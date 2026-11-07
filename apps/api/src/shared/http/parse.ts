// Request-parsing helpers shared by API routes.

import type { Context } from 'hono';
import type { ZodType } from 'zod';

import { ValidationError } from './errors';

/** Parse a value against a shared contract schema or throw a ValidationError
 *  carrying per-field messages in the error envelope. */
export function parseOrThrow<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      (fieldErrors[key] ??= []).push(issue.message);
    }
    throw new ValidationError('Datos inválidos', fieldErrors);
  }
  return result.data;
}

/** Read and parse a JSON request body, or reject with a clear 400. */
export async function readJsonBody(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw new ValidationError('El cuerpo de la petición debe ser JSON válido');
  }
}

/** Query strings arrive as strings; drop empty/undefined values so `?q=`
 *  means "no filter". */
export function cleanQuery(raw: Record<string, string | undefined>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== undefined && value !== '') out[key] = value;
  }
  return out;
}
