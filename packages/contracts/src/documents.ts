// Structured, browser-printable prescriptions and reports (UI_SPEC §7.4).

import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

export const medicalDocumentKindSchema = z.enum(['prescription', 'report']);
export type MedicalDocumentKind = z.infer<typeof medicalDocumentKindSchema>;

export const prescriptionLineInputSchema = z.object({
  medication: z.string().trim().min(1, 'Indica el medicamento.').max(200, 'El medicamento admite hasta 200 caracteres.'),
  dose: z.string().trim().max(100).nullable().optional(),
  route: z.string().trim().max(80).nullable().optional(),
  frequency: z.string().trim().max(120).nullable().optional(),
  duration: z.string().trim().max(100).nullable().optional(),
  instructions: z.string().trim().max(500).nullable().optional(),
}).strict();
export type PrescriptionLineInput = z.infer<typeof prescriptionLineInputSchema>;

const optionalTitle = z.string().trim().max(120).nullable().optional();
const optionalEncounterId = idSchema.nullable().optional();

export const createPrescriptionInputSchema = z.object({
  kind: z.literal('prescription'),
  encounterId: optionalEncounterId,
  title: optionalTitle,
  body: z.string().trim().max(2000).nullable().optional(),
  lines: z.array(prescriptionLineInputSchema).min(1).max(50),
}).strict();
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionInputSchema>;

export const createReportInputSchema = z.object({
  kind: z.literal('report'),
  encounterId: optionalEncounterId,
  title: optionalTitle,
  body: z.string().trim().min(1, 'Escribe el texto del informe.').max(20000, 'El informe admite hasta 20,000 caracteres.'),
}).strict();
export type CreateReportInput = z.infer<typeof createReportInputSchema>;

export const createMedicalDocumentInputSchema = z.discriminatedUnion('kind', [
  createPrescriptionInputSchema,
  createReportInputSchema,
]);
export type CreateMedicalDocumentInput = z.infer<typeof createMedicalDocumentInputSchema>;
export const updateMedicalDocumentInputSchema = z.discriminatedUnion('kind', [
  createPrescriptionInputSchema.extend({ expectedVersion: z.number().int().positive().optional() }),
  createReportInputSchema.extend({ expectedVersion: z.number().int().positive().optional() }),
]);
export type UpdateMedicalDocumentInput = z.infer<typeof updateMedicalDocumentInputSchema>;

const documentPatientSchema = z.object({
  id: idSchema,
  fullName: z.string(),
  dateOfBirth: z.string().nullable(),
});
const documentEncounterSchema = z.object({
  id: idSchema,
  occurredAt: isoDateTimeSchema,
  reason: z.string().nullable(),
});
const documentLineSchema = z.object({
  id: idSchema,
  position: z.number().int().nonnegative(),
  medication: z.string(),
  dose: z.string().nullable(),
  route: z.string().nullable(),
  frequency: z.string().nullable(),
  duration: z.string().nullable(),
  instructions: z.string().nullable(),
});

const documentBaseSchema = z.object({
  version: z.number().int().positive().optional(),
  author: z.object({ id: idSchema, name: z.string() }).nullable().optional(),
  id: idSchema,
  patientId: idSchema,
  patient: documentPatientSchema,
  encounter: documentEncounterSchema.nullable(),
  title: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export const medicalDocumentSchema = z.discriminatedUnion('kind', [
  documentBaseSchema.extend({ kind: z.literal('prescription'), body: z.string().nullable(), lines: z.array(documentLineSchema) }),
  documentBaseSchema.extend({ kind: z.literal('report'), body: z.string(), lines: z.array(documentLineSchema) }),
]);
export type MedicalDocument = z.infer<typeof medicalDocumentSchema>;
