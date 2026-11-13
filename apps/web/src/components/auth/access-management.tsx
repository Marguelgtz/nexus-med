'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { AuthMember, Invitation } from '@nexus-med/contracts';

interface AccessManagementProps {
  initialInvitations: Invitation[];
  initialMembers: AuthMember[];
  nowMs: number;
  currentUserId: string;
}

export function AccessManagement({ initialInvitations, initialMembers, nowMs, currentUserId }: AccessManagementProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(formElement);
    try {
      const response = await fetch('/api/access/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: String(form.get('email') ?? '').trim(), role: String(form.get('role') ?? 'secretary') }),
        cache: 'no-store',
      });
      if (!response.ok) throw new Error(await apiMessage(response));
      setMessage('Invitación registrada en la cola de correo.');
      formElement.reset();
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear la invitación.');
    } finally {
      setBusy(false);
    }
  }

  async function postAction(path: string, action: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(path, { method: 'POST', cache: 'no-store' });
      if (!response.ok) throw new Error(await apiMessage(response));
      setMessage(action);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo guardar el cambio.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="access-management">
      <section className="access-section">
        <div className="page-head"><div><h2>Invitar a la clínica</h2><p className="muted">La invitación vence después de 72 horas y solo funciona para el correo indicado. Para modificar accesos, inicia sesión de nuevo si llevas más de 10 minutos.</p></div></div>
        <form className="access-invite-form" onSubmit={handleInvite}>
          <label>Correo electrónico<input name="email" type="email" autoComplete="email" maxLength={255} required disabled={busy} /></label>
          <label>Rol<select name="role" defaultValue="secretary" disabled={busy}><option value="secretary">Secretaría</option><option value="doctor">Médico</option></select></label>
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Guardando…' : 'Crear invitación'}</button>
        </form>
      </section>

      {error ? <p className="auth-message auth-error" role="alert">{error}</p> : null}
      {message ? <p className="auth-message auth-success" role="status">{message}</p> : null}

      <section className="access-section">
        <div className="page-head"><div><h2>Cuentas</h2><p className="muted">Las cuentas revocadas pierden sus sesiones activas.</p></div></div>
        <div className="access-list">
          {initialMembers.map(member => (
            <article className="access-row" key={member.id}>
              <div><strong>{member.name}</strong><span>{member.email}</span><span>{roleName(member.role)}{member.isAdmin ? ' · Administrador' : ''}</span></div>
              <span className={`badge ${member.active ? 'badge-success' : 'badge-neutral'}`}>{member.active ? (member.emailVerified ? 'Activa' : 'Pendiente de verificación') : 'Revocada'}</span>
              {member.active && member.id !== currentUserId ? <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void postAction(`/api/access/members/${encodeURIComponent(member.id)}/revoke`, 'Acceso revocado.')}>Revocar acceso</button> : null}
            </article>
          ))}
          {initialMembers.length === 0 ? <p className="muted">No hay cuentas de equipo configuradas.</p> : null}
        </div>
      </section>

      <section className="access-section">
        <div className="page-head"><div><h2>Invitaciones</h2><p className="muted">No compartas el enlace de invitación por otros canales.</p></div></div>
        <div className="access-list">
          {initialInvitations.map(invitation => {
            const pending = !invitation.acceptedAt && !invitation.revokedAt && new Date(invitation.expiresAt).getTime() > nowMs;
            return (
              <article className="access-row" key={invitation.id}>
                <div><strong>{invitation.email}</strong><span>Vence {formatMexicoDate(invitation.expiresAt)}</span></div>
                <span className={`badge ${pending ? 'badge-warning' : 'badge-neutral'}`}>{invitation.acceptedAt ? 'Aceptada' : invitation.revokedAt ? 'Revocada' : pending ? 'Pendiente' : 'Vencida'}</span>
                {pending ? <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void postAction(`/api/access/invitations/${encodeURIComponent(invitation.id)}/revoke`, 'Invitación revocada.')}>Revocar</button> : null}
              </article>
            );
          })}
          {initialInvitations.length === 0 ? <p className="muted">Aún no hay invitaciones.</p> : null}
        </div>
      </section>
    </div>
  );
}

function roleName(role: AuthMember['role']): string {
  return role === 'doctor' ? 'Médico' : role === 'secretary' ? 'Secretaría' : 'Administración';
}

async function apiMessage(response: Response): Promise<string> {
  const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  return body?.error?.message ?? 'No se pudo completar la solicitud.';
}

function formatMexicoDate(value: string): string {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

