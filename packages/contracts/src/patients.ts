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
    expectedVersion: z.number().int().positive().optional(),
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
    appointmentEmailConsent: z.boolean().default(false),
    externalIdentifier: externalIdentifierSchema.optional(),
  })
  .strict()
  .refine(value => !value.appointmentEmailConsent || Boolean(value.email), {
    message: 'Agrega un correo antes de aceptar mensajes de citas',
    path: ['appointmentEmailConsent'],
  });

export type CreatePatientInput = z.infer<typeof createPatientInputSchema>;

export const updatePatientInputSchema = z
  .object({
    expectedVersion: z.number().int().positive().optional(),
    fullName: fullNameSchema.optional(),
    // nullable so a date of birth can be cleared explicitly.
    dateOfBirth: dateSchema.nullable().optional(),
    phone: phoneSchema.optional().nullable(),
    email: emailSchema.optional().nullable(),
    appointmentEmailConsent: z.boolean().optional(),
    externalIdentifier: externalIdentifierSchema.optional().nullable(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })
  .refine(value => value.appointmentEmailConsent !== true || (value.email !== null), {
    message: 'Agrega o conserva un correo antes de aceptar mensajes de citas',
    path: ['appointmentEmailConsent'],
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
  version: z.number().int().positive().optional(),
  id: idSchema,
  fullName: z.string(),
  dateOfBirth: dateSchema.nullable(),
  externalIdentifier: z.string().nullable(),
  isArchived: z.boolean(),
});

export type PatientSummary = z.infer<typeof patientSummarySchema>;

export const patientDetailSchema = z.object({
  version: z.number().int().positive().optional(),
  id: idSchema,
  fullName: z.string(),
  dateOfBirth: dateSchema.nullable(),
  phone: z.string().nullable(),
  email: z.string().nullable(),
  appointmentEmailConsent: z.boolean(),
  appointmentEmailConsentUpdatedAt: isoDateTimeSchema.nullable(),
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

/** Administrative projection: never contains medical background or notes. */
export const administrativePatientSchema = patientSummarySchema.extend({
  phone: z.string().nullable(),
  email: z.string().nullable(),
  appointmentEmailConsent: z.boolean(),
  appointmentEmailConsentUpdatedAt: isoDateTimeSchema.nullable(),
});
export type AdministrativePatient = z.infer<typeof administrativePatientSchema>;
