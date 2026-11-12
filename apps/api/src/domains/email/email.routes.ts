import { Hono } from 'hono';
import { getAuthRuntime } from '../auth/auth.context';
import { decryptEmailPayload } from './outbox';

export const emailRoutes = new Hono();

emailRoutes.get('/dev/emails', async c => {
  const runtime = getAuthRuntime();
  if (!runtime.localRuntime) return c.json({ error: { code: 'NOT_FOUND', message: 'No encontrado.' } }, 404);

  const rows = await runtime.database.emailOutbox.findMany({
    take: 50,
    orderBy: { createdAt: 'desc' },
    select: { id: true, kind: true, recipient: true, subject: true, encryptedBody: true, status: true, createdAt: true },
  });
  const messages = await Promise.all(rows.map(async row => ({
    id: row.id,
    kind: row.kind,
    recipient: row.recipient,
    subject: row.subject,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    ...(await decryptEmailPayload(runtime.secret, row.encryptedBody)),
  })));

  c.header('Cache-Control', 'no-store');
  c.header('Referrer-Policy', 'no-referrer');
  return c.json({ messages });
});

