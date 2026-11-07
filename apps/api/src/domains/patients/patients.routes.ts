// Patient routes (mounted under /api by app.ts).

import { Hono } from 'hono';

import {
  createPatientInputSchema,
  medicalBackgroundInputSchema,
  patientListQuerySchema,
  updatePatientInputSchema,
} from '@nexus-med/contracts';

import {
  archivePatient,
  createPatient,
  getPatient,
  listPatients,
  updateMedicalBackground,
  updatePatient,
} from './patients.service';
import { cleanQuery, parseOrThrow, readJsonBody } from '../../shared/http/parse';

export const patientsRoutes = new Hono();

patientsRoutes.get('/patients', async (c) => {
  const query = parseOrThrow(patientListQuerySchema, cleanQuery(c.req.query()));
  const patients = await listPatients(query);
  return c.json(patients);
});

patientsRoutes.post('/patients', async (c) => {
  const input = parseOrThrow(createPatientInputSchema, await readJsonBody(c));
  const patient = await createPatient(input);
  return c.json(patient, 201);
});

patientsRoutes.get('/patients/:patientId', async (c) => {
  const patient = await getPatient(c.req.param('patientId'));
  return c.json(patient);
});

patientsRoutes.patch('/patients/:patientId', async (c) => {
  const input = parseOrThrow(updatePatientInputSchema, await readJsonBody(c));
  const patient = await updatePatient(c.req.param('patientId'), input);
  return c.json(patient);
});

patientsRoutes.patch('/patients/:patientId/medical-background', async (c) => {
  const input = parseOrThrow(medicalBackgroundInputSchema, await readJsonBody(c));
  const patient = await updateMedicalBackground(c.req.param('patientId'), input);
  return c.json(patient);
});

patientsRoutes.patch('/patients/:patientId/archive', async (c) => {
  const patient = await archivePatient(c.req.param('patientId'));
  return c.json(patient);
});
