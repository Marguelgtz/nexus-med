import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { localPrisma as db } from '../src/infrastructure/database/prisma';
import { createSqliteAtomicWrite } from '../src/infrastructure/database/runtime-client';
import { resolvePrincipal, withAuthRuntime, type BetterAuthInstance } from '../src/domains/auth/auth.context';

const app = createApp();
const ids = { a: crypto.randomUUID(), b: crypto.randomUUID(), d1: crypto.randomUUID(), d2: crypto.randomUUID(), s1: crypto.randomUUID(), s2: crypto.randomUUID(), outsider: crypto.randomUUID() };
const secret = 'isolated-synthetic-clinic-test-secret-'.repeat(2);
const origin = 'http://127.0.0.1:3000';

async function as(userId: string, path: string, method = 'GET', body?: unknown) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const session = { id: `session-${userId}`, userId, createdAt: new Date(), expiresAt: new Date(Date.now() + 60_000), demoView: 'doctor' };
  const auth: BetterAuthInstance = { handler: async () => new Response(null), api: { getSession: async () => ({ user, session }) } };
  const principal = await resolvePrincipal(auth, new Headers(), db);
  return withAuthRuntime({ auth, database: db, atomicWrite: createSqliteAtomicWrite(db), secret, appBaseUrl: origin, googleEnabled: false, localRuntime: true, principal }, () => app.request(path, {
    method, headers: { origin, 'content-type': 'application/json' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}

async function createPatient(userId = ids.d1) {
  const response = await as(userId, '/api/patients', 'POST', { fullName: 'Paciente sintético aislamiento' });
  expect(response.status).toBe(201);
  return await response.json() as { id: string; version: number };
}

beforeAll(async () => {
  for (const id of [ids.a, ids.b]) await db.clinic.create({ data: { id, name: 'Clínica sintética' } });
  for (const [id, clinicId, role] of [[ids.d1, ids.a, 'doctor'], [ids.d2, ids.a, 'doctor'], [ids.s1, ids.a, 'secretary'], [ids.s2, ids.a, 'secretary'], [ids.outsider, ids.b, 'doctor']] as const) {
    await db.user.create({ data: { id, name: `Profesional sintético ${id.slice(0, 4)}`, email: `${id}@example.test`, emailVerified: true } });
    await db.clinicMembership.create({ data: { clinicId, userId: id, role, isAdmin: id === ids.d1 } });
  }
});

describe('clinic-scoped patient journey and adversarial access', () => {
  it('shares same-clinic patients with both doctors and secretaries, denies cross-clinic detail/list/mutations', async () => {
    const patient = await createPatient();
    expect((await as(ids.d2, `/api/patients/${patient.id}`)).status).toBe(200);
    for (const secretary of [ids.s1, ids.s2]) {
      expect((await as(secretary, `/api/patients/${patient.id}/administrative`)).status).toBe(200);
      expect((await as(secretary, `/api/patients/${patient.id}`)).status).toBe(403);
    }
    for (const path of [`/api/patients/${patient.id}`, `/api/patients/${patient.id}/administrative`, `/api/patients/${patient.id}/encounters`, `/api/patients/${patient.id}/appointments`, `/api/patients/${patient.id}/studies`, `/api/patients/${patient.id}/documents`, `/api/patients/${patient.id}/study-receipt-options`]) {
      expect((await as(ids.outsider, path)).status, path).toBe(404);
    }
    const others = await (await as(ids.outsider, '/api/patients?status=all')).json() as Array<{ id: string }>;
    expect(others.some(item => item.id === patient.id)).toBe(false);
    expect((await as(ids.outsider, `/api/patients/${patient.id}`, 'PATCH', { fullName: 'No debe guardarse', expectedVersion: patient.version })).status).toBe(404);
    expect((await as(ids.outsider, `/api/patients/${patient.id}/archive`, 'PATCH', {})).status).toBe(404);
  });

  it('keeps encounter author across another doctor edit, rejects a stale draft and foreign references', async () => {
    const patient = await createPatient();
    const created = await as(ids.d1, `/api/patients/${patient.id}/encounters`, 'POST', { occurredAt: '2026-11-13T15:00:00Z', reason: 'Consulta sintética', studies: [{ category: 'laboratorio', name: 'Solicitud sintética' }] });
    expect(created.status).toBe(201);
    const encounter = await created.json() as { id: string; version: number; author: { id: string } };
    expect(encounter.author.id).toBe(ids.d1);
    const edited = await as(ids.d2, `/api/encounters/${encounter.id}`, 'PATCH', { expectedVersion: encounter.version, assessment: 'Texto sintético explícito' });
    expect(edited.status).toBe(200);
    expect((await edited.json() as { author: { id: string } }).author.id).toBe(ids.d1);
    expect((await as(ids.d1, `/api/encounters/${encounter.id}`, 'PATCH', { expectedVersion: encounter.version, assessment: 'Borrador obsoleto' })).status).toBe(409);
    expect((await as(ids.d2, `/api/encounters/${encounter.id}`, 'PATCH', { assessment: 'Sin versión' })).status).toBe(400);
    expect((await as(ids.outsider, `/api/encounters/${encounter.id}`)).status).toBe(404);
    const outsiderPatient = await createPatient(ids.outsider);
    expect((await as(ids.outsider, `/api/patients/${outsiderPatient.id}/studies`, 'POST', { encounterId: encounter.id, studies: [{ category: 'otro', name: 'Referencia inválida' }] })).status).toBe(404);
    const studies = await (await as(ids.d2, `/api/patients/${patient.id}/studies`)).json() as Array<{ id: string }>;
    expect((await as(ids.outsider, `/api/studies/${studies[0]!.id}`, 'PATCH', { status: 'reviewed' })).status).toBe(404);
  });

  it('assigns separate doctor schedules and rejects cross-clinic assignment and unauthorized doctor mutation', async () => {
    const patient = await createPatient();
    const appts = [];
    for (const doctorId of [ids.d1, ids.d2]) {
      const response = await as(ids.s1, `/api/patients/${patient.id}/appointments`, 'POST', { startAt: '2026-11-13T17:00:00Z', durationMinutes: 30, type: 'consulta', doctorId });
      expect(response.status).toBe(201);
      appts.push(await response.json() as { id: string; doctor: { id: string }; version: number });
    }
    const range = await (await as(ids.d1, `/api/appointments?from=2026-11-13T00:00:00Z&to=2026-11-14T00:00:00Z&doctorId=${ids.d2}`)).json() as Array<{ doctor: { id: string } }>;
    expect(range.length).toBeGreaterThan(0);
    expect(range.every(item => item.doctor.id === ids.d2)).toBe(true);
    expect((await as(ids.d2, `/api/appointments/${appts[0]!.id}/cancel`, 'POST')).status).toBe(403);
    expect((await as(ids.outsider, `/api/appointments/${appts[0]!.id}`)).status).toBe(404);
    expect((await as(ids.s2, `/api/appointments/${appts[0]!.id}`, 'PATCH', { doctorId: ids.d2, expectedVersion: appts[0]!.version })).status).toBe(200);
    expect((await as(ids.s1, `/api/appointments/${appts[0]!.id}`, 'PATCH', { doctorId: ids.d1, expectedVersion: appts[0]!.version })).status).toBe(409);
    expect((await as(ids.s1, `/api/patients/${patient.id}/appointments`, 'POST', { startAt: '2026-11-13T18:00:00Z', durationMinutes: 30, type: 'consulta', doctorId: ids.outsider })).status).toBe(400);
  });

  it('does not disclose another clinic’s appointment email status on retry', async () => {
    const patient = await createPatient();
    const response = await as(ids.s1, `/api/patients/${patient.id}/appointments`, 'POST', { startAt: '2026-11-13T17:00:00Z', durationMinutes: 30, type: 'consulta', doctorId: ids.d1 });
    expect(response.status).toBe(201);
    const appointment = await response.json() as { id: string };
    const email = await db.emailOutbox.create({ data: {
      appointmentId: appointment.id, appointmentEvent: 'confirmation', kind: 'appointment',
      recipient: 'synthetic@example.test', subject: 'Synthetic', encryptedBody: 'synthetic',
      idempotencyKey: crypto.randomUUID(), status: 'captured',
    } });
    const path = `/api/appointments/${appointment.id}/emails/${email.id}/retry`;
    expect((await as(ids.s1, path, 'POST', {})).status).toBe(409);
    expect((await as(ids.outsider, path, 'POST', {})).status).toBe(404);
    expect((await as(ids.outsider, `/api/appointments/${appointment.id}/emails/${crypto.randomUUID()}/retry`, 'POST', {})).status).toBe(404);
    expect((await db.emailOutbox.findUniqueOrThrow({ where: { id: email.id } })).status).toBe('captured');
  });

  it('preserves prescription author and atomic lines on stale concurrent replacement', async () => {
    const patient = await createPatient();
    const input = { kind: 'prescription', lines: [{ medication: 'Medicamento sintético A' }] };
    const response = await as(ids.d1, `/api/patients/${patient.id}/documents`, 'POST', input);
    expect(response.status).toBe(201);
    const document = await response.json() as { id: string; version: number; author: { id: string } };
    expect(document.author.id).toBe(ids.d1);
    const attempts = await Promise.all([ids.d1, ids.d2].map(user => as(user, `/api/documents/${document.id}`, 'PATCH', { ...input, expectedVersion: document.version, lines: [{ medication: `Edición sintética ${user}` }] })));
    expect(attempts.map(item => item.status).sort()).toEqual([200, 409]);
    const saved = await (await as(ids.d2, `/api/documents/${document.id}`)).json() as { author: { id: string }; lines: unknown[]; version: number };
    expect(saved.author.id).toBe(ids.d1);
    expect(saved.lines).toHaveLength(1);
    expect(saved.version).toBe(document.version + 1);
    expect((await as(ids.outsider, `/api/documents/${document.id}`)).status).toBe(404);
    expect(await db.atomicWriteGuard.count()).toBe(0);
  });

  it('protects receipt metadata and attachment download and preserves explicit clinical review', async () => {
    const patient = await createPatient();
    const receiptId = crypto.randomUUID(); const fileId = crypto.randomUUID();
    await db.studyReceipt.create({ data: { id: receiptId, clinicId: ids.a, patientId: patient.id, title: 'Adjunto sintético', files: { create: { id: fileId, storageKey: crypto.randomUUID(), name: 'sintetico.pdf', mimeType: 'application/pdf', size: 10 } } } });
    expect((await as(ids.outsider, `/api/study-receipt-files/${fileId}`)).status).toBe(404);
    const foreign = await (await as(ids.outsider, '/api/study-receipts')).json() as unknown[];
    expect(foreign).toEqual([]);
    const administrative = await (await as(ids.s2, '/api/study-receipts')).json() as Array<Record<string, unknown>>;
    expect(administrative.find(item => item.id === receiptId)?.reviewedAt).toBeNull();
    expect(administrative.find(item => item.id === receiptId)).not.toHaveProperty('reviewNote');
    expect((await as(ids.s1, `/api/study-receipts/${receiptId}/review`, 'POST', {})).status).toBe(403);
    expect((await as(ids.d2, `/api/study-receipts/${receiptId}/review`, 'POST', { reviewNote: 'Revisión explícita sintética' })).status).toBe(200);
    expect((await db.studyReceipt.findUniqueOrThrow({ where: { id: receiptId } })).reviewedById).toBe(ids.d2);
  });

  it('detects concurrent patient edits and rejects direct database association injection', async () => {
    const patient = await createPatient();
    const attempts = await Promise.all([ids.d1, ids.d2].map(user => as(user, `/api/patients/${patient.id}`, 'PATCH', { fullName: 'Edición sintética', expectedVersion: patient.version })));
    expect(attempts.map(item => item.status).sort()).toEqual([200, 409]);
    await expect(db.encounter.create({ data: { clinicId: ids.b, patientId: patient.id, occurredAt: new Date() } })).rejects.toThrow();
    expect(await db.encounter.count({ where: { patientId: patient.id } })).toBe(0);
  });
});
