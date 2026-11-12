interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  APP_BASE_URL?: string;
}

function resolveAppBaseUrl(request: Request, configured?: string): string {
  if (configured) return configured.replace(/\/$/, '');

  const hostname = new URL(request.url).hostname;
  const workersSuffix = '.workers.dev';
  if (!hostname.endsWith(workersSuffix)) {
    throw new Error('Set APP_BASE_URL when the marketing site uses a custom domain.');
  }

  const accountHostname = hostname.slice('nexus-med-site.'.length);
  if (!hostname.startsWith('nexus-med-site.') || !accountHostname.endsWith(workersSuffix)) {
    throw new Error('The marketing Worker must use the configured nexus-med-site workers.dev name.');
  }
  return `https://nexus-med-app.${accountHostname}`;
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== '/') return env.ASSETS.fetch(request);

    let appBaseUrl: string;
    try {
      appBaseUrl = resolveAppBaseUrl(request, env.APP_BASE_URL);
    } catch {
      return new Response('Application URL is not configured.', { status: 503 });
    }

    const assetResponse = await env.ASSETS.fetch(request);
    if (!assetResponse.ok || !assetResponse.headers.get('content-type')?.includes('text/html')) return assetResponse;

    const html = (await assetResponse.text()).replaceAll('__APP_BASE_URL__', appBaseUrl);
    const headers = new Headers(assetResponse.headers);
    headers.set('Cache-Control', 'public, max-age=300');
    headers.set('Content-Security-Policy', "default-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; upgrade-insecure-requests");
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    return new Response(html, { status: assetResponse.status, headers });
  },
};

export default worker;
