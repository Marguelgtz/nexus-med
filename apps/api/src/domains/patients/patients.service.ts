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
  MedicalBackgroundInput,
  PatientDetail,
  PatientListQuery,
  PatientSummary,
  UpdatePatientInput,
} from '@nexus-med/contracts';

import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError } from '../../shared/http/errors';

const PATIENT_NOT_FOUND = 'Paciente no encontrado';

const summarySelect = {
  id: true,
  fullName: true,
  dateOfBirth: true,
  externalIdentifier: true,
  isArchived: true,
} as const;

export async function listPatients(query: PatientListQuery): Promise<PatientSummary[]> {
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

  return prisma.patient.findMany({
    where: { ...(archived === undefined ? {} : { isArchived: archived }), ...search },
    orderBy: { fullName: 'asc' },
    select: summarySelect,
  });
}

export async function getPatient(patientId: string): Promise<PatientDetail> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError(PATIENT_NOT_FOUND);
  return patient;
}

export async function createPatient(input: CreatePatientInput): Promise<PatientDetail> {
  return prisma.patient.create({ data: input });
}

export async function updatePatient(
  patientId: string,
  input: UpdatePatientInput,
): Promise<PatientDetail> {
  const existing = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!existing) throw new NotFoundError(PATIENT_NOT_FOUND);
  return prisma.patient.update({ where: { id: patientId }, data: input });
}

/** Update current medical background. Only the provided fields change. */
export async function updateMedicalBackground(
  patientId: string,
  input: MedicalBackgroundInput,
): Promise<PatientDetail> {
  const existing = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!existing) throw new NotFoundError(PATIENT_NOT_FOUND);
  return prisma.patient.update({ where: { id: patientId }, data: input });
}

/** Archive a patient. Idempotent: archiving an archived patient succeeds. */
export async function archivePatient(patientId: string): Promise<PatientDetail> {
  const existing = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!existing) throw new NotFoundError(PATIENT_NOT_FOUND);
  return prisma.patient.update({
    where: { id: patientId },
    data: { isArchived: true },
  });
}
