import { describe, expect, it } from 'vitest';

import type { Appointment } from '@nexus-med/contracts';

import {
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_MAX_CHIPS_PER_DAY,
  overlappingScheduledAppointments,
  splitDayAppointments,
  visibleAppointmentSlice,
} from '../src/lib/calendar';

const patient = { id: 'patient-1', fullName: 'Paciente DEMO 001' };

function appointment(id: string, startAt: string): Appointment {
  return {
    id,
    patient,
    startAt,
    durationMinutes: 30,
    type: 'consulta',
    status: 'scheduled',
    actualDurationMinutes: null,
    completedAt: null,
    linkedEncounterId: null,
    createdAt: '2026-01-01T12:00:00.000Z',
    updatedAt: '2026-01-01T12:00:00.000Z',
  };
}

describe('calendar view acceptance', () => {
  it('uses the specified 48 px hourly scale and three weekly chips per day', () => {
    expect(CALENDAR_HOUR_HEIGHT_PX).toBe(48);
    expect(CALENDAR_MAX_CHIPS_PER_DAY).toBe(3);
  });

  it('keeps appointments outside 06:00–22:00 visible in a separate list', () => {
    const items = [
      appointment('before', '2026-11-09T11:59:00.000Z'), // 05:59 in Monterrey
      appointment('at-open', '2026-11-09T12:00:00.000Z'), // 06:00
      appointment('late', '2026-11-10T03:59:00.000Z'), // 21:59
      appointment('at-close', '2026-11-10T04:00:00.000Z'), // 22:00
      appointment('other-day', '2026-11-10T12:00:00.000Z'),
    ];

    const result = splitDayAppointments(items, '2026-11-09');
    expect(result.inGrid.map((item) => item.id)).toEqual(['at-open', 'late']);
    expect(result.outsideHours.map((item) => item.id)).toEqual(['before', 'at-close']);
  });

  it('returns exactly three visible items and an accurate overflow count', () => {
    const items = ['one', 'two', 'three', 'four', 'five'];
    expect(visibleAppointmentSlice(items)).toEqual({
      visible: ['one', 'two', 'three'],
      remaining: 2,
    });
  });

  it('warns about scheduled overlaps across patients, but ignores completed/cancelled records', () => {
    const startsAtTen = '2026-11-09T16:00:00.000Z';
    const otherPatient = {
      ...appointment('other-patient', startsAtTen),
      patient: { id: 'patient-2', fullName: 'Paciente DEMO 002' },
    };
    const cancelled = { ...appointment('cancelled', startsAtTen), status: 'cancelled' as const };
    const completed = { ...appointment('completed', startsAtTen), status: 'completed' as const };
    const editedAppointment = appointment('editing', startsAtTen);

    const matches = overlappingScheduledAppointments(
      [otherPatient, cancelled, completed, editedAppointment],
      '2026-11-09T16:15:00.000Z',
      30,
      'editing',
    );
    expect(matches.map((item) => item.id)).toEqual(['other-patient']);
  });
});
