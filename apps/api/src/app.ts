// Hono application factory.
//
// The factory keeps the app testable: tests call createApp().request()
// against the real domain stack and an isolated SQLite database without
// binding a port.

import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { appointmentsRoutes } from './domains/appointments/appointments.routes';
import { encountersRoutes } from './domains/encounters/encounters.routes';
import { documentsRoutes } from './domains/documents/documents.routes';
import { patientsRoutes } from './domains/patients/patients.routes';
import { studiesRoutes } from './domains/studies/studies.routes';
import { receiptsRoutes } from './domains/receipts/receipts.routes';
import { healthRoutes } from './routes/health';
import { onErrorHandler, onNotFound } from './shared/http/errors';

// The only browser origin of the local prototype. Server-side (SSR) calls do
// not go through browser CORS; this constrains direct browser access to the
// local frontend.
const ALLOWED_ORIGINS = ['http://127.0.0.1:3000', 'http://localhost:3000'];

export function createApp(): Hono {
  const app = new Hono();

  app.onError(onErrorHandler);
  app.notFound(onNotFound);

  app.use(
    '*',
    cors({
      origin: ALLOWED_ORIGINS,
      allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type'],
    }),
  );

  app.use('/api/*', async (c, next) => {
    const origin = c.req.header('Origin');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method) && origin && !ALLOWED_ORIGINS.includes(origin)) {
      return c.json({ error: { code: 'VALIDATION_ERROR', message: 'Origen de solicitud no permitido.' } }, 403);
    }
    await next();
  });

  app.route('/', healthRoutes);
  app.route('/api', patientsRoutes);
  app.route('/api', encountersRoutes);
  app.route('/api', appointmentsRoutes);
  app.route('/api', studiesRoutes);
  app.route('/api', documentsRoutes);
  app.route('/api', receiptsRoutes);

  return app;
}

export const app = createApp();
