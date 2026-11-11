// Doctor-authored prescription and report operations (UI_SPEC §7.4).

import type {
  CreateMedicalDocumentInput,
  MedicalDocument,
  PrescriptionLineInput,
  UpdateMedicalDocumentInput,
} from '@nexus-med/contracts';

import { prisma } from '../../infrastructure/database/runtime-client';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/http/errors';

const PATIENT_NOT_FOUND = 'Paciente no encontrado';
const DOCUMENT_NOT_FOUND: Record<'prescription' | 'report', string> = {
  prescription: 'Receta no encontrada',
  report: 'Informe no encontrado',
};

const documentInclude = {
  patient: { select: { id: true, fullName: true, dateOfBirth: true } },
  encounter: { select: { id: true, occurredAt: true, reason: true } },
  lines: { orderBy: { position: 'asc' as const } },
} as const;

interface DocumentRow {
  id: string;
  patientId: string;
  patient: { id: string; fullName: string; dateOfBirth: string | null };
  encounter: { id: string; occurredAt: Date; reason: string | null } | null;
  kind: string;
  title: string | null;
  body: string | null;
  lines: Array<{
    id: string;
    position: number;
    medication: string;
    dose: string | null;
    route: string | null;
    frequency: string | null;
    duration: string | null;
    instructions: string | null;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

function toMedicalDocument(row: DocumentRow): MedicalDocument {
  const base = {
    id: row.id,
    patientId: row.patientId,
    patient: row.patient,
    encounter: row.encounter
      ? { ...row.encounter, occurredAt: row.encounter.occurredAt.toISOString() }
      : null,
    title: row.title,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
  const lines = row.lines.map((line) => ({ ...line }));
  if (row.kind === 'prescription') return { ...base, kind: 'prescription', body: row.body, lines };
  return { ...base, kind: 'report', body: row.body ?? '', lines };
}

function lineData(lines: PrescriptionLineInput[]) {
  return lines.map((line, position) => ({
    position,
    medication: line.medication,
    dose: line.dose || null,
    route: line.route || null,
    frequency: line.frequency || null,
    duration: line.duration || null,
    instructions: line.instructions || null,
  }));
}

async function validateAssociation(patientId: string, encounterId: string | null | undefined) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new NotFoundError(PATIENT_NOT_FOUND);
  if (!encounterId) return;
  const encounter = await prisma.encounter.findUnique({
    where: { id: encounterId },
    select: { id: true, patientId: true },
  });
  if (!encounter || encounter.patientId !== patientId) {
    throw new ValidationError('La consulta relacionada debe pertenecer al mismo paciente.', {
      encounterId: ['Selecciona una consulta de este paciente.'],
    });
  }
}

/** Documents for the overview, newest first. */
export async function listPatientDocuments(patientId: string): Promise<MedicalDocument[]> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new NotFoundError(PATIENT_NOT_FOUND);
  const rows = await prisma.medicalDocument.findMany({
    where: { patientId },
    orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    include: documentInclude,
  });
  return rows.map((row) => toMedicalDocument(row));
}

export async function getMedicalDocument(documentId: string): Promise<MedicalDocument> {
  const row = await prisma.medicalDocument.findUnique({ where: { id: documentId }, include: documentInclude });
  if (!row) throw new NotFoundError('Documento no encontrado');
  return toMedicalDocument(row);
}

export async function createMedicalDocument(
  patientId: string,
  input: CreateMedicalDocumentInput,
): Promise<MedicalDocument> {
  await validateAssociation(patientId, input.encounterId);
  const row = await prisma.medicalDocument.create({
    data: {
      patientId,
      encounterId: input.encounterId || null,
      kind: input.kind,
      title: input.title || null,
      body: input.body || null,
      ...(input.kind === 'prescription' ? { lines: { create: lineData(input.lines) } } : {}),
    },
    include: documentInclude,
  });
  return toMedicalDocument(row);
}

/** Replace the editable form contents atomically; patient and kind are fixed. */
export async function updateMedicalDocument(
  documentId: string,
  input: UpdateMedicalDocumentInput,
): Promise<MedicalDocument> {
  const existing = await prisma.medicalDocument.findUnique({
    where: { id: documentId },
    select: { id: true, kind: true, patientId: true },
  });
  if (!existing) throw new NotFoundError('Documento no encontrado');
  if (existing.kind !== input.kind) {
    throw new ConflictError('El tipo del documento no se puede cambiar.');
  }
  await validateAssociation(existing.patientId, input.encounterId);

  const row = await prisma.$transaction(async (tx) => {
    if (input.kind === 'prescription') {
      await tx.prescriptionLine.deleteMany({ where: { documentId } });
    }
    await tx.medicalDocument.update({
      where: { id: documentId },
      data: {
        encounterId: input.encounterId || null,
        title: input.title || null,
        body: input.body || null,
      },
    });
    if (input.kind === 'prescription') {
      for (const line of lineData(input.lines)) {
        await tx.prescriptionLine.create({ data: { ...line, documentId } });
      }
    }
    return tx.medicalDocument.findUniqueOrThrow({ where: { id: documentId }, include: documentInclude });
  });
  return toMedicalDocument(row);
}

export function documentNotFoundMessage(kind: 'prescription' | 'report'): string {
  return DOCUMENT_NOT_FOUND[kind];
}
