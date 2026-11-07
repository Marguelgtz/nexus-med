// Encounter (consultation) contracts.

import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';

/** A clinical note section entered by the doctor, verbatim. */
export const noteSectionSchema = z.string().trim().max(10000);

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
    ...encounterSectionsSchema,
  })
  .strict();

export type CreateEncounterInput = z.infer<typeof createEncounterInputSchema>;

export const updateEncounterInputSchema = z
  .object({
    occurredAt: isoDateTimeSchema.optional(),
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
