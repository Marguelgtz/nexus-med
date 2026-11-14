import { checkVersion } from '../../shared/version';
import { currentPrincipal } from '../auth/auth.context';
import { clinicScope } from '../../shared/clinic';
// Appointment domain operations (UI_SPEC §7.1).
//
// Business rules:
// - An appointment belongs to exactly one patient and is created as
//   `scheduled`. Status transitions are explicit: scheduled → completed |
//   cancelled; cancelled → scheduled (reschedule). `completed` is final.
// - Overlapping appointments are ACCEPTED (the UI shows a notice); the API
//   never rejects on overlap — that is the doctor's call.
// - Completing may link one existing encounter (same patient); the link is
//   the only relationship and is never copied into the appointment.
// - Encounters and appointments are preserved; there is no destructive
//   delete anywhere.

import type {
  Appointment,
  CompleteAppointmentInput,
  CreateAppointmentInput,
  LinkEncounterInput,
  UpdateAppointmentInput,
  ReceptionInput,
} from '@nexus-med/contracts';

import { prisma } from '../../infrastructure/database/runtime-client';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../../shared/http/errors';

const APPOINTMENT_NOT_FOUND = 'Cita no encontrada';
const PATIENT_NOT_FOUND = 'Paciente no encontrado';
const ENCOUNTER_NOT_FOUND = 'Consulta no encontrada';
const ENCOUNTER_ALREADY_LINKED = 'La consulta ya está enlazada a otra cita.';

function isUniqueConstraintViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

// Prisma rows carry Dates and raw enum strings; the public contract carries
// ISO 8601 strings and validated enums. Services serialize at this boundary.
interface AppointmentRow {
  id: string;
  version: number;
  doctor: { id: string; name: string } | null;
  patient: { id: string; fullName: string; email: string | null; appointmentEmailConsent: boolean };
  startAt: Date;
  durationMinutes: number;
  type: string;
  status: string;
  arrivedAt: Date | null;
  attentionStartedAt: Date | null;
  actualDurationMinutes: number | null;
  completedAt: Date | null;
  linkedEncounterId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

function toAppointment(row: AppointmentRow): Appointment {
  return {
    id: row.id, version: row.version, doctor: row.doctor,
    patient: {
      id: row.patient.id,
      fullName: row.patient.fullName,
      email: row.patient.email,
      appointmentEmailConsent: row.patient.appointmentEmailConsent,
    },
    startAt: row.startAt.toISOString(),
    durationMinutes: row.durationMinutes,
    // The values are only ever written through the validated API boundary;
    // the cast is the serialization boundary, not a skip of validation.
    type: row.type as Appointment['type'],
    status: row.status as Appointment['status'],
    arrivedAt: row.arrivedAt?.toISOString() ?? null,
    attentionStartedAt: row.attentionStartedAt?.toISOString() ?? null,
    actualDurationMinutes: row.actualDurationMinutes,
    completedAt: row.completedAt ? row.completedAt.toISOString() : null,
    linkedEncounterId: row.linkedEncounterId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

const rowInclude = { doctor: { select: { id: true, name: true } }, patient: { select: { id: true, fullName: true, email: true, appointmentEmailConsent: true } } } as const;

async function findAppointment(id: string): Promise<AppointmentRow> {
  const row = await prisma.appointment.findUnique({ where: { ...clinicScope(), id }, include: rowInclude });
  if (!row) throw new NotFoundError(APPOINTMENT_NOT_FOUND);
  return row;
}

async function requirePatient(patientId: string): Promise<void> {
  const patient = await prisma.patient.findUnique({
    where: { ...clinicScope(), id: patientId },
    select: { id: true },
  });
  if (!patient) throw new NotFoundError(PATIENT_NOT_FOUND);
}

/** List all appointments in [from, to), ordered by start time (deterministic
 *  ties by id). Used by the calendar; from/to come from the contract query. */
export async function listAppointmentsInRange(
  from: string,
  to: string,
  doctorId?: string,
): Promise<Appointment[]> {
  const rows = await prisma.appointment.findMany({
    where: { ...clinicScope(), ...(doctorId ? { doctorId } : {}), startAt: { gte: new Date(from), lt: new Date(to) } },
    orderBy: [{ startAt: 'asc' }, { id: 'asc' }],
    include: rowInclude,
  });
  return rows.map(toAppointment);
}

/** All appointments for one patient, newest first (the UI splits into
 *  Próximas / Historial). */
export async function listPatientAppointments(patientId: string): Promise<Appointment[]> {
  await requirePatient(patientId);
  const rows = await prisma.appointment.findMany({
    where: { ...clinicScope(), patientId },
    orderBy: [{ startAt: 'desc' }, { id: 'asc' }],
    include: rowInclude,
  });
  return rows.map(toAppointment);
}

export async function createAppointment(
  patientId: string,
  input: CreateAppointmentInput,
): Promise<Appointment> {
  await requirePatient(patientId);
  const doctorId = await validateDoctor(input.doctorId);
  const row = await prisma.appointment.create({
    data: {
      patientId, ...clinicScope(), doctorId,
      startAt: new Date(input.startAt),
      durationMinutes: input.durationMinutes,
      type: input.type,
    },
    include: rowInclude,
  });
  return toAppointment(row);
}

export async function getAppointment(appointmentId: string): Promise<Appointment> {
  return toAppointment(await findAppointment(appointmentId));
}

/**
 * Reschedule / edit. Only `scheduled` and `cancelled` appointments accept
 * edits (completed is final → 409). Saving a cancelled appointment
 * re-activates it as scheduled (Reprogramar).
 */
export async function updateAppointment(
  appointmentId: string,
  input: UpdateAppointmentInput,
): Promise<Appointment> {
  const existing = await findAppointment(appointmentId);
  requireAppointmentControl(existing);
  if (existing.status === 'completed') {
    throw new ConflictError(
      'La cita está completada y no puede modificarse. Crea una nueva cita si necesitas reprogramar.',
    );
  }
  checkVersion(input.expectedVersion, existing.version);
  const data: {
    doctorId?: string | null;
    startAt?: Date;
    durationMinutes?: number;
    type?: string;
    status?: string;
  } = {};
  if (input.doctorId !== undefined) {
    data.doctorId = await validateDoctor(input.doctorId);
    if (existing.linkedEncounterId) await requireEncounterForPatient(existing.linkedEncounterId, existing.patient.id, data.doctorId ?? undefined);
  }
  if (input.startAt !== undefined) data.startAt = new Date(input.startAt);
  if (input.durationMinutes !== undefined) data.durationMinutes = input.durationMinutes;
  if (input.type !== undefined) data.type = input.type;
  if (existing.status === 'cancelled') data.status = 'scheduled';
  const row = await prisma.appointment.update({
    where: { ...clinicScope(), id: appointmentId, version: existing.version },
    data: { ...data, version: { increment: 1 }, arrivedAt: null, attentionStartedAt: null },
    include: rowInclude,
  });
  return toAppointment(row);
}

/**
 * Complete a scheduled appointment (scheduled → completed, one-directional).
 * Both fields optional: the doctor may complete as-is, with an actual
 * duration, with an encounter link, or both.
 */
export async function completeAppointment(
  appointmentId: string,
  input: CompleteAppointmentInput,
): Promise<Appointment> {
  const existing = await findAppointment(appointmentId);
  requireAppointmentControl(existing);
  if (existing.status !== 'scheduled') {
    throw new ConflictError(
      existing.status === 'cancelled'
        ? 'La cita está cancelada. Reprograma o crea una nueva cita.'
        : 'La cita ya está completada.',
    );
  }
  const data: {
    status: string;
    completedAt: Date;
    actualDurationMinutes?: number;
    linkedEncounterId?: string;
  } = { status: 'completed', completedAt: new Date() };
  if (input.actualDurationMinutes !== undefined) {
    data.actualDurationMinutes = input.actualDurationMinutes;
  }
  if (input.encounterId !== undefined) {
    if (existing.linkedEncounterId) {
      throw new ConflictError('La cita ya está enlazada a una consulta.');
    }
    await requireEncounterForPatient(input.encounterId, existing.patient.id, existing.doctor?.id);
    data.linkedEncounterId = input.encounterId;
  }
  try {
    const row = await prisma.appointment.update({
      where: { ...clinicScope(), id: appointmentId, version: existing.version },
      data: { ...data, version: { increment: 1 } },
      include: rowInclude,
    });
    return toAppointment(row);
  } catch (error) {
    // The unique index is the final guard if two local requests attempt to
    // link the same encounter concurrently. Keep that race a domain conflict.
    if (input.encounterId !== undefined && isUniqueConstraintViolation(error)) {
      throw new ConflictError(ENCOUNTER_ALREADY_LINKED);
    }
    throw error;
  }
}

/** Cancel a scheduled appointment (record kept in history). */
export async function cancelAppointment(appointmentId: string): Promise<Appointment> {
  const existing = await findAppointment(appointmentId);
  requireAppointmentControl(existing);
  if (existing.status !== 'scheduled') {
    throw new ConflictError(
      existing.status === 'cancelled' ? 'La cita ya está cancelada.' : 'La cita ya está completada.',
    );
  }
  const row = await prisma.appointment.update({
    where: { ...clinicScope(), id: appointmentId, version: existing.version },
    data: { status: 'cancelled', version: { increment: 1 } },
    include: rowInclude,
  });
  return toAppointment(row);
}

/**
 * Link an encounter to an appointment that has no link yet (scheduled or
 * completed). The link is the only relationship — the note is never copied.
 */
export async function linkEncounter(
  appointmentId: string,
  input: LinkEncounterInput,
): Promise<Appointment> {
  const existing = await findAppointment(appointmentId);
  requireAppointmentControl(existing);
  if (existing.linkedEncounterId) {
    throw new ConflictError('La cita ya está enlazada a una consulta.');
  }
  if (existing.status === 'cancelled') {
    throw new ConflictError('La cita está cancelada y no puede enlazarse a una consulta.');
  }
  await requireEncounterForPatient(input.encounterId, existing.patient.id, existing.doctor?.id);
  try {
    const row = await prisma.appointment.update({
      where: { ...clinicScope(), id: appointmentId, version: existing.version },
      data: { version: { increment: 1 }, linkedEncounterId: input.encounterId },
      include: rowInclude,
    });
    return toAppointment(row);
  } catch (error) {
    if (isUniqueConstraintViolation(error)) throw new ConflictError(ENCOUNTER_ALREADY_LINKED);
    throw error;
  }
}

/** The encounter must exist and belong to the same patient as the
 *  appointment (clinical content never crosses patients). */
async function requireEncounterForPatient(encounterId: string, patientId: string, doctorId?: string): Promise<void> {
  const encounter = await prisma.encounter.findUnique({
    where: { ...clinicScope(), id: encounterId },
    select: { id: true, patientId: true, authorId: true },
  });
  if (!encounter) throw new NotFoundError(ENCOUNTER_NOT_FOUND);
  if (doctorId && encounter.authorId && doctorId !== encounter.authorId) throw new ValidationError('La consulta pertenece a otro médico. Reasigna la cita de forma explícita.');
  if (encounter.patientId !== patientId) {
    throw new ValidationError('La consulta pertenece a otro paciente', {
      encounterId: ['La consulta pertenece a otro paciente'],
    });
  }
}

/** Conditional writes prevent two windows from silently applying stale transitions. */
export async function updateReception(id: string, input: ReceptionInput): Promise<Appointment> {
  const existing = await findAppointment(id);
  requireAppointmentControl(existing);
  const now = new Date();
  let changed = 0;
  if (input.action === 'start') {
    const startedBeforeArrival = await prisma.appointment.updateMany({
      where: { ...clinicScope(), id, version: existing.version, status: 'scheduled', arrivedAt: null, attentionStartedAt: null },
      data: { arrivedAt: now, attentionStartedAt: now, version: { increment: 1 } },
    });
    changed = startedBeforeArrival.count;
    if (changed === 0) {
      const startedAfterArrival = await prisma.appointment.updateMany({
        where: { ...clinicScope(), id, version: existing.version, status: 'scheduled', arrivedAt: { not: null }, attentionStartedAt: null },
        data: { attentionStartedAt: now, version: { increment: 1 } },
      });
      changed = startedAfterArrival.count;
    }
  } else {
    const result = await prisma.appointment.updateMany({
      where: { ...clinicScope(),
        id, version: existing.version, status: 'scheduled',
        ...(input.action === 'arrive' ? { arrivedAt: null } : { arrivedAt: { not: null } }),
        attentionStartedAt: null,
      },
      data: { arrivedAt: input.action === 'arrive' ? now : null, version: { increment: 1 } },
    });
    changed = result.count;
  }
  if (changed !== 1) throw new ConflictError('La recepción cambió o la cita ya no está programada. Actualiza la lista.');
  return toAppointment(await findAppointment(id));
}

export async function listReception() {
  return (await prisma.appointment.findMany({ where: { ...clinicScope(), status: 'scheduled', arrivedAt: { not: null } }, include: rowInclude, orderBy: [{ arrivedAt: 'asc' }, { id: 'asc' }] })).map(toAppointment);
}


export async function listClinicDoctors() {
  const memberships = await prisma.clinicMembership.findMany({
    where: { ...clinicScope(), role: 'doctor', status: 'active', user: { disabledAt: null, emailVerified: true } },
    select: { user: { select: { id: true, name: true } } }, orderBy: { user: { name: 'asc' } },
  });
  return memberships.map(item => item.user);
}

async function validateDoctor(requested: string | null | undefined): Promise<string | null> {
  const principal = currentPrincipal();
  const id = requested === undefined ? (principal?.user.role === 'doctor' ? principal.user.id : null) : requested;
  if (!id) return null; // Explicit supported unassigned state, including legacy/demo.
  const membership = await prisma.clinicMembership.findFirst({
    where: { ...clinicScope(), userId: id, role: 'doctor', status: 'active', user: { disabledAt: null, emailVerified: true } }, select: { id: true },
  });
  if (!membership) throw new ValidationError('Selecciona un médico activo de esta clínica.', { doctorId: ['Médico no disponible.'] });
  if (principal?.user.role === 'doctor' && !principal.membership?.isAdmin && principal.user.id !== id) throw new ForbiddenError('Solo puedes gestionar tu agenda.');
  return id;
}

function requireAppointmentControl(appointment: AppointmentRow) {
  const principal = currentPrincipal();
  if (principal?.user.role === 'doctor' && !principal.membership?.isAdmin && appointment.doctor && appointment.doctor.id !== principal.user.id) {
    throw new ForbiddenError('Esta cita está asignada a otro médico.');
  }
}
