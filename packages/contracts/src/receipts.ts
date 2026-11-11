import { z } from 'zod';
import { dateSchema, idSchema, isoDateTimeSchema } from './common';
export const RECEIPT_MAX_FILES = 5;
export const RECEIPT_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const RECEIPT_MAX_TOTAL_FILE_BYTES = 24 * 1024 * 1024;
export const RECEIPT_MAX_BODY_BYTES = 25 * 1024 * 1024;
export const createStudyReceiptSchema = z.object({
  title: z.string().trim().min(2).max(200),
  studyDate: dateSchema.nullable().optional(),
  receiptNote: z.string().trim().max(1000).nullable().optional(),
  encounterId: idSchema.nullable().optional(),
  requestId: idSchema.nullable().optional(),
}).strict();
export type CreateStudyReceipt = z.infer<typeof createStudyReceiptSchema>;
export const receiptFileSchema = z.object({ id: idSchema, name: z.string(), mimeType: z.enum(['application/pdf', 'image/jpeg', 'image/png']), size: z.number().int().positive() });
export const studyReceiptSchema = z.object({
  id: idSchema, patient: z.object({ id: idSchema, fullName: z.string() }),
  encounter: z.object({ id: idSchema, occurredAt: isoDateTimeSchema }).nullable(),
  requestId: idSchema.nullable(), title: z.string(), studyDate: dateSchema.nullable(), receiptNote: z.string().nullable(),
  receivedAt: isoDateTimeSchema, reviewedAt: isoDateTimeSchema.nullable(),
  reviewNote: z.string().nullable().optional(), files: z.array(receiptFileSchema),
});
export type StudyReceipt = z.infer<typeof studyReceiptSchema>;
export const receiptQuerySchema = z.object({ patientId: idSchema.optional(), view: z.enum(['administrative', 'medical']).default('medical'), review: z.enum(['pending', 'all']).default('pending') }).strict();
export const reviewReceiptSchema = z.object({ reviewNote: z.string().trim().max(1000).optional() }).strict();

export const receiptOptionsSchema = z.object({
  consultations: z.array(z.object({ id: idSchema, occurredAt: isoDateTimeSchema, type: z.string() })),
  requests: z.array(z.object({ id: idSchema, name: z.string(), encounterId: idSchema.nullable() })),
});
export type ReceiptOptions = z.infer<typeof receiptOptionsSchema>;
