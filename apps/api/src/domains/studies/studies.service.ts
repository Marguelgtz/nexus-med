import { clinicScope, currentClinicId, currentActorId } from '../../shared/clinic';
// Study request domain operations (UI_SPEC §7.3, U-15).
//
// Business rules:
// - A study request belongs to one patient and may have no encounter. If an
//   encounter is supplied, it must belong to the same patient.
// - Encounter creation keeps nested study creation atomic. Standalone and
//   existing-encounter requests also commit all rows in one transaction.
// - Requests cannot be edited or deleted; status and result note retain the
//   existing O-005 behavior until clinical semantics are validated.
// - Status transitions are explicit and one-directional:
//   ordered → completed, ordered → reviewed, completed → reviewed.
//   `reviewed` is final. A backward or repeated transition is a 409.

import type {
  CreatePatientStudiesInput,
  StudyInput,
  StudyRequest,
  StudyStatus,
  UpdateStudyInput,
} from '@nexus-med/contracts';

import { randomUUID } from 'node:crypto';

import { executeAtomicWrite, prisma } from '../../infrastructure/database/runtime-client';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/http/errors';

const STUDY_NOT_FOUND = 'Estudio no encontrado';
const PATIENT_NOT_FOUND = 'Paciente no encontrado';
const ENCOUNTER_NOT_FOUND = 'Consulta no encontrada';

// Prisma rows carry Dates and raw enum strings; the public contract carries
// ISO 8601 strings and validated enums. Services serialize at this boundary.
interface StudyRow {
  id: string;
  patientId: string;
  encounter: { id: string; occurredAt: Date; reason: string | null } | null;
  category: string;
  name: string;
  description: string | null;
  status: string;
  resultNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toStudyRequest(row: StudyRow): StudyRequest {
  return {
    id: row.id,
    patientId: row.patientId,
    encounter: row.encounter
      ? {
          id: row.encounter.id,
          occurredAt: row.encounter.occurredAt.toISOString(),
          reason: row.encounter.reason,
        }
      : null,
    // Only ever written through the validated API boundary.
    category: row.category as StudyRequest['category'],
    name: row.name,
    description: row.description,
    status: row.status as StudyRequest['status'],
    resultNote: row.resultNote,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const rowInclude = {
  encounter: { select: { id: true, occurredAt: true, reason: true } },
} as const;

async function findStudy(id: string): Promise<StudyRow> {
  const row = await prisma.studyRequest.findUnique({ where: { ...clinicScope(), id }, include: rowInclude });
  if (!row) throw new NotFoundError(STUDY_NOT_FOUND);
  return row;
}

/** All studies of one patient, newest first; optional status values are ORed. */
export async function listPatientStudies(
  patientId: string,
  statuses?: StudyStatus[],
): Promise<StudyRequest[]> {
  const patient = await prisma.patient.findUnique({ where: { ...clinicScope(), id: patientId }, select: { id: true } });
  if (!patient) throw new NotFoundError(PATIENT_NOT_FOUND);
  const rows = await prisma.studyRequest.findMany({
    where: { ...clinicScope(),
      patientId,
      ...(statuses ? { status: { in: statuses } } : {}),
    },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    include: rowInclude,
  });
  return rows.map(toStudyRequest);
}

/** Add studies to an existing encounter. The patient is derived from the
 *  encounter, and all rows commit or roll back together. */
export async function createEncounterStudies(
  encounterId: string,
  studies: StudyInput[],
): Promise<StudyRequest[]> {
  const encounter = await prisma.encounter.findUnique({
    where: { ...clinicScope(), id: encounterId },
    select: { id: true, patientId: true },
  });
  if (!encounter) throw new NotFoundError(ENCOUNTER_NOT_FOUND);

  return createStudies(encounter.patientId, encounter.id, studies);
}

export async function createPatientStudies(
  patientId: string,
  input: CreatePatientStudiesInput,
): Promise<StudyRequest[]> {
  const patient = await prisma.patient.findUnique({ where: { ...clinicScope(), id: patientId }, select: { id: true } });
  if (!patient) throw new NotFoundError(PATIENT_NOT_FOUND);

  if (input.encounterId) {
    const encounter = await prisma.encounter.findUnique({
      where: { ...clinicScope(), id: input.encounterId },
      select: { id: true, patientId: true },
    });
    if (!encounter) throw new NotFoundError(ENCOUNTER_NOT_FOUND);
    if (encounter.patientId !== patientId) {
      throw new ValidationError('La consulta pertenece a otro paciente', {
        encounterId: ['La consulta pertenece a otro paciente'],
      });
    }
  }

  return createStudies(patientId, input.encounterId ?? null, input.studies);
}

async function createStudies(
  patientId: string,
  encounterId: string | null,
  studies: StudyInput[],
): Promise<StudyRequest[]> {
  if (!studies.length) return [];

  const rowsToCreate = studies.map((study) => ({ id: randomUUID(), study }));
  const ids = rowsToCreate.map(({ id }) => id);
  const timestamp = Date.now();
  await executeAtomicWrite(
    rowsToCreate.map(({ id, study }, index) => {
      const createdAt = new Date(timestamp + index).toISOString();
      return {
        sql: `INSERT INTO study_requests (
          id, patientId, encounterId, category, name, description, status,
          resultNote, createdAt, updatedAt, clinicId, orderedById
        ) VALUES (?, ?, ?, ?, ?, ?, 'ordered', NULL, ?, ?, ?, ?)`,
        values: [
          id,
          patientId,
          encounterId,
          study.category,
          study.name,
          study.description?.trim() || null,
          createdAt,
          createdAt, currentClinicId(), currentActorId(),
        ],
      };
    }),
  );

  const rows = await prisma.studyRequest.findMany({ where: { ...clinicScope(), id: { in: ids } }, include: rowInclude });
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  return ids.map((id) => {
    const row = rowsById.get(id);
    if (!row) throw new Error('A committed study request could not be reloaded.');
    return toStudyRequest(row);
  });
}

/** All studies ordered during one encounter (the encounter-detail section). */
export async function listEncounterStudies(encounterId: string): Promise<StudyRequest[]> {
  const encounter = await prisma.encounter.findUnique({ where: { ...clinicScope(), id: encounterId }, select: { id: true } });
  if (!encounter) throw new NotFoundError(ENCOUNTER_NOT_FOUND);
  const rows = await prisma.studyRequest.findMany({
    where: { ...clinicScope(), encounterId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    include: rowInclude,
  });
  return rows.map(toStudyRequest);
}

/**
 * Advance a study's status (the only mutation). The target status must be a
 * forward transition from the current one; the optional note is stored with
 * it (a note on an already-reviewed study is not accepted — reviewed is
 * final).
 */
export async function updateStudyStatus(studyId: string, input: UpdateStudyInput): Promise<StudyRequest> {
  const existing = await findStudy(studyId);
  const from = existing.status;
  const to = input.status;
  if (from === to) {
    throw new ConflictError(
      from === 'reviewed'
        ? 'El estudio ya está revisado y no puede modificarse.'
        : 'El estudio ya está en ese estado.',
    );
  }
  const allowed: Record<string, string[]> = {
    ordered: ['completed', 'reviewed'],
    completed: ['reviewed'],
    reviewed: [],
  };
  if (!allowed[from]?.includes(to)) {
    throw new ConflictError('Los estados del estudio solo avanzan: ordenada → completada → revisada.');
  }
  const row = await prisma.studyRequest.update({
    where: { ...clinicScope(), id: studyId, status: from },
    data: {
      status: to,
      ...(to === 'reviewed' ? { reviewedById: currentActorId() } : {}),
      ...(input.resultNote !== undefined ? { resultNote: input.resultNote } : {}),
    },
    include: rowInclude,
  });
  return toStudyRequest(row);
}
