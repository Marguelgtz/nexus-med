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

patientsRoutes.get('/patients', (c) => {
  const query = parseOrThrow(patientListQuerySchema, cleanQuery(c.req.query()));
  return c.json(listPatients(query));
});

patientsRoutes.post('/patients', async (c) => {
  const input = parseOrThrow(createPatientInputSchema, await readJsonBody(c));
  const patient = await createPatient(input);
  return c.json(patient, 201);
});

patientsRoutes.get('/patients/:patientId', (c) => c.json(getPatient(c.req.param('patientId'))));

patientsRoutes.patch('/patients/:patientId', async (c) => {
  const input = parseOrThrow(updatePatientInputSchema, await readJsonBody(c));
  return c.json(updatePatient(c.req.param('patientId'), input));
});

patientsRoutes.patch('/patients/:patientId/medical-background', async (c) => {
  const input = parseOrThrow(medicalBackgroundInputSchema, await readJsonBody(c));
  return c.json(updateMedicalBackground(c.req.param('patientId'), input));
});

patientsRoutes.patch('/patients/:patientId/archive', (c) =>
  c.json(archivePatient(c.req.param('patientId'))),
);
