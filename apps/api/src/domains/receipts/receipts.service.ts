import { clinicScope, currentClinicId, currentActorId } from '../../shared/clinic';
import { randomUUID } from 'node:crypto';

import type { CreateStudyReceipt } from '@nexus-med/contracts';
import type { z } from 'zod';
import type { receiptQuerySchema } from '@nexus-med/contracts';
import { executeAtomicWrite, prisma } from '../../infrastructure/database/runtime-client';
import { removeStudyFiles, storeStudyFiles, readStudyFile } from '../../infrastructure/storage/study-files';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/http/errors';
const include = { patient: { select: { id: true, fullName: true } }, encounter: { select: { id: true, occurredAt: true } }, files: true } as const;
type Row = Awaited<ReturnType<typeof prisma.studyReceipt.findMany<{ include: typeof include }>>>[number];
function dto(row: Row, administrative = false) {
  return { id: row.id, patient: row.patient, encounter: row.encounter ? { id: row.encounter.id, occurredAt: row.encounter.occurredAt.toISOString() } : null,
    requestId: row.requestId, title: row.title, studyDate: row.studyDate, receiptNote: row.receiptNote,
    receivedAt: row.receivedAt.toISOString(), reviewedAt: row.reviewedAt?.toISOString() ?? null,
    ...(!administrative ? { reviewNote: row.reviewNote } : {}),
    files: row.files.map(({ id, name, mimeType, size }) => ({ id, name, mimeType, size })) };
}
export async function listReceipts(query: z.infer<typeof receiptQuerySchema>) {
  const rows = await prisma.studyReceipt.findMany({ where: { ...clinicScope(), ...(query.patientId ? { patientId: query.patientId } : {}), ...(query.review === 'pending' ? { reviewedAt: null } : {}) }, include, orderBy: [{ receivedAt: 'desc' }, { id: 'asc' }] });
  return rows.map(row => dto(row, query.view === 'administrative'));
}
export async function createReceipt(patientId: string, input: CreateStudyReceipt, files: File[]) {
  const patient = await prisma.patient.findUnique({ where: { ...clinicScope(), id: patientId } });
  if (!patient) throw new NotFoundError('Paciente no encontrado');
  let encounterId = input.encounterId ?? null;
  if (input.requestId) {
    const request = await prisma.studyRequest.findUnique({ where: { ...clinicScope(), id: input.requestId } });
    if (!request || request.patientId !== patientId) throw new ValidationError('La solicitud no pertenece al paciente.');
    if (encounterId && request.encounterId && request.encounterId !== encounterId) throw new ValidationError('La solicitud pertenece a otra consulta.');
    encounterId ??= request.encounterId;
  }
  if (encounterId) {
    const encounter = await prisma.encounter.findUnique({ where: { ...clinicScope(), id: encounterId }, select: { patientId: true } });
    if (!encounter || encounter.patientId !== patientId) throw new ValidationError('La consulta no pertenece al paciente.');
  }
  const stored = await storeStudyFiles(files);
  const receiptId = randomUUID();
  const receivedAt = new Date().toISOString();
  try {
    await executeAtomicWrite([
      {
        sql: `INSERT INTO study_receipts (
          id, patientId, encounterId, requestId, title, studyDate, receiptNote,
          receivedAt, reviewedAt, reviewNote, clinicId, receivedById
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
        values: [
          receiptId,
          patientId,
          encounterId,
          input.requestId ?? null,
          input.title,
          input.studyDate ?? null,
          input.receiptNote ?? null,
          receivedAt, currentClinicId(), currentActorId(),
        ],
      },
      ...stored.map((file) => ({
        sql: `INSERT INTO study_receipt_files (
          id, receiptId, storageKey, name, mimeType, size
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        values: [randomUUID(), receiptId, file.storageKey, file.name, file.mimeType, file.size],
      })),
    ]);
    const row = await prisma.studyReceipt.findUniqueOrThrow({ where: { ...clinicScope(), id: receiptId }, include });
    return dto(row, true);
  } catch (error) { await removeStudyFiles(stored.map(file => file.storageKey)); throw error; }
}
export async function reviewReceipt(id: string, reviewNote?: string) {
  const existing = await prisma.studyReceipt.findUnique({ where: { ...clinicScope(), id } });
  if (!existing) throw new NotFoundError('Estudio recibido no encontrado');
  const changed = await prisma.studyReceipt.updateMany({ where: { ...clinicScope(), id, reviewedAt: null }, data: { reviewedById: currentActorId(), reviewedAt: new Date(), reviewNote: reviewNote?.trim() || null } });
  if (!changed.count) throw new ConflictError('El estudio ya fue revisado. Actualiza la bandeja.');
  return dto(await prisma.studyReceipt.findUniqueOrThrow({ where: { ...clinicScope(), id }, include }));
}
export async function getReceiptFile(id: string) {
  const file = await prisma.studyReceiptFile.findUnique({ where: { id, receipt: clinicScope() } });
  if (!file) throw new NotFoundError('Archivo no encontrado');
  return { file, bytes: await readStudyFile(file.storageKey) };
}

export async function receiptOptions(patientId: string, includeClinicalRequests = true) {
  if (!await prisma.patient.findUnique({ where: { ...clinicScope(), id: patientId }, select: { id: true } })) throw new NotFoundError('Paciente no encontrado');
  const [consultations, requests] = await Promise.all([
    prisma.encounter.findMany({ where: { ...clinicScope(), patientId }, select: { id: true, occurredAt: true, type: true }, orderBy: { occurredAt: 'desc' } }),
    includeClinicalRequests
      ? prisma.studyRequest.findMany({ where: { ...clinicScope(), patientId }, select: { id: true, name: true, encounterId: true }, orderBy: { createdAt: 'desc' } })
      : Promise.resolve([]),
  ]);
  return { consultations: consultations.map(row => ({ ...row, occurredAt: row.occurredAt.toISOString() })), requests };
}
