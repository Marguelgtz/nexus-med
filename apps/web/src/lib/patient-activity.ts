import type { Appointment, EncounterSummary } from '@nexus-med/contracts';

export type PatientActivityItem<A, E> =
  | { kind: 'appointment'; id: string; occurredAt: string; value: A }
  | { kind: 'consultation'; id: string; occurredAt: string; value: E };

/** Build the chronological history while leaving scheduled appointments in their own agenda section. */
export function buildPatientActivity<A extends Pick<Appointment, 'id' | 'status' | 'startAt'>, E extends Pick<EncounterSummary, 'id' | 'occurredAt'>>(
  appointments: A[], encounters: E[],
): PatientActivityItem<A, E>[] {
  return [
    ...appointments.filter(appointment => appointment.status !== 'scheduled').map(appointment => ({
      kind: 'appointment' as const,
      id: appointment.id,
      occurredAt: appointment.startAt,
      value: appointment,
    })),
    ...encounters.map(encounter => ({
      kind: 'consultation' as const,
      id: encounter.id,
      occurredAt: encounter.occurredAt,
      value: encounter,
    })),
  ].sort((left, right) => {
    const timeOrder = Date.parse(right.occurredAt) - Date.parse(left.occurredAt);
    if (timeOrder !== 0) return timeOrder;
    if (left.kind === right.kind) return left.id.localeCompare(right.id);
    return left.kind === 'consultation' ? -1 : 1;
  });
}
