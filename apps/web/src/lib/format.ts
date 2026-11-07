// Date/age presentation helpers (UI_SPEC §1.4): es-MX, rendered in the
// configured practice timezone. Dates are never displayed in UTC and never
// depend on the host machine's timezone.

// Central practice timezone (DATA_MODEL.md §6): one config, applied
// consistently. Initially America/Monterrey unless the doctor specifies
// otherwise.
export const PRACTICE_TIMEZONE = 'America/Monterrey';

const dateFmt = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: PRACTICE_TIMEZONE,
});

const dateTimeFmt = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: PRACTICE_TIMEZONE,
});

/**
 * Current calendar date (year/month/day, 1-indexed month) as seen in the
 * practice timezone, so age is computed against the practice's "today",
 * not the host's clock.
 */
function todayInPractice(now: Date = new Date()): { y: number; m: number; d: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PRACTICE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { y: get('year'), m: get('month'), d: get('day') };
}

/**
 * `YYYY-MM-DD` → "12 de marzo de 1958". A date-only value is rendered via a
 * UTC-noon instant so the same calendar date appears in the practice
 * timezone regardless of the host's timezone.
 */
export function formatDate(value: string | null): string {
  if (!value) return 'No registrado';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return dateFmt.format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** ISO 8601 instant → "12 de marzo de 2025, 10:30" (practice timezone). */
export function formatDateTime(value: string | null): string {
  if (!value) return 'No registrado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFmt.format(date);
}

/** Age in completed years from a `YYYY-MM-DD` birth date (never stored). */
export function formatAge(dateOfBirth: string | null, now: Date = new Date()): string | null {
  if (!dateOfBirth) return null;
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  if (!y || !m || !d) return null;
  const { y: nowY, m: nowM, d: nowD } = todayInPractice(now);
  let age = nowY - y;
  const beforeBirthday = nowM < m || (nowM === m && nowD < d);
  if (beforeBirthday) age -= 1;
  if (age < 0) return null;
  return String(age);
}

/**
 * True when the note was edited after it was first created. Compares
 * `updatedAt` against `createdAt` — never against `occurredAt`, which is
 * when the consultation took place (a backdated consultation entered
 * later was not "edited" merely because it was recorded late).
 */
export function wasEdited(createdAt: string, updatedAt: string): boolean {
  const a = new Date(createdAt).getTime();
  const b = new Date(updatedAt).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return false;
  return b - a > 60_000;
}
