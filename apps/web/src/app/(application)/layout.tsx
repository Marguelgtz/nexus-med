import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { authSessionSchema } from '@nexus-med/contracts';
import { AppFrame } from '../../components/shell/app-frame';
import { SessionKeepAlive } from '../../components/auth/session-keepalive';
import { ApiError, apiGet } from '../../lib/api/server';
import { applicationRedirectPath } from '../../lib/auth/navigation';

export const dynamic = 'force-dynamic';

function safeReturnPath(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/';
  return value;
}

export default async function ApplicationLayout({ children }: { children: ReactNode }) {
  const requestHeaders = await headers();
  const returnTo = safeReturnPath(requestHeaders.get('x-nexus-path'));

  let session;
  try {
    session = await apiGet('/api/session', authSessionSchema);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      redirect(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    }
    return (
      <main className="auth-status-page">
        <section className="auth-card">
          <p className="eyebrow">Nexus Med</p>
          <h1>No pudimos conectar con la aplicación</h1>
          <p>No fue posible confirmar tu acceso. Intenta de nuevo o vuelve al inicio de sesión.</p>
          <div className="actions">
            <a className="btn btn-primary" href={returnTo}>Reintentar</a>
            <a className="btn btn-secondary" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>Volver a iniciar sesión</a>
          </div>
        </section>
      </main>
    );
  }

  const currentPath = safeReturnPath(requestHeaders.get('x-nexus-path')).split(/[?#]/, 1)[0] ?? '/';
  const redirectPath = applicationRedirectPath(session, currentPath);
  if (redirectPath) redirect(redirectPath);
  if (session.onboardingRequired) return <><SessionKeepAlive />{children}</>;
  return <><SessionKeepAlive /><AppFrame session={session}>{children}</AppFrame></>;
}

