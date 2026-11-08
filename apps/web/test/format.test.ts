import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  PRACTICE_TIMEZONE,
  addDays,
  diffDays,
  formatAge,
  formatDate,
  formatDateTime,
  formatTime,
  formatTimeRange,
  instantAtLocalTime,
  isValidCalendarDate,
  localDateOfInstant,
  monthGrid,
  practiceToday,
  sameMonth,
  startOfWeek,
  wasEdited,
  weekDays,
} from '../src/lib/format';

afterEach(() => {
  vi.useRealTimers();
});

describe('formatDate (date-only, practice timezone)', () => {
  it('renders es-MX long form', () => {
    expect(formatDate('1958-03-12')).toBe('12 de marzo de 1958');
  });

  it('returns the placeholder for null', () => {
    expect(formatDate(null)).toBe('No registrado');
  });

  it('returns the raw value when unparseable', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });

  it('keeps the calendar date stable across year boundaries (host-tz independent)', () => {
    // A date-only value must render the same calendar date regardless of the
    // host timezone; UTC-noon construction guarantees this for ±12h zones.
    expect(formatDate('2026-01-01')).toBe('1 de enero de 2026');
    expect(formatDate('2025-12-31')).toBe('31 de diciembre de 2025');
  });
});

describe('formatDateTime (instant, practice timezone)', () => {
  it('renders the instant in America/Monterrey, not the host timezone', () => {
    // 04:30 UTC is 22:30 CST (UTC-6, no DST since 2022) the PREVIOUS day in
    // Monterrey. A UTC-host would render Sep 5 04:30 — a different day.
    expect(formatDateTime('2026-09-05T04:30:00Z')).toBe('4 de septiembre de 2026 a las 10:30 p.m.');
  });

  it('returns the placeholder for null', () => {
    expect(formatDateTime(null)).toBe('No registrado');
  });

  it('returns the raw value when unparseable', () => {
    expect(formatDateTime('garbage')).toBe('garbage');
  });
});

describe('formatAge (practice "today")', () => {
  it('counts completed years', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T12:00:00Z'));
    expect(formatAge('1958-03-12')).toBe('68');
  });

  it('counts the birthday itself as completed in the practice timezone', () => {
    // 06:30 UTC = 01:30 on Sep 5 in Monterrey → birthday day.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-05T06:30:00Z'));
    expect(formatAge('1958-09-05')).toBe('68');
  });

  it('stays one year under just before the practice birthday', () => {
    // 23:00 UTC on Sep 4 = 18:00 on Sep 4 in Monterrey → birthday not yet.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-04T23:00:00Z'));
    expect(formatAge('1958-09-05')).toBe('67');
  });

  it('returns null for a future birth date or missing value', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-06T12:00:00Z'));
    expect(formatAge('2027-01-01')).toBeNull();
    expect(formatAge(null)).toBeNull();
  });
});

describe('wasEdited', () => {
  it('is false when updatedAt is within one minute of createdAt', () => {
    expect(wasEdited('2026-11-07T10:00:00Z', '2026-11-07T10:00:30Z')).toBe(false);
  });

  it('is true when the note changed more than one minute after entry', () => {
    expect(wasEdited('2026-11-07T10:00:00Z', '2026-11-07T11:00:00Z')).toBe(true);
  });

  it('is false for a backdated consultation recorded late (occurredAt is irrelevant)', () => {
    // Consultation occurred Nov 5; entered and unedited Nov 7.
    expect(wasEdited('2026-11-07T09:00:00Z', '2026-11-07T09:00:00Z')).toBe(false);
  });

  it('is false for invalid timestamps', () => {
    expect(wasEdited('garbage', '2026-11-07T09:00:00Z')).toBe(false);
  });
});

describe('PRACTICE_TIMEZONE', () => {
  it('is a valid IANA zone (single source of truth)', () => {
    expect(() => new Intl.DateTimeFormat('es-MX', { timeZone: PRACTICE_TIMEZONE })).not.toThrow();
    expect(PRACTICE_TIMEZONE).toBe('America/Monterrey');
  });
});

describe('calendar date math (UI_SPEC §7.1)', () => {
  it('isValidCalendarDate accepts real dates and rejects impossible ones', () => {
    expect(isValidCalendarDate('2026-02-28')).toBe(true);
    expect(isValidCalendarDate('2026-02-30')).toBe(false); // Feb 30 does not exist
    expect(isValidCalendarDate('2024-02-29')).toBe(true); // leap year
    expect(isValidCalendarDate('2026-13-01')).toBe(false);
    expect(isValidCalendarDate('26-02-01')).toBe(false);
    expect(isValidCalendarDate('garbage')).toBe(false);
  });

  it('addDays rolls over months and years', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01'); // 2026 is not a leap year
    expect(addDays('2025-12-31', 1)).toBe('2026-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('startOfWeek is Monday-start (Sunday belongs to the week that starts the next Monday)', () => {
    expect(startOfWeek('2026-09-07')).toBe('2026-09-07'); // Monday
    expect(startOfWeek('2026-09-06')).toBe('2026-08-31'); // Sunday → previous Monday
    expect(startOfWeek('2026-09-13')).toBe('2026-09-07'); // Sunday of the week
  });

  it('weekDays returns the 7 days of the containing week', () => {
    expect(weekDays('2026-09-08')).toEqual([
      '2026-09-07',
      '2026-09-08',
      '2026-09-09',
      '2026-09-10',
      '2026-09-11',
      '2026-09-12',
      '2026-09-13',
    ]);
  });

  it('monthGrid builds a rectangular Monday-start grid (Feb 23 – Apr 5 for March 2026)', () => {
    const cells = monthGrid('2026-03-15');
    expect(cells.length % 7).toBe(0);
    expect(cells[0]).toBe('2026-02-23'); // Monday before the 1st
    expect(cells.at(-1)).toBe('2026-04-05'); // Saturday after the 31st
    expect(cells).toContain('2026-03-01');
    expect(cells).toContain('2026-03-31');
    // Consecutive days
    for (let i = 1; i < cells.length; i++) {
      expect(addDays(cells[i - 1], 1)).toBe(cells[i]);
    }
  });

  it('diffDays and sameMonth compare calendar dates', () => {
    expect(diffDays('2026-03-01', '2026-03-31')).toBe(30);
    expect(diffDays('2026-03-31', '2026-03-01')).toBe(-30);
    expect(sameMonth('2026-03-15', '2026-03-01')).toBe(true);
    expect(sameMonth('2026-03-15', '2026-04-01')).toBe(false);
  });

  it('practiceToday reflects the practice timezone, not the host', () => {
    vi.useFakeTimers();
    // 23:30 UTC on Sep 4 = 17:30 on Sep 4 in Monterrey (host in a far
    // timezone might already be on Sep 5).
    vi.setSystemTime(new Date('2026-09-04T23:30:00Z'));
    expect(practiceToday()).toBe('2026-09-04');
    vi.setSystemTime(new Date('2026-09-05T03:00:00Z')); // 21:00 Sep 4 in Monterrey
    expect(practiceToday()).toBe('2026-09-04');
  });
});

describe('practice-timezone instants (UI_SPEC §7.1)', () => {
  it('instantAtLocalTime resolves wall-clock time in America/Monterrey (UTC-6, no DST)', () => {
    // 10:30 wall time on Sep 5 → 16:30 UTC.
    expect(instantAtLocalTime('2026-09-05', 10, 30).toISOString()).toBe('2026-09-05T16:30:00.000Z');
    // Midnight boundary.
    expect(instantAtLocalTime('2026-09-05', 0, 0).toISOString()).toBe('2026-09-05T06:00:00.000Z');
  });

  it('localDateOfInstant maps instants back to the practice calendar date', () => {
    expect(localDateOfInstant('2026-09-05T16:30:00Z')).toBe('2026-09-05');
    // 05:59 UTC is still 23:59 on Sep 4 in Monterrey — the previous day.
    expect(localDateOfInstant('2026-09-05T05:59:00Z')).toBe('2026-09-04');
    // 06:00 UTC is 00:00 on Sep 5 — the next day.
    expect(localDateOfInstant('2026-09-05T06:00:00Z')).toBe('2026-09-05');
  });

  it('round-trips: instantAtLocalTime → localDateOfInstant returns the same day', () => {
    for (const [d, h, m] of [
      ['2026-01-01', 0, 0],
      ['2026-01-01', 23, 59],
      ['2026-06-15', 12, 0],
      ['2026-12-31', 9, 15],
    ] as const) {
      expect(localDateOfInstant(instantAtLocalTime(d, h, m).toISOString())).toBe(d);
    }
  });

  it('formatTime and formatTimeRange render practice wall-clock times', () => {
    expect(formatTime('2026-09-05T16:30:00Z')).toBe('10:30');
    expect(formatTime('2026-09-05T05:59:00Z')).toBe('23:59');
    expect(formatTime(null)).toBe('');
    expect(formatTimeRange('2026-09-05T16:30:00Z', 45)).toBe('10:30–11:15');
  });
});
