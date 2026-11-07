// Liveness endpoint.

import { Hono } from 'hono';

export const healthRoutes = new Hono();

healthRoutes.get('/', (c) =>
  c.json({ status: 'ok', service: 'nexus-med-api', time: new Date().toISOString() }),
);
