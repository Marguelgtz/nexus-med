import { describe, expect, it } from 'vitest';
import { resolveReceptionSection } from '../src/components/appointments/reception-section';

describe('reception section navigation', () => {
  it('opens the physician appointment list only for the citas section', () => {
    expect(resolveReceptionSection(false, 'citas')).toBe('citas');
    expect(resolveReceptionSection(false, undefined)).toBe('agenda');
    expect(resolveReceptionSection(false, 'pacientes')).toBe('agenda');
    expect(resolveReceptionSection(false, 'estudios')).toBe('agenda');
  });

  it('keeps administrative sections inside the secretary workspace', () => {
    expect(resolveReceptionSection(true, 'pacientes')).toBe('pacientes');
    expect(resolveReceptionSection(true, 'estudios')).toBe('estudios');
    expect(resolveReceptionSection(true, 'agenda')).toBe('agenda');
    expect(resolveReceptionSection(true, 'citas')).toBe('agenda');
  });
});
