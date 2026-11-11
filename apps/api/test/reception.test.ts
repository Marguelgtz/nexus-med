import { describe, expect, it } from 'vitest';
import { app, registerPatient, uniqueName } from './helpers';

const headers = { 'content-type': 'application/json' };
async function appointment() {
  const patient = await registerPatient(uniqueName('Recepción'));
  const res = await app.request(`/api/patients/${patient.id}/appointments`, {
    method: 'POST', headers, body: JSON.stringify({ startAt: '2026-11-10T16:00:00Z', durationMinutes: 30, type: 'consulta' }),
  });
  return { patient, appointment: await res.json() as { id: string } };
}
const reception = (id: string, action: string) => app.request(`/api/appointments/${id}/reception`, {
  method: 'POST', headers, body: JSON.stringify({ action }),
});

describe('Administrative reception', () => {
  it('persists arrival and attention separately from completion, and rejects repeated transitions', async () => {
    const { appointment: a } = await appointment();
    expect((await reception(a.id, 'start')).status).toBe(409);
    const arrived = await reception(a.id, 'arrive');
    expect(arrived.status).toBe(200);
    const body = await arrived.json() as Record<string, unknown>;
    expect(body.arrivedAt).toBeTruthy();
    expect(body.attentionStartedAt).toBeNull();
    expect(body.status).toBe('scheduled');
    expect(body.linkedEncounterId).toBeNull();
    expect((await reception(a.id, 'arrive')).status).toBe(409);
    expect((await reception(a.id, 'start')).status).toBe(200);
    expect((await reception(a.id, 'undoArrival')).status).toBe(409);
    const saved = await app.request(`/api/appointments/${a.id}`);
    expect((await saved.json() as Record<string, unknown>).attentionStartedAt).toBeTruthy();
  });
  it('allows correction before attention and clears queue markers on reschedule', async () => {
    const { appointment: a } = await appointment();
    await reception(a.id, 'arrive');
    expect((await reception(a.id, 'undoArrival')).status).toBe(200);
    await reception(a.id, 'arrive');
    const res = await app.request(`/api/appointments/${a.id}`, { method: 'PATCH', headers, body: JSON.stringify({ startAt: '2026-11-11T16:00:00Z' }) });
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ arrivedAt: null, attentionStartedAt: null });
  });
  it('has one winner for concurrent arrivals and rejects cancelled appointments', async () => {
    const { appointment: a } = await appointment();
    const results = await Promise.all([reception(a.id, 'arrive'), reception(a.id, 'arrive')]);
    expect(results.map(r => r.status).sort()).toEqual([200, 409]);
    await app.request(`/api/appointments/${a.id}/cancel`, { method: 'POST' });
    expect((await reception(a.id, 'start')).status).toBe(409);
    expect((await reception(a.id, 'invented')).status).toBe(400);
    expect((await reception('missing', 'arrive')).status).toBe(404);
  });
  it('administrative reads and edits exclude clinical data', async () => {
    const { patient } = await appointment();
    const res = await app.request(`/api/patients/${patient.id}/administrative`);
    const body = await res.json();
    expect(body).toHaveProperty('phone');
    expect(body).not.toHaveProperty('allergies');
    expect(body).not.toHaveProperty('medicalConditions');
    const created = await app.request('/api/administrative/patients', { method: 'POST', headers, body: JSON.stringify({ fullName: uniqueName('Admin') }) });
    expect(created.status).toBe(201);
    expect(await created.json()).not.toHaveProperty('allergies');
    const saved = await app.request(`/api/patients/${patient.id}/administrative`, { method: 'PATCH', headers, body: JSON.stringify({ phone: '5551234567' }) });
    expect(await saved.json()).toMatchObject({ phone: '5551234567' });
    const listed = await app.request('/api/administrative/patients?status=all');
    const rows = await listed.json() as Record<string, unknown>[];
    expect(rows.find(row => row.id === patient.id)).toMatchObject({ phone: '5551234567', email: null });
    expect(rows.find(row => row.id === patient.id)).not.toHaveProperty('allergies');
    const rejected = await app.request(`/api/patients/${patient.id}/administrative`, { method: 'PATCH', headers, body: JSON.stringify({ allergies: 'not allowed' }) });
    expect(rejected.status).toBe(400);
  });
});
