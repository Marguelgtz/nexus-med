// Small helpers shared by API test files.

import { createApp } from '../src/app';

export const app = createApp();

let counter = 0;

/** A name guaranteed not to collide with fixture data or other tests. */
export function uniqueName(prefix = 'Paciente Prueba'): string {
  counter += 1;
  return `${prefix} ${Date.now().toString(36)}-${counter}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Register a patient through the real API and return its detail. */
export async function registerPatient(fullName: string): Promise<any> {
  const res = await app.request('/api/patients', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ fullName }),
  });
  if (res.status !== 201) throw new Error(`registerPatient failed: ${res.status}`);
  return res.json();
}
