import type { Context, MiddlewareHandler } from 'hono';
import { currentPrincipal, getAuthRuntime } from './auth.context';
import { ForbiddenError, UnauthenticatedError } from '../../shared/http/errors';

function effectiveRole(role: 'doctor' | 'secretary' | 'demo', demoView: 'doctor' | 'secretary') {
  return role === 'demo' ? demoView : role;
}

function isSecretaryRoute(method: string, path: string): boolean {
  if (path === '/api/session') return true;
  if (path === '/api/administrative/patients') return ['GET', 'POST'].includes(method);
  if (/^\/api\/patients\/[^/]+\/administrative$/.test(path)) return ['GET', 'PATCH'].includes(method);
  if (/^\/api\/patients\/[^/]+\/appointments$/.test(path)) return ['GET', 'POST'].includes(method);
  if (path === '/api/appointments' || /^\/api\/appointments\/[^/]+$/.test(path)) return ['GET', 'PATCH'].includes(method);
  if (/^\/api\/appointments\/[^/]+\/emails(?:\/[^/]+\/retry)?$/.test(path)) return ['GET', 'POST'].includes(method);
  if (path === '/api/reception' || /^\/api\/appointments\/[^/]+\/reception$/.test(path)) return method === 'GET' || method === 'POST';
  if (path === '/api/study-receipts') return method === 'GET';
  if (/^\/api\/patients\/[^/]+\/study-receipts$/.test(path)) return method === 'POST';
  if (/^\/api\/study-receipt-files\/[^/]+$/.test(path)) return method === 'GET';
  if (/^\/api\/patients\/[^/]+\/study-receipt-options$/.test(path)) return method === 'GET';
  return false;
}

export const requireAuthentication: MiddlewareHandler = async (c, next) => {
  const path = c.req.path;
  if (path === '/api/demo/session' || path === '/api/options' || path === '/api/auth/prepare-invitation' || path.startsWith('/api/auth/')) {
    await next();
    return;
  }
  if (path === '/api/dev/emails' && getAuthRuntime().localRuntime) {
    await next();
    return;
  }

  const principal = currentPrincipal();
  if (!principal) throw new UnauthenticatedError();
  if (principal.user.disabledAt || !principal.user.emailVerified) throw new UnauthenticatedError();
  if (path === '/api/demo/view') {
    if (principal.user.role !== 'demo') throw new ForbiddenError();
    await next();
    return;
  }

  const routeRole = effectiveRole(principal.user.role, principal.session.demoView);
  if (routeRole === 'secretary' && !isSecretaryRoute(c.req.method, path)) throw new ForbiddenError();
  if (path.startsWith('/api/access/') && principal.user.role !== 'doctor') throw new ForbiddenError();

  if (path === '/api/appointments' || path === '/api/reception' || /^\/api\/appointments\/[^/]+\/reception$/.test(path)) {
    if (path.endsWith('/reception') && c.req.method === 'POST') {
      const body = await c.req.raw.clone().json().catch(() => null) as { action?: unknown } | null;
      if (body?.action === 'start' && routeRole !== 'doctor') throw new ForbiddenError();
    }
  }

  if (/^\/api\/appointments\/[^/]+\/(complete|link-encounter)$/.test(path) && routeRole !== 'doctor') throw new ForbiddenError();
  if (/^\/api\/study-receipts\/[^/]+\/review$/.test(path) && routeRole !== 'doctor') throw new ForbiddenError();

  await next();
};

export function isTrustedAppOrigin(origin: string | undefined, c: Context): boolean {
  if (!origin) return false;
  const configured = (c.env as { APP_BASE_URL?: string } | undefined)?.APP_BASE_URL ?? process.env.APP_BASE_URL;
  const trusted = new Set([
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    new URL(c.req.url).origin,
    ...(configured ? [configured.replace(/\/$/, '')] : []),
  ]);
  return trusted.has(origin);
}
