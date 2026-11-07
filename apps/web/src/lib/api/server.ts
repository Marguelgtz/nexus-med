// Server-side access to the Hono API (SSR).
//
// This module is the ONLY way server components talk to the API. It must
// never be imported from client components (guarded by `server-only`), and
// every fetch is explicitly non-cached: clinical data must never leak into
// static output or shared caches.

import 'server-only';

const API_BASE = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { cache: 'no-store' });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new Error(body?.error?.message ?? `Error de la API (${res.status})`);
  }
  return (await res.json()) as T;
}
