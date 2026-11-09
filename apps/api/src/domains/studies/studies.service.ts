// Study request domain operations (UI_SPEC §7.3, U-15).
//
// Business rules:
// - A study request belongs to one patient and one encounter (the
//   consultation during which it was ordered). It is created with that
//   encounter — inside the encounter-creation transaction, so the two
//   commit atomically. There is no standalone create endpoint and no edit
//   or delete: after creation only the status and an optional result note
//   change.
// - Status transitions are explicit and one-directional:
//   ordered → completed, ordered → reviewed, completed → reviewed.
//   `reviewed` is final. A backward or repeated transition is a 409.

import type {
  StudyInput,
  StudyRequest,
  StudyStatus,
  UpdateStudyInput,
} from '@nexus-med/contracts';

import { prisma } from '../../infrastructure/database/prisma';
import { ConflictError, NotFoundError } from '../../shared/http/errors';

const STUDY_NOT_FOUND = 'Estudio no encontrado';
const PATIENT_NOT_FOUND = 'Paciente no encontrado';
const ENCOUNTER_NOT_FOUND = 'Consulta no encontrada';

// Prisma rows carry Dates and raw enum strings; the public contract carries
// ISO 8601 strings and validated enums. Services serialize at this boundary.
interface StudyRow {
  id: string;
  patientId: string;
  encounter: { id: string; occurredAt: Date; reason: string | null };
  category: string;
  description: string;
  status: string;
  resultNote: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toStudyRequest(row: StudyRow): StudyRequest {
  return {
    id: row.id,
    patientId: row.patientId,
    encounter: {
      id: row.encounter.id,
      occurredAt: row.encounter.occurredAt.toISOString(),
      reason: row.encounter.reason,
    },
    // Only ever written through the validated API boundary.
    category: row.category as StudyRequest['category'],
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
  const row = await prisma.studyRequest.findUnique({ where: { id }, include: rowInclude });
  if (!row) throw new NotFoundError(STUDY_NOT_FOUND);
  return row;
}

/** All studies of one patient, newest first; optional status values are ORed. */
export async function listPatientStudies(
  patientId: string,
  statuses?: StudyStatus[],
): Promise<StudyRequest[]> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new NotFoundError(PATIENT_NOT_FOUND);
  const rows = await prisma.studyRequest.findMany({
    where: {
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
    where: { id: encounterId },
    select: { id: true, patientId: true },
  });
  if (!encounter) throw new NotFoundError(ENCOUNTER_NOT_FOUND);

  const rows = await prisma.$transaction(async (tx) => {
    const created: StudyRow[] = [];
    for (const study of studies) {
      created.push(
        await tx.studyRequest.create({
          data: {
            patientId: encounter.patientId,
            encounterId: encounter.id,
            category: study.category,
            description: study.description,
          },
          include: rowInclude,
        }),
      );
    }
    return created;
  });
  return rows.map(toStudyRequest);
}

/** All studies ordered during one encounter (the encounter-detail section). */
export async function listEncounterStudies(encounterId: string): Promise<StudyRequest[]> {
  const encounter = await prisma.encounter.findUnique({ where: { id: encounterId }, select: { id: true } });
  if (!encounter) throw new NotFoundError(ENCOUNTER_NOT_FOUND);
  const rows = await prisma.studyRequest.findMany({
    where: { encounterId },
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
    where: { id: studyId },
    data: {
      status: to,
      ...(input.resultNote !== undefined ? { resultNote: input.resultNote } : {}),
    },
    include: rowInclude,
  });
  return toStudyRequest(row);
}
