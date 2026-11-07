// Date/age presentation helpers (UI_SPEC §1.4): es-MX, local practice
// timezone, dates never displayed in UTC.

const dateFmt = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: undefined,
});

const dateTimeFmt = new Intl.DateTimeFormat('es-MX', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: undefined,
});

/** `YYYY-MM-DD` → "12 de marzo de 1958". */
export function formatDate(value: string | null): string {
  if (!value) return 'No registrado';
  const [y, m, d] = value.split('-').map(Number);
  if (!y || !m || !d) return value;
  return dateFmt.format(new Date(y, m - 1, d));
}

/** ISO 8601 → "12 de marzo de 2025, 10:30". */
export function formatDateTime(value: string | null): string {
  if (!value) return 'No registrado';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateTimeFmt.format(date);
}

/** Age in completed years from a `YYYY-MM-DD` birth date (never stored). */
export function formatAge(dateOfBirth: string | null): string | null {
  if (!dateOfBirth) return null;
  const [y, m, d] = dateOfBirth.split('-').map(Number);
  if (!y || !m || !d) return null;
  const birth = new Date(y, m - 1, d);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - y;
  const beforeBirthday =
    now.getMonth() < m - 1 || (now.getMonth() === m - 1 && now.getDate() < d);
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
