import type { CreateClinic } from '@nexus-med/contracts';
import { ConflictError, ForbiddenError, UnauthenticatedError, ValidationError } from '../../shared/http/errors';
import { currentPrincipal, getAuthRuntime, type AuthPrincipal, type MembershipRole } from './auth.context';
import { normalizeEmail, sha256 } from './invitations';

export function requireVerifiedIdentity(): AuthPrincipal {
  const principal = currentPrincipal();
  if (!principal || principal.user.disabledAt || !principal.user.emailVerified) throw new UnauthenticatedError();
  if (principal.user.role === 'demo') throw new ForbiddenError();
  return principal;
}

export function requireClinicAdmin(): AuthPrincipal & { clinicId: string; membership: NonNullable<AuthPrincipal['membership']> } {
  const principal = requireVerifiedIdentity();
  if (!principal.clinicId || !principal.membership?.isAdmin) throw new ForbiddenError();
  return principal as AuthPrincipal & { clinicId: string; membership: NonNullable<AuthPrincipal['membership']> };
}

async function activateMembership(userId: string, clinicId: string) {
  const runtime = getAuthRuntime();
  const membership = await runtime.database.clinicMembership.findFirst({
    where: { userId, clinicId, status: 'active', clinic: { isActive: true } },
    include: { clinic: { select: { id: true, name: true, timezone: true } } },
  });
  if (!membership) throw new ConflictError('El acceso cambió. Vuelve a iniciar sesión.');
  const principal = requireVerifiedIdentity();
  await runtime.database.session.updateMany({
    where: { id: principal.session.id, userId },
    data: { activeClinicId: clinicId },
  });
  runtime.principal = {
    ...principal,
    user: { ...principal.user, role: membership.role as MembershipRole },
    clinicId,
    clinic: membership.clinic,
    membership: { id: membership.id, clinicId, role: membership.role as MembershipRole, isAdmin: membership.isAdmin },
  };
}

/** Stable IDs make the clinic + owner write retry-safe on both SQLite and D1. */
export async function bootstrapClinic(input: CreateClinic) {
  const principal = requireVerifiedIdentity();
  const runtime = getAuthRuntime();
  const existing = await runtime.database.clinicMembership.findFirst({
    where: { userId: principal.user.id, status: 'active', clinic: { isActive: true } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  if (existing) {
    await activateMembership(principal.user.id, existing.clinicId);
    return;
  }
  const clinicId = `clinic-${principal.user.id}`;
  const membershipId = `owner-${principal.user.id}`;
  const now = new Date().toISOString();
  await runtime.atomicWrite([
    {
      sql: `INSERT OR IGNORE INTO clinics (id, name, timezone, isActive, createdAt, updatedAt)
            SELECT ?, ?, ?, 1, ?, ? FROM auth_users WHERE id = ? AND emailVerified = 1 AND disabledAt IS NULL`,
      values: [clinicId, input.name, input.timezone, now, now, principal.user.id],
    },
    {
      sql: `INSERT OR IGNORE INTO clinic_memberships (id, clinicId, userId, role, isAdmin, status, createdAt, updatedAt)
            SELECT ?, ?, ?, 'doctor', 1, 'active', ?, ?
            WHERE EXISTS (SELECT 1 FROM auth_users WHERE id = ? AND emailVerified = 1 AND disabledAt IS NULL)
              AND EXISTS (SELECT 1 FROM clinics WHERE id = ? AND isActive = 1)`,
      values: [membershipId, clinicId, principal.user.id, now, now, principal.user.id, clinicId],
    },
    {
      sql: `INSERT OR IGNORE INTO security_events (id, actorId, event, targetId, outcome, createdAt)
            SELECT ?, ?, 'clinic.created', ?, 'success', ?
            WHERE EXISTS (SELECT 1 FROM clinic_memberships WHERE id = ? AND status = 'active' AND isAdmin = 1)`,
      values: [`bootstrap-${principal.user.id}`, principal.user.id, clinicId, now, membershipId],
    },
  ]);
  await activateMembership(principal.user.id, clinicId);
}

/** Token possession is insufficient: acceptance needs the verified matching identity. */
export async function acceptClinicInvitation(token: string) {
  const principal = requireVerifiedIdentity();
  const runtime = getAuthRuntime();
  const invitation = await runtime.database.invitation.findUnique({
    where: { tokenHash: await sha256(token) },
    include: { clinic: { select: { isActive: true } } },
  });
  if (
    !invitation || invitation.revokedAt || !invitation.clinic.isActive ||
    invitation.email !== normalizeEmail(principal.user.email) ||
    !['doctor', 'secretary'].includes(invitation.role) ||
    (invitation.acceptedAt && invitation.acceptedUserId !== principal.user.id) ||
    (!invitation.acceptedAt && invitation.expiresAt.getTime() <= Date.now())
  ) throw new ValidationError('La invitación no está disponible para esta cuenta.');

  if (invitation.acceptedAt) {
    await activateMembership(principal.user.id, invitation.clinicId);
    return;
  }
  const now = new Date().toISOString();
  const membershipId = crypto.randomUUID();
  // The SELECT predicates run inside the atomic batch. Revocation, expiry,
  // duplicate acceptance, or a changed identity cannot leave a new grant.
  await runtime.atomicWrite([
    {
      sql: `INSERT INTO clinic_memberships (id, clinicId, userId, role, isAdmin, status, createdAt, updatedAt)
            SELECT ?, i.clinicId, u.id, i.role, 0, 'active', ?, ?
            FROM auth_invitations i JOIN auth_users u ON u.id = ? AND u.email = i.email
            JOIN clinics c ON c.id = i.clinicId AND c.isActive = 1
            WHERE i.id = ? AND i.acceptedAt IS NULL AND i.revokedAt IS NULL AND i.expiresAt > ?
              AND u.emailVerified = 1 AND u.disabledAt IS NULL AND i.role IN ('doctor', 'secretary')
            ON CONFLICT(clinicId, userId) DO UPDATE SET role = excluded.role, isAdmin = 0,
              status = 'active', updatedAt = excluded.updatedAt
            WHERE clinic_memberships.status = 'revoked'`,
      values: [membershipId, now, now, principal.user.id, invitation.id, now],
    },
    {
      sql: `UPDATE auth_invitations SET acceptedAt = ?, acceptedUserId = ?
            WHERE id = ? AND acceptedAt IS NULL AND revokedAt IS NULL AND expiresAt > ?
              AND EXISTS (SELECT 1 FROM clinic_memberships m WHERE m.clinicId = auth_invitations.clinicId
                AND m.userId = ? AND m.status = 'active' AND m.role = auth_invitations.role)`,
      values: [now, principal.user.id, invitation.id, now, principal.user.id],
    },
    {
      sql: `INSERT OR IGNORE INTO security_events (id, actorId, event, targetId, outcome, createdAt)
            SELECT ?, ?, 'invitation.accepted', ?, 'success', ?
            WHERE EXISTS (SELECT 1 FROM auth_invitations WHERE id = ? AND acceptedUserId = ? AND acceptedAt IS NOT NULL)`,
      values: [`accept-${invitation.id}`, principal.user.id, invitation.id, now, invitation.id, principal.user.id],
    },
  ]);
  const consumed = await runtime.database.invitation.findUnique({ where: { id: invitation.id } });
  if (!consumed?.acceptedAt || consumed.acceptedUserId !== principal.user.id) {
    throw new ConflictError('La invitación cambió. Solicita una nueva.');
  }
  await activateMembership(principal.user.id, invitation.clinicId);
}
