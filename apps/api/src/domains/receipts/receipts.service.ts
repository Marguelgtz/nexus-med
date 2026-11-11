import type { CreateStudyReceipt } from '@nexus-med/contracts';
import type { z } from 'zod';
import type { receiptQuerySchema } from '@nexus-med/contracts';
import { prisma } from '../../infrastructure/database/runtime-client';
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
  const rows = await prisma.studyReceipt.findMany({ where: { ...(query.patientId ? { patientId: query.patientId } : {}), ...(query.review === 'pending' ? { reviewedAt: null } : {}) }, include, orderBy: [{ receivedAt: 'desc' }, { id: 'asc' }] });
  return rows.map(row => dto(row, query.view === 'administrative'));
}
export async function createReceipt(patientId: string, input: CreateStudyReceipt, files: File[]) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw new NotFoundError('Paciente no encontrado');
  let encounterId = input.encounterId ?? null;
  if (input.requestId) {
    const request = await prisma.studyRequest.findUnique({ where: { id: input.requestId } });
    if (!request || request.patientId !== patientId) throw new ValidationError('La solicitud no pertenece al paciente.');
    if (encounterId && request.encounterId && request.encounterId !== encounterId) throw new ValidationError('La solicitud pertenece a otra consulta.');
    encounterId ??= request.encounterId;
  }
  if (encounterId) {
    const encounter = await prisma.encounter.findUnique({ where: { id: encounterId }, select: { patientId: true } });
    if (!encounter || encounter.patientId !== patientId) throw new ValidationError('La consulta no pertenece al paciente.');
  }
  const stored = await storeStudyFiles(files);
  try {
    const row = await prisma.studyReceipt.create({ data: { patientId, encounterId, requestId: input.requestId ?? null, title: input.title, studyDate: input.studyDate ?? null, receiptNote: input.receiptNote ?? null, files: { create: stored } }, include });
    return dto(row, true);
  } catch (error) { await removeStudyFiles(stored.map(file => file.storageKey)); throw error; }
}
export async function reviewReceipt(id: string, reviewNote?: string) {
  const existing = await prisma.studyReceipt.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Estudio recibido no encontrado');
  const changed = await prisma.studyReceipt.updateMany({ where: { id, reviewedAt: null }, data: { reviewedAt: new Date(), reviewNote: reviewNote?.trim() || null } });
  if (!changed.count) throw new ConflictError('El estudio ya fue revisado. Actualiza la bandeja.');
  return dto(await prisma.studyReceipt.findUniqueOrThrow({ where: { id }, include }));
}
export async function getReceiptFile(id: string) {
  const file = await prisma.studyReceiptFile.findUnique({ where: { id } });
  if (!file) throw new NotFoundError('Archivo no encontrado');
  return { file, bytes: await readStudyFile(file.storageKey) };
}

export async function receiptOptions(patientId: string) {
  if (!await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } })) throw new NotFoundError('Paciente no encontrado');
  const [consultations, requests] = await Promise.all([
    prisma.encounter.findMany({ where: { patientId }, select: { id: true, occurredAt: true, type: true }, orderBy: { occurredAt: 'desc' } }),
    prisma.studyRequest.findMany({ where: { patientId }, select: { id: true, name: true, encounterId: true }, orderBy: { createdAt: 'desc' } }),
  ]);
  return { consultations: consultations.map(row => ({ ...row, occurredAt: row.occurredAt.toISOString() })), requests };
}
