// Encounter routes (mounted under /api by app.ts).

import { Hono } from 'hono';

import { createEncounterInputSchema, updateEncounterInputSchema } from '@nexus-med/contracts';

import {
  createEncounter,
  getEncounter,
  listEncounters,
  updateEncounter,
} from './encounters.service';
import { parseOrThrow, readJsonBody } from '../../shared/http/parse';

export const encountersRoutes = new Hono();

encountersRoutes.get('/patients/:patientId/encounters', (c) =>
  c.json(listEncounters(c.req.param('patientId'))),
);

encountersRoutes.post('/patients/:patientId/encounters', async (c) => {
  const input = parseOrThrow(createEncounterInputSchema, await readJsonBody(c));
  const encounter = await createEncounter(c.req.param('patientId'), input);
  return c.json(encounter, 201);
});

encountersRoutes.get('/encounters/:encounterId', (c) =>
  c.json(getEncounter(c.req.param('encounterId'))),
);

encountersRoutes.patch('/encounters/:encounterId', async (c) => {
  const input = parseOrThrow(updateEncounterInputSchema, await readJsonBody(c));
  return c.json(updateEncounter(c.req.param('encounterId'), input));
});
