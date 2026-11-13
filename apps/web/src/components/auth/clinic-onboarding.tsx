'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { applicationPathForSession, postAuthSession } from '../../lib/auth/api';

export function ClinicOnboarding() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const session = await postAuthSession('/api/onboarding/clinic', {
        name: String(form.get('name') ?? '').trim(),
      });
      router.replace(applicationPathForSession(session));
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el consultorio.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-status-page">
      <section className="auth-card">
        <p className="eyebrow">Primer acceso</p>
        <h1>Configura tu consultorio</h1>
        <p>Este espacio pertenece a tu cuenta. Después podrás invitar a quienes colaboran contigo.</p>
        <form className="auth-form" onSubmit={handleSubmit}>
          <label>Nombre del consultorio
            <input name="name" type="text" autoComplete="organization" required minLength={2} maxLength={120} disabled={busy} />
          </label>
          <p className="muted">Zona horaria del piloto: Ciudad de México.</p>
          {error ? <p className="auth-message auth-error" role="alert">{error}</p> : null}
          <button className="btn btn-primary auth-submit" type="submit" disabled={busy}>
            {busy ? 'Guardando…' : 'Continuar'}
          </button>
        </form>
      </section>
    </main>
  );
}
