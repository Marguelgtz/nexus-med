import { describe, expect, it } from 'vitest';
import type { Appointment } from '@nexus-med/contracts';
import { summarizeReception } from '../src/lib/reception-summary';

const asOf = '2026-11-10T15:00:00.000Z';
function appointment(id: string, changes: Partial<Appointment> = {}): Appointment {
  return { id, patient: { id: 'patient', fullName: 'Paciente de prueba' }, startAt: '2026-11-10T16:00:00.000Z',
    durationMinutes: 30, type: 'consulta', status: 'scheduled', arrivedAt: null, attentionStartedAt: null,
    actualDurationMinutes: null, completedAt: null, linkedEncounterId: null, createdAt: asOf, updatedAt: asOf, ...changes };
}

describe('reception overview scopes', () => {
  it('excludes cancellations from the agenda totals and counts the shared queue independently', () => {
    const result = summarizeReception([
      appointment('scheduled'), appointment('completed', { status: 'completed', durationMinutes: 45 }),
      appointment('cancelled', { status: 'cancelled' }),
    ], [
      appointment('previous-day', { startAt: '2026-11-09T16:00:00.000Z', arrivedAt: asOf }),
      appointment('attending', { arrivedAt: asOf, attentionStartedAt: asOf }),
      appointment('stale-cancelled', { status: 'cancelled', arrivedAt: asOf }),
    ], asOf);
    expect(result).toMatchObject({ total: 2, completed: 1, cancelled: 1, plannedMinutes: 75, waiting: 1, attending: 1 });
  });
  it('chooses the earliest future unarrived appointment regardless of input order', () => {
    const result = summarizeReception([
      appointment('later', { startAt: '2026-11-10T18:00:00.000Z' }),
      appointment('past', { startAt: '2026-11-10T14:00:00.000Z' }),
      appointment('already-arrived', { startAt: asOf, arrivedAt: asOf }),
      appointment('next'),
    ], [], asOf);
    expect(result.next?.id).toBe('next');
  });
  it('leaves an empty agenda empty instead of inventing a next patient', () => {
    expect(summarizeReception([], [], asOf)).toEqual({ total: 0, completed: 0, cancelled: 0, plannedMinutes: 0, waiting: 0, attending: 0, next: null });
  });
});
