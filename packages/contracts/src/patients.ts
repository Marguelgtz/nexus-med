// Patient contracts: request inputs, list query, and response DTOs.

import { z } from 'zod';
import { dateSchema, idSchema, isoDateTimeSchema } from './common';

export const fullNameSchema = z.string().trim().min(1, 'El nombre es obligatorio').max(200);
export const phoneSchema = z.string().trim().min(1).max(30);
export const emailSchema = z.string().trim().email().max(255);
export const externalIdentifierSchema = z.string().trim().min(1).max(100);

/**
 * Free-text medical background. A value of `null` clears the field; an
 * absent field leaves it unchanged (PATCH) or stores blank (POST).
 * Blank means "not recorded", never a confirmed negative finding.
 */
export const backgroundFieldSchema = z.string().trim().max(5000).nullable().optional();

export const medicalBackgroundInputSchema = z
  .object({
    medicalConditions: backgroundFieldSchema,
    previousSurgeries: backgroundFieldSchema,
    allergies: backgroundFieldSchema,
    currentMedications: backgroundFieldSchema,
  })
  .strict();

export type MedicalBackgroundInput = z.infer<typeof medicalBackgroundInputSchema>;

export const createPatientInputSchema = z
  .object({
    fullName: fullNameSchema,
    dateOfBirth: dateSchema.nullable().optional(),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    externalIdentifier: externalIdentifierSchema.optional(),
  })
  .strict();

export type CreatePatientInput = z.infer<typeof createPatientInputSchema>;

export const updatePatientInputSchema = z
  .object({
    fullName: fullNameSchema.optional(),
    // nullable so a date of birth can be cleared explicitly.
    dateOfBirth: dateSchema.nullable().optional(),
    phone: phoneSchema.optional().nullable(),
    email: emailSchema.optional().nullable(),
    externalIdentifier: externalIdentifierSchema.optional().nullable(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdatePatientInput = z.infer<typeof updatePatientInputSchema>;

export const patientListQuerySchema = z
  .object({
    // Free-text search over full name and practice identifier.
    q: z.string().trim().min(1).optional(),
    status: z.enum(['active', 'archived', 'all']).default('active'),
  })
  .strict();

export type PatientListQuery = z.infer<typeof patientListQuerySchema>;

export const patientSummarySchema = z.object({
  id: idSchema,
  fullName: z.string(),
  dateOfBirth: dateSchema.nullable(),
  externalIdentifier: z.string().nullable(),
  isArchived: z.boolean(),
});

export type PatientSummary = z.infer<typeof patientSummarySchema>;

export const patientDetailSchema = z.object({
  id: idSchema,
  fullName: z.string(),
  dateOfBirth: dateSchema.nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  externalIdentifier: z.string().nullable(),
  medicalConditions: z.string().nullable(),
  previousSurgeries: z.string().nullable(),
  allergies: z.string().nullable(),
  currentMedications: z.string().nullable(),
  isArchived: z.boolean(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type PatientDetail = z.infer<typeof patientDetailSchema>;
