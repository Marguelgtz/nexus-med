import nodemailer from 'nodemailer';
import type { PrismaClient } from '../../generated/prisma/client';
import { decryptEmailPayload } from './outbox';

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 5;
const LEASE_MS = 60_000;

export interface EmailDispatchConfiguration {
  senderEmail?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpTlsMode?: string;
  smtpUsername?: string;
  smtpPassword?: string;
  allowedRecipients: string[];
  sendEmail?: (message: {
    from: { name: string; address: string };
    to: string;
    subject: string;
    text: string;
    html: string;
  }) => Promise<void>;
}

export interface EmailDispatchResult {
  sent: number;
  retried: number;
  failed: number;
  uncertain: number;
  superseded: number;
  skippedNotAllowlisted: number;
}

type AppointmentContext = {
  status: string;
  updatedAt: Date;
  patient: {
    email: string | null;
    appointmentEmailConsent: boolean;
    appointmentEmailConsentUpdatedAt: Date | null;
  };
};

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function responseCode(error: unknown): number | null {
  if (typeof error !== 'object' || error === null || !('responseCode' in error)) return null;
  const code = Number(error.responseCode);
  return Number.isInteger(code) ? code : null;
}

function appointmentIsCurrent(
  row: { appointmentEvent: string | null; appointmentVersion: string | null; recipient: string },
  appointment: AppointmentContext | null,
): boolean {
  if (!appointment || !row.appointmentEvent || !row.appointmentVersion) return false;
  if (!appointment.patient.appointmentEmailConsent || !appointment.patient.email) return false;
  if (normalizeEmail(appointment.patient.email) !== normalizeEmail(row.recipient)) return false;
  if (appointment.updatedAt.toISOString() !== row.appointmentVersion) return false;
  return row.appointmentEvent === 'cancellation'
    ? appointment.status === 'cancelled'
    : appointment.status === 'scheduled';
}

async function getAppointmentContext(database: PrismaClient, appointmentId: string): Promise<AppointmentContext | null> {
  return database.appointment.findUnique({
    where: { id: appointmentId },
    select: {
      status: true,
      updatedAt: true,
      patient: { select: { email: true, appointmentEmailConsent: true, appointmentEmailConsentUpdatedAt: true } },
    },
  });
}

function makeTransporter(senderEmail: string, config: EmailDispatchConfiguration) {
  const host = config.smtpHost?.trim();
  const port = config.smtpPort ?? 465;
  const tlsMode = config.smtpTlsMode ?? 'implicit';
  const username = config.smtpUsername?.trim();
  const password = config.smtpPassword?.trim();
  if (
    !host || /[\r\n]/.test(host) ||
    !Number.isInteger(port) || port < 1 || port > 65_535 || port === 25 ||
    (tlsMode !== 'implicit' && tlsMode !== 'starttls') ||
    !username || !password
  ) {
    throw new Error('SMTP transport configuration is incomplete or unsupported.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: tlsMode === 'implicit',
    requireTLS: tlsMode === 'starttls',
    auth: { user: username, pass: password },
    tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    pool: false,
    logger: false,
    debug: false,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });
}

/**
 * Dispatch a small bounded batch. Queued appointment messages are validated
 * against current consent, address and appointment version immediately
 * before SMTP. Expired sends are marked uncertain rather than replayed.
 */
export async function dispatchEmailOutbox(
  database: PrismaClient,
  secret: string,
  config: EmailDispatchConfiguration,
  now = new Date(),
): Promise<EmailDispatchResult> {
  const result: EmailDispatchResult = {
    sent: 0,
    retried: 0,
    failed: 0,
    uncertain: 0,
    superseded: 0,
    skippedNotAllowlisted: 0,
  };

  const expired = await database.emailOutbox.updateMany({
    where: { status: 'sending', leaseExpiresAt: { lte: now } },
    data: { status: 'uncertain', leaseExpiresAt: null, lastError: 'smtp_result_uncertain' },
  });
  result.uncertain += expired.count;

  const senderEmail = config.senderEmail?.trim().toLowerCase();
  const smtpConfigured = Boolean(
    senderEmail && config.smtpHost?.trim() && config.smtpUsername?.trim() && config.smtpPassword?.trim(),
  );
  if (!smtpConfigured && !config.sendEmail) return result;

  const allowlist = new Set(config.allowedRecipients.map(normalizeEmail).filter(Boolean));
  const candidates = await database.emailOutbox.findMany({
    where: { status: 'queued', availableAt: { lte: now }, kind: { in: ['verify_email', 'reset_password', 'invitation', 'appointment'] } },
    take: BATCH_SIZE,
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      kind: true,
      appointmentId: true,
      appointmentVersion: true,
      appointmentEvent: true,
      recipient: true,
      subject: true,
      encryptedBody: true,
      attempts: true,
    },
  });

  for (const candidate of candidates) {
    if (candidate.kind === 'appointment' && !allowlist.has(normalizeEmail(candidate.recipient))) {
      result.skippedNotAllowlisted += 1;
      continue;
    }

    if (candidate.kind === 'appointment' && candidate.appointmentId) {
      const current = await getAppointmentContext(database, candidate.appointmentId);
      if (!appointmentIsCurrent(candidate, current)) {
        await database.emailOutbox.updateMany({
          where: { id: candidate.id, status: 'queued' },
          data: { status: 'superseded', lastError: 'appointment_or_consent_changed' },
        });
        result.superseded += 1;
        continue;
      }
    }

    const leaseExpiresAt = new Date(now.getTime() + LEASE_MS);
    const claim = await database.emailOutbox.updateMany({
      where: { id: candidate.id, status: 'queued', availableAt: { lte: now } },
      data: { status: 'sending', attempts: { increment: 1 }, leaseExpiresAt, lastError: null },
    });
    if (claim.count !== 1) continue;

    if (candidate.kind === 'appointment' && candidate.appointmentId) {
      const current = await getAppointmentContext(database, candidate.appointmentId);
      if (!appointmentIsCurrent(candidate, current)) {
        await database.emailOutbox.updateMany({
          where: { id: candidate.id, status: 'sending' },
          data: { status: 'superseded', leaseExpiresAt: null, lastError: 'appointment_or_consent_changed' },
        });
        result.superseded += 1;
        continue;
      }
    }

    const attempts = candidate.attempts + 1;
    let transporter: ReturnType<typeof makeTransporter> | null = null;
    let sendStarted = false;
    let payloadReady = false;
    try {
      const payload = await decryptEmailPayload(secret, candidate.encryptedBody);
      payloadReady = true;
      transporter = senderEmail && smtpConfigured ? makeTransporter(senderEmail, config) : null;
      const message = {
        from: { name: 'Nexus Med', address: senderEmail ?? 'local-test@nexus-med.invalid' },
        to: candidate.recipient,
        subject: candidate.subject,
        text: payload.text,
        html: payload.html,
      };
      if (config.sendEmail) {
        sendStarted = true;
        await config.sendEmail(message);
      } else {
        if (!transporter) throw new Error('SMTP transport is not configured.');
        sendStarted = true;
        await transporter!.sendMail({ ...message, disableFileAccess: true, disableUrlAccess: true });
      }
      await database.emailOutbox.updateMany({
        where: { id: candidate.id, status: 'sending' },
        data: { status: 'sent', sentAt: new Date(), leaseExpiresAt: null, lastError: null },
      });
      result.sent += 1;
    } catch (error) {
      const code = responseCode(error);
      if (!sendStarted) {
        await database.emailOutbox.updateMany({
          where: { id: candidate.id, status: 'sending' },
          data: { status: 'failed', leaseExpiresAt: null, lastError: payloadReady ? 'smtp_configuration_error' : 'stored_payload_invalid' },
        });
        result.failed += 1;
      } else if (code !== null && code >= 400 && code < 500 && attempts < MAX_ATTEMPTS) {
        const delayMs = Math.min(60 * 60_000, 60_000 * (2 ** (attempts - 1)));
        await database.emailOutbox.updateMany({
          where: { id: candidate.id, status: 'sending' },
          data: { status: 'queued', availableAt: new Date(now.getTime() + delayMs), leaseExpiresAt: null, lastError: 'smtp_temporary_rejection' },
        });
        result.retried += 1;
      } else if (code !== null && code >= 400) {
        await database.emailOutbox.updateMany({
          where: { id: candidate.id, status: 'sending' },
          data: { status: 'failed', leaseExpiresAt: null, lastError: attempts >= MAX_ATTEMPTS && code < 500 ? 'smtp_retry_limit' : 'smtp_permanent_rejection' },
        });
        result.failed += 1;
      } else {
        await database.emailOutbox.updateMany({
          where: { id: candidate.id, status: 'sending' },
          data: { status: 'uncertain', leaseExpiresAt: null, lastError: 'smtp_result_uncertain' },
        });
        result.uncertain += 1;
      }
    } finally {
      transporter?.close();
    }
  }
  return result;
}
