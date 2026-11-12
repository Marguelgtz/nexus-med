import { Hono } from 'hono';
import { z } from 'zod';
import { parseOrThrow, readJsonBody } from '../../shared/http/parse';
import { ConflictError, ForbiddenError, NotFoundError, UnauthenticatedError, ValidationError } from '../../shared/http/errors';
import { createInvitationSchema, updateDemoViewSchema } from '@nexus-med/contracts';
import { currentPrincipal, getAuthRuntime } from './auth.context';
import { findInvitationByToken, INVITATION_COOKIE, INVITATION_LIFETIME_MS, newOpaqueToken, normalizeEmail, sha256 } from './invitations';
import { authEmailTemplate } from '../email/templates';
import { enqueueEmail } from '../email/outbox';
import { DEMO_ACCOUNT_EMAIL, deriveDemoPassword, ensureDemoAccount } from './demo-password';
import { consumeAccountRateLimit } from './auth.config';

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
    canManagePatients: true,
    canReadClinical: doctorView,
    canReceiveStudies: true,
    canReviewStudies: doctorView,
    canManageAccess: principal.user.role === 'doctor',
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
  return c.json({ email: invitation.email, expiresAt: invitation.expiresAt.toISOString() });
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

authRoutes.get('/access/invitations', async (c) => {
  const principal = requireDoctor();
  const database = getAuthRuntime().database;
  const invitations = await database.invitation.findMany({
    where: { createdById: principal.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, email: true, expiresAt: true, createdAt: true, acceptedAt: true, revokedAt: true },
  });
  c.header('Cache-Control', 'no-store');
  return c.json(invitations.map(item => ({ ...item, expiresAt: item.expiresAt.toISOString(), createdAt: item.createdAt.toISOString(), acceptedAt: item.acceptedAt?.toISOString() ?? null, revokedAt: item.revokedAt?.toISOString() ?? null })));
});

authRoutes.post('/access/invitations', async (c) => {
  const principal = requireDoctor();
  requireRecentAuthentication(principal.session.createdAt);
  const database = getAuthRuntime().database;
  const runtime = getAuthRuntime();
  const input = parseOrThrow(createInvitationSchema, await readJsonBody(c));
  const email = normalizeEmail(input.email);
  const existingUser = await database.user.findUnique({ where: { email }, select: { id: true, role: true, disabledAt: true } });
  if (existingUser) throw new ConflictError('Ya existe una cuenta con ese correo.');

  const now = new Date();
  const activeInvitation = await database.invitation.findFirst({
    where: { email, acceptedAt: null, revokedAt: null, expiresAt: { gt: now } },
    select: { id: true },
  });
  if (activeInvitation) throw new ConflictError('Ya existe una invitación vigente para ese correo.');

  const token = newOpaqueToken();
  const tokenHash = await sha256(token);
  const id = crypto.randomUUID();
  const expiresAt = new Date(now.getTime() + INVITATION_LIFETIME_MS);
  await database.invitation.create({
    data: { id, email, role: 'secretary', tokenHash, expiresAt, createdById: principal.user.id },
  });

  const invitationUrl = new URL('/aceptar-invitacion', runtime.appBaseUrl);
  invitationUrl.searchParams.set('token', token);
  const message = authEmailTemplate('invitation', 'colaborador', invitationUrl.toString());
  try {
    await enqueueEmail(database, runtime.secret, {
      kind: 'invitation',
      recipient: email,
      subject: message.subject,
      payload: message.payload,
      idempotencyKey: `invitation:${tokenHash}`,
    });
  } catch {
    await database.invitation.update({ where: { id }, data: { revokedAt: new Date() } });
    throw new Error('No se pudo preparar el correo de invitación.');
  }
  await database.securityEvent.create({
    data: { actorId: principal.user.id, event: 'invitation.created', targetId: id, outcome: 'success' },
  });
  return c.json({ id, email, expiresAt: expiresAt.toISOString(), createdAt: now.toISOString(), acceptedAt: null, revokedAt: null }, 201);
});

authRoutes.post('/access/invitations/:id/revoke', async (c) => {
  const principal = requireDoctor();
  requireRecentAuthentication(principal.session.createdAt);
  const database = getAuthRuntime().database;
  const invitation = await database.invitation.findFirst({ where: { id: c.req.param('id'), createdById: principal.user.id, acceptedAt: null, revokedAt: null } });
  if (!invitation) throw new NotFoundError('Invitación pendiente no encontrada.');
  await database.invitation.update({ where: { id: invitation.id }, data: { revokedAt: new Date() } });
  await database.securityEvent.create({ data: { actorId: principal.user.id, event: 'invitation.revoked', targetId: invitation.id, outcome: 'success' } });
  return c.json({ revoked: true });
});

authRoutes.get('/access/members', async (c) => {
  requireDoctor();
  const database = getAuthRuntime().database;
  const users = await database.user.findMany({
    where: { role: { in: ['doctor', 'secretary'] } },
    orderBy: { createdAt: 'asc' },
    select: { id: true, name: true, email: true, role: true, emailVerified: true, disabledAt: true, createdAt: true },
  });
  c.header('Cache-Control', 'no-store');
  return c.json(users.map(({ disabledAt, createdAt, ...user }) => ({ ...user, active: disabledAt === null, createdAt: createdAt.toISOString() })));
});

authRoutes.post('/access/members/:id/revoke', async (c) => {
  const principal = requireDoctor();
  requireRecentAuthentication(principal.session.createdAt);
  const database = getAuthRuntime().database;
  const target = await database.user.findUnique({ where: { id: c.req.param('id') }, select: { id: true, role: true, disabledAt: true } });
  if (!target || target.role !== 'secretary') throw new NotFoundError('Cuenta de secretaría no encontrada.');
  if (target.disabledAt) return c.json({ revoked: true });

  const now = new Date();
  await database.user.update({ where: { id: target.id }, data: { disabledAt: now } });
  await database.session.deleteMany({ where: { userId: target.id } });
  await database.securityEvent.create({ data: { actorId: principal.user.id, event: 'member.revoked', targetId: target.id, outcome: 'success' } });
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
  const response = await getAuthRuntime().auth.handler(c.req.raw);
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

