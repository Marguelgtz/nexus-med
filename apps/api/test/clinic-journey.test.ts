import { describe, expect, it } from 'vitest';
import type { AdministrativePatient, Appointment, AuthSession, EncounterDetail, EncounterSummary, MedicalDocument, PatientDetail, PatientSummary, StudyReceipt, StudyRequest } from '@nexus-med/contracts';
import { createApp } from '../src/app';
import { createAuth } from '../src/domains/auth/auth.config';
import { resolvePrincipal, withAuthRuntime } from '../src/domains/auth/auth.context';
import { decryptEmailPayload } from '../src/domains/email/outbox';
import { localPrisma } from '../src/infrastructure/database/prisma';
import { createSqliteAtomicWrite, withPrismaClient } from '../src/infrastructure/database/runtime-client';
import '../src/infrastructure/storage/local-study-files';

const origin = 'http://127.0.0.1:3000';
const secret = 'synthetic-persisted-journey-secret-'.repeat(3);
const password = 'Synthetic-Journey-Password-2026';
const auth = createAuth(localPrisma, { secret, appBaseUrl: origin, production: false });
const app = createApp();
let requestSequence = 0;
interface Identity { id: string; email: string; cookie: string }

async function request(path: string, body?: unknown, cookie = '', method = body === undefined ? 'GET' : 'POST') {
  const multipart = body instanceof FormData;
  const headers = new Headers({ origin, cookie, 'cf-connecting-ip': `192.0.2.${++requestSequence % 250 + 1}` });
  if (!multipart) headers.set('content-type', 'application/json');
  const principal = await resolvePrincipal(auth, headers, localPrisma);
  return withAuthRuntime({ auth, database: localPrisma, atomicWrite: createSqliteAtomicWrite(localPrisma), secret, appBaseUrl: origin, googleEnabled: false, localRuntime: true, principal }, () =>
    withPrismaClient(localPrisma, () => app.request(`${origin}${path}`, {
      method, headers, ...(body === undefined ? {} : { body: multipart ? body : JSON.stringify(body) }),
    }), createSqliteAtomicWrite(localPrisma)));
}

async function json<T>(response: Response, status = 200): Promise<T> {
  expect(response.status).toBe(status);
  return response.json() as Promise<T>;
}

function cookies(response: Response): string {
  const value = response.headers.getSetCookie().map(item => item.split(';')[0]).join('; ');
  expect(value).toContain('session_token=');
  return value;
}

function version(row: { version?: number }): number {
  expect(row.version).toBeTypeOf('number');
  return row.version!;
}

async function capturedUrl(email: string, kind: 'verify_email' | 'invitation'): Promise<URL> {
  const message = await localPrisma.emailOutbox.findFirstOrThrow({ where: { recipient: email, kind }, orderBy: { createdAt: 'desc' } });
  const payload = await decryptEmailPayload(secret, message.encryptedBody);
  return new URL(payload.text.match(/https?:\/\/[^\s]+/)![0]);
}

async function login(email: string): Promise<string> {
  const response = await request('/api/auth/sign-in/email', { email, password });
  expect(response.status).toBe(200);
  return cookies(response);
}

async function signup(name: string): Promise<Identity> {
  const email = `journey-${crypto.randomUUID()}@example.test`;
  expect((await request('/api/auth/sign-up/email', { email, password, name })).status).toBe(200);
  const link = await capturedUrl(email, 'verify_email');
  expect([200, 302]).toContain((await request(`${link.pathname}${link.search}`)).status);
  const cookie = await login(email);
  const session = await json<AuthSession>(await request('/api/session', undefined, cookie));
  expect(session.onboardingRequired).toBe(true);
  return { email, cookie, id: session.user.id };
}

async function owner(name: string) {
  const identity = await signup(name);
  const session = await json<AuthSession>(await request('/api/onboarding/clinic', { name: `Clínica sintética ${name}` }, identity.cookie));
  expect(session.canManageAccess).toBe(true);
  return { ...identity, clinicId: session.clinic!.id };
}

async function joinClinic(issuer: Identity, identity: Identity, role: 'doctor' | 'secretary') {
  expect((await request('/api/access/invitations', { email: identity.email, role }, issuer.cookie)).status).toBe(201);
  const token = (await capturedUrl(identity.email, 'invitation')).searchParams.get('token');
  const session = await json<AuthSession>(await request('/api/invitations/accept', { token }, identity.cookie));
  expect(session.user.role).toBe(role);
  expect(session.canManageAccess).toBe(false);
}

describe('real-session persisted multi-user clinic journey', () => {
  it('preserves a complete visit across five separate logins, clinic boundaries and conflicting saves', async () => {
    const journeyStarted = performance.now();
    const doctor1 = await owner('Médica primera');
    const doctor2 = await signup('Médico segundo');
    const secretary1 = await signup('Secretaría primera');
    const secretary2 = await signup('Secretaría segunda');
    for (const [identity, role] of [[doctor2, 'doctor'], [secretary1, 'secretary'], [secretary2, 'secretary']] as const) {
      await joinClinic(doctor1, identity, role);
    }
    const outsider = await owner('Médica otra clínica');
    expect(outsider.clinicId).not.toBe(doctor1.clinicId);

    const patient = await json<AdministrativePatient>(await request('/api/administrative/patients', {
      fullName: 'Paciente sintético de recorrido completo', dateOfBirth: '1980-05-12', externalIdentifier: 'JOURNEY-001',
    }, secretary1.cookie), 201);
    const administrative = await json<AdministrativePatient>(await request(`/api/patients/${patient.id}/administrative`, {
      phone: '5550000000', expectedVersion: version(patient),
    }, secretary2.cookie, 'PATCH'));
    expect(administrative).not.toHaveProperty('medicalConditions');
    const background = await json<PatientDetail>(await request(`/api/patients/${patient.id}/medical-background`, {
      medicalConditions: 'Antecedente sintético declarado para prueba.', expectedVersion: version(administrative),
    }, doctor1.cookie, 'PATCH'));
    expect((await request(`/api/patients/${patient.id}`, undefined, secretary1.cookie)).status).toBe(403);
    expect((await request(`/api/patients/${patient.id}/medical-background`, { medicalConditions: 'No autorizado', expectedVersion: version(background) }, secretary2.cookie, 'PATCH')).status).toBe(403);
    expect((await json<PatientDetail>(await request(`/api/patients/${patient.id}`, undefined, doctor2.cookie))).medicalConditions).toBe(background.medicalConditions);

    const appointmentInput = { startAt: '2026-11-16T16:00:00Z', durationMinutes: 30, type: 'consulta' };
    const appointment = await json<Appointment>(await request(`/api/patients/${patient.id}/appointments`, { ...appointmentInput, doctorId: doctor1.id }, secretary1.cookie), 201);
    const secondAppointment = await json<Appointment>(await request(`/api/patients/${patient.id}/appointments`, { ...appointmentInput, doctorId: doctor2.id }, secretary2.cookie), 201);
    expect(appointment.doctor?.id).toBe(doctor1.id);
    expect(secondAppointment.doctor?.id).toBe(doctor2.id);
    const doctor2Schedule = await json<Appointment[]>(await request(`/api/appointments?from=2026-11-16T00:00:00Z&to=2026-11-17T00:00:00Z&doctorId=${doctor2.id}`, undefined, secretary2.cookie));
    expect(doctor2Schedule.map(item => item.id)).toEqual([secondAppointment.id]);
    expect((await request(`/api/appointments/${appointment.id}/reception`, { action: 'start' }, doctor2.cookie)).status).toBe(403);
    expect((await request(`/api/patients/${patient.id}/appointments`, { ...appointmentInput, doctorId: outsider.id }, secretary1.cookie)).status).toBe(400);
    const reassigned = await json<Appointment>(await request(`/api/appointments/${secondAppointment.id}`, {
      doctorId: doctor1.id, expectedVersion: version(secondAppointment),
    }, secretary2.cookie, 'PATCH'));
    expect(reassigned.doctor?.id).toBe(doctor1.id);
    expect((await request(`/api/appointments/${secondAppointment.id}/reception`, { action: 'start' }, doctor2.cookie)).status).toBe(403);

    const arrived = await json<Appointment>(await request(`/api/appointments/${appointment.id}/reception`, { action: 'arrive' }, secretary1.cookie));
    expect(arrived.arrivedAt).not.toBeNull();
    expect(arrived.attentionStartedAt).toBeNull();
    expect((await request(`/api/appointments/${appointment.id}/reception`, { action: 'start' }, secretary2.cookie)).status).toBe(403);
    const started = await json<Appointment>(await request(`/api/appointments/${appointment.id}/reception`, { action: 'start' }, doctor1.cookie));
    expect(started.attentionStartedAt).not.toBeNull();
    const queue = await json<Appointment[]>(await request('/api/reception', undefined, doctor1.cookie));
    expect(queue.some(item => item.id === appointment.id)).toBe(true);

    const encounter = await json<EncounterDetail>(await request(`/api/patients/${patient.id}/encounters`, {
      occurredAt: '2026-11-16T16:03:00Z', type: 'consulta', reason: 'Consulta sintética de verificación',
      historyOfPresentIllness: 'Narrativa ficticia ingresada explícitamente para prueba.',
      physicalExamination: 'Texto sintético sin significado clínico real.', assessment: 'Valoración sintética declarada por el usuario de prueba.',
      plan: 'Plan ficticio de verificación de persistencia.',
      studies: [{ category: 'laboratorio', name: 'Solicitud sintética del recorrido', description: 'Solo para prueba de asociación.' }],
    }, doctor1.cookie), 201);
    expect(encounter.author?.id).toBe(doctor1.id);
    expect(encounter.patientId).toBe(patient.id);
    expect((await request(`/api/encounters/${encounter.id}`, undefined, secretary1.cookie)).status).toBe(403);
    expect((await request(`/api/patients/${patient.id}/encounters`, { occurredAt: '2026-11-16T16:00:00Z' }, secretary2.cookie)).status).toBe(403);
    const studies = await json<StudyRequest[]>(await request(`/api/encounters/${encounter.id}/studies`, undefined, doctor2.cookie));
    expect(studies).toHaveLength(1);
    expect(studies[0]!.encounter?.id).toBe(encounter.id);
    const untouchedAppointment = await json<Appointment>(await request(`/api/appointments/${appointment.id}`, undefined, doctor1.cookie));
    expect(untouchedAppointment.status).toBe('scheduled');
    expect(untouchedAppointment.linkedEncounterId).toBeNull();

    const competingSaves = await Promise.all([
      request(`/api/encounters/${encounter.id}`, { expectedVersion: version(encounter), assessment: 'Edición sintética A' }, doctor1.cookie, 'PATCH'),
      request(`/api/encounters/${encounter.id}`, { expectedVersion: version(encounter), assessment: 'Edición sintética B' }, doctor2.cookie, 'PATCH'),
    ]);
    expect(competingSaves.map(item => item.status).sort()).toEqual([200, 409]);
    const savedEncounter = await json<EncounterDetail>(competingSaves.find(item => item.status === 200)!);
    const clinicalReload = await json<EncounterDetail>(await request(`/api/encounters/${encounter.id}`, undefined, doctor2.cookie));
    expect(clinicalReload.assessment).toBe(savedEncounter.assessment);
    expect(clinicalReload.author?.id).toBe(doctor1.id);
    expect(clinicalReload.version).toBe(version(encounter) + 1);
    expect((await request(`/api/encounters/${encounter.id}`, { expectedVersion: version(encounter), assessment: 'Borrador obsoleto que debe conservarse solo en cliente' }, doctor1.cookie, 'PATCH')).status).toBe(409);
    expect((await json<EncounterDetail>(await request(`/api/encounters/${encounter.id}`, undefined, doctor1.cookie))).assessment).toBe(savedEncounter.assessment);

    // A real multipart upload and authorized read use the local file adapter.
    const png = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNfoAAAAASUVORK5CYII=', 'base64'));
    const upload = new FormData();
    upload.set('metadata', JSON.stringify({ title: 'Resultado externo sintético', studyDate: '2026-11-16', encounterId: encounter.id, requestId: studies[0]!.id, receiptNote: 'Recepción administrativa ficticia.' }));
    upload.append('files', new File([png], 'estudio-sintetico.png', { type: 'image/png' }));
    const receipt = await json<StudyReceipt>(await request(`/api/patients/${patient.id}/study-receipts`, upload, secretary1.cookie), 201);
    expect(receipt.reviewedAt).toBeNull();
    expect(receipt.requestId).toBe(studies[0]!.id);
    const fileId = receipt.files[0]!.id;
    const file = await request(`/api/study-receipt-files/${fileId}`, undefined, secretary2.cookie);
    expect(file.status).toBe(200);
    expect(file.headers.get('content-type')).toBe('image/png');
    expect(file.headers.get('content-security-policy')).toBe('sandbox');
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(png);
    expect((await request(`/api/study-receipt-files/${fileId}`, undefined, outsider.cookie)).status).toBe(404);
    expect((await request(`/api/study-receipt-files/${fileId}`)).status).toBe(401);
    expect((await request(`/api/study-receipts/${receipt.id}/review`, {}, secretary2.cookie)).status).toBe(403);
    expect((await json<StudyRequest[]>(await request(`/api/encounters/${encounter.id}/studies`, undefined, doctor1.cookie)))[0]!.status).toBe('ordered');
    const reviewed = await json<StudyReceipt>(await request(`/api/study-receipts/${receipt.id}/review`, { reviewNote: 'Revisión ficticia explícita del segundo médico.' }, doctor2.cookie));
    expect(reviewed.reviewedAt).not.toBeNull();
    const administrativeReceipts = await json<StudyReceipt[]>(await request(`/api/study-receipts?patientId=${patient.id}&review=all&view=medical`, undefined, secretary2.cookie));
    expect(administrativeReceipts.find(item => item.id === receipt.id)).not.toHaveProperty('reviewNote');
    expect((await json<StudyRequest[]>(await request(`/api/encounters/${encounter.id}/studies`, undefined, doctor1.cookie)))[0]!.status).toBe('ordered');
    const reviewedRequest = await json<StudyRequest>(await request(`/api/studies/${studies[0]!.id}`, { status: 'reviewed', resultNote: 'Constancia sintética de revisión explícita.' }, doctor2.cookie, 'PATCH'));
    expect(reviewedRequest.status).toBe('reviewed');
    expect((await request(`/api/studies/${studies[0]!.id}`, { status: 'completed' }, doctor1.cookie, 'PATCH')).status).toBe(409);

    const prescription = await json<MedicalDocument>(await request(`/api/patients/${patient.id}/documents`, {
      kind: 'prescription', encounterId: encounter.id, title: 'Receta sintética de prueba',
      lines: [{ medication: 'Medicamento ficticio sin uso clínico', dose: 'Cantidad ficticia', instructions: 'Datos de prueba; no utilizar.' }], body: 'Documento exclusivamente sintético.',
    }, doctor1.cookie), 201);
    const report = await json<MedicalDocument>(await request(`/api/patients/${patient.id}/documents`, {
      kind: 'report', encounterId: encounter.id, title: 'Informe sintético', body: 'Narrativa ficticia ingresada por el segundo médico para verificar autoría.',
    }, doctor2.cookie), 201);
    expect(prescription.author?.id).toBe(doctor1.id);
    expect(report.author?.id).toBe(doctor2.id);
    expect((await request(`/api/documents/${prescription.id}`, undefined, secretary1.cookie)).status).toBe(403);
    const prescriptionEdit = { kind: 'prescription', encounterId: encounter.id, title: 'Receta sintética revisada', lines: [{ medication: 'Línea ficticia corregida', instructions: 'Solo prueba.' }], body: 'Edición explícita sintética.', expectedVersion: version(prescription) };
    const editedPrescription = await json<MedicalDocument>(await request(`/api/documents/${prescription.id}`, prescriptionEdit, doctor2.cookie, 'PATCH'));
    expect(editedPrescription.author?.id).toBe(doctor1.id);
    expect((await request(`/api/documents/${prescription.id}`, { ...prescriptionEdit, lines: [{ medication: 'Línea obsoleta no guardada' }] }, doctor1.cookie, 'PATCH')).status).toBe(409);
    const stablePrescription = await json<MedicalDocument>(await request(`/api/documents/${prescription.id}`, undefined, doctor1.cookie));
    expect(stablePrescription.lines[0]!.medication).toBe('Línea ficticia corregida');

    const otherDoctorEncounter = await json<EncounterDetail>(await request(`/api/patients/${patient.id}/encounters`, { occurredAt: '2026-11-16T16:10:00Z', reason: 'Segunda nota sintética para validar médico asignado.' }, doctor2.cookie), 201);
    expect((await request(`/api/appointments/${appointment.id}/link-encounter`, { encounterId: otherDoctorEncounter.id }, doctor1.cookie)).status).toBe(400);
    expect((await request(`/api/appointments/${appointment.id}/complete`, { encounterId: encounter.id }, secretary2.cookie)).status).toBe(403);
    const completed = await json<Appointment>(await request(`/api/appointments/${appointment.id}/complete`, { encounterId: encounter.id, actualDurationMinutes: 23 }, doctor1.cookie));
    expect(completed.status).toBe('completed');
    expect(completed.linkedEncounterId).toBe(encounter.id);
    expect(completed.doctor?.id).toBe(doctor1.id);
    expect(completed.actualDurationMinutes).toBe(23);
    expect((await json<Appointment[]>(await request('/api/reception', undefined, secretary1.cookie))).some(item => item.id === appointment.id)).toBe(false);

    // References and downloads cannot cross into a second real clinic session.
    const outsiderPatient = await json<PatientDetail>(await request('/api/patients', { fullName: 'Paciente sintético de clínica B', externalIdentifier: 'JOURNEY-001' }, outsider.cookie), 201);
    for (const path of [`/api/patients/${patient.id}`, `/api/encounters/${encounter.id}`, `/api/appointments/${appointment.id}`, `/api/documents/${prescription.id}`, `/api/study-receipt-files/${fileId}`]) {
      expect((await request(path, undefined, outsider.cookie)).status).toBe(404);
    }
    expect((await request(`/api/patients/${outsiderPatient.id}/studies`, { encounterId: encounter.id, studies: [{ category: 'otro', name: 'Referencia ajena denegada' }] }, outsider.cookie)).status).toBe(404);
    expect((await request(`/api/patients/${outsiderPatient.id}/documents`, { kind: 'report', encounterId: encounter.id, body: 'Referencia ajena no guardada.' }, outsider.cookie)).status).toBe(400);
    const outsiderRegistry = await json<PatientSummary[]>(await request('/api/patients?status=all', undefined, outsider.cookie));
    expect(outsiderRegistry.map(item => item.id)).toEqual([outsiderPatient.id]);

    expect((await request('/api/auth/sign-out', {}, doctor1.cookie)).status).toBe(200);
    expect((await request(`/api/encounters/${encounter.id}`, undefined, doctor1.cookie)).status).toBe(401);
    doctor1.cookie = await login(doctor1.email);
    const persistedEncounter = await json<EncounterDetail>(await request(`/api/encounters/${encounter.id}`, undefined, doctor1.cookie));
    const persistedDocuments = await json<MedicalDocument[]>(await request(`/api/patients/${patient.id}/documents`, undefined, doctor1.cookie));
    expect(persistedEncounter.assessment).toBe(savedEncounter.assessment);
    expect(persistedDocuments).toHaveLength(2);
    expect(persistedDocuments.find(item => item.id === prescription.id)?.author?.id).toBe(doctor1.id);
    expect(persistedDocuments.find(item => item.id === report.id)?.author?.id).toBe(doctor2.id);
    const timeline = await json<EncounterSummary[]>(await request(`/api/patients/${patient.id}/encounters`, undefined, doctor2.cookie));
    expect(timeline.map(item => item.id)).toEqual([otherDoctorEncounter.id, encounter.id]);
    expect((await json<Appointment>(await request(`/api/appointments/${appointment.id}`, undefined, doctor1.cookie))).linkedEncounterId).toBe(encounter.id);

    const savedAppointment = await localPrisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } });
    expect(savedAppointment).toMatchObject({ clinicId: doctor1.clinicId, patientId: patient.id, doctorId: doctor1.id, linkedEncounterId: encounter.id, status: 'completed' });
    expect(await localPrisma.studyReceipt.findUniqueOrThrow({ where: { id: receipt.id } })).toMatchObject({ clinicId: doctor1.clinicId, patientId: patient.id, encounterId: encounter.id, requestId: studies[0]!.id, receivedById: secretary1.id, reviewedById: doctor2.id });
    expect(await localPrisma.studyRequest.findUniqueOrThrow({ where: { id: studies[0]!.id } })).toMatchObject({ clinicId: doctor1.clinicId, orderedById: doctor1.id, reviewedById: doctor2.id });
    expect(await localPrisma.medicalDocument.findUniqueOrThrow({ where: { id: prescription.id } })).toMatchObject({ authorId: doctor1.id, lastEditedById: doctor2.id });

    // Diagnostic only: observed local concurrency, not a throughput release claim.
    const readStarted = performance.now();
    const reads = await Promise.all(Array.from({ length: 12 }, (_, index) => {
      const identity = [doctor1, doctor2, secretary1, secretary2][index % 4]!;
      const path = index % 4 < 2 ? `/api/patients/${patient.id}` : `/api/patients/${patient.id}/administrative`;
      return request(path, undefined, identity.cookie);
    }));
    expect(reads.every(response => response.status === 200)).toBe(true);
    console.info('[clinic-journey] diagnostic', JSON.stringify({ clinicCount: 2, separateIdentities: 5, concurrentAuthorizedReads: 12, concurrentReadMilliseconds: Math.round(performance.now() - readStarted), journeyMilliseconds: Math.round(performance.now() - journeyStarted) }));
  }, 30_000);
});
