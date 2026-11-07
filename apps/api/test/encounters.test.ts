// Encounter API integration tests — real Hono app, real SQLite test database.

import { beforeEach, describe, expect, it } from 'vitest';

import { app, registerPatient, uniqueName } from './helpers';

const json = { 'content-type': 'application/json' } as const;

let patientId: string;
let patientName: string;

beforeEach(async () => {
  patientName = uniqueName();
  const patient = await registerPatient(patientName);
  patientId = patient.id as string;
});

async function makeEncounter(occurredAt: string, reason?: string): Promise<any> {
  const res = await app.request(`/api/patients/${patientId}/encounters`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ occurredAt, ...(reason ? { reason } : {}) }),
  });
  if (res.status !== 201) throw new Error(`makeEncounter failed: ${res.status}`);
  return res.json();
}

describe('POST /patients/:patientId/encounters', () => {
  it('creates an encounter for an existing patient', async () => {
    const res = await app.request(`/api/patients/${patientId}/encounters`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        occurredAt: '2026-11-01T10:30:00-06:00',
        reason: 'Consulta de prueba',
        assessment: 'Valoración de prueba',
      }),
    });

    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.patientId).toBe(patientId);
    // Timestamps are normalized to ISO 8601 (UTC); compare instants, not
    // raw strings, so the assertion holds regardless of the API's offset.
    expect(new Date(body.occurredAt).getTime()).toBe(
      Date.parse('2026-11-01T10:30:00.000-06:00'),
    );
    expect(body.reason).toBe('Consulta de prueba');
    expect(body.id).toBeTruthy();
  });

  it('rejects encounters for an unknown patient with 404', async () => {
    const res = await app.request('/api/patients/nope/encounters', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ occurredAt: '2026-11-01T10:30:00-06:00' }),
    });

    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('requires occurredAt and a valid ISO date-time', async () => {
    const res = await app.request(`/api/patients/${patientId}/encounters`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ reason: 'sin fecha' }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors.occurredAt).toBeDefined();
  });

  it('rejects unknown fields', async () => {
    const res = await app.request(`/api/patients/${patientId}/encounters`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        occurredAt: '2026-11-01T10:30:00-06:00',
        diagnosis: 'campo inexistente',
      }),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors.diagnosis).toBeDefined();
  });
});

describe('GET /patients/:patientId/encounters', () => {
  it('returns the timeline newest first', async () => {
    const early = await makeEncounter('2026-01-05T09:00:00-06:00', 'primera');
    const late = await makeEncounter('2026-10-20T09:00:00-06:00', 'segunda');
    const middle = await makeEncounter('2026-06-15T09:00:00-06:00', 'tercera');

    const res = await app.request(`/api/patients/${patientId}/encounters`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(body.map((e) => e.id)).toEqual([late.id, middle.id, early.id]);
  });

  it('only lists encounters of that patient', async () => {
    const other = await registerPatient(uniqueName('Otro'));
    await makeEncounter('2026-01-05T09:00:00-06:00');

    const res = await app.request(`/api/patients/${other.id}/encounters`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 404 for an unknown patient', async () => {
    const res = await app.request('/api/patients/missing/encounters');
    expect(res.status).toBe(404);
  });
});

describe('GET /encounters/:encounterId', () => {
  it('returns the full note', async () => {
    const created = await makeEncounter('2026-01-05T09:00:00-06:00');
    const res = await app.request(`/api/encounters/${created.id}`);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.patientId).toBe(patientId);
    expect(body.historyOfPresentIllness).toBeNull();
  });

  it('returns 404 for an unknown id', async () => {
    const res = await app.request('/api/encounters/missing');
    expect(res.status).toBe(404);
    expect(((await res.json()) as any).error.code).toBe('NOT_FOUND');
  });
});

describe('PATCH /encounters/:encounterId', () => {
  it('updates note sections', async () => {
    const created = await makeEncounter('2026-01-05T09:00:00-06:00', 'motivo inicial');

    const res = await app.request(`/api/encounters/${created.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({
        reason: 'motivo corregido',
        plan: 'plan actualizado',
      }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.reason).toBe('motivo corregido');
    expect(body.plan).toBe('plan actualizado');
    expect(body.patientId).toBe(patientId);
  });

  it('rejects attempts to reassign the patient', async () => {
    const created = await makeEncounter('2026-01-05T09:00:00-06:00');
    const res = await app.request(`/api/encounters/${created.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ patientId: 'otro-paciente' }),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors.patientId).toBeDefined();
  });

  it('rejects an empty update body', async () => {
    const created = await makeEncounter('2026-01-05T09:00:00-06:00');
    const res = await app.request(`/api/encounters/${created.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
