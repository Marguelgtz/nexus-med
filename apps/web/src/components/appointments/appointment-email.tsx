'use client';

import { useEffect, useRef, useState } from 'react';
import type { Appointment, AppointmentEmailEvent, AppointmentEmailStatus } from '@nexus-med/contracts';
import { listAppointmentEmails, retryAppointmentEmail, sendAppointmentEmail } from '../../lib/api/client';

const EVENT_LABEL: Record<AppointmentEmailEvent, string> = {
  confirmation: 'Confirmación',
  reschedule: 'Cambio de cita',
  cancellation: 'Cancelación',
};

const STATUS_LABEL: Record<AppointmentEmailStatus['status'], string> = {
  queued: 'En cola',
  captured: 'Capturado localmente; no se envía',
  sending: 'Enviando',
  sent: 'Aceptado por el servidor de correo',
  failed: 'Falló',
  uncertain: 'Revisar antes de volver a enviar',
  superseded: 'La cita o el permiso cambió antes del envío',
  simulated: 'Simulado; no se envía desde la demo',
};

export function AppointmentEmail({ appointment, compact = false, showHistory = false }: {
  appointment: Appointment;
  compact?: boolean;
  showHistory?: boolean;
}) {
  const [history, setHistory] = useState<AppointmentEmailStatus[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [historyExpanded, setHistoryExpanded] = useState(showHistory);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const historyRevision = useRef(0);
  const consentReady = Boolean(appointment.patient.email && appointment.patient.appointmentEmailConsent);

  useEffect(() => {
    if (!historyExpanded || historyLoaded || busy) return;
    let current = true;
    const revision = historyRevision.current;
    listAppointmentEmails(appointment.id)
      .then(rows => { if (current) {
        // A fast send can finish before React renders the busy state. Preserve
        // its newer status if this older history request resolves afterwards.
        setHistory(existing => revision === historyRevision.current ? rows : [
          ...existing,
          ...rows.filter(row => !existing.some(message => message.id === row.id)),
        ]);
        setHistoryError(''); setHistoryLoaded(true);
      } })
      .catch(() => { if (current) { setHistoryError('No se pudieron cargar los avisos.'); setHistoryLoaded(true); } });
    return () => { current = false; };
  }, [appointment.id, historyExpanded, historyLoaded, busy]);

  async function run(action: () => Promise<AppointmentEmailStatus>) {
    setBusy(true);
    setError('');
    try {
      const message = await action();
      historyRevision.current += 1;
      setHistory(rows => [message, ...rows.filter(row => row.id !== message.id)]);
      setHistoryExpanded(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo procesar el aviso.');
    } finally {
      setBusy(false);
    }
  }

  const events: AppointmentEmailEvent[] = appointment.status === 'cancelled'
    ? ['cancellation']
    : appointment.status === 'scheduled'
      ? ['confirmation', 'reschedule']
      : [];

  return (
    <section className={`appointment-email${compact ? ' appointment-email-compact' : ''}`} aria-label="Avisos por correo">
      <div className="appointment-email-heading">
        <div>
          <strong>Correo de coordinación</strong>
          <p className="field-hint">{consentReady ? 'Permiso confirmado. El aviso no incluye información clínica.' : 'Sin permiso de correo para este paciente.'}</p>
        </div>
      </div>
      {consentReady ? <div className="appointment-email-actions">
        {events.map(event => <button key={event} type="button" className="btn btn-ghost btn-sm" disabled={busy}
          onClick={() => void run(() => sendAppointmentEmail(appointment.id, event))}>
          {busy ? 'Procesando…' : `Enviar ${EVENT_LABEL[event].toLowerCase()}`}
        </button>)}
      </div> : null}
      {compact ? <button type="button" className="btn btn-ghost btn-sm" onClick={() => setHistoryExpanded(value => !value)}>
        {historyExpanded ? 'Ocultar avisos' : 'Ver avisos'}
      </button> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}
      {historyExpanded && !historyLoaded && !busy ? <p role="status">Cargando avisos…</p> : null}
      {historyExpanded && historyError ? <div role="alert"><p className="error">{historyError}</p><button type="button" className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setHistoryError(''); setHistoryLoaded(false); }}>Reintentar carga de avisos</button></div> : null}
      {historyExpanded && historyLoaded && !historyError && history.length === 0 ? <p className="faint">Aún no hay avisos.</p> : null}
      {historyExpanded && history.length ? <ul className="appointment-email-history" aria-label="Estado de avisos">
        {history.map(message => <li key={message.id}>
          <span><strong>{EVENT_LABEL[message.event]}</strong> · {STATUS_LABEL[message.status]}</span>
          {message.status === 'failed' || message.status === 'uncertain' ? <button type="button" className="btn btn-ghost btn-sm" disabled={busy}
            onClick={() => {
              const acknowledge = message.status !== 'uncertain' || window.confirm('El servidor pudo haber aceptado el correo antes de interrumpirse. Reintentar podría enviar un duplicado. ¿Ya revisaste la bandeja de salida?');
              if (acknowledge) void run(() => retryAppointmentEmail(appointment.id, message.id, message.status === 'uncertain'));
            }}>Reintentar</button> : null}
        </li>)}
      </ul> : null}
    </section>
  );
}
