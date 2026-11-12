import { redirect } from 'next/navigation';
import { authSessionSchema } from '@nexus-med/contracts';
import { ApiError, apiGet } from '../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let session;
  try {
    session = await apiGet('/api/session', authSessionSchema);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) redirect('/login');
    return (
      <main className="auth-status-page">
        <section className="auth-card">
          <p className="eyebrow">Nexus Med</p>
          <h1>No pudimos conectar con la aplicación</h1>
          <p>No fue posible confirmar tu acceso. Intenta de nuevo o vuelve al inicio de sesión.</p>
          <div className="actions">
            <a className="btn btn-primary" href="/">Reintentar</a>
            <a className="btn btn-secondary" href="/login">Volver a iniciar sesión</a>
          </div>
        </section>
      </main>
    );
  }
  redirect(session.user.role === 'secretary' || session.activeView === 'secretary' ? '/secretaria' : '/recepcion');
}
