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
          <h1>Aplicación temporalmente no disponible</h1>
          <p>No se pudo confirmar el acceso al espacio de trabajo.</p>
          <a className="btn btn-primary" href="/">Reintentar</a>
        </section>
      </main>
    );
  }
  redirect(session.user.role === 'secretary' || session.activeView === 'secretary' ? '/secretaria' : '/recepcion');
}
