import { describe, expect, it } from 'vitest';
import { buildPatientActivity } from '../src/lib/patient-activity';

describe('buildPatientActivity', () => {
  it('sorts completed appointments and consultations together, leaving scheduled items in the agenda', () => {
    const history = buildPatientActivity(
      [
        { id: 'scheduled', status: 'scheduled', startAt: '2026-11-20T16:00:00.000Z' },
        { id: 'completed', status: 'completed', startAt: '2026-11-10T16:00:00.000Z' },
        { id: 'cancelled', status: 'cancelled', startAt: '2026-11-08T16:00:00.000Z' },
      ],
      [
        { id: 'encounter-old', occurredAt: '2026-11-08T16:00:00.000Z' },
        { id: 'encounter-new', occurredAt: '2026-11-12T16:00:00.000Z' },
      ],
    );

    expect(history.map(item => `${item.kind}:${item.id}`)).toEqual([
      'consultation:encounter-new',
      'appointment:completed',
      'consultation:encounter-old',
      'appointment:cancelled',
    ]);
  });

  it('keeps same-time appointments and consultations as separate activity types', () => {
    const history = buildPatientActivity(
      [{ id: 'appointment', status: 'completed', startAt: '2026-11-10T16:00:00.000Z' }],
      [{ id: 'consultation', occurredAt: '2026-11-10T16:00:00.000Z' }],
    );

    expect(history.map(item => item.kind)).toEqual(['consultation', 'appointment']);
  });
});
