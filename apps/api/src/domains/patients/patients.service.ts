// Patient domain operations.
//
// Business rules (docs/WORKFLOWS.md):
// - Registration requires a full name; everything else is optional.
// - Search covers full name and practice identifier, case-insensitive.
// - Updates touch demographics only; medical background has its own operation
//   so the two concerns stay separated.
// - Archiving is non-destructive: the record and its clinical history remain.

import type {
  CreatePatientInput,
  AdministrativePatient,
  MedicalBackgroundInput,
  PatientDetail,
  PatientListQuery,
  PatientSummary,
  UpdatePatientInput,
} from '@nexus-med/contracts';

import { prisma } from '../../infrastructure/database/runtime-client';
import { NotFoundError, ValidationError } from '../../shared/http/errors';

const PATIENT_NOT_FOUND = 'Paciente no encontrado';

// Prisma rows carry Dates; the public contract carries ISO 8601 strings.
// The services serialize at this boundary so API responses always match
// @nexus-med/contracts.
interface PatientRow {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  externalIdentifier: string | null;
  isArchived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toSummary(row: PatientRow): PatientSummary {
  return {
    id: row.id,
    fullName: row.fullName,
    dateOfBirth: row.dateOfBirth,
    externalIdentifier: row.externalIdentifier,
    isArchived: row.isArchived,
  };
}

function toDetail(
  row: PatientRow & {
    phone: string | null;
    email: string | null;
    appointmentEmailConsent: boolean;
    appointmentEmailConsentUpdatedAt: Date | null;
    medicalConditions: string | null;
    previousSurgeries: string | null;
    allergies: string | null;
    currentMedications: string | null;
  },
): PatientDetail {
  return {
    ...toSummary(row),
    phone: row.phone,
    email: row.email,
    appointmentEmailConsent: row.appointmentEmailConsent,
    appointmentEmailConsentUpdatedAt: row.appointmentEmailConsentUpdatedAt?.toISOString() ?? null,
    medicalConditions: row.medicalConditions,
    previousSurgeries: row.previousSurgeries,
    allergies: row.allergies,
    currentMedications: row.currentMedications,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const summarySelect = {
  id: true,
  fullName: true,
  dateOfBirth: true,
  externalIdentifier: true,
  isArchived: true,
  createdAt: true,
  updatedAt: true,
} as const;

function patientWhere(query: PatientListQuery) {
  const archived = query.status === 'archived' ? true : query.status === 'active' ? false : undefined;
  const search = query.q
    ? {
        OR: [
          { fullName: { contains: query.q } },
          { id: { contains: query.q } },
          { externalIdentifier: { contains: query.q } },
        ],
      }
    : {};

  return { ...(archived === undefined ? {} : { isArchived: archived }), ...search };
}

export async function listPatients(query: PatientListQuery): Promise<PatientSummary[]> {
  const rows = await prisma.patient.findMany({
    where: patientWhere(query),
    orderBy: { fullName: 'asc' },
    select: summarySelect,
  });
  return rows.map(toSummary);
}

/** Administrative list projection: contact details without clinical fields. */
export async function listAdministrativePatients(
  query: PatientListQuery,
): Promise<AdministrativePatient[]> {
  const rows = await prisma.patient.findMany({
    where: patientWhere(query),
    orderBy: { fullName: 'asc' },
    select: { ...summarySelect, phone: true, email: true, appointmentEmailConsent: true, appointmentEmailConsentUpdatedAt: true },
  });
  return rows.map(row => ({
    ...toSummary(row), phone: row.phone, email: row.email,
    appointmentEmailConsent: row.appointmentEmailConsent,
    appointmentEmailConsentUpdatedAt: row.appointmentEmailConsentUpdatedAt?.toISOString() ?? null,
  }));
}

export async function getPatient(patientId: string): Promise<PatientDetail> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError(PATIENT_NOT_FOUND);
  return toDetail(patient);
}

export async function createPatient(input: CreatePatientInput): Promise<PatientDetail> {
  return toDetail(await prisma.patient.create({ data: {
    ...input,
    appointmentEmailConsentUpdatedAt: input.appointmentEmailConsent ? new Date() : null,
  } }));
}

export async function updatePatient(
  patientId: string,
  input: UpdatePatientInput,
): Promise<PatientDetail> {
  const existing = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!existing) throw new NotFoundError(PATIENT_NOT_FOUND);
  const emailChanged = input.email !== undefined &&
    (input.email?.trim().toLowerCase() ?? null) !== (existing.email?.trim().toLowerCase() ?? null);
  const requestedConsent = input.appointmentEmailConsent;
  const consent = emailChanged
    ? requestedConsent === true
    : requestedConsent ?? existing.appointmentEmailConsent;
  const email = input.email !== undefined ? input.email : existing.email;
  if (consent && !email) throw new ValidationError('Agrega un correo antes de aceptar mensajes de citas.');

  const consentChanged = consent !== existing.appointmentEmailConsent;
  const data = {
    ...input,
    appointmentEmailConsent: consent,
    ...(emailChanged || consentChanged ? { appointmentEmailConsentUpdatedAt: new Date() } : {}),
  };
  return toDetail(await prisma.patient.update({ where: { id: patientId }, data }));
}

/** Update current medical background. Only the provided fields change. */
export async function updateMedicalBackground(
  patientId: string,
  input: MedicalBackgroundInput,
): Promise<PatientDetail> {
  const existing = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!existing) throw new NotFoundError(PATIENT_NOT_FOUND);
  return toDetail(await prisma.patient.update({ where: { id: patientId }, data: input }));
}

/** Archive a patient. Idempotent: archiving an archived patient succeeds. */
export async function archivePatient(patientId: string): Promise<PatientDetail> {
  const existing = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!existing) throw new NotFoundError(PATIENT_NOT_FOUND);
  return toDetail(
    await prisma.patient.update({ where: { id: patientId }, data: { isArchived: true } }),
  );
}

export async function getAdministrativePatient(patientId: string): Promise<AdministrativePatient> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { ...summarySelect, phone: true, email: true, appointmentEmailConsent: true, appointmentEmailConsentUpdatedAt: true },
  });
  if (!patient) throw new NotFoundError(PATIENT_NOT_FOUND);
  return {
    ...toSummary(patient), phone: patient.phone, email: patient.email,
    appointmentEmailConsent: patient.appointmentEmailConsent,
    appointmentEmailConsentUpdatedAt: patient.appointmentEmailConsentUpdatedAt?.toISOString() ?? null,
  };
}
