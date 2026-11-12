// Encounter (consultation) domain operations.
//
// Business rules (docs/WORKFLOWS.md):
// - An encounter belongs to exactly one patient (given in the route).
// - Timeline order is newest first (occurredAt desc), deterministic ties by id.
// - Editing an encounter never changes which patient it belongs to.
// - Encounters are preserved; the product has no destructive delete.

import type {
  CreateEncounterInput,
  EncounterDetail,
  EncounterSummary,
  UpdateEncounterInput,
} from '@nexus-med/contracts';

import { randomUUID } from 'node:crypto';

import { executeAtomicWrite, prisma } from '../../infrastructure/database/runtime-client';
import { NotFoundError } from '../../shared/http/errors';

const ENCOUNTER_NOT_FOUND = 'Consulta no encontrada';
const PATIENT_NOT_FOUND = 'Paciente no encontrado';

// Prisma rows carry Dates; the public contract carries ISO 8601 strings.
// The services serialize at this boundary so API responses always match
// @nexus-med/contracts.
interface EncounterRow {
  id: string;
  patientId: string;
  occurredAt: Date;
  type: string;
  reason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toSummary(row: EncounterRow): EncounterSummary {
  return {
    id: row.id,
    patientId: row.patientId,
    occurredAt: row.occurredAt.toISOString(),
    // Only ever written through the validated API boundary.
    type: row.type as EncounterSummary['type'],
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toDetail(
  row: EncounterRow & {
    historyOfPresentIllness: string | null;
    relevantHistory: string | null;
    physicalExamination: string | null;
    assessment: string | null;
    plan: string | null;
    followUp: string | null;
  },
): EncounterDetail {
  return {
    ...toSummary(row),
    historyOfPresentIllness: row.historyOfPresentIllness,
    relevantHistory: row.relevantHistory,
    physicalExamination: row.physicalExamination,
    assessment: row.assessment,
    plan: row.plan,
    followUp: row.followUp,
  };
}

const summarySelect = {
  id: true,
  patientId: true,
  occurredAt: true,
  type: true,
  reason: true,
  createdAt: true,
  updatedAt: true,
} as const;

async function requirePatient(patientId: string): Promise<void> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    select: { id: true },
  });
  if (!patient) throw new NotFoundError(PATIENT_NOT_FOUND);
}

export async function listEncounters(patientId: string): Promise<EncounterSummary[]> {
  await requirePatient(patientId);
  const rows = await prisma.encounter.findMany({
    where: { patientId },
    orderBy: [{ occurredAt: 'desc' }, { id: 'asc' }],
    select: summarySelect,
  });
  return rows.map(toSummary);
}

export async function createEncounter(
  patientId: string,
  input: CreateEncounterInput,
): Promise<EncounterDetail> {
  await requirePatient(patientId);
  const { studies, ...note } = input;
  if (!studies || studies.length === 0) {
    return toDetail(await prisma.encounter.create({ data: { ...note, patientId } }));
  }
  // IDs and timestamps are generated before the batch so the same ordered
  // write set runs atomically in SQLite and D1.
  const encounterId = randomUUID();
  const timestamp = Date.now();
  const createdAt = new Date(timestamp).toISOString();
  await executeAtomicWrite([
    {
      sql: `INSERT INTO encounters (
        id, patientId, occurredAt, type, reason, historyOfPresentIllness,
        relevantHistory, physicalExamination, assessment, plan, followUp,
        createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values: [
        encounterId,
        patientId,
        new Date(input.occurredAt).toISOString(),
        input.type ?? 'consulta',
        note.reason ?? null,
        note.historyOfPresentIllness ?? null,
        note.relevantHistory ?? null,
        note.physicalExamination ?? null,
        note.assessment ?? null,
        note.plan ?? null,
        note.followUp ?? null,
        createdAt,
        createdAt,
      ],
    },
    ...studies.map((study, index) => {
      const studyTimestamp = new Date(timestamp + index + 1).toISOString();
      return {
        sql: `INSERT INTO study_requests (
          id, patientId, encounterId, category, name, description, status,
          resultNote, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, 'ordered', NULL, ?, ?)`,
        values: [
          randomUUID(),
          patientId,
          encounterId,
          study.category,
          study.name,
          study.description?.trim() || null,
          studyTimestamp,
          studyTimestamp,
        ],
      };
    }),
  ]);

  const created = await prisma.encounter.findUniqueOrThrow({ where: { id: encounterId } });
  return toDetail(created);
}

export async function getEncounter(encounterId: string): Promise<EncounterDetail> {
  const encounter = await prisma.encounter.findUnique({ where: { id: encounterId } });
  if (!encounter) throw new NotFoundError(ENCOUNTER_NOT_FOUND);
  return toDetail(encounter);
}

export async function updateEncounter(
  encounterId: string,
  input: UpdateEncounterInput,
): Promise<EncounterDetail> {
  const existing = await prisma.encounter.findUnique({ where: { id: encounterId } });
  if (!existing) throw new NotFoundError(ENCOUNTER_NOT_FOUND);
  return toDetail(await prisma.encounter.update({ where: { id: encounterId }, data: input }));
}
