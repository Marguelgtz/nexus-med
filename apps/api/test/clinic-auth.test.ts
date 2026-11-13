import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { createAuth } from '../src/domains/auth/auth.config';
import { resolvePrincipal, withAuthRuntime } from '../src/domains/auth/auth.context';
import { newOpaqueToken, sha256 } from '../src/domains/auth/invitations';
import { decryptEmailPayload } from '../src/domains/email/outbox';
import { localPrisma } from '../src/infrastructure/database/prisma';
import { createSqliteAtomicWrite, withPrismaClient } from '../src/infrastructure/database/runtime-client';

const origin = 'http://127.0.0.1:3000';
const secret = 'synthetic-clinic-auth-secret-'.repeat(3);
const password = 'Synthetic-Test-Password-2026';
const auth = createAuth(localPrisma, { secret, appBaseUrl: origin, production: false });
const app = createApp();
let sequence = 0;
let requestSequence = 0;
const email = () => `clinic-auth-${++sequence}-${crypto.randomUUID()}@example.test`;

async function request(path: string, body?: unknown, cookie = '', method = body === undefined ? 'GET' : 'POST') {
  const headers = new Headers({ origin, cookie, 'content-type': 'application/json', 'cf-connecting-ip': `192.0.2.${++requestSequence % 250 + 1}` });
  const principal = await resolvePrincipal(auth, headers, localPrisma);
  return withAuthRuntime({ auth, database: localPrisma, atomicWrite: createSqliteAtomicWrite(localPrisma), secret, appBaseUrl: origin, googleEnabled: false, localRuntime: true, principal }, () =>
    withPrismaClient(localPrisma, () => app.request(`${origin}${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), createSqliteAtomicWrite(localPrisma)));
}

async function signupVerified(name = 'Doctora sintética') {
  const address = email();
  const signup = await request('/api/auth/sign-up/email', { name, email: address, password, role: 'doctor', emailVerified: true });
  expect(signup.status).toBe(200);
  const user = await localPrisma.user.findUniqueOrThrow({ where: { email: address } });
  expect(user.role).toBe('pending');
  expect(user.emailVerified).toBe(false);
  expect(await localPrisma.clinicMembership.count({ where: { userId: user.id } })).toBe(0);
  expect((await request('/api/auth/sign-in/email', { email: address, password })).status).toBe(403);
  const verification = await localPrisma.emailOutbox.findFirstOrThrow({ where: { recipient: address, kind: 'verify_email' }, orderBy: { createdAt: 'desc' } });
  const payload = await decryptEmailPayload(secret, verification.encryptedBody);
  const url = payload.text.match(/https?:\/\/[^\s]+/)?.[0];
  expect(url).toBeTruthy();
  const verified = await request(`${new URL(url!).pathname}${new URL(url!).search}`);
  expect([200, 302]).toContain(verified.status);
  const login = await request('/api/auth/sign-in/email', { email: address, password });
  expect(login.status).toBe(200);
  const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
  expect(cookie).toContain('session_token=');
  return { user: await localPrisma.user.findUniqueOrThrow({ where: { id: user.id } }), cookie };
}

async function makeOwner() {
  const identity = await signupVerified();
  const created = await request('/api/onboarding/clinic', { name: 'Clínica sintética de prueba' }, identity.cookie);
  expect(created.status).toBe(200);
  const session = await created.json() as { clinic: { id: string }; canManageAccess: boolean; onboardingRequired: boolean };
  expect(session.canManageAccess).toBe(true);
  expect(session.onboardingRequired).toBe(false);
  return { ...identity, clinicId: session.clinic.id };
}

async function inviteToken(ownerCookie: string, recipient: string, role: 'doctor' | 'secretary') {
  const response = await request('/api/access/invitations', { email: recipient, role }, ownerCookie);
  expect(response.status).toBe(201);
  const invite = await response.json() as { id: string; clinicId: string; role: string };
  expect(invite.role).toBe(role);
  const queued = await localPrisma.emailOutbox.findFirstOrThrow({ where: { recipient, kind: 'invitation' }, orderBy: { createdAt: 'desc' } });
  const payload = await decryptEmailPayload(secret, queued.encryptedBody);
  const token = new URL(payload.text.match(/https?:\/\/[^\s]+/)![0]).searchParams.get('token')!;
  return { ...invite, token };
}

describe('verified clinic onboarding and membership authorization', () => {
  it('creates one pending invitation under concurrency and rolls back a failed outbox write', async () => {
    const owner = await makeOwner();
    const address = email();
    const attempts = await Promise.all(Array.from({ length: 8 }, () => request('/api/access/invitations', { email: address, role: 'secretary' }, owner.cookie)));
    expect(attempts.map(response => response.status).sort()).toEqual([201, 409, 409, 409, 409, 409, 409, 409]);
    expect(await localPrisma.invitation.count({ where: { clinicId: owner.clinicId, email: address, acceptedAt: null, revokedAt: null } })).toBe(1);
    expect(await localPrisma.emailOutbox.count({ where: { recipient: address, kind: 'invitation' } })).toBe(1);

    const failedAddress = email();
    const eventsBefore = await localPrisma.securityEvent.count({ where: { event: 'invitation.created' } });
    await localPrisma.$executeRawUnsafe("CREATE TRIGGER synthetic_invite_outbox_failure BEFORE INSERT ON email_outbox WHEN NEW.kind='invitation' BEGIN SELECT RAISE(ABORT, 'synthetic outbox failure'); END");
    try {
      expect((await request('/api/access/invitations', { email: failedAddress, role: 'secretary' }, owner.cookie)).status).toBe(500);
      expect(await localPrisma.invitation.count({ where: { clinicId: owner.clinicId, email: failedAddress } })).toBe(0);
      expect(await localPrisma.emailOutbox.count({ where: { recipient: failedAddress } })).toBe(0);
      expect(await localPrisma.securityEvent.count({ where: { event: 'invitation.created' } })).toBe(eventsBefore);
    } finally {
      await localPrisma.$executeRawUnsafe('DROP TRIGGER synthetic_invite_outbox_failure');
    }
    expect((await request('/api/access/invitations', { email: failedAddress, role: 'secretary' }, owner.cookie)).status).toBe(201);

    const expiredAddress = email();
    await localPrisma.invitation.create({ data: {
      clinicId: owner.clinicId, createdById: owner.user.id, email: expiredAddress,
      role: 'secretary', tokenHash: await sha256(newOpaqueToken()), expiresAt: new Date(Date.now() - 60_000),
    } });
    expect((await request('/api/access/invitations', { email: expiredAddress, role: 'secretary' }, owner.cookie)).status).toBe(201);
  });
  it('creates only a pending identity until verified, then bootstraps one retry-safe owner/doctor clinic', async () => {
    const { user, cookie } = await signupVerified();
    const pending = await request('/api/session', undefined, cookie);
    expect(pending.status).toBe(200);
    expect(await pending.json()).toMatchObject({ user: { role: 'pending' }, onboardingRequired: true, clinic: null, canReadClinical: false, canManageAccess: false });
    expect((await request('/api/patients', undefined, cookie)).status).toBe(403);
    const first = await request('/api/onboarding/clinic', { name: 'Clínica de continuidad' }, cookie);
    expect(first.status).toBe(200);
    const session = await first.json() as { clinic: { id: string } };
    const second = await request('/api/onboarding/clinic', { name: 'Otro nombre' }, cookie);
    expect(second.status).toBe(200);
    expect(await second.json()).toMatchObject({ clinic: { id: session.clinic.id, name: 'Clínica de continuidad' }, user: { role: 'doctor' }, canReadClinical: true, canManageAccess: true });
    expect(await localPrisma.clinicMembership.count({ where: { userId: user.id } })).toBe(1);
    const denied = await request('/api/onboarding/clinic', { name: 'Clínica atacada', clinicId: 'legacy-clinic', isAdmin: true }, cookie);
    expect(denied.status).toBe(400);
  });

  it('invites existing verified doctors and secretaries, scopes access to the clinic, and revokes only that membership', async () => {
    const owner = await makeOwner();
    const secondDoctor = await signupVerified('Médico segundo');
    const secretary = await signupVerified('Secretaría primera');
    const secondSecretary = await signupVerified('Secretaría segunda');
    for (const [identity, role] of [[secondDoctor, 'doctor'], [secretary, 'secretary'], [secondSecretary, 'secretary']] as const) {
      const invite = await inviteToken(owner.cookie, identity.user.email, role);
      const accepted = await request('/api/invitations/accept', { token: invite.token }, identity.cookie);
      expect(accepted.status).toBe(200);
      expect(await accepted.json()).toMatchObject({ user: { role }, clinic: { id: owner.clinicId }, canManageAccess: false, canReadClinical: role === 'doctor' });
      expect((await request('/api/invitations/accept', { token: invite.token }, identity.cookie)).status).toBe(200);
      expect((await request('/api/access/members', undefined, identity.cookie)).status).toBe(403);
    }
    const members = await request('/api/access/members', undefined, owner.cookie);
    expect(members.status).toBe(200);
    expect((await members.json() as unknown[]).length).toBe(4);
    expect((await request('/api/patients', undefined, secretary.cookie)).status).toBe(403);
    expect((await request('/api/administrative/patients', undefined, secretary.cookie)).status).toBe(200);
    expect((await request(`/api/access/members/${owner.user.id}/revoke`, {}, owner.cookie)).status).toBe(409);
    const revoked = await request(`/api/access/members/${secondDoctor.user.id}/revoke`, {}, owner.cookie);
    expect(revoked.status).toBe(200);
    expect((await request('/api/patients', undefined, secondDoctor.cookie)).status).toBe(401);
    expect((await localPrisma.user.findUniqueOrThrow({ where: { id: secondDoctor.user.id } })).disabledAt).toBeNull();
  });

  it('rejects token reuse by another account, expired/revoked grants, and client role escalation', async () => {
    const owner = await makeOwner();
    const identity = await signupVerified();
    const stranger = await signupVerified();
    const invite = await inviteToken(owner.cookie, identity.user.email, 'secretary');
    expect((await request('/api/invitations/accept', { token: invite.token }, stranger.cookie)).status).toBe(400);
    expect((await request('/api/invitations/accept', { token: invite.token, role: 'doctor' }, identity.cookie)).status).toBe(400);
    expect((await request(`/api/access/invitations/${invite.id}/revoke`, {}, owner.cookie)).status).toBe(200);
    expect((await request('/api/invitations/accept', { token: invite.token }, identity.cookie)).status).toBe(400);
    expect(await localPrisma.clinicMembership.count({ where: { userId: identity.user.id } })).toBe(0);
    const token = newOpaqueToken();
    await localPrisma.invitation.create({ data: { email: identity.user.email, role: 'doctor', clinicId: owner.clinicId, createdById: owner.user.id, tokenHash: await sha256(token), expiresAt: new Date(Date.now() - 1000) } });
    expect((await request('/api/invitations/accept', { token }, identity.cookie)).status).toBe(400);
    expect((await request('/api/access/invitations', { email: stranger.user.email, role: 'administrator' }, owner.cookie)).status).toBe(400);
  });

  it('denies disabled users and keeps administrator permissions separate from clinical authoring', async () => {
    const owner = await makeOwner();
    const identity = await signupVerified();
    const membership = await localPrisma.clinicMembership.create({ data: { userId: identity.user.id, clinicId: owner.clinicId, role: 'administrator', isAdmin: true } });
    expect((await request('/api/access/members', undefined, identity.cookie)).status).toBe(200);
    expect((await request('/api/patients', undefined, identity.cookie)).status).toBe(403);
    const session = await request('/api/session', undefined, identity.cookie);
    expect(await session.json()).toMatchObject({ canReadClinical: false, canManageAccess: true });
    await localPrisma.clinicMembership.update({ where: { id: membership.id }, data: { status: 'revoked' } });
    expect((await request('/api/access/members', undefined, identity.cookie)).status).toBe(403);
    await localPrisma.user.update({ where: { id: identity.user.id }, data: { disabledAt: new Date() } });
    expect((await request('/api/session', undefined, identity.cookie)).status).toBe(401);
  });

  it('refreshes active sessions, enforces absolute expiry, and invalidates reset/logout sessions', async () => {
    const identity = await signupVerified();
    const existing = await localPrisma.session.findFirstOrThrow({ where: { userId: identity.user.id } });
    const olderCreation = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const beforeRefresh = new Date(Date.now() + 60 * 60 * 1000);
    await localPrisma.session.update({ where: { id: existing.id }, data: { createdAt: olderCreation, expiresAt: beforeRefresh } });
    expect((await request('/api/session', undefined, identity.cookie)).status).toBe(200);
    const refreshed = await localPrisma.session.findUniqueOrThrow({ where: { id: existing.id } });
    expect(refreshed.expiresAt.getTime()).toBeGreaterThan(beforeRefresh.getTime());
    expect(refreshed.expiresAt.getTime()).toBeLessThanOrEqual(olderCreation.getTime() + 7 * 24 * 60 * 60 * 1000);

    const requested = await request('/api/auth/request-password-reset', { email: identity.user.email, redirectTo: `${origin}/restablecer-contrasena` });
    expect(requested.status).toBe(200);
    const queued = await localPrisma.emailOutbox.findFirstOrThrow({ where: { recipient: identity.user.email, kind: 'reset_password' }, orderBy: { createdAt: 'desc' } });
    const payload = await decryptEmailPayload(secret, queued.encryptedBody);
    const resetUrl = new URL(payload.text.match(/https?:\/\/[^\s]+/)![0]);
    const token = resetUrl.pathname.split('/').at(-1)!;
    const nextPassword = 'Changed-Synthetic-Password-2026';
    expect((await request('/api/auth/reset-password', { token, newPassword: nextPassword })).status).toBe(200);
    expect((await request('/api/auth/reset-password', { token, newPassword: nextPassword })).status).toBe(400);
    expect((await request('/api/session', undefined, identity.cookie)).status).toBe(401);
    expect((await request('/api/auth/sign-in/email', { email: identity.user.email, password })).status).toBe(401);
    const login = await request('/api/auth/sign-in/email', { email: identity.user.email, password: nextPassword });
    expect(login.status).toBe(200);
    const cookie = login.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    expect((await request('/api/auth/sign-out', {}, cookie)).status).toBe(200);
    expect((await request('/api/session', undefined, cookie)).status).toBe(401);

    const anotherLogin = await request('/api/auth/sign-in/email', { email: identity.user.email, password: nextPassword });
    const anotherCookie = anotherLogin.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    const activeSession = await localPrisma.session.findFirstOrThrow({ where: { userId: identity.user.id } });
    await localPrisma.session.update({ where: { id: activeSession.id }, data: { createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), expiresAt: new Date(Date.now() + 60 * 60 * 1000) } });
    expect((await request('/api/session', undefined, anotherCookie)).status).toBe(401);
  });

  it('prepares Google OIDC with state and the canonical callback while rejecting missing state and external redirects', async () => {
    const google = createAuth(localPrisma, { secret, appBaseUrl: origin, production: false, googleClientId: 'synthetic-client.apps.googleusercontent.com', googleClientSecret: 'synthetic-client-secret' });
    const headers = { 'content-type': 'application/json', origin, 'cf-connecting-ip': '192.0.2.201' };
    const start = await google.handler(new Request(`${origin}/api/auth/sign-in/social`, { method: 'POST', headers, body: JSON.stringify({ provider: 'google', requestSignUp: true, callbackURL: `${origin}/` }) }));
    expect(start.status).toBe(200);
    const result = await start.json() as { url: string };
    const destination = new URL(result.url);
    expect(destination.hostname).toBe('accounts.google.com');
    expect(destination.searchParams.get('redirect_uri')).toBe(`${origin}/api/auth/callback/google`);
    expect(destination.searchParams.get('state')).toBeTruthy();
    expect(destination.searchParams.get('scope')?.split(' ')).toEqual(expect.arrayContaining(['openid', 'email', 'profile']));
    expect(start.headers.getSetCookie().join(';')).toContain('HttpOnly');
    const invalidCallback = await google.handler(new Request(`${origin}/api/auth/callback/google?code=synthetic-code`));
    expect(invalidCallback.status).toBe(302);
    expect(invalidCallback.headers.get('location')).toContain('error=');
    const external = await google.handler(new Request(`${origin}/api/auth/sign-in/social`, { method: 'POST', headers, body: JSON.stringify({ provider: 'google', callbackURL: 'https://outside.example/steal' }) }));
    expect(external.status).toBe(403);
    const disabled = await auth.handler(new Request(`${origin}/api/auth/sign-in/social`, { method: 'POST', headers, body: JSON.stringify({ provider: 'google', callbackURL: `${origin}/` }) }));
    expect(disabled.status).toBe(404);
  });

});
