// Typed browser API client (UI_SPEC §1.6, ARCHITECTURE.md).
//
// Used by client components for mutations and client-side fetches.
// Responses are parsed with the shared contract schemas, so a drifted API
// fails loudly in the browser instead of corrupting the UI. Never imported
// from server components (use lib/api/server.ts there).

import {
  clinicDoctorSchema, type ClinicDoctor,
  type Appointment,
  type AppointmentEmailEvent,
  type AppointmentEmailStatus,
  type CreateStudyReceipt,
  type ReceiptQuery,
  type StudyReceipt,
  studyReceiptSchema,
  receiptOptionsSchema,
  type ReceptionInput,
  administrativePatientSchema,
  type CreateAppointmentInput,
  type CreateEncounterInput,
  type CreateEncounterStudiesInput,
  type CreatePatientStudiesInput,
  type CreatePatientInput,
  type CreateMedicalDocumentInput,
  type EncounterDetail,
  type EncounterSummary,
  type MedicalBackgroundInput,
  type MedicalDocument,
  type PatientDetail,
  type PatientSummary,
  type StudyRequest,
  type StudyStatus,
  type UpdateAppointmentInput,
  type UpdateEncounterInput,
  type UpdatePatientInput,
  type UpdateMedicalDocumentInput,
  type UpdateStudyInput,
  appointmentSchema,
  appointmentEmailStatusSchema,
  createMedicalDocumentInputSchema,
  createAppointmentInputSchema,
  createEncounterInputSchema,
  createEncounterStudiesInputSchema,
  createPatientStudiesInputSchema,
  createPatientInputSchema,
  encounterDetailSchema,
  encounterSummarySchema,
  errorEnvelopeSchema,
  medicalBackgroundInputSchema,
  medicalDocumentSchema,
  patientDetailSchema,
  patientSummarySchema,
  studyRequestSchema,
  updateAppointmentInputSchema,
  updateEncounterInputSchema,
  updatePatientInputSchema,
  updateMedicalDocumentInputSchema,
  updateStudyInputSchema,
} from '@nexus-med/contracts';

const API_BASE = '/api';

export type ApiErrorCode = 'VALIDATION_ERROR' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'RATE_LIMITED' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL_ERROR';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fieldErrors: Record<string, string[]>;

  constructor(status: number, code: ApiErrorCode, message: string, fieldErrors: Record<string, string[]> = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

class NetworkError extends Error {
  constructor() {
    super('No se pudo conectar con la API. Verifica que el servidor está iniciado.');
    this.name = 'NetworkError';
  }
}

type Parsed<T> = { success: true; data: T } | { success: false; data?: unknown };

async function request<T>(
  path: string,
  init: RequestInit | undefined,
  parse: (value: unknown) => Parsed<T>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers: { ...(init?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...(init?.headers ?? {}) },
      cache: 'no-store',
    });
  } catch {
    throw new NetworkError();
  }

  const body: unknown = await res.json().catch(() => null);

  if (!res.ok) {
    const envelope = errorEnvelopeSchema.safeParse(body);
    if (envelope.success) {
      throw new ApiError(
        res.status,
        envelope.data.error.code,
        envelope.data.error.message,
        envelope.data.error.fieldErrors ?? {},
      );
    }
    const fallback =
      body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Error de la API (${res.status})`;
    throw new ApiError(res.status, res.status === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR', fallback);
  }

  const parsed = parse(body);
  if (!parsed.success) {
    throw new ApiError(res.status, 'INTERNAL_ERROR', 'La respuesta de la API no coincide con el contrato.');
  }
  return parsed.data;
}

function asList<T>(item: { safeParse: (v: unknown) => Parsed<T> }): (v: unknown) => Parsed<T[]> {
  return (value) => {
    if (!Array.isArray(value)) return { success: false };
    const items: T[] = [];
    for (const entry of value) {
      const one = item.safeParse(entry);
      if (!one.success) return { success: false };
      items.push(one.data);
    }
    return { success: true, data: items };
  };
}

export type PatientListQuery = { q?: string; status?: 'active' | 'archived' | 'all' };

export function listPatients(query?: PatientListQuery): Promise<PatientSummary[]> {
  const params = new URLSearchParams();
  if (query?.q) params.set('q', query.q);
  if (query?.status) params.set('status', query.status);
  const qs = params.toString();
  return request(`/patients${qs ? `?${qs}` : ''}`, undefined, asList(patientSummarySchema));
}

export function getPatient(id: string): Promise<PatientDetail> {
  return request(`/patients/${encodeURIComponent(id)}`, undefined, patientDetailSchema.safeParse.bind(patientDetailSchema));
}

export function createPatient(input: CreatePatientInput): Promise<PatientDetail> {
  createPatientInputSchema.parse(input);
  return request('/patients', { method: 'POST', body: JSON.stringify(input) }, patientDetailSchema.safeParse.bind(patientDetailSchema));
}

export function updatePatient(id: string, input: UpdatePatientInput): Promise<PatientDetail> {
  updatePatientInputSchema.parse(input);
  return request(
    `/patients/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    patientDetailSchema.safeParse.bind(patientDetailSchema),
  );
}

export function updateMedicalBackground(id: string, input: MedicalBackgroundInput): Promise<PatientDetail> {
  medicalBackgroundInputSchema.parse(input);
  return request(
    `/patients/${encodeURIComponent(id)}/medical-background`,
    { method: 'PATCH', body: JSON.stringify(input) },
    patientDetailSchema.safeParse.bind(patientDetailSchema),
  );
}

export function archivePatient(id: string): Promise<PatientDetail> {
  return request(
    `/patients/${encodeURIComponent(id)}/archive`,
    { method: 'PATCH' },
    patientDetailSchema.safeParse.bind(patientDetailSchema),
  );
}

export function listEncounters(patientId: string): Promise<EncounterSummary[]> {
  return request(
    `/patients/${encodeURIComponent(patientId)}/encounters`,
    undefined,
    asList(encounterSummarySchema),
  );
}

export function getEncounter(id: string): Promise<EncounterDetail> {
  return request(
    `/encounters/${encodeURIComponent(id)}`,
    undefined,
    encounterDetailSchema.safeParse.bind(encounterDetailSchema),
  );
}

export function createEncounter(patientId: string, input: CreateEncounterInput): Promise<EncounterDetail> {
  createEncounterInputSchema.parse(input);
  return request(
    `/patients/${encodeURIComponent(patientId)}/encounters`,
    { method: 'POST', body: JSON.stringify(input) },
    encounterDetailSchema.safeParse.bind(encounterDetailSchema),
  );
}

export function updateEncounter(id: string, input: UpdateEncounterInput): Promise<EncounterDetail> {
  updateEncounterInputSchema.parse(input);
  return request(
    `/encounters/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    encounterDetailSchema.safeParse.bind(encounterDetailSchema),
  );
}

// ── Printable documents (UI_SPEC §7.4) ───────────────────────────────────

export function listPatientDocuments(patientId: string): Promise<MedicalDocument[]> {
  return request(
    `/patients/${encodeURIComponent(patientId)}/documents`,
    undefined,
    asList(medicalDocumentSchema),
  );
}

export function getMedicalDocument(documentId: string): Promise<MedicalDocument> {
  return request(
    `/documents/${encodeURIComponent(documentId)}`,
    undefined,
    medicalDocumentSchema.safeParse.bind(medicalDocumentSchema),
  );
}

export function createMedicalDocument(
  patientId: string,
  input: CreateMedicalDocumentInput,
): Promise<MedicalDocument> {
  createMedicalDocumentInputSchema.parse(input);
  return request(
    `/patients/${encodeURIComponent(patientId)}/documents`,
    { method: 'POST', body: JSON.stringify(input) },
    medicalDocumentSchema.safeParse.bind(medicalDocumentSchema),
  );
}

export function updateMedicalDocument(
  documentId: string,
  input: UpdateMedicalDocumentInput,
): Promise<MedicalDocument> {
  updateMedicalDocumentInputSchema.parse(input);
  return request(
    `/documents/${encodeURIComponent(documentId)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    medicalDocumentSchema.safeParse.bind(medicalDocumentSchema),
  );
}

// ── Appointments (UI_SPEC §7.2) ──────────────────────────────────────────

export type AppointmentRangeQuery = { from: string; to: string; doctorId?: string };

/** Appointments for the calendar, [from, to) ISO range. */
export function listAppointmentsInRange(query: AppointmentRangeQuery): Promise<Appointment[]> {
  const params = new URLSearchParams({ from: query.from, to: query.to });
  if (query.doctorId) params.set('doctorId', query.doctorId);
  return request(`/appointments?${params.toString()}`, undefined, asList(appointmentSchema));
}

/** All appointments of a patient, newest first. */
export function listPatientAppointments(patientId: string): Promise<Appointment[]> {
  return request(
    `/patients/${encodeURIComponent(patientId)}/appointments`,
    undefined,
    asList(appointmentSchema),
  );
}

export function createAppointment(patientId: string, input: CreateAppointmentInput): Promise<Appointment> {
  createAppointmentInputSchema.parse(input);
  return request(
    `/patients/${encodeURIComponent(patientId)}/appointments`,
    { method: 'POST', body: JSON.stringify(input) },
    appointmentSchema.safeParse.bind(appointmentSchema),
  );
}

export function updateAppointment(id: string, input: UpdateAppointmentInput): Promise<Appointment> {
  updateAppointmentInputSchema.parse(input);
  return request(
    `/appointments/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    appointmentSchema.safeParse.bind(appointmentSchema),
  );
}

export function listAppointmentEmails(id: string): Promise<AppointmentEmailStatus[]> {
  return request(`/appointments/${encodeURIComponent(id)}/emails`, undefined, asList(appointmentEmailStatusSchema));
}

export function sendAppointmentEmail(id: string, event: AppointmentEmailEvent): Promise<AppointmentEmailStatus> {
  return request(
    `/appointments/${encodeURIComponent(id)}/emails`,
    { method: 'POST', body: JSON.stringify({ event }) },
    appointmentEmailStatusSchema.safeParse.bind(appointmentEmailStatusSchema),
  );
}

export function retryAppointmentEmail(id: string, emailId: string, acknowledgePossibleDuplicate: boolean): Promise<AppointmentEmailStatus> {
  return request(
    `/appointments/${encodeURIComponent(id)}/emails/${encodeURIComponent(emailId)}/retry`,
    { method: 'POST', body: JSON.stringify({ acknowledgePossibleDuplicate }) },
    appointmentEmailStatusSchema.safeParse.bind(appointmentEmailStatusSchema),
  );
}

export function completeAppointment(
  id: string,
  input: { actualDurationMinutes?: number; encounterId?: string },
): Promise<Appointment> {
  return request(
    `/appointments/${encodeURIComponent(id)}/complete`,
    { method: 'POST', body: JSON.stringify(input) },
    appointmentSchema.safeParse.bind(appointmentSchema),
  );
}

export function cancelAppointment(id: string): Promise<Appointment> {
  return request(
    `/appointments/${encodeURIComponent(id)}/cancel`,
    { method: 'POST' },
    appointmentSchema.safeParse.bind(appointmentSchema),
  );
}

export function linkEncounter(id: string, encounterId: string): Promise<Appointment> {
  return request(
    `/appointments/${encodeURIComponent(id)}/link-encounter`,
    { method: 'POST', body: JSON.stringify({ encounterId }) },
    appointmentSchema.safeParse.bind(appointmentSchema),
  );
}

// ── Study requests (UI_SPEC §7.3) ──────────────────────────────────────

/** List patient studies; repeated statuses are ORed by the API. */
export function listPatientStudies(
  patientId: string,
  statuses?: StudyStatus[],
): Promise<StudyRequest[]> {
  const params = new URLSearchParams();
  statuses?.forEach((status) => params.append('status', status));
  const query = params.toString();
  return request(
    `/patients/${encodeURIComponent(patientId)}/studies${query ? `?${query}` : ''}`,
    undefined,
    asList(studyRequestSchema),
  );
}

/** Add studies to an existing encounter; patient association is server-derived. */
export function createEncounterStudies(
  encounterId: string,
  input: CreateEncounterStudiesInput,
): Promise<StudyRequest[]> {
  createEncounterStudiesInputSchema.parse(input);
  return request(
    `/encounters/${encodeURIComponent(encounterId)}/studies`,
    { method: 'POST', body: JSON.stringify(input) },
    asList(studyRequestSchema),
  );
}

/** Create patient-level study requests, optionally tied to one encounter. */
export function createPatientStudies(
  patientId: string,
  input: CreatePatientStudiesInput,
): Promise<StudyRequest[]> {
  createPatientStudiesInputSchema.parse(input);
  return request(
    `/patients/${encodeURIComponent(patientId)}/studies`,
    { method: 'POST', body: JSON.stringify(input) },
    asList(studyRequestSchema),
  );
}

/** The studies ordered during one encounter (the detail-section list). */
export function listEncounterStudies(encounterId: string): Promise<StudyRequest[]> {
  return request(
    `/encounters/${encodeURIComponent(encounterId)}/studies`,
    undefined,
    asList(studyRequestSchema),
  );
}

/** Advance a study's status, storing an optional result note with it. */
export function updateStudyStatus(id: string, input: UpdateStudyInput): Promise<StudyRequest> {
  updateStudyInputSchema.parse(input);
  return request(
    `/studies/${encodeURIComponent(id)}`,
    { method: 'PATCH', body: JSON.stringify(input) },
    studyRequestSchema.safeParse.bind(studyRequestSchema),
  );
}

export function getAdministrativePatient(id: string) {
  return request(`/patients/${encodeURIComponent(id)}/administrative`, undefined, administrativePatientSchema.safeParse.bind(administrativePatientSchema));
}
export function updateAdministrativePatient(id: string, input: UpdatePatientInput) {
  updatePatientInputSchema.parse(input);
  return request(`/patients/${encodeURIComponent(id)}/administrative`, { method: 'PATCH', body: JSON.stringify(input) }, administrativePatientSchema.safeParse.bind(administrativePatientSchema));
}
export function updateReception(id: string, input: ReceptionInput): Promise<Appointment> {
  return request(`/appointments/${encodeURIComponent(id)}/reception`, { method: 'POST', body: JSON.stringify(input) }, appointmentSchema.safeParse.bind(appointmentSchema));
}

export function getReceiptOptions(patientId: string) {
  return request(`/patients/${encodeURIComponent(patientId)}/study-receipt-options`, undefined, receiptOptionsSchema.safeParse.bind(receiptOptionsSchema));
}
export function listStudyReceipts(query: ReceiptQuery): Promise<StudyReceipt[]> {
  const params = new URLSearchParams();
  if (query.patientId) params.set('patientId', query.patientId);
  if (query.view) params.set('view', query.view);
  if (query.review) params.set('review', query.review);
  return request(`/study-receipts?${params.toString()}`, undefined, asList(studyReceiptSchema));
}
export function createStudyReceipt(patientId: string, metadata: CreateStudyReceipt, files: File[]): Promise<StudyReceipt> {
  const body = new FormData();
  body.set('metadata', JSON.stringify(metadata));
  files.forEach(file => body.append('files', file));
  return request(`/patients/${encodeURIComponent(patientId)}/study-receipts`, { method: 'POST', body }, studyReceiptSchema.safeParse.bind(studyReceiptSchema));
}
export function reviewStudyReceipt(id: string, reviewNote: string): Promise<StudyReceipt> {
  return request(`/study-receipts/${encodeURIComponent(id)}/review`, { method: 'POST', body: JSON.stringify({ reviewNote }) }, studyReceiptSchema.safeParse.bind(studyReceiptSchema));
}
export function receiptFileUrl(id: string) { return `${API_BASE}/study-receipt-files/${encodeURIComponent(id)}`; }

export function createAdministrativePatient(input: CreatePatientInput) {
  createPatientInputSchema.parse(input);
  return request('/administrative/patients', { method: 'POST', body: JSON.stringify(input) }, administrativePatientSchema.safeParse.bind(administrativePatientSchema));
}

export function listClinicDoctors(): Promise<ClinicDoctor[]> {
  return request('/clinic/doctors', undefined, asList(clinicDoctorSchema));
}
