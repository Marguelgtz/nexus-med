// Study request API integration tests — real Hono app, real SQLite test db.

import { beforeEach, describe, expect, it } from 'vitest';

import { app, registerPatient, uniqueName } from './helpers';

const json = { 'content-type': 'application/json' } as const;

let patientId: string;

beforeEach(async () => {
  const patient = await registerPatient(uniqueName());
  patientId = patient.id as string;
});

async function makeEncounter(studies?: unknown): Promise<any> {
  const res = await app.request(`/api/patients/${patientId}/encounters`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({
      occurredAt: '2026-11-01T10:30:00-06:00',
      reason: 'Seguimiento de prueba',
      ...(studies !== undefined ? { studies } : {}),
    }),
  });
  if (res.status !== 201) throw new Error(`makeEncounter failed: ${res.status}`);
  return res.json();
}

describe('creating studies with an encounter', () => {
  it('creates the study rows with status ordered in the same save', async () => {
    const created = await makeEncounter([
      { category: 'laboratorio', description: 'Biometría hemática' },
      { category: 'rayos_x', description: 'Rayos X de tórax' },
    ]);

    const studies = (await (await app.request(`/api/encounters/${created.id}/studies`)).json()) as any[];
    expect(studies).toHaveLength(2);
    expect(studies[0]).toMatchObject({
      patientId,
      category: 'laboratorio',
      description: 'Biometría hemática',
      status: 'ordered',
      resultNote: null,
    });
    expect(studies[0].encounter).toMatchObject({ id: created.id });
    expect(studies[0].encounter.occurredAt).toBeTruthy();
    expect(studies[0].encounter.reason).toBe('Seguimiento de prueba');
  });

  it('creates no study rows when studies is omitted', async () => {
    const created = await makeEncounter();
    const studies = (await (await app.request(`/api/encounters/${created.id}/studies`)).json()) as any[];
    expect(studies).toEqual([]);
  });

  it('rejects a study row missing its description', async () => {
    const res = await app.request(`/api/patients/${patientId}/encounters`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        occurredAt: '2026-11-01T10:30:00-06:00',
        studies: [{ category: 'laboratorio' }],
      }),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors['studies.0.description']).toBeDefined();
    // The encounter must not have been created either (atomic save).
    const listed = (await (await app.request(`/api/patients/${patientId}/encounters`)).json()) as any[];
    expect(listed).toHaveLength(0);
  });

  it('rejects an invalid category', async () => {
    const res = await app.request(`/api/patients/${patientId}/encounters`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        occurredAt: '2026-11-01T10:30:00-06:00',
        studies: [{ category: 'mri', description: 'RMN de rodilla' }],
      }),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors['studies.0.category']).toBeDefined();
  });

  it('rejects an unknown field on a study row', async () => {
    const res = await app.request(`/api/patients/${patientId}/encounters`, {
      method: 'POST',
      headers: json,
      body: JSON.stringify({
        occurredAt: '2026-11-01T10:30:00-06:00',
        studies: [
          { category: 'laboratorio', description: 'Glucosa', status: 'completed' },
        ],
      }),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors['studies.0.status']).toBeDefined();
  });
});

describe('GET /patients/:patientId/studies', () => {
  it('lists all the patient\'s studies with the encounter embedded', async () => {
    const first = await makeEncounter([{ category: 'laboratorio', description: 'Biometría hemática' }]);
    await makeEncounter(); // second encounter, no studies

    const res = await app.request(`/api/patients/${patientId}/studies`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(body).toHaveLength(1);
    expect(body[0].patientId).toBe(patientId);
    expect(body[0].encounter.id).toBe(first.id);
    expect(body[0].encounter.reason).toBe('Seguimiento de prueba');
  });

  it('returns an empty array for a patient without studies', async () => {
    const res = await app.request(`/api/patients/${patientId}/studies`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('returns 404 for an unknown patient', async () => {
    const res = await app.request('/api/patients/missing/studies');
    expect(res.status).toBe(404);
  });
});

describe('GET /encounters/:encounterId/studies', () => {
  it('lists the studies ordered in that encounter only', async () => {
    const withStudies = await makeEncounter([{ category: 'ecg', description: 'ECG de 12 derivaciones' }]);
    await makeEncounter(); // no studies

    const res = await app.request(`/api/encounters/${withStudies.id}/studies`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any[];
    expect(body).toHaveLength(1);
    expect(body[0].description).toBe('ECG de 12 derivaciones');
  });

  it('returns 404 for an unknown encounter', async () => {
    const res = await app.request('/api/encounters/missing/studies');
    expect(res.status).toBe(404);
  });
});

describe('PATCH /studies/:studyId', () => {
  async function makeOrderedStudy(): Promise<string> {
    const created = await makeEncounter([{ category: 'laboratorio', description: 'Biometría hemática' }]);
    const [study] = (await (await app.request(`/api/encounters/${created.id}/studies`)).json()) as any[];
    return study.id;
  }

  it('advances ordered → completed with a note', async () => {
    const id = await makeOrderedStudy();
    const res = await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'completed', resultNote: 'Resultados dentro de rango.' }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('completed');
    expect(body.resultNote).toBe('Resultados dentro de rango.');
  });

  it('allows ordered → reviewed directly', async () => {
    const id = await makeOrderedStudy();
    const res = await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'reviewed' }),
    });
    expect(res.status).toBe(200);
    expect(((await res.json()) as any).status).toBe('reviewed');
  });

  it('advances completed → reviewed', async () => {
    const id = await makeOrderedStudy();
    await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'completed' }),
    });
    const res = await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'reviewed', resultNote: 'Revisado con el paciente.' }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.status).toBe('reviewed');
    expect(body.resultNote).toBe('Revisado con el paciente.');
  });

  it('rejects a repeated transition (409)', async () => {
    const id = await makeOrderedStudy();
    await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'completed' }),
    });
    const res = await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'completed' }),
    });
    expect(res.status).toBe(409);
    expect(((await res.json()) as any).error.code).toBe('CONFLICT');
  });

  it('rejects going backwards (reviewed → anything)', async () => {
    const id = await makeOrderedStudy();
    await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'reviewed' }),
    });
    const res = await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'ordered' }),
    });
    expect(res.status).toBe(409);
  });

  it('requires a status (a note alone is not a transition)', async () => {
    const id = await makeOrderedStudy();
    const res = await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ resultNote: 'solo nota' }),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors.status).toBeDefined();
  });

  it('rejects an over-long note', async () => {
    const id = await makeOrderedStudy();
    const res = await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'completed', resultNote: 'a'.repeat(1001) }),
    });
    expect(res.status).toBe(400);
    const body: any = await res.json();
    expect(body.error.fieldErrors.resultNote).toBeDefined();
  });

  it('returns 404 for an unknown study', async () => {
    const res = await app.request('/api/studies/missing', {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'completed' }),
    });
    expect(res.status).toBe(404);
  });

  it('persists the transition', async () => {
    const id = await makeOrderedStudy();
    await app.request(`/api/studies/${id}`, {
      method: 'PATCH',
      headers: json,
      body: JSON.stringify({ status: 'completed' }),
    });
    const studies = (await (await app.request(`/api/patients/${patientId}/studies`)).json()) as any[];
    expect(studies[0].status).toBe('completed');
  });
});
