import { describe, expect, it, vi } from 'vitest';
import { symmetricEncrypt } from 'better-auth/crypto';
import { createApp } from '../src/app';
import type { AuthPrincipal, AuthRuntime } from '../src/domains/auth/auth.context';
import { withAuthRuntime } from '../src/domains/auth/auth.context';
import type { PrismaClient } from '../src/generated/prisma/client';
import { localPrisma } from '../src/infrastructure/database/prisma';
import { createSqliteAtomicWrite } from '../src/infrastructure/database/runtime-client';
import { DEMO_ACCOUNT_EMAIL, ensureDemoAccount } from '../src/domains/auth/demo-password';
import { app as publicTestApp, registerPatient, uniqueName } from './helpers';

const secureApp = createApp();

function principal(role: AuthPrincipal['user']['role'], createdAt = new Date()): AuthPrincipal {
  const now = new Date();
  return {
    clinicId: role === 'pending' ? null : 'legacy-clinic',
    clinic: role === 'pending' ? null : { id: 'legacy-clinic', name: 'Consultorio de prueba', timezone: 'America/Mexico_City' },
    membership: role === 'pending' || role === 'demo' ? null : { id: 'membership-fixture', clinicId: 'legacy-clinic', role, isAdmin: role === 'doctor' },
    session: { id: 'session-fixture', userId: 'user-fixture', createdAt, expiresAt: new Date(now.getTime() + 60_000), demoView: 'doctor' },
    user: {
      id: 'user-fixture',
      name: 'Fictional test user',
      email: 'fictional@example.test',
      emailVerified: true,
      role,
      disabledAt: null,
    },
  };
}

function runtime(currentPrincipal: AuthPrincipal | null, database: unknown = {}) {
  const value: AuthRuntime = {
    auth: { handler: async () => new Response(null, { status: 404 }), api: { getSession: async () => null } },
    database: database as PrismaClient,
    atomicWrite: async () => undefined,
    secret: 'test-only-secret-'.repeat(4),
    appBaseUrl: 'http://127.0.0.1:3000',
    googleEnabled: false,
    localRuntime: true,
    principal: currentPrincipal,
  };
  return value;
}

function request(path: string, init?: RequestInit, currentPrincipal: AuthPrincipal | null = null, database?: unknown) {
  return withAuthRuntime(runtime(currentPrincipal, database), () => secureApp.request(path, init));
}

describe('authentication and route authorization', () => {
  it('rejects anonymous domain access and exposes only the safe auth options', async () => {
    expect((await request('/api/patients')).status).toBe(401);
    expect((await request('/api/session')).status).toBe(401);
    const options = await request('/api/options');
    expect(options.status).toBe(200);
    expect(await options.json()).toEqual({ googleEnabled: false, localEmailCapture: true });
    expect(options.headers.get('cache-control')).toBe('no-store');
  });

  it('keeps secretary access on administrative patient routes and blocks clinical records', async () => {
    const patient = await registerPatient(uniqueName());
    expect((await request(`/api/patients/${patient.id}`, undefined, principal('secretary'))).status).toBe(403);
    const response = await request(`/api/patients/${patient.id}/administrative`, undefined, principal('secretary'));
    expect(response.status).toBe(200);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toHaveProperty('email');
    expect(body).not.toHaveProperty('medicalConditions');
  });

  it('allows secretary appointment cancellation while keeping physician-only transitions forbidden', async () => {
    const patient = await registerPatient(uniqueName());
    const created = await publicTestApp.request(`/api/patients/${patient.id}/appointments`, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ startAt: '2026-11-16T15:00:00Z', durationMinutes: 30, type: 'consulta' }),
    });
    expect(created.status).toBe(201);
    const appointment = await created.json() as { id: string };
    const init = { method: 'POST', headers: { origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' }, body: '{}' };
    expect((await request(`/api/appointments/${appointment.id}/complete`, init, principal('secretary'))).status).toBe(403);
    expect((await request(`/api/appointments/${appointment.id}/reception`, { ...init, body: JSON.stringify({ action: 'start' }) }, principal('secretary'))).status).toBe(403);
    const cancelled = await request(`/api/appointments/${appointment.id}/cancel`, init, principal('secretary'));
    expect(cancelled.status).toBe(200);
    expect(await cancelled.json()).toMatchObject({ status: 'cancelled' });
  });

  it('allows only demo sessions to change the per-session view', async () => {
    const update = vi.fn(async () => ({}));
    const database = { session: { update } };
    const init: RequestInit = {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', origin: 'http://127.0.0.1:3000' },
      body: JSON.stringify({ view: 'secretary' }),
    };
    expect((await request('/api/demo/view', init, principal('secretary'), database)).status).toBe(403);
    const response = await request('/api/demo/view', init, principal('demo'), database);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ view: 'secretary' });
    expect(update).toHaveBeenCalledWith({ where: { id: 'session-fixture' }, data: { demoView: 'secretary' } });
  });

  it('provisions the shared demo identity idempotently without changing its role', async () => {
    const secret = 'demo-provisioning-test-secret-'.repeat(3);
    const atomicWrite = createSqliteAtomicWrite(localPrisma);

    await ensureDemoAccount(localPrisma, atomicWrite, secret);
    const first = await localPrisma.user.findUnique({ where: { email: DEMO_ACCOUNT_EMAIL } });
    await ensureDemoAccount(localPrisma, atomicWrite, secret);
    const second = await localPrisma.user.findUnique({ where: { email: DEMO_ACCOUNT_EMAIL } });
    const credentials = first ? await localPrisma.account.count({ where: { userId: first.id, providerId: 'credential' } }) : 0;

    expect(first?.role).toBe('demo');
    expect(second?.id).toBe(first?.id);
    expect(credentials).toBe(1);
  });

  it('rejects cross-origin demo session creation and exposes captured messages only in local mode', async () => {
    const foreign = await request('/api/demo/session', {
      method: 'POST',
      headers: { origin: 'https://outside.example' },
      body: '{}',
    });
    expect(foreign.status).toBe(403);

    const encryptedBody = await symmetricEncrypt({
      key: runtime(null).secret,
      data: JSON.stringify({ text: 'https://127.0.0.1/aceptar-invitacion?token=synthetic', html: '<p>synthetic</p>' }),
    });
    const local = await request('/api/dev/emails', undefined, null, {
      emailOutbox: { findMany: async () => [{
        id: 'captured-message',
        kind: 'invitation',
        recipient: 'secretary@example.test',
        subject: 'Invitación',
        encryptedBody,
        status: 'captured',
        createdAt: new Date('2026-11-11T12:00:00.000Z'),
      }] },
    });
    expect(local.status).toBe(200);
    expect(await local.json()).toEqual({ messages: [{
      id: 'captured-message',
      kind: 'invitation',
      recipient: 'secretary@example.test',
      subject: 'Invitación',
      status: 'captured',
      createdAt: '2026-11-11T12:00:00.000Z',
      text: 'https://127.0.0.1/aceptar-invitacion?token=synthetic',
      html: '<p>synthetic</p>',
    }] });
    expect(local.headers.get('cache-control')).toBe('no-store');

    const productionRuntime = runtime(null);
    productionRuntime.localRuntime = false;
    const production = await withAuthRuntime(productionRuntime, () => secureApp.request('/api/dev/emails'));
    expect(production.status).toBe(401);
  });

  it('rejects cross-origin and originless unsafe authentication requests', async () => {
    const crossOrigin = await request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { origin: 'https://outside.example', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@example.test', password: 'synthetic password' }),
    });
    expect(crossOrigin.status).toBe(403);

    const noOrigin = await request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'doctor@example.test', password: 'synthetic password' }),
    });
    expect(noOrigin.status).toBe(403);
  });

  it('does not trust loopback or request-host origins in a deployed runtime', async () => {
    const production = runtime(null);
    production.localRuntime = false;
    production.appBaseUrl = 'https://clinic.example.test';
    for (const origin of ['http://127.0.0.1:3000', 'http://localhost:3000', 'https://untrusted.example.test']) {
      const response = await withAuthRuntime(production, () => secureApp.request('https://untrusted.example.test/api/auth/sign-in/email', {
        method: 'POST', headers: { origin, 'content-type': 'application/json' }, body: '{}',
      }));
      expect(response.status).toBe(403);
    }
    const permitted = await withAuthRuntime(production, () => secureApp.request('https://untrusted.example.test/api/auth/sign-in/email', {
      method: 'POST', headers: { origin: production.appBaseUrl, 'content-type': 'application/json' }, body: '{}',
    }));
    expect(permitted.status).toBe(404); // Reaches the fixture auth handler.
  });

  it('requires a recent doctor session to mutate access', async () => {
    const staleDoctor = principal('doctor', new Date(Date.now() - 11 * 60 * 1000));
    const response = await request('/api/access/invitations', {
      method: 'POST',
      headers: { origin: 'http://127.0.0.1:3000', 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'secretary@example.test' }),
    }, staleDoctor);
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: {
      code: 'FORBIDDEN',
      message: 'Vuelve a iniciar sesión para administrar accesos.',
    } });
  });

  it('keeps domain integration helpers explicitly isolated from authentication', async () => {
    const patient = await registerPatient(uniqueName());
    expect((await publicTestApp.request(`/api/patients/${patient.id}`)).status).toBe(200);
  });
});

