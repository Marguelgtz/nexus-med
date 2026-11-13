import type { Appointment } from '@nexus-med/contracts';

import { formatTime, localDateOfInstant } from './format';

export const CALENDAR_DAY_START_HOUR = 6;
export const CALENDAR_DAY_END_HOUR = 22;
export const CALENDAR_HOUR_HEIGHT_PX = 48;
export const CALENDAR_MAX_CHIPS_PER_DAY = 3;

export function calendarViewHref(vista: 'dia' | 'mes', fecha: string, doctorId?: string, dia?: string): string {
  const params = new URLSearchParams({ vista, fecha });
  if (dia) params.set('dia', dia);
  if (doctorId) params.set('doctorId', doctorId);
  return `/calendar?${params}`;
}

function minuteOfPracticeDay(instant: string): number {
  const time = formatTime(instant);
  const [hour = 0, minute = 0] = time.split(':').map(Number);
  return hour * 60 + minute;
}

/** Appointments are grouped by their practice-local start date. */
export function appointmentsForDay(appointments: Appointment[], date: string): Appointment[] {
  return appointments.filter((appointment) => localDateOfInstant(appointment.startAt) === date);
}

/** The day grid covers 06:00–22:00; starts outside that interval stay visible below it. */
export function splitDayAppointments(appointments: Appointment[], date: string): {
  inGrid: Appointment[];
  outsideHours: Appointment[];
} {
  const start = CALENDAR_DAY_START_HOUR * 60;
  const end = CALENDAR_DAY_END_HOUR * 60;
  const inGrid: Appointment[] = [];
  const outsideHours: Appointment[] = [];

  for (const appointment of appointmentsForDay(appointments, date)) {
    const minute = minuteOfPracticeDay(appointment.startAt);
    (minute >= start && minute < end ? inGrid : outsideHours).push(appointment);
  }

  return { inGrid, outsideHours };
}

export function visibleAppointmentSlice<T>(items: T[], limit = CALENDAR_MAX_CHIPS_PER_DAY): {
  visible: T[];
  remaining: number;
} {
  const visible = items.slice(0, limit);
  return { visible, remaining: items.length - visible.length };
}

/** Return scheduled appointments whose time interval conflicts with a candidate. */
export function overlappingScheduledAppointments(
  appointments: Appointment[],
  candidateStartAt: string,
  candidateDurationMinutes: number,
  excludeId?: string,
): Appointment[] {
  const candidateStart = Date.parse(candidateStartAt);
  if (!Number.isFinite(candidateStart)) return [];
  const candidateEnd = candidateStart + candidateDurationMinutes * 60_000;

  return appointments.filter((appointment) => {
    if (appointment.id === excludeId || appointment.status !== 'scheduled') return false;
    const start = Date.parse(appointment.startAt);
    const end = start + appointment.durationMinutes * 60_000;
    return Number.isFinite(start) && start < candidateEnd && end > candidateStart;
  });
}
