// Study request routes (mounted under /api by app.ts, UI_SPEC §7.3).
//
// POST   /encounters/:encounterId/studies  add studies to an existing encounter
// POST   /patients/:patientId/studies     create patient-level study requests
// GET    /patients/:patientId/studies?status= (repeatable filter)
// GET    /encounters/:encounterId/studies
// PATCH  /studies/:studyId              advance status (+ optional note)

import { Hono } from 'hono';

import {
  createEncounterStudiesInputSchema,
  createPatientStudiesInputSchema,
  listPatientStudiesQuerySchema,
  updateStudyInputSchema,
} from '@nexus-med/contracts';

import {
  createEncounterStudies,
  createPatientStudies,
  listEncounterStudies,
  listPatientStudies,
  updateStudyStatus,
} from './studies.service';
import { parseOrThrow, readJsonBody } from '../../shared/http/parse';

export const studiesRoutes = new Hono();

studiesRoutes.post('/patients/:patientId/studies', async (c) => {
  const input = parseOrThrow(createPatientStudiesInputSchema, await readJsonBody(c));
  const studies = await createPatientStudies(c.req.param('patientId'), input);
  return c.json(studies, 201);
});

studiesRoutes.get('/patients/:patientId/studies', async (c) => {
  const statusValues = c.req.queries('status');
  const otherQuery = Object.fromEntries(
    Object.entries(c.req.query()).filter(([key]) => key !== 'status'),
  );
  const query = parseOrThrow(listPatientStudiesQuerySchema, {
    ...otherQuery,
    ...(statusValues?.length ? { status: statusValues } : {}),
  });
  const studies = await listPatientStudies(c.req.param('patientId'), query.status);
  return c.json(studies);
});

studiesRoutes.post('/encounters/:encounterId/studies', async (c) => {
  const input = parseOrThrow(createEncounterStudiesInputSchema, await readJsonBody(c));
  const studies = await createEncounterStudies(c.req.param('encounterId'), input.studies);
  return c.json(studies, 201);
});

studiesRoutes.get('/encounters/:encounterId/studies', async (c) => {
  const studies = await listEncounterStudies(c.req.param('encounterId'));
  return c.json(studies);
});

studiesRoutes.patch('/studies/:studyId', async (c) => {
  const input = parseOrThrow(updateStudyInputSchema, await readJsonBody(c));
  const study = await updateStudyStatus(c.req.param('studyId'), input);
  return c.json(study);
});
