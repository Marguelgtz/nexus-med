import { afterEach, describe, expect, it, vi } from 'vitest';
import { PRACTICE_TIMEZONE, formatAge, formatDate, formatDateTime, wasEdited } from '../src/lib/format';

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
