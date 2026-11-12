import { describe, expect, it } from 'vitest';
import {
  buildPatientDirectoryHref,
  buildPatientExpedienteHref,
  safePatientDirectoryHref,
} from '../src/components/patients/patient-directory-navigation';

describe('patient directory navigation', () => {
  it('builds a directory link with the current search and filter', () => {
    expect(buildPatientDirectoryHref('  Elena Rodríguez ', 'archived')).toBe('/patients?q=Elena+Rodr%C3%ADguez&status=archived');
    expect(buildPatientDirectoryHref('', 'active')).toBe('/patients');
  });

  it('carries a validated internal return path into the patient expediente', () => {
    expect(buildPatientExpedienteHref('patient-1', '/patients?q=Elena&status=archived'))
      .toBe('/patients/patient-1?returnTo=%2Fpatients%3Fq%3DElena%26status%3Darchived');
  });

  it('keeps only the registry search and filter in a safe return path', () => {
    expect(safePatientDirectoryHref('/patients?status=all&q=Juan&extra=ignored'))
      .toBe('/patients?q=Juan&status=all');
    expect(safePatientDirectoryHref('https://example.com/patients?q=secret')).toBe('/patients');
    expect(safePatientDirectoryHref('/patients/patient-1')).toBe('/patients');
    expect(safePatientDirectoryHref('//example.com/patients')).toBe('/patients');
  });
});
