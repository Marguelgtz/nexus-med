// Hono application factory.
//
// The factory keeps the app testable: tests call createApp().request()
// against the real domain stack and an isolated SQLite database without
// binding a port.

import { Hono } from 'hono';
import { cors } from 'hono/cors';

import { encountersRoutes } from './domains/encounters/encounters.routes';
import { patientsRoutes } from './domains/patients/patients.routes';
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

  app.route('/', healthRoutes);
  app.route('/api', patientsRoutes);
  app.route('/api', encountersRoutes);

  return app;
}

export const app = createApp();
