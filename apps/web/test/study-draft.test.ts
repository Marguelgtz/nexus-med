import { describe, expect, it } from 'vitest';
import { hasUnsavedStudyRequest } from '../src/lib/study-draft';

describe('unsaved study-order detection', () => {
  const initial = [{ category: 'laboratorio' as const, description: '' }];

  it('allows an untouched patient or linked-encounter form to close', () => {
    expect(hasUnsavedStudyRequest(initial, '')).toBe(false);
    expect(hasUnsavedStudyRequest(initial, 'encounter-1', 'encounter-1')).toBe(false);
  });

  it('detects entered descriptions, even when only whitespace is entered', () => {
    expect(hasUnsavedStudyRequest([{ ...initial[0], description: 'Biometría hemática' }], '')).toBe(true);
    expect(hasUnsavedStudyRequest([{ ...initial[0], description: ' ' }], '')).toBe(true);
  });

  it('detects category and encounter-selection changes', () => {
    expect(hasUnsavedStudyRequest([{ ...initial[0], category: 'ecg' }], '')).toBe(true);
    expect(hasUnsavedStudyRequest(initial, 'encounter-2')).toBe(true);
  });

  it('detects newly added rows even when their text is blank', () => {
    expect(hasUnsavedStudyRequest([...initial, ...initial], '')).toBe(true);
  });
});
