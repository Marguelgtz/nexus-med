// Server-side access to the Hono API (SSR).
//
// This module is the ONLY way server components talk to the API. It must
// never be imported from client components (guarded by `server-only`), and
// every fetch is explicitly non-cached: clinical data must never leak into
// static output or shared caches.
//
// Error contract: `apiGet` throws `ApiError`, which preserves the HTTP
// status (or `null` for network failures) and a user-facing message.
// Responses are validated against the shared contract schemas, so API/
// frontend contract drift fails loudly at request time instead of as
// undefined fields later.

import 'server-only';

import { z } from 'zod';

const API_BASE = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';

/**
 * A failed API request. `status` is the HTTP status when the API answered
 * (404 = record does not exist, 5xx = API failure) or `null` when the API
 * was unreachable. Callers must distinguish a missing record from an
 * unavailable API — they need different UI (notFound page vs recoverable
 * error banner), never the same.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number | null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch a resource and validate it against the shared contract schema.
 * Throws `ApiError` for any failure: non-OK status, network error, or a
 * response that does not match the contract.
 */
export async function apiGet<S extends z.ZodTypeAny>(path: string, schema: S): Promise<z.infer<S>> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  } catch {
    throw new ApiError('No se pudo conectar con el servicio de pacientes.', null);
  }

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new ApiError(body?.error?.message ?? `Error de la API (${res.status})`, res.status);
  }

  const data: unknown = await res.json().catch(() => null);
  try {
    return schema.parse(data);
  } catch {
    throw new ApiError('La respuesta de la API no cumple el contrato esperado.', res.status);
  }
}

/**
 * Tri-state result for pages: data, a genuine 404 (record does not exist),
 * or a recoverable error message. Pages map 404 → `notFound()` and anything
 * else → error banner with retry.
 */
export type ServerApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; notFound: true }
  | { ok: false; notFound: false; error: string };

/** apiGet as a tri-state result, so pages render the correct state. */
export async function fetchServer<S extends z.ZodTypeAny>(
  path: string,
  schema: S,
): Promise<ServerApiResult<z.infer<S>>> {
  try {
    return { ok: true, data: await apiGet<S>(path, schema) };
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return { ok: false, notFound: true };
    }
    return {
      ok: false,
      notFound: false,
      error: err instanceof Error ? err.message : 'Error desconocido',
    };
  }
}
