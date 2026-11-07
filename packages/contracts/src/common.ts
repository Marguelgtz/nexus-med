// Shared primitives for API contracts (browser-safe, no Node APIs).

import { z } from 'zod';

export const idSchema = z.string().min(1);

/** Calendar date, YYYY-MM-DD. Stored as a date-only string on purpose:
 *  date fields must not shift when interpreted in a timezone. */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected a date in YYYY-MM-DD format');

/** ISO-8601 date-time with timezone offset or Z (e.g. 2026-09-03T10:15:00-06:00). */
export const isoDateTimeSchema = z.iso.datetime({ offset: true });

/**
 * Consistent API error envelope. `message` is user-facing (Spanish in the UI
 * layer, neutral in the API); `fieldErrors` maps input field names to the
 * validation messages for that field.
 */
export const errorEnvelopeSchema = z.object({
  error: z.object({
    code: z.enum(['VALIDATION_ERROR', 'NOT_FOUND', 'CONFLICT', 'INTERNAL_ERROR']),
    message: z.string(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;
export type ErrorEnvelopeCode = ErrorEnvelope['error']['code'];
