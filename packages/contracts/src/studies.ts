// Study request contracts (UI_SPEC §7.3, decision U-15).
//
// A study request is the order for one specific study, created with its
// originating encounter and immutable after that: only the status and an
// optional result note can change (ordered → completed → reviewed, with
// ordered → reviewed allowed). No edit, no delete — the originating
// encounter is the record of what was ordered.
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

/** The specific study, in the doctor's words (≤ 200 chars). */
export const studyDescriptionSchema = z.string().trim().min(2).max(200);

/** The doctor's observation about the result — verbatim, never an
 * interpretation (≤ 1,000 chars). */
export const studyResultNoteSchema = z.string().trim().max(1000);

/**
 * One study request. `encounter` is embedded (id + occurrence + reason) so
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
  encounter: studyEncounterSchema,
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
