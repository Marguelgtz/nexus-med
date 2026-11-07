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

import { prisma } from '../../infrastructure/database/prisma';
import { NotFoundError } from '../../shared/http/errors';

const ENCOUNTER_NOT_FOUND = 'Consulta no encontrada';
const PATIENT_NOT_FOUND = 'Paciente no encontrado';

const summarySelect = {
  id: true,
  patientId: true,
  occurredAt: true,
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
  return prisma.encounter.findMany({
    where: { patientId },
    orderBy: [{ occurredAt: 'desc' }, { id: 'asc' }],
    select: summarySelect,
  });
}

export async function createEncounter(
  patientId: string,
  input: CreateEncounterInput,
): Promise<EncounterDetail> {
  await requirePatient(patientId);
  return prisma.encounter.create({
    data: { ...input, patientId },
  });
}

export async function getEncounter(encounterId: string): Promise<EncounterDetail> {
  const encounter = await prisma.encounter.findUnique({ where: { id: encounterId } });
  if (!encounter) throw new NotFoundError(ENCOUNTER_NOT_FOUND);
  return encounter;
}

export async function updateEncounter(
  encounterId: string,
  input: UpdateEncounterInput,
): Promise<EncounterDetail> {
  const existing = await prisma.encounter.findUnique({ where: { id: encounterId } });
  if (!existing) throw new NotFoundError(ENCOUNTER_NOT_FOUND);
  return prisma.encounter.update({ where: { id: encounterId }, data: input });
}
