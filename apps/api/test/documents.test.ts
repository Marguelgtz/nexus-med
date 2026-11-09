// Printable-document API integration tests against the migrated SQLite test database.

import { beforeEach, describe, expect, it } from 'vitest';

import { app, registerPatient, uniqueName } from './helpers';

const json = { 'content-type': 'application/json' } as const;
let patientId: string;

beforeEach(async () => {
  const patient = await registerPatient(uniqueName());
  patientId = patient.id;
});

async function createEncounter(forPatientId = patientId) {
  const response = await app.request(`/api/patients/${forPatientId}/encounters`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ occurredAt: '2026-11-01T10:30:00-06:00', reason: 'Consulta ficticia de prueba' }),
  });
  if (response.status !== 201) throw new Error(`createEncounter failed: ${response.status}`);
  return response.json() as Promise<{ id: string }>;
}

const prescription = (overrides: Record<string, unknown> = {}) => ({
  kind: 'prescription',
  title: 'Receta de prueba',
  body: 'Texto general ficticio.',
  lines: [{ medication: 'Medicamento ficticio', dose: 'Texto de ejemplo' }],
  ...overrides,
});

describe('medical documents', () => {
  it('lists an empty patient document collection and returns 404 for an unknown patient', async () => {
    expect(await (await app.request(`/api/patients/${patientId}/documents`)).json()).toEqual([]);
    expect((await app.request('/api/patients/missing/documents')).status).toBe(404);
  });

  it('creates a prescription with ordered lines and optional encounter association', async () => {
    const encounter = await createEncounter();
    const response = await app.request(`/api/patients/${patientId}/documents`, {
      method: 'POST', headers: json,
      body: JSON.stringify(prescription({
        encounterId: encounter.id,
        lines: [
          { medication: 'Medicamento ficticio A', route: 'Texto de prueba' },
          { medication: 'Medicamento ficticio B', instructions: 'Indicación de demostración' },
        ],
      })),
    });
    expect(response.status).toBe(201);
    const created = await response.json() as any;
    expect(created).toMatchObject({ kind: 'prescription', patientId, title: 'Receta de prueba', body: 'Texto general ficticio.' });
    expect(created.patient.id).toBe(patientId);
    expect(created.encounter.id).toBe(encounter.id);
    expect(created.lines.map((line: any) => [line.position, line.medication])).toEqual([
      [0, 'Medicamento ficticio A'], [1, 'Medicamento ficticio B'],
    ]);
    expect(created.lines[0].dose).toBeNull();
  });

  it('creates a report without an encounter and preserves the narrative', async () => {
    const response = await app.request(`/api/patients/${patientId}/documents`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ kind: 'report', body: 'Texto ficticio de informe.\nSegunda línea de prueba.' }),
    });
    expect(response.status).toBe(201);
    const created = await response.json() as any;
    expect(created).toMatchObject({ kind: 'report', patientId, title: null, encounter: null, lines: [] });
    expect(created.body).toBe('Texto ficticio de informe.\nSegunda línea de prueba.');
  });

  it('rejects an encounter belonging to another patient', async () => {
    const other = await registerPatient(uniqueName());
    const encounter = await createEncounter(other.id);
    const response = await app.request(`/api/patients/${patientId}/documents`, {
      method: 'POST', headers: json,
      body: JSON.stringify(prescription({ encounterId: encounter.id })),
    });
    expect(response.status).toBe(400);
    expect((await response.json() as any).error.fieldErrors.encounterId).toBeDefined();
    expect(await (await app.request(`/api/patients/${patientId}/documents`)).json()).toEqual([]);
  });

  it('rejects missing prescription medication, empty report, and overlong report', async () => {
    const bodies = [
      prescription({ lines: [{ dose: 'no medication' }] }),
      { kind: 'report', body: '   ' },
      { kind: 'report', body: 'x'.repeat(20001) },
    ];
    for (const body of bodies) {
      expect((await app.request(`/api/patients/${patientId}/documents`, {
        method: 'POST', headers: json, body: JSON.stringify(body),
      })).status).toBe(400);
    }
  });

  it('gets a document by id and returns kind-specific not-found responses', async () => {
    const created = await (await app.request(`/api/patients/${patientId}/documents`, {
      method: 'POST', headers: json, body: JSON.stringify(prescription()),
    })).json() as any;
    expect((await (await app.request(`/api/documents/${created.id}`)).json() as any).id).toBe(created.id);
    expect((await app.request('/api/documents/missing')).status).toBe(404);
  });

  it('updates title, encounter link, instructions and lines atomically', async () => {
    const first = await (await app.request(`/api/patients/${patientId}/documents`, {
      method: 'POST', headers: json, body: JSON.stringify(prescription()),
    })).json() as any;
    const encounter = await createEncounter();
    const response = await app.request(`/api/documents/${first.id}`, {
      method: 'PATCH', headers: json,
      body: JSON.stringify(prescription({
        title: 'Título editado', encounterId: encounter.id, body: 'Indicaciones generales ficticias editadas.',
        lines: [{ medication: 'Renglón de reemplazo', frequency: 'Texto libre ficticio' }],
      })),
    });
    expect(response.status).toBe(200);
    const updated = await response.json() as any;
    expect(updated).toMatchObject({ id: first.id, title: 'Título editado', body: 'Indicaciones generales ficticias editadas.', encounter: { id: encounter.id } });
    expect(updated.lines).toHaveLength(1);
    expect(updated.lines[0]).toMatchObject({ position: 0, medication: 'Renglón de reemplazo', frequency: 'Texto libre ficticio' });
    expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(first.updatedAt).getTime());
    const stored = await (await app.request(`/api/documents/${first.id}`)).json() as any;
    expect(stored.lines).toHaveLength(1);
    expect(stored.lines[0].medication).toBe('Renglón de reemplazo');
  });

  it('rejects changing the patient association or document kind on update', async () => {
    const first = await (await app.request(`/api/patients/${patientId}/documents`, {
      method: 'POST', headers: json, body: JSON.stringify(prescription()),
    })).json() as any;
    const wrongEncounter = await createEncounter((await registerPatient(uniqueName())).id);
    const wrongPatient = await app.request(`/api/documents/${first.id}`, {
      method: 'PATCH', headers: json,
      body: JSON.stringify(prescription({ encounterId: wrongEncounter.id })),
    });
    expect(wrongPatient.status).toBe(400);
    const wrongKind = await app.request(`/api/documents/${first.id}`, {
      method: 'PATCH', headers: json,
      body: JSON.stringify({ kind: 'report', body: 'Informe ficticio.' }),
    });
    expect(wrongKind.status).toBe(409);
    expect((await (await app.request(`/api/documents/${first.id}`)).json() as any).kind).toBe('prescription');
  });

  it('lists documents newest first and never exposes delete behavior', async () => {
    const older = await (await app.request(`/api/patients/${patientId}/documents`, {
      method: 'POST', headers: json,
      body: JSON.stringify({ kind: 'report', body: 'Informe ficticio anterior.' }),
    })).json() as any;
    const newer = await (await app.request(`/api/patients/${patientId}/documents`, {
      method: 'POST', headers: json, body: JSON.stringify(prescription()),
    })).json() as any;
    const list = await (await app.request(`/api/patients/${patientId}/documents`)).json() as any[];
    expect(list.map((document) => document.id)).toEqual([newer.id, older.id]);
    expect((await app.request(`/api/documents/${newer.id}`, { method: 'DELETE' })).status).toBe(404);
  });
});
