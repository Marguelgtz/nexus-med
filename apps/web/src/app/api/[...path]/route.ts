import { getCloudflareContext } from '@opennextjs/cloudflare';

export const dynamic = 'force-dynamic';

type ApiService = { fetch(request: Request): Promise<Response> };

async function forward(request: Request): Promise<Response> {
  if (process.env.NODE_ENV !== 'production') {
    const apiBase = process.env.API_INTERNAL_URL ?? 'http://127.0.0.1:4000';
    const sourceUrl = new URL(request.url);
    const targetUrl = new URL(`${sourceUrl.pathname}${sourceUrl.search}`, apiBase);
    const headers = new Headers(request.headers);
    headers.delete('host');
    headers.delete('content-length');
    headers.delete('cf-connecting-ip');
    headers.delete('x-forwarded-for');
    headers.delete('x-real-ip');
    headers.delete('x-nexus-path');
    headers.delete('x-user-id');
    headers.delete('x-user-role');
    headers.delete('x-workspace');
    headers.set('x-forwarded-for', '127.0.0.1');

    const init: RequestInit & { duplex?: 'half' } = {
      method: request.method,
      headers,
      redirect: 'manual',
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
      init.duplex = 'half';
    }
    return fetch(targetUrl, init);
  }

  const { env } = await getCloudflareContext({ async: true });
  const api = (env as CloudflareEnv & { API?: ApiService }).API;
  if (!api) return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'La API no está disponible.' } }, { status: 503 });
  return api.fetch(request);
}

export const GET = forward;
export const HEAD = forward;
export const POST = forward;
export const PUT = forward;
export const PATCH = forward;
export const DELETE = forward;
export const OPTIONS = forward;

