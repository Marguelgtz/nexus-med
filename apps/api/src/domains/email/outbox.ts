import { symmetricEncrypt, symmetricDecrypt } from 'better-auth/crypto';

export type QueuedEmailKind = 'verify_email' | 'reset_password' | 'invitation' | 'appointment';

export interface EmailPayload {
  text: string;
  html: string;
}

export async function encryptEmailPayload(secret: string, payload: EmailPayload): Promise<string> {
  return symmetricEncrypt({ key: secret, data: JSON.stringify(payload) });
}

export interface EmailOutboxDatabase {
  emailOutbox: {
    upsert(args: {
      where: { idempotencyKey: string };
      create: {
        kind: string;
        appointmentId?: string;
        appointmentVersion?: string;
        appointmentEvent?: string;
        recipient: string;
        subject: string;
        encryptedBody: string;
        idempotencyKey: string;
        status?: string;
      };
      update: Record<string, never>;
    }): Promise<{ id: string }>;
    findMany(args: {
      take: number;
      orderBy: { createdAt: 'desc' };
      select: {
        id: true;
        kind: true;
        recipient: true;
        subject: true;
        encryptedBody: true;
        status: true;
        createdAt: true;
      };
    }): Promise<Array<{
      id: string;
      kind: string;
      recipient: string;
      subject: string;
      encryptedBody: string;
      status: string;
      createdAt: Date;
    }>>;
  };
}

export async function enqueueEmail(
  database: EmailOutboxDatabase,
  secret: string,
  message: {
    kind: QueuedEmailKind;
    recipient: string;
    subject: string;
    payload: EmailPayload;
    idempotencyKey: string;
    appointmentId?: string;
    appointmentVersion?: string;
    appointmentEvent?: string;
    status?: 'queued' | 'captured' | 'simulated';
  },
): Promise<string> {
  const encryptedBody = await encryptEmailPayload(secret, message.payload);

  const row = await database.emailOutbox.upsert({
    where: { idempotencyKey: message.idempotencyKey },
    create: {
      kind: message.kind,
      ...(message.appointmentId ? { appointmentId: message.appointmentId } : {}),
      ...(message.appointmentVersion ? { appointmentVersion: message.appointmentVersion } : {}),
      ...(message.appointmentEvent ? { appointmentEvent: message.appointmentEvent } : {}),
      recipient: message.recipient.trim().toLowerCase(),
      subject: message.subject,
      encryptedBody,
      idempotencyKey: message.idempotencyKey,
      ...(message.status ? { status: message.status } : {}),
    },
    update: {},
  });
  return row.id;
}

export async function decryptEmailPayload(secret: string, encryptedBody: string): Promise<EmailPayload> {
  const data = await symmetricDecrypt({ key: secret, data: encryptedBody });
  const parsed: unknown = JSON.parse(data);
  if (
    typeof parsed !== 'object' || parsed === null ||
    !('text' in parsed) || typeof parsed.text !== 'string' ||
    !('html' in parsed) || typeof parsed.html !== 'string'
  ) {
    throw new Error('Stored email payload is invalid.');
  }
  return { text: parsed.text, html: parsed.html };
}
