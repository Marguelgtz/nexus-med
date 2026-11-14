// Appointment routes (mounted under /api by app.ts, UI_SPEC §7.1).
//
// GET    /appointments?from=&to=          range listing (calendar)
// GET    /patients/:patientId/appointments
// POST   /patients/:patientId/appointments
// GET    /appointments/:appointmentId
// PATCH  /appointments/:appointmentId     reschedule / edit
// POST   /appointments/:appointmentId/complete
// POST   /appointments/:appointmentId/cancel
// POST   /appointments/:appointmentId/link-encounter

import { Hono } from 'hono';

import {
  appointmentRangeQuerySchema,
  receptionInputSchema,
  completeAppointmentInputSchema,
  createAppointmentInputSchema,
  linkEncounterInputSchema,
  updateAppointmentInputSchema,
} from '@nexus-med/contracts';

import {
  listClinicDoctors,
  cancelAppointment,
  completeAppointment,
  createAppointment,
  getAppointment,
  linkEncounter,
  listAppointmentsInRange,
  listPatientAppointments,
  updateAppointment,
  updateReception,
  listReception,
} from './appointments.service';
import { parseOrThrow, readJsonBody } from '../../shared/http/parse';

export const appointmentsRoutes = new Hono();

appointmentsRoutes.get('/appointments', async (c) => {
  const query = Object.fromEntries(Object.entries(c.req.query()).filter(([, v]) => v !== ''));
  const { from, to, doctorId } = parseOrThrow(appointmentRangeQuerySchema, query);
  const appointments = await listAppointmentsInRange(from, to, doctorId);
  return c.json(appointments);
});

appointmentsRoutes.get('/patients/:patientId/appointments', async (c) => {
  const appointments = await listPatientAppointments(c.req.param('patientId'));
  return c.json(appointments);
});

appointmentsRoutes.post('/patients/:patientId/appointments', async (c) => {
  const input = parseOrThrow(createAppointmentInputSchema, await readJsonBody(c));
  const appointment = await createAppointment(c.req.param('patientId'), input);
  return c.json(appointment, 201);
});

appointmentsRoutes.get('/appointments/:appointmentId', async (c) => {
  const appointment = await getAppointment(c.req.param('appointmentId'));
  return c.json(appointment);
});

appointmentsRoutes.patch('/appointments/:appointmentId', async (c) => {
  const input = parseOrThrow(updateAppointmentInputSchema, await readJsonBody(c));
  const appointment = await updateAppointment(c.req.param('appointmentId'), input);
  return c.json(appointment);
});

appointmentsRoutes.post('/appointments/:appointmentId/complete', async (c) => {
  const input = parseOrThrow(completeAppointmentInputSchema, await readJsonBody(c));
  const appointment = await completeAppointment(c.req.param('appointmentId'), input);
  return c.json(appointment);
});

appointmentsRoutes.post('/appointments/:appointmentId/cancel', async (c) => {
  const appointment = await cancelAppointment(c.req.param('appointmentId'));
  return c.json(appointment);
});

appointmentsRoutes.post('/appointments/:appointmentId/link-encounter', async (c) => {
  const input = parseOrThrow(linkEncounterInputSchema, await readJsonBody(c));
  const appointment = await linkEncounter(c.req.param('appointmentId'), input);
  return c.json(appointment);
});

appointmentsRoutes.post('/appointments/:appointmentId/reception', async (c) => {
  const input = parseOrThrow(receptionInputSchema, await readJsonBody(c));
  return c.json(await updateReception(c.req.param('appointmentId'), input));
});

appointmentsRoutes.get('/reception', async c => c.json(await listReception()));

appointmentsRoutes.get('/clinic/doctors', async c => c.json(await listClinicDoctors()));
