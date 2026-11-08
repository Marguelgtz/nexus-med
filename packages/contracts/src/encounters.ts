// Encounter (consultation) contracts.

import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';
import { studyInputSchema } from './studies';

/** A clinical note section entered by the doctor, verbatim. */
export const noteSectionSchema = z.string().trim().max(10000);

/**
 * Fixed list of encounter types (decision D-024): what actually happened.
 * Mirrors the appointment type list — the PLANNED type lives on the
 * appointment, the ACTUAL type here. `consulta` is the default; all
 * pre-expansion records are consultations.
 */
export const encounterTypeSchema = z.enum([
  'consulta',
  'procedimiento',
  'visita_domicilio',
  'urgencia',
]);
export type EncounterType = z.infer<typeof encounterTypeSchema>;

export const encounterSectionsSchema = {
  reason: noteSectionSchema.nullable().optional(),
  historyOfPresentIllness: noteSectionSchema.nullable().optional(),
  relevantHistory: noteSectionSchema.nullable().optional(),
  physicalExamination: noteSectionSchema.nullable().optional(),
  assessment: noteSectionSchema.nullable().optional(),
  plan: noteSectionSchema.nullable().optional(),
  followUp: noteSectionSchema.nullable().optional(),
} as const;

export const createEncounterInputSchema = z
  .object({
    // When the consultation happened (distinct from creation time).
    occurredAt: isoDateTimeSchema,
    // What actually happened (default `consulta`, D-024).
    type: encounterTypeSchema.optional(),
    // Studies ordered during this consultation (UI_SPEC §7.3); created with
    // the encounter in the same save. Absent/empty = no studies.
    studies: z.array(studyInputSchema).optional(),
    ...encounterSectionsSchema,
  })
  .strict();

export type CreateEncounterInput = z.infer<typeof createEncounterInputSchema>;

export const updateEncounterInputSchema = z
  .object({
    occurredAt: isoDateTimeSchema.optional(),
    // What actually happened (default `consulta`, D-024).
    type: encounterTypeSchema.optional(),
    ...encounterSectionsSchema,
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  });

export type UpdateEncounterInput = z.infer<typeof updateEncounterInputSchema>;

/** One row in the patient's chronological clinical timeline. */
export const encounterSummarySchema = z.object({
  id: idSchema,
  patientId: idSchema,
  occurredAt: isoDateTimeSchema,
  // What actually happened (default `consulta`, D-024).
  type: encounterTypeSchema,
  reason: z.string().nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});

export type EncounterSummary = z.infer<typeof encounterSummarySchema>;

export const encounterDetailSchema = encounterSummarySchema.extend({
  historyOfPresentIllness: z.string().nullable(),
  relevantHistory: z.string().nullable(),
  physicalExamination: z.string().nullable(),
  assessment: z.string().nullable(),
  plan: z.string().nullable(),
  followUp: z.string().nullable(),
});

export type EncounterDetail = z.infer<typeof encounterDetailSchema>;
