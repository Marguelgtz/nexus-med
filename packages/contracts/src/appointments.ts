import { z } from 'zod';

import { idSchema, isoDateTimeSchema } from './common';
import { fullNameSchema } from './patients';

/**
 * Appointments (UI_SPEC §7.1, decisions D-028/D-029).
 *
 * `startAt` is an ISO 8601 instant (like `occurredAt`); the UI renders it in
 * the practice timezone. `type` is what was PLANNED (a consultation may
 * turn out to be something else — the actual type lives on the encounter).
 * Status transitions are explicit and one-directional:
 * scheduled → completed | cancelled, cancelled → scheduled (reschedule).
 * `completed` is final (only an optional encounter link may be added).
 */

/** Fixed list of appointment types (validated at the API boundary). */
export const appointmentTypeSchema = z.enum([
  'consulta',
  'procedimiento',
  'visita_domicilio',
  'urgencia',
]);
export type AppointmentType = z.infer<typeof appointmentTypeSchema>;

/** Fixed list of appointment statuses. */
export const appointmentStatusSchema = z.enum([
  'scheduled',
  'completed',
  'cancelled',
]);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

/**
 * Planned duration in minutes. 5–480 (8 h); the UI steps by 5 minutes —
 * the API only enforces the hard bounds.
 */
export const durationMinutesSchema = z.number().int().min(5).max(480);

/** A patient reference embedded in an appointment (calendar + lists). */
const appointmentPatientSchema = z.object({
  id: idSchema,
  fullName: fullNameSchema,
  email: z.string().nullable().optional(),
  appointmentEmailConsent: z.boolean().optional(),
});
export type AppointmentPatient = z.infer<typeof appointmentPatientSchema>;

/**
 * One appointment. Summary and detail share the same shape — the detail
 * page adds no data beyond what the row shows (patient reached by link).
 */
export const appointmentSchema = z.object({
  version: z.number().int().positive().optional(),
  doctor: z.object({ id: idSchema, name: z.string() }).nullable().optional(),
  id: idSchema,
  patient: appointmentPatientSchema,
  startAt: isoDateTimeSchema,
  durationMinutes: durationMinutesSchema,
  type: appointmentTypeSchema,
  status: appointmentStatusSchema,
  arrivedAt: isoDateTimeSchema.nullable().default(null),
  attentionStartedAt: isoDateTimeSchema.nullable().default(null),
  actualDurationMinutes: durationMinutesSchema.nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  linkedEncounterId: idSchema.nullable(),
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema,
});
export type Appointment = z.infer<typeof appointmentSchema>;

/** Query params for the range listing (both bounds required, `from < to`). */
export const appointmentRangeQuerySchema = z
  .object({
    doctorId: idSchema.optional(),
    from: isoDateTimeSchema,
    to: isoDateTimeSchema,
  })
  .refine((v) => v.from < v.to, {
    message: 'from must be earlier than to',
  });
export type AppointmentRangeQuery = z.infer<typeof appointmentRangeQuerySchema>;

/** Create a scheduled appointment for a patient. */
export const createAppointmentInputSchema = z
  .object({
    doctorId: idSchema.nullable().optional(),
    startAt: isoDateTimeSchema,
    durationMinutes: durationMinutesSchema,
    type: appointmentTypeSchema,
  })
  .strict();
export type CreateAppointmentInput = z.infer<typeof createAppointmentInputSchema>;

/**
 * Reschedule / edit. All fields optional, at least one required. Saving a
 * CANCELLED appointment re-activates it as scheduled (Reprogramar).
 * Completed appointments cannot be edited (409).
 */
export const updateAppointmentInputSchema = z
  .object({
    expectedVersion: z.number().int().positive(),
    doctorId: idSchema.nullable().optional(),
    startAt: isoDateTimeSchema,
    durationMinutes: durationMinutesSchema,
    type: appointmentTypeSchema,
  })
  .partial()
  .refine(
    (v) => v.startAt !== undefined || v.durationMinutes !== undefined || v.type !== undefined || v.doctorId !== undefined,
    { message: 'Indica al menos un campo para guardar' },
  );
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentInputSchema>;

/** Complete a scheduled appointment. Both fields optional — completing
 * as-is is a valid doctor choice, not an API error. */
export const completeAppointmentInputSchema = z
  .object({
    actualDurationMinutes: durationMinutesSchema,
    encounterId: idSchema,
  })
  .partial()
  .strict();
export type CompleteAppointmentInput = z.infer<typeof completeAppointmentInputSchema>;

/** Link an encounter to an appointment that has no link yet (scheduled or
 * completed). The link is the only relationship — the note is never copied. */
export const linkEncounterInputSchema = z
  .object({
    encounterId: idSchema,
  })
  .strict();
export type LinkEncounterInput = z.infer<typeof linkEncounterInputSchema>;

/** Reception is separate from appointment completion and clinical notes. */
export const receptionInputSchema = z.object({
  action: z.enum(['arrive', 'start', 'undoArrival']),
}).strict();
export type ReceptionInput = z.infer<typeof receptionInputSchema>;

export const clinicDoctorSchema = z.object({ id: idSchema, name: z.string() });
export type ClinicDoctor = z.infer<typeof clinicDoctorSchema>;
