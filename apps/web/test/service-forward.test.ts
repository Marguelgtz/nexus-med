import { describe, expect, it } from 'vitest';
import { forwardToApiService } from '../src/lib/api/service-forward';

describe('API service redirects', () => {
  it('returns authentication redirects to the browser rather than following them inside the API', async () => {
    const api = { fetch: async (request: Request) => request.redirect === 'manual'
      ? new Response(null, { status: 302, headers: { Location: '/login?verified=1' } })
      : new Response('API root not found', { status: 404 }) };
    const response = await forwardToApiService(api, new Request('https://example.test/api/auth/verify-email?token=synthetic'));
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('/login?verified=1');
  });
});
