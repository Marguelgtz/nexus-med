// Study request contracts (UI_SPEC §7.3, decision U-15).
//
// A study request belongs to one patient and may have an optional immutable
// encounter association. Existing statuses are retained until the physician
// defines whether `completed` means performed or result available.
//
// `category` is a fixed list (Q-NX-02: to be confirmed with the doctor);
// `description` carries the specific study (e.g. "Biometría hemática").

import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';

/** Fixed list of study categories (UI_SPEC §7.3). */
export const studyCategorySchema = z.enum([
  'laboratorio',
  'imagenologia',
  'rayos_x',
  'ecg',
  'ecografia',
  'otro',
]);
export type StudyCategory = z.infer<typeof studyCategorySchema>;

/** Fixed list of study statuses. `reviewed` is final. */
export const studyStatusSchema = z.enum(['ordered', 'completed', 'reviewed']);
export type StudyStatus = z.infer<typeof studyStatusSchema>;

/** Studies remain pending until a doctor reviews them. */
export const PENDING_STUDY_STATUSES = ['ordered', 'completed'] as const satisfies readonly StudyStatus[];

/**
 * Optional repeatable filter for a patient's studies. Multiple statuses are
 * ORed, so `?status=ordered&status=completed` returns all unreviewed work.
 */
export const listPatientStudiesQuerySchema = z
  .object({ status: z.array(studyStatusSchema).min(1).optional() })
  .strict();
export type ListPatientStudiesQuery = z.infer<typeof listPatientStudiesQuerySchema>;

/** The specific study, in the doctor's words (≤ 200 chars). */
export const studyDescriptionSchema = z.string().trim().min(2).max(200);

/** The doctor's observation about the result — verbatim, never an
 * interpretation (≤ 1,000 chars). */
export const studyResultNoteSchema = z.string().trim().max(1000);

/**
 * One study request. The optional `encounter` is embedded (id + occurrence + reason) so
 * the overview pending card and the encounter detail can render their rows
 * without a second fetch per study.
 */
const studyEncounterSchema = z.object({
  id: idSchema,
  occurredAt: isoDateTimeSchema,
  reason: z.string().nullable(),
});

export const studyRequestSchema = z.object({
  id: idSchema,
  patientId: idSchema,
  encounter: studyEncounterSchema.nullable(),
  category: studyCategorySchema,
  description: studyDescriptionSchema,
  status: studyStatusSchema,
  resultNote: studyResultNoteSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type StudyRequest = z.infer<typeof studyRequestSchema>;

/** One study row entered in the consultation form (U-15). */
export const studyInputSchema = z
  .object({
    category: studyCategorySchema,
    description: studyDescriptionSchema,
  })
  .strict();
export type StudyInput = z.infer<typeof studyInputSchema>;

/** Add one or more studies to an existing encounter. Patient association is
 * derived from that encounter by the API; callers cannot choose it. */
export const createEncounterStudiesInputSchema = z
  .object({ studies: z.array(studyInputSchema).min(1) })
  .strict();
export type CreateEncounterStudiesInput = z.infer<typeof createEncounterStudiesInputSchema>;

/** Create requests from a patient context with an optional same-patient
 * encounter association. The patient ID is always derived from the route. */
export const createPatientStudiesInputSchema = z
  .object({
    encounterId: idSchema.optional(),
    studies: z.array(studyInputSchema).min(1),
  })
  .strict();
export type CreatePatientStudiesInput = z.infer<typeof createPatientStudiesInputSchema>;

/**
 * Advance a study's status (the only mutation). `status` is required —
 * every save sets a status; the optional note is stored with it.
 */
export const updateStudyInputSchema = z
  .object({
    status: studyStatusSchema,
    resultNote: studyResultNoteSchema.nullable().optional(),
  })
  .strict();
export type UpdateStudyInput = z.infer<typeof updateStudyInputSchema>;
