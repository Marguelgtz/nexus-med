import { symmetricEncrypt } from 'better-auth/crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '../src/generated/prisma/client';
import { dispatchEmailOutbox } from '../src/domains/email/dispatcher';
import { createLocalPrismaClient } from '../src/infrastructure/database/prisma';

const Database = createRequire(import.meta.url)('better-sqlite3');

const secret = 'email-dispatch-test-secret-'.repeat(3);
const recipient = 'allowed@example.test';
const now = new Date('2026-11-11T12:00:00.000Z');

async function fakeDatabase(options: { kind?: string; appointment?: Record<string, unknown> | null } = {}) {
  const encryptedBody = await symmetricEncrypt({ key: secret, data: JSON.stringify({ text: 'Aviso de prueba', html: '<p>Aviso de prueba</p>' }) });
  let status = 'queued';
  let attempts = 0;
  const candidate = {
    id: 'mail-1',
    kind: options.kind ?? 'verify_email',
    appointmentId: options.kind === 'appointment' ? 'appointment-1' : null,
    appointmentVersion: options.kind === 'appointment' ? '2026-11-11T11:00:00.000Z' : null,
    appointmentEvent: options.kind === 'appointment' ? 'confirmation' : null,
    recipient,
    subject: 'Aviso de prueba',
    encryptedBody,
    attempts: 0,
  };

  const updateMany = vi.fn(async ({ where, data }: { where: { status?: string }; data: Record<string, unknown> }) => {
    if (where.status === status) {
      if (typeof data.status === 'string') status = data.status;
      if (data.attempts && typeof data.attempts === 'object' && 'increment' in data.attempts) attempts += Number(data.attempts.increment);
      return { count: 1 };
    }
    return { count: 0 };
  });
  const database = {
    emailOutbox: {
      updateMany,
      findMany: vi.fn(async () => [{ ...candidate, attempts }]),
    },
    appointment: {
      findUnique: vi.fn(async () => options.appointment ?? null),
    },
  } as unknown as PrismaClient;
  return { database, updateMany, getStatus: () => status };
}

describe('email outbox dispatcher', () => {
  it('delivers security mail behind five ineligible appointment messages without sending them', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'nexus-email-recovery-'));
    const databasePath = path.join(directory, 'test.sqlite');
    const sqlite = new Database(databasePath);
    // Use the real committed outbox schema while keeping this regression
    // independent from the shared integration database and clinic fixtures.
    sqlite.exec(await readFile(new URL('../../../prisma/migrations/20261111211721_auth_email_outbox/migration.sql', import.meta.url), 'utf8'));
    sqlite.exec('ALTER TABLE email_outbox ADD COLUMN appointmentId TEXT; ALTER TABLE email_outbox ADD COLUMN appointmentVersion TEXT; ALTER TABLE email_outbox ADD COLUMN appointmentEvent TEXT;');
    sqlite.close();
    const database = createLocalPrismaClient(databasePath);
    try {
      const encryptedBody = await symmetricEncrypt({ key: secret, data: JSON.stringify({ text: 'Aviso sintético', html: '<p>Aviso sintético</p>' }) });
      await database.emailOutbox.createMany({ data: [
        ...Array.from({ length: 5 }, (_, index) => ({
          id: `blocked-${index}`, kind: 'appointment', recipient: 'not-allowlisted@example.test', subject: 'Cita sintética', encryptedBody,
          idempotencyKey: `blocked-${index}`, createdAt: new Date(now.getTime() - 10_000 + index), availableAt: now,
        })),
        { id: 'verification', kind: 'verify_email', recipient, subject: 'Verificación sintética', encryptedBody, idempotencyKey: 'verification', createdAt: now, availableAt: now },
      ] });
      const sendEmail = vi.fn(async () => undefined);
      const result = await dispatchEmailOutbox(database, secret, { allowedRecipients: [], sendEmail }, now);
      expect(result.sent).toBe(1);
      expect(sendEmail).toHaveBeenCalledOnce();
      expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: recipient }));
      expect(await database.emailOutbox.count({ where: { kind: 'appointment', status: 'queued', attempts: 0 } })).toBe(5);
      expect((await database.emailOutbox.findUniqueOrThrow({ where: { id: 'verification' } })).status).toBe('sent');
    } finally {
      await database.$disconnect();
      await rm(directory, { recursive: true, force: true });
    }
  });

  it('sends account security mail without a patient-message allowlist', async () => {
    const fake = await fakeDatabase();
    const sendEmail = vi.fn(async () => undefined);
    const result = await dispatchEmailOutbox(fake.database, secret, { allowedRecipients: [], sendEmail }, now);

    expect(result.sent).toBe(1);
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(fake.getStatus()).toBe('sent');
  });

  it('leaves appointment mail queued when its recipient is not allowlisted', async () => {
    const fake = await fakeDatabase({
      kind: 'appointment',
      appointment: {
        status: 'scheduled',
        updatedAt: new Date('2026-11-11T11:00:00.000Z'),
        patient: { email: recipient, appointmentEmailConsent: true, appointmentEmailConsentUpdatedAt: now },
      },
    });
    const sendEmail = vi.fn(async () => undefined);
    const result = await dispatchEmailOutbox(fake.database, secret, { allowedRecipients: ['other@example.test'], sendEmail }, now);

    expect(result.skippedNotAllowlisted).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(fake.getStatus()).toBe('queued');
  });

  it('sends current appointment mail to an allowlisted recipient', async () => {
    const fake = await fakeDatabase({
      kind: 'appointment',
      appointment: {
        status: 'scheduled',
        updatedAt: new Date('2026-11-11T11:00:00.000Z'),
        patient: { email: recipient, appointmentEmailConsent: true, appointmentEmailConsentUpdatedAt: now },
      },
    });
    const sendEmail = vi.fn(async () => undefined);
    const result = await dispatchEmailOutbox(fake.database, secret, { allowedRecipients: [recipient], sendEmail }, now);

    expect(result.sent).toBe(1);
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(fake.getStatus()).toBe('sent');
  });

  it('supersedes appointment mail if consent or appointment version changed', async () => {
    const fake = await fakeDatabase({
      kind: 'appointment',
      appointment: {
        status: 'scheduled',
        updatedAt: new Date('2026-11-11T11:30:00.000Z'),
        patient: { email: recipient, appointmentEmailConsent: true, appointmentEmailConsentUpdatedAt: now },
      },
    });
    const sendEmail = vi.fn(async () => undefined);
    const result = await dispatchEmailOutbox(fake.database, secret, { allowedRecipients: [recipient], sendEmail }, now);

    expect(result.superseded).toBe(1);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(fake.getStatus()).toBe('superseded');
  });

  it('schedules a bounded retry for an explicit temporary SMTP response', async () => {
    const fake = await fakeDatabase();
    const sendEmail = vi.fn(async () => { throw Object.assign(new Error('temporary SMTP response'), { responseCode: 451 }); });
    const result = await dispatchEmailOutbox(fake.database, secret, { allowedRecipients: [recipient], sendEmail }, now);

    expect(result.retried).toBe(1);
    expect(fake.getStatus()).toBe('queued');
  });

  it('marks an ambiguous transport failure uncertain instead of replaying it', async () => {
    const fake = await fakeDatabase();
    const sendEmail = vi.fn(async () => { throw new Error('connection closed'); });
    const result = await dispatchEmailOutbox(fake.database, secret, { allowedRecipients: [recipient], sendEmail }, now);

    expect(result.uncertain).toBe(1);
    expect(fake.getStatus()).toBe('uncertain');
  });
});
