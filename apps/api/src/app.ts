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
import { authRoutes } from './domains/auth/auth.routes';
import { emailRoutes } from './domains/email/email.routes';
import { appointmentEmailRoutes } from './domains/email/appointment-email';
import { isTrustedAppOrigin, requireAuthentication } from './domains/auth/authorization';

interface CreateAppOptions {
  /** Unit/integration tests can opt out and exercise domain behavior directly. */
  authentication?: 'required' | 'disabled';
}

export function createApp(options: CreateAppOptions = {}): Hono {
  const app = new Hono();
  const authenticationRequired = options.authentication !== 'disabled';

  app.onError(onErrorHandler);
  app.notFound(onNotFound);

  app.use(
    '*',
    cors({
      origin: (origin, context) => isTrustedAppOrigin(origin, context) ? origin : '',
      allowMethods: ['GET', 'HEAD', 'POST', 'PATCH', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      exposeHeaders: ['X-Retry-After'],
    }),
  );

  app.use('/api/*', async (c, next) => {
    c.header('Cache-Control', 'no-store');
    await next();
  });

  app.use('/api/*', async (c, next) => {
    const unsafeMethod = !['GET', 'HEAD', 'OPTIONS'].includes(c.req.method);
    const origin = c.req.header('Origin');
    if (unsafeMethod && ((authenticationRequired && !origin) || (origin && !isTrustedAppOrigin(origin, c)))) {
      return c.json({ error: { code: 'FORBIDDEN', message: 'Origen de solicitud no permitido.' } }, 403);
    }
    await next();
  });

  if (authenticationRequired) app.use('/api/*', requireAuthentication);

  app.route('/', healthRoutes);
  app.route('/api', authRoutes);
  app.route('/api', emailRoutes);
  app.route('/api', appointmentEmailRoutes);
  app.route('/api', patientsRoutes);
  app.route('/api', encountersRoutes);
  app.route('/api', appointmentsRoutes);
  app.route('/api', studiesRoutes);
  app.route('/api', documentsRoutes);
  app.route('/api', receiptsRoutes);

  return app;
}

export const app = createApp();
