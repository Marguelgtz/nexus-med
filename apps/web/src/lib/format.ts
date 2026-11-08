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

// ── Calendar date math (UI_SPEC §7.1) ────────────────────────────────────
//
// All calendar arithmetic works on `YYYY-MM-DD` calendar dates interpreted
// in the practice timezone, never on the host's clock or on UTC.

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function partsOf(dateStr: string): { y: number; m: number; d: number } {
  const [y = 0, m = 0, d = 0] = dateStr.split('-').map(Number);
  return { y, m, d };
}

function isValidDateStr(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return false;
  const check = new Date(Date.UTC(y, m - 1, d));
  return check.getUTCFullYear() === y && check.getUTCMonth() === m - 1 && check.getUTCDate() === d;
}

/** Today as `YYYY-MM-DD` in the practice timezone. */
export function practiceToday(now: Date = new Date()): string {
  const { y, m, d } = todayInPractice(now);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}
/** True for a real calendar date in `YYYY-MM-DD` form. */
export function isValidCalendarDate(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && isValidDateStr(dateStr);
}

/** Add (or subtract) days to a `YYYY-MM-DD` date. */
export function addDays(dateStr: string, days: number): string {
  const { y, m, d } = partsOf(dateStr);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return `${shifted.getUTCFullYear()}-${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}

/** Monday of the week containing `dateStr` (Monday-start weeks, §7.1). */
export function startOfWeek(dateStr: string): string {
  const { y, m, d } = partsOf(dateStr);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=Sun … 6=Sat
  const backToMonday = dow === 0 ? 6 : dow - 1;
  return addDays(dateStr, -backToMonday);
}

/** First day of the month of `dateStr`. */
export function startOfMonth(dateStr: string): string {
  const { y, m } = partsOf(dateStr);
  return `${y}-${pad2(m)}-01`;
}

/** The 7 days of the week starting at `dateStr`. */
export function weekDays(dateStr: string): string[] {
  const monday = startOfWeek(dateStr);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

/** The 28–42 cells of the month grid containing `dateStr` (Monday-start
 *  weeks, padded at both ends so the grid is always rectangular). */
export function monthGrid(dateStr: string): string[] {
  const first = startOfMonth(dateStr);
  const gridStart = startOfWeek(first);
  const lastOfMonth = addDays(startOfMonth(addDays(first, 32)), -1); // next month, back one day
  const weeksNeeded = Math.ceil((diffDays(gridStart, lastOfMonth) + 1) / 7);
  return Array.from({ length: weeksNeeded * 7 }, (_, i) => addDays(gridStart, i));
}

/** Whole days from `a` to `b` (both `YYYY-MM-DD`). */
export function diffDays(a: string, b: string): number {
  const pa = partsOf(a);
  const pb = partsOf(b);
  return Math.round(
    (Date.UTC(pb.y, pb.m - 1, pb.d) - Date.UTC(pa.y, pa.m - 1, pa.d)) / 86_400_000,
  );
}

/** True when `other` is the same calendar month as `dateStr`. */
export function sameMonth(a: string, b: string): boolean {
  return a.slice(0, 7) === b.slice(0, 7);
}

/**
 * The instant (Date) of `hour`:`minute` local wall-clock time on
 * `dateStr`, resolved in the practice timezone. Used to build the [from,
 * to) API range for a calendar view.
 */
export function instantAtLocalTime(dateStr: string, hour: number, minute: number): Date {
  const { y, m, d } = partsOf(dateStr);
  // First estimate: treat the wall time as UTC, then shift by the practice
  // offset at that instant (two passes make this exact for all current
  // timezones, which have no intra-day offset changes).
  const estimate = new Date(Date.UTC(y, m - 1, d, hour, minute));
  const offset = tzOffsetMinutes(estimate, PRACTICE_TIMEZONE);
  return new Date(estimate.getTime() - offset * 60_000);
}

/** UTC offset (in minutes, east-positive) of a timezone at an instant. */
export function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUTC = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour') % 24, get('minute'), get('second'));
  return (asUTC - instant.getTime()) / 60_000;
}

/** ISO instant → `YYYY-MM-DD` calendar date in the practice timezone. */
export function localDateOfInstant(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const { y, m, d } = todayInPractice(date);
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** ISO instant → "HH:mm" in the practice timezone. */
export function formatTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: PRACTICE_TIMEZONE,
  }).format(date);
}

/** ISO instant → "HH:MM–HH:MM" range label (practice timezone). */
export function formatTimeRange(startIso: string, durationMinutes: number): string {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return '';
  const end = new Intl.DateTimeFormat('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: PRACTICE_TIMEZONE,
  }).format(new Date(start.getTime() + durationMinutes * 60_000));
  return `${formatTime(startIso)}–${end}`;
}

/** "lun 1" — compact weekday + day for week/month grid headers. */
export function formatDayHeader(dateStr: string): string {
  const { y, m, d } = partsOf(dateStr);
  const wd = new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    timeZone: PRACTICE_TIMEZONE,
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
  return `${wd.replace('.', '')} ${d}`;
}

/** "lunes, 1 de marzo de 2026" — full day heading for the day view. */
export function formatDayLong(dateStr: string): string {
  const { y, m, d } = partsOf(dateStr);
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: PRACTICE_TIMEZONE,
  }).format(new Date(Date.UTC(y, m - 1, d, 12)));
}

/** "marzo de 2026" — month view heading. */
export function formatMonthLong(dateStr: string): string {
  const { y, m } = partsOf(dateStr);
  return new Intl.DateTimeFormat('es-MX', {
    month: 'long',
    year: 'numeric',
    timeZone: PRACTICE_TIMEZONE,
  }).format(new Date(Date.UTC(y, m - 1, 15, 12)));
}

// ── Display labels (UI_SPEC §7.1) ────────────────────────────────────────

export const APPOINTMENT_TYPE_LABELS: Record<string, string> = {
  consulta: 'Consulta',
  procedimiento: 'Procedimiento',
  visita_domicilio: 'Visita a domicilio',
  urgencia: 'Urgencia',
};

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: 'Programada',
  completed: 'Completada',
  cancelled: 'Cancelada',
};

export const STUDY_STATUS_LABELS: Record<string, string> = {
  ordered: 'Ordenada',
  completed: 'Completada',
  reviewed: 'Revisada',
};

export const STUDY_CATEGORY_LABELS: Record<string, string> = {
  laboratorio: 'Laboratorio',
  imagenologia: 'Imagenología',
  rayos_x: 'Rayos X',
  ecg: 'ECG',
  ecografia: 'Ecografía',
  otro: 'Otro',
};
