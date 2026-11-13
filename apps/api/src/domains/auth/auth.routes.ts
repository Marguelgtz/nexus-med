import { Hono } from 'hono';
import { z } from 'zod';
import { parseOrThrow, readJsonBody } from '../../shared/http/parse';
import { ConflictError, ForbiddenError, NotFoundError, UnauthenticatedError, ValidationError } from '../../shared/http/errors';
import { acceptInvitationSchema, createClinicSchema, createInvitationSchema, updateDemoViewSchema } from '@nexus-med/contracts';
import { currentPrincipal, getAuthRuntime } from './auth.context';
import { findInvitationByToken, INVITATION_COOKIE, INVITATION_LIFETIME_MS, newOpaqueToken, normalizeEmail, sha256 } from './invitations';
import { authEmailTemplate } from '../email/templates';
import { encryptEmailPayload } from '../email/outbox';
import { DEMO_ACCOUNT_EMAIL, deriveDemoPassword, ensureDemoAccount } from './demo-password';
import { consumeAccountRateLimit } from './auth.config';
import { acceptClinicInvitation, bootstrapClinic, requireClinicAdmin } from './clinic-access';
import { cleanUpOrphanedSignupIdentity } from './signup-cleanup';

const invitationPrepareSchema = z.object({ token: z.string().min(32).max(128) }).strict();
const RECENT_AUTH_MAX_AGE_MS = 10 * 60 * 1000;
const authRoutes = new Hono();

function authCookie(value: string, maxAge: number, secure: boolean): string {
  return `${INVITATION_COOKIE}=${value}; Max-Age=${maxAge}; Path=/api/auth; HttpOnly; SameSite=Lax${secure ? '; Secure' : ''}`;
}

function sessionResponse() {
  const principal = currentPrincipal();
  if (!principal) throw new UnauthenticatedError();
  const effectiveRole = principal.user.role === 'demo' ? principal.session.demoView : principal.user.role;
  const doctorView = effectiveRole === 'doctor';
  return {
    user: { id: principal.user.id, name: principal.user.name, role: principal.user.role },
    activeView: principal.user.role === 'demo' ? principal.session.demoView : null,
    onboardingRequired: !principal.clinicId,
    clinic: principal.clinic,
    canManagePatients: Boolean(principal.clinicId),
    canReadClinical: doctorView,
    canReceiveStudies: Boolean(principal.clinicId),
    canReviewStudies: doctorView,
    canManageAccess: principal.membership?.isAdmin === true,
  };
}

export { authRoutes };

authRoutes.post('/auth/prepare-invitation', async (c) => {
  const input = parseOrThrow(invitationPrepareSchema, await readJsonBody(c));
  const runtime = getAuthRuntime();
  const invitation = await findInvitationByToken(runtime.database, input.token);
  if (!invitation) throw new ValidationError('La invitación venció o ya fue utilizada. Solicita una nueva.');

  c.header('Set-Cookie', authCookie(input.token, 10 * 60, !runtime.localRuntime));
  c.header('Cache-Control', 'no-store');
  c.header('Referrer-Policy', 'no-referrer');
  return c.json({ email: invitation.email, role: invitation.role, clinicName: invitation.clinic.name, expiresAt: invitation.expiresAt.toISOString() });
});

authRoutes.post('/demo/session', async (c) => {
  const runtime = getAuthRuntime();
  const clientIp = c.req.header('cf-connecting-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0] ?? 'local';
  const limit = await consumeAccountRateLimit(runtime.database, runtime.secret, `demo-entry:${clientIp}`, { window: 60 * 60, max: 30 });
  if (!limit.allowed) {
    c.header('Retry-After', String(limit.retryAfter));
    c.header('Cache-Control', 'no-store');
    return c.json({ error: { code: 'RATE_LIMITED', message: 'Demasiadas solicitudes para abrir la demo. Intenta más tarde.' } }, 429);
  }
  await ensureDemoAccount(runtime.database, runtime.atomicWrite, runtime.secret);
  const url = new URL('/api/auth/sign-in/email', runtime.appBaseUrl);
  const headers = new Headers({
    'content-type': 'application/json',
    origin: runtime.appBaseUrl,
  });
  const ip = c.req.header('cf-connecting-ip');
  if (ip) headers.set('cf-connecting-ip', ip);
  const userAgent = c.req.header('user-agent');
  if (userAgent) headers.set('user-agent', userAgent);
  const forwardedFor = c.req.header('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);

  const password = await deriveDemoPassword(runtime.secret);
  const signInResponse = await runtime.auth.handler(new Request(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email: DEMO_ACCOUNT_EMAIL, password, callbackURL: `${runtime.appBaseUrl}/` }),
  }));
  c.header('Cache-Control', 'no-store');
  return signInResponse;
});

authRoutes.get('/session', (c) => {
  c.header('Cache-Control', 'no-store');
  return c.json(sessionResponse());
});

authRoutes.get('/options', (c) => {
  c.header('Cache-Control', 'no-store');
  const runtime = getAuthRuntime();
  return c.json({ googleEnabled: runtime.googleEnabled, localEmailCapture: runtime.localRuntime });
});

authRoutes.patch('/demo/view', async (c) => {
  const principal = currentPrincipal();
  if (!principal) throw new UnauthenticatedError();
  if (principal.user.role !== 'demo') throw new ForbiddenError();
  const input = parseOrThrow(updateDemoViewSchema, await readJsonBody(c));
  const runtime = getAuthRuntime();
  await runtime.database.session.update({
    where: { id: principal.session.id },
    data: { demoView: input.view },
  });
  c.header('Cache-Control', 'no-store');
  return c.json({ view: input.view });
});

authRoutes.post('/onboarding/clinic', async c => {
  const input = parseOrThrow(createClinicSchema, await readJsonBody(c));
  await bootstrapClinic(input);
  return c.json(sessionResponse());
});

authRoutes.post('/invitations/accept', async c => {
  const input = parseOrThrow(acceptInvitationSchema, await readJsonBody(c));
  await acceptClinicInvitation(input.token);
  return c.json(sessionResponse());
});

const invitationSelect = { id: true, clinicId: true, email: true, role: true, expiresAt: true, createdAt: true, acceptedAt: true, revokedAt: true } as const;
function invitationDto(item: { id: string; clinicId: string; email: string; role: string; expiresAt: Date; createdAt: Date; acceptedAt: Date | null; revokedAt: Date | null }) {
  return { ...item, expiresAt: item.expiresAt.toISOString(), createdAt: item.createdAt.toISOString(), acceptedAt: item.acceptedAt?.toISOString() ?? null, revokedAt: item.revokedAt?.toISOString() ?? null };
}

authRoutes.get('/access/invitations', async (c) => {
  const principal = requireClinicAdmin();
  const invitations = await getAuthRuntime().database.invitation.findMany({
    where: { clinicId: principal.clinicId }, orderBy: { createdAt: 'desc' }, take: 100, select: invitationSelect,
  });
  return c.json(invitations.map(invitationDto));
});

authRoutes.post('/access/invitations', async (c) => {
  const principal = requireClinicAdmin();
  requireRecentAuthentication(principal.session.createdAt);
  const runtime = getAuthRuntime();
  const database = runtime.database;
  const input = parseOrThrow(createInvitationSchema, await readJsonBody(c));
  const email = normalizeEmail(input.email);
  const existingUser = await database.user.findUnique({ where: { email }, select: { id: true, role: true, disabledAt: true } });
  if (existingUser?.disabledAt || existingUser?.role === 'demo') throw new ConflictError('Esta cuenta no está disponible para recibir acceso.');
  if (existingUser && await database.clinicMembership.findFirst({ where: { clinicId: principal.clinicId, userId: existingUser.id, status: 'active' } })) {
    throw new ConflictError('La cuenta ya pertenece a esta clínica.');
  }
  const now = new Date();
  const activeInvitation = await database.invitation.findFirst({
    where: { clinicId: principal.clinicId, email, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } }, select: { id: true },
  });
  if (activeInvitation) throw new ConflictError('Ya existe una invitación vigente para ese correo.');
  const token = newOpaqueToken();
  const tokenHash = await sha256(token);
  const invitationUrl = new URL('/aceptar-invitacion', runtime.appBaseUrl);
  invitationUrl.searchParams.set('token', token);
  const message = authEmailTemplate('invitation', 'colaborador', invitationUrl.toString());
  const encryptedBody = await encryptEmailPayload(runtime.secret, message.payload);
  const invitationId = crypto.randomUUID();
  const guardId = crypto.randomUUID();
  const nowIso = now.toISOString();
  const expiresAt = new Date(now.getTime() + INVITATION_LIFETIME_MS).toISOString();
  try {
    // Check and write within one SQLite transaction / D1 batch. The earlier
    // reads improve feedback, but cannot protect concurrent submissions.
    await runtime.atomicWrite([
      { sql: `INSERT INTO atomic_write_guards(id,valid) VALUES (?,CASE WHEN
          EXISTS (SELECT 1 FROM clinic_memberships m JOIN clinics c ON c.id=m.clinicId
            JOIN auth_users actor ON actor.id=m.userId
            WHERE m.id=? AND m.userId=? AND m.clinicId=? AND m.status='active' AND m.isAdmin=1
              AND c.isActive=1 AND actor.emailVerified=1 AND actor.disabledAt IS NULL)
          AND NOT EXISTS (SELECT 1 FROM auth_users u WHERE u.email=? AND (u.disabledAt IS NOT NULL OR u.role='demo'))
          AND NOT EXISTS (SELECT 1 FROM clinic_memberships m JOIN auth_users u ON u.id=m.userId
            WHERE m.clinicId=? AND u.email=? AND m.status='active')
          AND NOT EXISTS (SELECT 1 FROM auth_invitations i WHERE i.clinicId=? AND i.email=?
            AND i.acceptedAt IS NULL AND i.revokedAt IS NULL AND i.expiresAt>?)
          THEN 1 ELSE 0 END)`,
        values: [guardId, principal.membership.id, principal.user.id, principal.clinicId, email, principal.clinicId, email, principal.clinicId, email, nowIso] },
      { sql: `INSERT INTO auth_invitations(id,email,role,tokenHash,expiresAt,createdById,createdAt,clinicId)
          VALUES (?,?,?,?,?,?,?,?)`, values: [invitationId, email, input.role, tokenHash, expiresAt, principal.user.id, nowIso, principal.clinicId] },
      { sql: `INSERT INTO email_outbox(id,kind,recipient,subject,encryptedBody,idempotencyKey,status,attempts,availableAt,createdAt,updatedAt)
          VALUES (?,'invitation',?,?,?,?,'queued',0,?,?,?)`, values: [crypto.randomUUID(), email, message.subject, encryptedBody, `invitation:${tokenHash}`, nowIso, nowIso, nowIso] },
      { sql: `INSERT INTO security_events(id,actorId,event,targetId,outcome,createdAt)
          VALUES (?,?,'invitation.created',?,'success',?)`, values: [crypto.randomUUID(), principal.user.id, invitationId, nowIso] },
      { sql: 'DELETE FROM atomic_write_guards WHERE id=?', values: [guardId] },
    ]);
  } catch (error) {
    if (error instanceof Error && /CHECK constraint failed.*valid/i.test(error.message)) {
      throw new ConflictError('La invitación o el acceso cambió. Actualiza e intenta de nuevo.');
    }
    throw error;
  }
  const invitation = await database.invitation.findUniqueOrThrow({ where: { id: invitationId }, select: invitationSelect });
  return c.json(invitationDto(invitation), 201);
});

authRoutes.post('/access/invitations/:id/revoke', async (c) => {
  const principal = requireClinicAdmin();
  requireRecentAuthentication(principal.session.createdAt);
  const runtime = getAuthRuntime();
  const invitationId = c.req.param('id');
  const guardId = crypto.randomUUID();
  const now = new Date().toISOString();
  try {
    await runtime.atomicWrite([
      { sql: `INSERT INTO atomic_write_guards(id,valid) VALUES (?,CASE WHEN
          EXISTS (SELECT 1 FROM auth_invitations i WHERE i.id=? AND i.clinicId=?
            AND i.acceptedAt IS NULL AND i.revokedAt IS NULL)
          AND EXISTS (SELECT 1 FROM clinic_memberships m JOIN clinics c ON c.id=m.clinicId
            JOIN auth_users actor ON actor.id=m.userId
            WHERE m.id=? AND m.userId=? AND m.clinicId=? AND m.status='active' AND m.isAdmin=1
              AND c.isActive=1 AND actor.emailVerified=1 AND actor.disabledAt IS NULL)
          THEN 1 ELSE 0 END)`,
        values: [guardId, invitationId, principal.clinicId, principal.membership.id, principal.user.id, principal.clinicId] },
      { sql: 'UPDATE auth_invitations SET revokedAt=? WHERE id=? AND clinicId=?', values: [now, invitationId, principal.clinicId] },
      { sql: `INSERT INTO security_events(id,actorId,event,targetId,outcome,createdAt)
          VALUES (?,?,'invitation.revoked',?,'success',?)`, values: [crypto.randomUUID(), principal.user.id, invitationId, now] },
      { sql: 'DELETE FROM atomic_write_guards WHERE id=?', values: [guardId] },
    ]);
  } catch (error) {
    if (error instanceof Error && /CHECK constraint failed.*valid/i.test(error.message)) {
      throw new NotFoundError('Invitación pendiente no encontrada.');
    }
    throw error;
  }
  return c.json({ revoked: true });
});

authRoutes.get('/access/members', async (c) => {
  const principal = requireClinicAdmin();
  const members = await getAuthRuntime().database.clinicMembership.findMany({
    where: { clinicId: principal.clinicId }, orderBy: { createdAt: 'asc' },
    include: { user: { select: { id: true, name: true, email: true, emailVerified: true, disabledAt: true } } },
  });
  return c.json(members.map(member => ({ id: member.user.id, membershipId: member.id, name: member.user.name, email: member.user.email,
    role: member.role, isAdmin: member.isAdmin, emailVerified: member.user.emailVerified,
    active: member.status === 'active' && !member.user.disabledAt, createdAt: member.createdAt.toISOString() })));
});

authRoutes.post('/access/members/:id/revoke', async (c) => {
  const principal = requireClinicAdmin();
  requireRecentAuthentication(principal.session.createdAt);
  const runtime = getAuthRuntime();
  const userId = c.req.param('id');
  if (userId === principal.user.id) throw new ConflictError('No puedes revocar tu propio acceso.');
  const target = await runtime.database.clinicMembership.findUnique({ where: { clinicId_userId: { clinicId: principal.clinicId, userId } } });
  if (!target) throw new NotFoundError('Integrante no encontrado.');
  if (target.status === 'revoked') return c.json({ revoked: true });
  const now = new Date().toISOString();
  await runtime.atomicWrite([
    { sql: `UPDATE clinic_memberships SET status = 'revoked', updatedAt = ? WHERE id = ? AND clinicId = ? AND userId <> ? AND status = 'active'
            AND EXISTS (SELECT 1 FROM clinic_memberships actor WHERE actor.id = ? AND actor.clinicId = ? AND actor.status = 'active' AND actor.isAdmin = 1)`,
      values: [now, target.id, principal.clinicId, principal.user.id, principal.membership.id, principal.clinicId] },
    { sql: `DELETE FROM auth_sessions WHERE userId = ? AND (activeClinicId = ? OR activeClinicId IS NULL)
            AND EXISTS (SELECT 1 FROM clinic_memberships WHERE id = ? AND status = 'revoked')`,
      values: [userId, principal.clinicId, target.id] },
    { sql: `INSERT INTO security_events (id, actorId, event, targetId, outcome, createdAt)
            SELECT ?, ?, 'member.revoked', ?, 'success', ? WHERE EXISTS (SELECT 1 FROM clinic_memberships WHERE id = ? AND status = 'revoked')`,
      values: [crypto.randomUUID(), principal.user.id, target.id, now, target.id] },
  ]);
  const updated = await runtime.database.clinicMembership.findUnique({ where: { id: target.id } });
  if (updated?.status !== 'revoked') throw new ConflictError('El acceso cambió. Actualiza la lista.');
  return c.json({ revoked: true });
});

authRoutes.on(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], '/auth/*', async (c) => {
  const action = c.req.path.replace(/^\/api\/auth\//, '');
  const accountRules: Record<string, { window: number; max: number }> = {
    'sign-in/email': { window: 10 * 60, max: 5 },
    'request-password-reset': { window: 60 * 60, max: 3 },
    'send-verification-email': { window: 60 * 60, max: 3 },
  };
  const rule = c.req.method === 'POST' ? accountRules[action] : undefined;
  if (rule) {
    const input = await c.req.raw.clone().json().catch(() => null) as { email?: unknown } | null;
    const email = typeof input?.email === 'string' ? normalizeEmail(input.email) : '';
    if (email && email !== DEMO_ACCOUNT_EMAIL) {
      const runtime = getAuthRuntime();
      const result = await consumeAccountRateLimit(runtime.database, runtime.secret, `account:${action}:${email}`, rule);
      if (!result.allowed) {
        c.header('Retry-After', String(result.retryAfter));
        return c.json({ error: { code: 'RATE_LIMITED', message: 'Demasiados intentos para esta cuenta. Intenta de nuevo más tarde.' } }, 429);
      }
    }
  }
  const runtime = getAuthRuntime();
  const handle = () => runtime.auth.handler(c.req.raw);
  const identityCreationFlow = (c.req.method === 'POST' && action === 'sign-up/email') || action === 'callback/google';
  const response = identityCreationFlow
    ? await cleanUpOrphanedSignupIdentity(runtime.atomicWrite, handle)
    : await handle();
  const signupComplete = response.ok && (c.req.path.endsWith('/sign-up/email') || c.req.path.endsWith('/callback/google'));
  if (!signupComplete) return response;
  const headers = new Headers(response.headers);
  headers.append('Set-Cookie', authCookie('', 0, !getAuthRuntime().localRuntime));
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
});

export function applicationSession() {
  return sessionResponse();
}

export function requireDoctor() {
  const principal = currentPrincipal();
  if (!principal) throw new UnauthenticatedError();
  if (principal.user.role !== 'doctor') throw new ForbiddenError();
  return principal;
}

function requireRecentAuthentication(createdAt: Date) {
  const ageMs = Date.now() - createdAt.getTime();
  if (ageMs < 0 || ageMs > RECENT_AUTH_MAX_AGE_MS) {
    throw new ForbiddenError('Vuelve a iniciar sesión para administrar accesos.');
  }
}

export function requireDoctorView() {
  const principal = requirePrincipal();
  const doctorView = principal.user.role === 'doctor' || (principal.user.role === 'demo' && principal.session.demoView === 'doctor');
  if (!doctorView) throw new ForbiddenError();
  return principal;
}

export function canReadClinicalInCurrentView(): boolean {
  const principal = currentPrincipal();
  if (!principal) return false; // Isolated API tests exercise the reduced administrative projection by default.
  return principal.user.role === 'doctor' || (principal.user.role === 'demo' && principal.session.demoView === 'doctor');
}

export function requirePrincipal() {
  const principal = currentPrincipal();
  if (!principal) throw new UnauthenticatedError();
  return principal;
}

