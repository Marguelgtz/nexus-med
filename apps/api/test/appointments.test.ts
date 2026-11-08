// Appointment API integration tests — real Hono app, real SQLite test DB.

import { beforeEach, describe, expect, it } from 'vitest';

import { app, registerPatient, uniqueName } from './helpers';

const json = { 'content-type': 'application/json' } as const;

let patientId: string;
let otherId: string;

beforeEach(async () => {
  const patient = await registerPatient(uniqueName());
  patientId = patient.id as string;
  const other = await registerPatient(uniqueName('Otro'));
  otherId = other.id as string;
});

async function makeAppointment(
  startAt: string,
  extra: Record<string, unknown> = {},
): Promise<any> {
  const res = await app.request(`/api/patients/${patientId}/appointments`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({
      startAt,
      durationMinutes: 30,
      type: 'consulta',
      ...extra,
    }),
  });
  if (res.status !== 201) throw new Error(`makeAppointment failed: ${res.status}`);
  return res.json();
}

async function makeEncounter(id: string, occurredAt = '2026-11-01T10:30:00-06:00'): Promise<any> {
  const res = await app.request(`/api/patients/${id}/encounters`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ occurredAt }),
  });
  if (res.status !== 201) throw new Error(`makeEncounter failed: ${res.status}`);
  return res.json();
}

describe('POST /patients/:patientId/appointments', () => {
  it('creates a scheduled appointment with the patient embedded', async () => {
    const res = await app.request(`/api/patients/${patientId}/appointments`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        startAt: '2026-11-02T10:00:00-06:00',
        durationMinutes: 30,
        type: 'consulta',
      }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.status).toBe('scheduled');
    expect(body.patient).toMatchObject({ id: patientId });
    expect(new Date(body.startAt).getTime()).toBe(Date.parse('2026-11-02T10:00:00.000-06:00'));
    expect(body.actualDurationMinutes).toBeNull();
    expect(body.linkedEncounterId).toBeNull();
  });

  it('rejects appointments for an unknown patient with 404', async () => {
    const res = await app.request('/api/patients/nope/appointments', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        startAt: '2026-11-02T10:00:00-06:00',
        durationMinutes: 30,
        type: 'consulta',
      }),
    });
    expect(res.status).toBe(404);
  });

  it('validates duration bounds, type, startAt and unknown fields', async () => {
    const cases: Record<string, unknown>[] = [
      { startAt: '2026-11-02T10:00:00-06:00', durationMinutes: 4, type: 'consulta' },
      { startAt: '2026-11-02T10:00:00-06:00', durationMinutes: 481, type: 'consulta' },
      { startAt: '2026-11-02T10:00:00-06:00', durationMinutes: 30, type: 'operacion' },
      { durationMinutes: 30, type: 'consulta' },
      {
        startAt: '2026-11-02T10:00:00-06:00',
        durationMinutes: 30,
        type: 'consulta',
        extra: 'no',
      },
    ];
    for (const body of cases) {
      const res = await app.request(`/api/patients/${patientId}/appointments`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify(body),
      });
      expect(res.status).toBe(400);
      const envelope: any = await res.json();
      expect(envelope.error.code).toBe('VALIDATION_ERROR');
    }
  });

  it('accepts overlapping appointments (doctor decides, API never blocks)', async () => {
    await makeAppointment('2026-11-02T10:00:00-06:00');
    const res = await app.request(`/api/patients/${otherId}/appointments`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        startAt: '2026-11-02T10:15:00-06:00',
        durationMinutes: 30,
        type: 'urgencia',
      }),
    });
    expect(res.status).toBe(201);
  });
});

describe('GET /appointments?from=&to=', () => {
  it('lists only appointments inside [from, to) in start-time order', async () => {
    const a1 = await makeAppointment('2026-11-02T09:00:00-06:00');
    const a2 = await makeAppointment('2026-11-02T11:30:00-06:00');
    const outside = await makeAppointment('2026-11-09T09:00:00-06:00'); // outside the week
    const otherAppt = await app.request(`/api/patients/${otherId}/appointments`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        startAt: '2026-11-02T10:00:00-06:00',
        durationMinutes: 15,
        type: 'visita_domicilio',
      }),
    });
    expect(otherAppt.status).toBe(201);
    const otherBody = (await otherAppt.json()) as any;

    const res = await app.request(
      '/api/appointments?from=2026-11-02T00:00:00-06:00&to=2026-11-09T00:00:00-06:00',
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    // Other tests in this file share the test database, so assert on OUR
    // rows: present, in start-time order, in-range — and never the
    // out-of-range one.
    const ids = new Set(body.map((a) => a.id));
    expect(ids.has(a1.id)).toBe(true);
    expect(ids.has(a2.id)).toBe(true);
    expect(ids.has(outside.id)).toBe(false);
    const order = [a1.id, a2.id, otherBody.id].filter((id) => ids.has(id));
    expect(body.map((a) => a.id)).toEqual(expect.arrayContaining(order));
    // Globally sorted by start time.
    const times = body.map((a) => new Date(a.startAt).getTime());
    expect([...times].sort((x, y) => x - y)).toEqual(times);
    // Everything returned is inside [from, to).
    const from = Date.parse('2026-11-02T00:00:00.000-06:00');
    const to = Date.parse('2026-11-09T00:00:00.000-06:00');
    for (const t of times) expect(t).toBeGreaterThanOrEqual(from);
    for (const t of times) expect(t).toBeLessThan(to);
  });

  it('requires both bounds, from < to', async () => {
    for (const qs of ['?from=2026-11-02T00:00:00-06:00', '?to=2026-11-02T00:00:00-06:00', '', '?from=2026-11-09T00:00:00-06:00&to=2026-11-02T00:00:00-06:00', '?from=notadate&to=2026-11-09T00:00:00-06:00']) {
      const res = await app.request(`/api/appointments${qs}`);
      expect(res.status).toBe(400);
    }
  });
});

describe('GET /patients/:patientId/appointments', () => {
  it('lists only that patient newest first', async () => {
    await makeAppointment('2026-01-05T09:00:00-06:00');
    await makeAppointment('2026-10-20T09:00:00-06:00');
    await app.request(`/api/patients/${otherId}/appointments`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        startAt: '2026-06-01T09:00:00-06:00',
        durationMinutes: 30,
        type: 'consulta',
      }),
    });

    const res = await app.request(`/api/patients/${patientId}/appointments`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(body.length).toBe(2);
    expect(new Date(body[0].startAt).getTime()).toBe(Date.parse('2026-10-20T09:00:00.000-06:00'));
  });

  it('returns 404 for an unknown patient', async () => {
    const res = await app.request('/api/patients/missing/appointments');
    expect(res.status).toBe(404);
  });
});

describe('GET /appointments/:appointmentId', () => {
  it('returns the appointment; 404 for an unknown id', async () => {
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    const res = await app.request(`/api/appointments/${created.id}`);
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).id).toBe(created.id);

    const missing = await app.request('/api/appointments/missing');
    expect(missing.status).toBe(404);
  });
});

describe('PATCH /appointments/:appointmentId', () => {
  it('reschedules a scheduled appointment', async () => {
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ startAt: '2026-11-03T15:00:00-06:00', type: 'procedimiento' }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(new Date(body.startAt).getTime()).toBe(Date.parse('2026-11-03T15:00:00.000-06:00'));
    expect(body.type).toBe('procedimiento');
    expect(body.status).toBe('scheduled');
  });

  it('re-activates a cancelled appointment as scheduled (Reprogramar)', async () => {
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    const cancelled = await app.request(`/api/appointments/${created.id}/cancel`, {
      method: 'POST',
    });
    expect((await cancelled.json()) as any).toMatchObject({ status: 'cancelled' });

    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ startAt: '2026-11-04T08:30:00-06:00' }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as any).toMatchObject({ status: 'scheduled' });
  });

  it('rejects edits to a completed appointment with 409', async () => {
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    await app.request(`/api/appointments/${created.id}/complete`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({}),
    });
    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ durationMinutes: 45 }),
    });
    expect(res.status).toBe(409);
  });

  it('rejects an empty update body', async () => {
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    const res = await app.request(`/api/appointments/${created.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /appointments/:appointmentId/complete', () => {
  it('completes with an actual duration and an encounter link', async () => {
    const encounter = await makeEncounter(patientId);
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    const res = await app.request(`/api/appointments/${created.id}/complete`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ actualDurationMinutes: 25, encounterId: encounter.id }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('completed');
    expect(body.actualDurationMinutes).toBe(25);
    expect(body.linkedEncounterId).toBe(encounter.id);
    expect(body.completedAt).toBeTruthy();
  });

  it('completes as-is (both fields optional)', async () => {
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    const res = await app.request(`/api/appointments/${created.id}/complete`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as any).toMatchObject({
      status: 'completed',
      actualDurationMinutes: null,
      linkedEncounterId: null,
    });
  });

  it('rejects an encounter belonging to another patient with 400 + fieldErrors', async () => {
    const foreignEncounter = await makeEncounter(otherId);
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    const res = await app.request(`/api/appointments/${created.id}/complete`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ encounterId: foreignEncounter.id }),
    });
    expect(res.status).toBe(400);
    expect(((await res.json()) as any).error.fieldErrors.encounterId).toBeDefined();
  });

  it('rejects an unknown encounter with 404', async () => {
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    const res = await app.request(`/api/appointments/${created.id}/complete`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ encounterId: 'missing' }),
    });
    expect(res.status).toBe(404);
  });

  it('rejects completing a completed or cancelled appointment with 409', async () => {
    const a = await makeAppointment('2026-11-02T09:00:00-06:00');
    await app.request(`/api/appointments/${a.id}/complete`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({}),
    });
    expect(
      (await app.request(`/api/appointments/${a.id}/complete`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({}),
      })).status,
    ).toBe(409);

    const b = await makeAppointment('2026-11-03T09:00:00-06:00');
    await app.request(`/api/appointments/${b.id}/cancel`, { method: 'POST' });
    expect(
      (await app.request(`/api/appointments/${b.id}/complete`, {
        method: 'POST',
        headers: json,
        body: JSON.stringify({}),
      })).status,
    ).toBe(409);
  });
});

describe('POST /appointments/:appointmentId/cancel', () => {
  it('cancels a scheduled appointment and keeps the record', async () => {
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    const res = await app.request(`/api/appointments/${created.id}/cancel`, {
      method: 'POST',
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as any).toMatchObject({ status: 'cancelled' });

    const listed = (await (await app.request(`/api/patients/${patientId}/appointments`)).json()) as any[];
    expect(listed).toHaveLength(1);
    expect(listed[0].status).toBe('cancelled');
  });

  it('rejects cancelling a cancelled or completed appointment with 409', async () => {
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    await app.request(`/api/appointments/${created.id}/cancel`, { method: 'POST' });
    expect(
      (await app.request(`/api/appointments/${created.id}/cancel`, { method: 'POST' })).status,
    ).toBe(409);
  });
});

describe('POST /appointments/:appointmentId/link-encounter', () => {
  it('links an encounter to a completed appointment without a link', async () => {
    const encounter = await makeEncounter(patientId);
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    await app.request(`/api/appointments/${created.id}/complete`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({}),
    });
    const res = await app.request(`/api/appointments/${created.id}/link-encounter`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ encounterId: encounter.id }),
    });
    expect(res.status).toBe(200);
    expect((await res.json()) as any).toMatchObject({ linkedEncounterId: encounter.id });
  });

  it('rejects a second link with 409', async () => {
    const e1 = await makeEncounter(patientId, '2026-11-01T10:30:00-06:00');
    const e2 = await makeEncounter(patientId, '2026-11-01T11:00:00-06:00');
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    await app.request(`/api/appointments/${created.id}/link-encounter`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ encounterId: e1.id }),
    });
    const res = await app.request(`/api/appointments/${created.id}/link-encounter`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ encounterId: e2.id }),
    });
    expect(res.status).toBe(409);
  });

  it('rejects linking a cancelled appointment with 409', async () => {
    const encounter = await makeEncounter(patientId);
    const created = await makeAppointment('2026-11-02T09:00:00-06:00');
    await app.request(`/api/appointments/${created.id}/cancel`, { method: 'POST' });
    const res = await app.request(`/api/appointments/${created.id}/link-encounter`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ encounterId: encounter.id }),
    });
    expect(res.status).toBe(409);
  });
});
