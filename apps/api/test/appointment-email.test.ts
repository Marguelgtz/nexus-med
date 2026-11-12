import { describe, expect, it } from 'vitest';
import type { AuthPrincipal, AuthRuntime } from '../src/domains/auth/auth.context';
import { withAuthRuntime } from '../src/domains/auth/auth.context';
import { createSqliteAtomicWrite } from '../src/infrastructure/database/runtime-client';
import { localPrisma } from '../src/infrastructure/database/prisma';
import { app, uniqueName } from './helpers';

const secret = 'appointment-email-test-secret-'.repeat(3);

function principal(role: AuthPrincipal['user']['role']): AuthPrincipal {
  const now = new Date();
  return {
    session: { id: `session-${role}`, userId: `user-${role}`, createdAt: now, expiresAt: new Date(now.getTime() + 60_000), demoView: 'doctor' },
    user: {
      id: `user-${role}`,
      name: 'Synthetic test user',
      email: `${role}@example.test`,
      emailVerified: true,
      role,
      disabledAt: null,
    },
  };
}

function runtime(currentPrincipal: AuthPrincipal): AuthRuntime {
  return {
    auth: { handler: async () => new Response(null, { status: 404 }), api: { getSession: async () => null } },
    database: localPrisma,
    atomicWrite: createSqliteAtomicWrite(localPrisma),
    secret,
    appBaseUrl: 'http://127.0.0.1:3000',
    googleEnabled: false,
    localRuntime: true,
    principal: currentPrincipal,
  };
}

async function createAppointment(consent = true) {
  const patientResponse = await app.request('/api/patients', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fullName: uniqueName(),
      email: 'appointment-recipient@example.test',
      appointmentEmailConsent: consent,
    }),
  });
  expect(patientResponse.status).toBe(201);
  const patient = await patientResponse.json() as { id: string };
  const appointmentResponse = await app.request(`/api/patients/${patient.id}/appointments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ startAt: '2026-12-10T10:00:00-06:00', durationMinutes: 30, type: 'consulta' }),
  });
  expect(appointmentResponse.status).toBe(201);
  const appointment = await appointmentResponse.json() as { id: string; status: string };
  return { patient, appointment };
}

async function requestAs(role: AuthPrincipal['user']['role'], path: string, init: RequestInit) {
  return withAuthRuntime(runtime(principal(role)), () => app.request(path, init));
}

describe('appointment email workflow', () => {
  it('captures a consented appointment message locally without exposing its recipient', async () => {
    const { appointment } = await createAppointment();
    const response = await requestAs('secretary', `/api/appointments/${appointment.id}/emails`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'confirmation' }),
    });

    expect(response.status).toBe(201);
    const body = await response.json() as Record<string, unknown>;
    expect(body).toMatchObject({ event: 'confirmation', status: 'captured' });
    expect(body).not.toHaveProperty('recipient');
    const [row] = await localPrisma.emailOutbox.findMany({
      where: { appointmentId: appointment.id },
      select: { appointmentEvent: true, status: true, subject: true },
    });
    expect(row).toMatchObject({ appointmentEvent: 'confirmation', status: 'captured', subject: 'Confirmación de cita en Nexus Med' });
  });

  it('refuses to send until the patient explicitly permits appointment email', async () => {
    const { appointment } = await createAppointment(false);
    const response = await requestAs('doctor', `/api/appointments/${appointment.id}/emails`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'confirmation' }),
    });

    expect(response.status).toBe(409);
    expect(await localPrisma.emailOutbox.count({ where: { appointmentId: appointment.id } })).toBe(0);
  });

  it('simulates email in the shared demo and never queues delivery', async () => {
    const { appointment } = await createAppointment();
    const response = await requestAs('demo', `/api/appointments/${appointment.id}/emails`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ event: 'confirmation' }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toMatchObject({ status: 'simulated' });
  });
});
