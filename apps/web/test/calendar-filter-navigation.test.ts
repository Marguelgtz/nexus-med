import { describe, expect, it } from 'vitest';
import { calendarViewHref } from '../src/lib/calendar';

describe('calendar doctor filter navigation', () => {
  it('retains and encodes the doctor on day and selected-month links', () => {
    const doctorId = 'doctor+one&synthetic';
    for (const href of [calendarViewHref('dia', '2026-11-13', doctorId), calendarViewHref('mes', '2026-11-01', doctorId, '2026-11-13')]) {
      const url = new URL(href, 'https://example.test');
      expect(url.searchParams.get('doctorId')).toBe(doctorId);
      expect(url.searchParams.get('fecha')).toMatch(/^2026-11-/);
    }
    expect(new URL(calendarViewHref('mes', '2026-11-01', doctorId, '2026-11-13'), 'https://example.test').searchParams.get('dia')).toBe('2026-11-13');
  });

  it('does not add a doctor to clinic-wide navigation', () => {
    expect(new URL(calendarViewHref('dia', '2026-11-13'), 'https://example.test').searchParams.has('doctorId')).toBe(false);
  });
});
