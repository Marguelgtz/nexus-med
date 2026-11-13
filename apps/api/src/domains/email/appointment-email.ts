import { clinicScope } from '../../shared/clinic';
import { Hono } from 'hono';
import {
  appointmentEmailStatusSchema,
  retryAppointmentEmailInputSchema,
  sendAppointmentEmailInputSchema,
  type AppointmentEmailEvent,
  type AppointmentEmailStatus,
} from '@nexus-med/contracts';
import { currentPrincipal, getAuthRuntime } from '../auth/auth.context';
import { ConflictError, NotFoundError, ValidationError } from '../../shared/http/errors';
import { parseOrThrow, readJsonBody } from '../../shared/http/parse';
import { prisma } from '../../infrastructure/database/runtime-client';
import { sha256 } from '../auth/invitations';
import { enqueueEmail } from './outbox';

const eventCopy: Record<AppointmentEmailEvent, { subject: string; heading: string; lead: string }> = {
  confirmation: {
    subject: 'Confirmación de cita en Nexus Med',
    heading: 'Confirmación de cita',
    lead: 'Tu cita está programada para',
  },
  reschedule: {
    subject: 'Actualización de cita en Nexus Med',
    heading: 'Actualización de cita',
    lead: 'La cita quedó programada para',
  },
  cancellation: {
    subject: 'Cancelación de cita en Nexus Med',
    heading: 'Cancelación de cita',
    lead: 'La cita programada para',
  },
};

function appointmentEmailTemplate(event: AppointmentEmailEvent, startAt: Date) {
  const copy = eventCopy[event];
  const date = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(startAt);
  const eventSentence = event === 'cancellation'
    ? `se canceló. ${copy.lead} ${date}.`
    : `${copy.lead} ${date}.`;
  return {
    subject: copy.subject,
    payload: {
      text: `Hola,\n\n${eventSentence}\n\nEste mensaje solo confirma la coordinación de la cita. Si necesitas ayuda, contacta al consultorio por el canal que ya utilizas.\n\nNexus Med`,
      html: `<!doctype html><html lang="es"><body style="margin:0;background:#f2f0e9;color:#202720;font-family:Georgia,serif"><main style="max-width:560px;margin:36px auto;padding:36px;background:#fffdf8;border:1px solid #ddd9cd"><p style="margin:0;color:#57725b;font:600 12px system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase">Nexus Med</p><h1 style="font-size:28px;font-weight:500">${copy.heading}</h1><p style="font:16px/1.6 system-ui,sans-serif">${eventSentence}</p><p style="font:13px/1.5 system-ui,sans-serif;color:#62675f">Este mensaje solo confirma la coordinación de una cita. No incluye información clínica.</p></main></body></html>`,
    },
  };
}

function serialize(row: {
  id: string;
  appointmentEvent: string | null;
  subject: string;
  status: string;
  attempts: number;
  createdAt: Date;
  sentAt: Date | null;
  lastError: string | null;
}): AppointmentEmailStatus {
  return appointmentEmailStatusSchema.parse({
    id: row.id,
    event: row.appointmentEvent,
    subject: row.subject,
    status: row.status,
    attempts: row.attempts,
    createdAt: row.createdAt.toISOString(),
    sentAt: row.sentAt?.toISOString() ?? null,
    errorCategory: row.lastError,
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function sendAppointmentEmail(appointmentId: string, event: AppointmentEmailEvent): Promise<AppointmentEmailStatus> {
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId, ...clinicScope() },
    select: {
      id: true,
      startAt: true,
      status: true,
      updatedAt: true,
      patient: {
        select: {
          email: true,
          appointmentEmailConsent: true,
          appointmentEmailConsentUpdatedAt: true,
        },
      },
    },
  });
  if (!appointment) throw new NotFoundError('Cita no encontrada.');
  if (!appointment.patient.email || !appointment.patient.appointmentEmailConsent) {
    throw new ConflictError('Confirma primero que este paciente acepta correos de coordinación de citas.');
  }
  if (event === 'cancellation' && appointment.status !== 'cancelled') {
    throw new ConflictError('La cita debe estar cancelada para enviar ese aviso.');
  }
  if (event !== 'cancellation' && appointment.status !== 'scheduled') {
    throw new ConflictError('Solo se pueden confirmar citas programadas.');
  }

  const runtime = getAuthRuntime();
  const isDemo = currentPrincipal()?.user.role === 'demo';
  const template = appointmentEmailTemplate(event, appointment.startAt);
  const recipient = normalizeEmail(appointment.patient.email);
  const appointmentVersion = appointment.updatedAt.toISOString();
  const consentVersion = appointment.patient.appointmentEmailConsentUpdatedAt?.toISOString() ?? 'unknown';
  const idempotencyKey = `appointment:${await sha256(`${appointmentId}:${event}:${appointmentVersion}:${consentVersion}:${recipient}`)}`;
  const status = isDemo ? 'simulated' : runtime.localRuntime ? 'captured' : 'queued';
  const id = await enqueueEmail(prisma, runtime.secret, {
    kind: 'appointment',
    appointmentId,
    appointmentVersion,
    appointmentEvent: event,
    recipient,
    subject: template.subject,
    payload: template.payload,
    idempotencyKey,
    status,
  });
  const row = await prisma.emailOutbox.findUniqueOrThrow({
    where: { id },
    select: { id: true, appointmentEvent: true, subject: true, status: true, attempts: true, createdAt: true, sentAt: true, lastError: true },
  });
  return serialize(row);
}

async function listAppointmentEmails(appointmentId: string): Promise<AppointmentEmailStatus[]> {
  const exists = await prisma.appointment.findUnique({ where: { id: appointmentId, ...clinicScope() }, select: { id: true } });
  if (!exists) throw new NotFoundError('Cita no encontrada.');
  const rows = await prisma.emailOutbox.findMany({
    where: { appointmentId },
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: { id: true, appointmentEvent: true, subject: true, status: true, attempts: true, createdAt: true, sentAt: true, lastError: true },
  });
  return rows.filter(row => row.appointmentEvent !== null).map(serialize);
}

async function retryAppointmentEmail(appointmentId: string, emailId: string, acknowledgePossibleDuplicate: boolean): Promise<AppointmentEmailStatus> {
  const row = await prisma.emailOutbox.findFirst({
    where: { id: emailId, appointmentId, appointment: { is: clinicScope() } },
    select: { id: true, appointmentVersion: true, appointmentEvent: true, recipient: true, status: true, subject: true, attempts: true, createdAt: true, sentAt: true, lastError: true },
  });
  if (!row || !row.appointmentEvent) throw new NotFoundError('Aviso de cita no encontrado.');
  if (row.status !== 'failed' && row.status !== 'uncertain') throw new ConflictError('Solo se pueden reintentar avisos fallidos o inciertos.');
  if (row.status === 'uncertain' && !acknowledgePossibleDuplicate) {
    throw new ValidationError('Confirma que revisaste si el correo pudo haberse enviado.');
  }
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId, ...clinicScope() },
    select: {
      status: true,
      updatedAt: true,
      patient: { select: { email: true, appointmentEmailConsent: true, appointmentEmailConsentUpdatedAt: true } },
    },
  });
  if (!appointment) throw new NotFoundError('Cita no encontrada.');
  if (!appointment.patient.appointmentEmailConsent || normalizeEmail(appointment.patient.email ?? '') !== normalizeEmail(row.recipient)) {
    throw new ConflictError('El correo o el permiso cambió; genera un aviso nuevo después de revisar el contacto.');
  }
  if (appointment.updatedAt.toISOString() !== row.appointmentVersion || !isEventCurrent(row.appointmentEvent as AppointmentEmailEvent, appointment.status)) {
    throw new ConflictError('La cita cambió desde que se creó este aviso. Genera uno nuevo para la cita actual.');
  }
  const updated = await prisma.emailOutbox.updateMany({
    where: { id: emailId, status: row.status },
    data: { status: 'queued', attempts: 0, availableAt: new Date(), leaseExpiresAt: null, lastError: null },
  });
  if (updated.count !== 1) throw new ConflictError('El aviso ya cambió de estado. Actualiza la página.');
  return serialize(await prisma.emailOutbox.findUniqueOrThrow({
    where: { id: emailId },
    select: { id: true, appointmentEvent: true, subject: true, status: true, attempts: true, createdAt: true, sentAt: true, lastError: true },
  }));
}

function isEventCurrent(event: AppointmentEmailEvent, status: string): boolean {
  return event === 'cancellation' ? status === 'cancelled' : status === 'scheduled';
}

export const appointmentEmailRoutes = new Hono();

appointmentEmailRoutes.post('/appointments/:appointmentId/emails', async c => {
  const input = parseOrThrow(sendAppointmentEmailInputSchema, await readJsonBody(c));
  return c.json(await sendAppointmentEmail(c.req.param('appointmentId'), input.event), 201);
});

appointmentEmailRoutes.get('/appointments/:appointmentId/emails', async c =>
  c.json(await listAppointmentEmails(c.req.param('appointmentId'))));

appointmentEmailRoutes.post('/appointments/:appointmentId/emails/:emailId/retry', async c => {
  const input = parseOrThrow(retryAppointmentEmailInputSchema, await c.req.json().catch(() => ({})));
  return c.json(await retryAppointmentEmail(c.req.param('appointmentId'), c.req.param('emailId'), input.acknowledgePossibleDuplicate));
});
