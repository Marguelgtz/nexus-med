import type { StudyInput } from '@nexus-med/contracts';

/** An untouched, blank study row is safe to dismiss. Any user edit is not. */
export function hasUnsavedStudyRequest(
  rows: readonly StudyInput[],
  selectedEncounterId: string,
  initialEncounterId?: string,
): boolean {
  return selectedEncounterId !== (initialEncounterId ?? '') ||
    rows.length !== 1 ||
    rows.some((row) => row.category !== 'laboratorio' || row.description.length > 0);
}
