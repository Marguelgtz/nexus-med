// Patient API integration tests — real Hono app, real SQLite test database.

import { beforeEach, describe, expect, it } from 'vitest';

import { app, registerPatient, uniqueName } from './helpers';

const json = { 'content-type': 'application/json' } as const;

let name: string;

beforeEach(() => {
  name = uniqueName();
});

describe('POST /api/patients', () => {
  it('creates a patient from a full name only', async () => {
    const res = await app.request('/api/patients', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ fullName: name }),
    });

    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.fullName).toBe(name);
    expect(body.isArchived).toBe(false);
    expect(body.id).toBeTruthy();
    expect(body.createdAt).toBeTruthy();
    expect(body.dateOfBirth).toBeNull();
  });

  it('rejects a missing full name with a field error', async () => {
    const res = await app.request('/api/patients', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ phone: '555' }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fieldErrors.fullName).toBeDefined();
  });

  it('rejects unknown fields', async () => {
    const res = await app.request('/api/patients', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ fullName: name, diagnosis: 'nope' }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.code).toBe('VALIDATION_ERROR');
    expect(body.error.fieldErrors.diagnosis).toBeDefined();
  });

  it('rejects a malformed date of birth', async () => {
    const res = await app.request('/api/patients', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ fullName: name, dateOfBirth: '12/04/1982' }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors.dateOfBirth).toBeDefined();
  });

  it('rejects a calendar-invalid date of birth (2025-02-30)', async () => {
    const res = await app.request('/api/patients', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ fullName: name, dateOfBirth: '2025-02-30' }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors.dateOfBirth).toBeDefined();
  });

  it('rejects a leap day in a non-leap year (2023-02-29)', async () => {
    const res = await app.request('/api/patients', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ fullName: name, dateOfBirth: '2023-02-29' }),
    });

    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors.dateOfBirth).toBeDefined();
  });

  it('accepts a leap day in a leap year (2024-02-29)', async () => {
    const res = await app.request('/api/patients', {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ fullName: name, dateOfBirth: '2024-02-29' }),
    });

    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.dateOfBirth).toBe('2024-02-29');
  });
});

describe('GET /api/patients', () => {
  it('lists active patients and hides archived ones by default', async () => {
    const created = await registerPatient(name);
    await app.request(`/api/patients/${created.id}/archive`, { method: 'PATCH' });

    const res = await app.request('/api/patients');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(body.some((p) => p.id === created.id)).toBe(false);

    const all = await app.request('/api/patients?status=all');
    expect((await all.json() as any[]).some((p) => p.id === created.id)).toBe(true);
  });

  it('searches by full name case-insensitively', async () => {
    await registerPatient(name);

    const query = name.toLowerCase().slice(0, 8);
    const res = await app.request(`/api/patients?q=${encodeURIComponent(query)}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(body.some((p) => p.fullName === name)).toBe(true);
  });

  it('returns no matches for an unknown search', async () => {
    const res = await app.request(`/api/patients?q=${encodeURIComponent('zz-no-match-')}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('filters by status=archived', async () => {
    const created = await registerPatient(name);
    await app.request(`/api/patients/${created.id}/archive`, { method: 'PATCH' });

    const res = await app.request('/api/patients?status=archived');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(body.some((p) => p.id === created.id)).toBe(true);
  });

  it('treats an empty q as no filter', async () => {
    await registerPatient(name);
    const res = await app.request('/api/patients?q=');
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(body.some((p) => p.id)).toBe(true);
  });
});

describe('patient detail and updates', () => {
  it('returns a created patient by id', async () => {
    const created = await registerPatient(name);
    const res = await app.request(`/api/patients/${created.id}`);
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.fullName).toBe(name);
  });

  it('returns 404 with the error envelope for an unknown id', async () => {
    const res = await app.request('/api/patients/does-not-exist');
    expect(res.status).toBe(404);
    const body: any = await res.json();
    expect(body.error.code).toBe('NOT_FOUND');
  });

  it('updates demographics without touching the medical background', async () => {
    const created = await registerPatient(name);
    await app.request(`/api/patients/${created.id}/medical-background`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ allergies: 'penicilina (prueba)' }),
    });

    const res = await app.request(`/api/patients/${created.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ fullName: `${name} (editado)`, phone: '5550001111' }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.fullName).toBe(`${name} (editado)`);
    expect(body.phone).toBe('5550001111');
    expect(body.allergies).toBe('penicilina (prueba)');
  });

  it('rejects an empty update body', async () => {
    const created = await registerPatient(name);
    const res = await app.request(`/api/patients/${created.id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('updates the medical background and clears fields with null', async () => {
    const created = await registerPatient(name);
    await app.request(`/api/patients/${created.id}/medical-background`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ allergies: 'polvo', currentMedications: 'n/a' }),
    });

    const res = await app.request(`/api/patients/${created.id}/medical-background`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ currentMedications: null }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.allergies).toBe('polvo');
    expect(body.currentMedications).toBeNull();
  });

  it('archives a patient; the record and history remain retrievable', async () => {
    const created = await registerPatient(name);
    const encounterRes = await app.request(`/api/patients/${created.id}/encounters`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({ occurredAt: '2026-11-01T10:00:00-06:00', reason: 'prueba' }),
    });
    expect(encounterRes.status).toBe(201);
    const encounter = (await encounterRes.json()) as any;

    const res = await app.request(`/api/patients/${created.id}/archive`, { method: 'PATCH' });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.isArchived).toBe(true);

    const detail = await app.request(`/api/patients/${created.id}`);
    expect(detail.status).toBe(200);

    const encounters = await app.request(`/api/patients/${created.id}/encounters`);
    expect(encounters.status).toBe(200);
    expect((await encounters.json() as any[]).map((e) => e.id)).toEqual([encounter.id]);
  });

  it('archive is idempotent', async () => {
    const created = await registerPatient(name);
    await app.request(`/api/patients/${created.id}/archive`, { method: 'PATCH' });
    const res = await app.request(`/api/patients/${created.id}/archive`, { method: 'PATCH' });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).isArchived).toBe(true);
  });

  it('rejects unknown patient routes with 404', async () => {
    const res = await app.request('/api/patients/some-id/unknown-op', { method: 'PATCH' });
    expect(res.status).toBe(404);
  });
});
