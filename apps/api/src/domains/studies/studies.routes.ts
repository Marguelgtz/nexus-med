// Study request routes (mounted under /api by app.ts, UI_SPEC §7.3).
//
// GET    /patients/:patientId/studies
// GET    /encounters/:encounterId/studies
// PATCH  /studies/:studyId              advance status (+ optional note)
//
// There is deliberately no create route: studies are created with their
// originating encounter (POST /patients/:patientId/encounters with a
// `studies` array) and never edited or deleted afterwards (U-15).

import { Hono } from 'hono';

import { updateStudyInputSchema } from '@nexus-med/contracts';

import {
  listEncounterStudies,
  listPatientStudies,
  updateStudyStatus,
} from './studies.service';
import { parseOrThrow, readJsonBody } from '../../shared/http/parse';

export const studiesRoutes = new Hono();

studiesRoutes.get('/patients/:patientId/studies', async (c) => {
  const studies = await listPatientStudies(c.req.param('patientId'));
  return c.json(studies);
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
