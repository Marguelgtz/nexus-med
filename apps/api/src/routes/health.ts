// Liveness endpoint.

import { Hono } from 'hono';

export const healthRoutes = new Hono();

healthRoutes.get('/health', (c) =>
  c.json({ status: 'ok', service: 'nexus-med-api', time: new Date().toISOString() }),
);
