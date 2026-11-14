import type { Context, MiddlewareHandler } from 'hono';
import { currentPrincipal, getAuthRuntime, type AuthRole } from './auth.context';
import { ForbiddenError, UnauthenticatedError } from '../../shared/http/errors';

function effectiveRole(role: AuthRole, demoView: 'doctor' | 'secretary') {
  return role === 'demo' ? demoView : role;
}

function isSecretaryRoute(method: string, path: string): boolean {
  if (path === '/api/session' || path === '/api/clinic/doctors') return method === 'GET';
  if (path === '/api/administrative/patients') return ['GET', 'POST'].includes(method);
  if (/^\/api\/patients\/[^/]+\/administrative$/.test(path)) return ['GET', 'PATCH'].includes(method);
  if (/^\/api\/patients\/[^/]+\/appointments$/.test(path)) return ['GET', 'POST'].includes(method);
  if (/^\/api\/appointments\/[^/]+\/cancel$/.test(path)) return method === 'POST';
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

  if (path === '/api/session' || path === '/api/onboarding/clinic' || path === '/api/invitations/accept') {
    await next();
    return;
  }
  if (principal.user.role !== 'demo' && !principal.membership) throw new ForbiddenError('Completa tu acceso a una clínica para continuar.');

  const routeRole = effectiveRole(principal.user.role, principal.session.demoView);
  if ((routeRole === 'secretary' || routeRole === 'administrator') && !path.startsWith('/api/access/') && !isSecretaryRoute(c.req.method, path)) throw new ForbiddenError();
  if (path.startsWith('/api/access/') && !principal.membership?.isAdmin) throw new ForbiddenError();

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
  let runtime: ReturnType<typeof getAuthRuntime> | undefined;
  try { runtime = getAuthRuntime(); } catch { /* Isolated domain tests have no authentication runtime. */ }
  const configured = runtime?.appBaseUrl ?? (c.env as { APP_BASE_URL?: string } | undefined)?.APP_BASE_URL ?? process.env.APP_BASE_URL;
  const trusted = new Set<string>();
  if (!runtime || runtime.localRuntime) {
    trusted.add('http://127.0.0.1:3000');
    trusted.add('http://localhost:3000');
  }
  if (configured) {
    try { trusted.add(new URL(configured).origin); } catch { return false; }
  }
  // Request Host/URL is not an authority for adding a trusted origin.
  return trusted.has(origin);
}
