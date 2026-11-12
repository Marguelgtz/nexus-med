import { z } from 'zod';
import { idSchema, isoDateTimeSchema } from './common';

export const appointmentEmailEventSchema = z.enum(['confirmation', 'reschedule', 'cancellation']);
export type AppointmentEmailEvent = z.infer<typeof appointmentEmailEventSchema>;

export const sendAppointmentEmailInputSchema = z.object({
  event: appointmentEmailEventSchema,
}).strict();
export type SendAppointmentEmailInput = z.infer<typeof sendAppointmentEmailInputSchema>;

export const appointmentEmailStatusSchema = z.object({
  id: idSchema,
  event: appointmentEmailEventSchema,
  subject: z.string(),
  status: z.enum(['queued', 'captured', 'sending', 'sent', 'failed', 'uncertain', 'superseded', 'simulated']),
  attempts: z.number().int().nonnegative(),
  createdAt: isoDateTimeSchema,
  sentAt: isoDateTimeSchema.nullable(),
  errorCategory: z.string().nullable(),
});
export type AppointmentEmailStatus = z.infer<typeof appointmentEmailStatusSchema>;

export const retryAppointmentEmailInputSchema = z.object({
  acknowledgePossibleDuplicate: z.boolean().default(false),
}).strict();
export type RetryAppointmentEmailInput = z.infer<typeof retryAppointmentEmailInputSchema>;
