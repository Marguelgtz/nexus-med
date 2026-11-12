'use client';

import { useEffect, useState } from 'react';
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
  const consentReady = Boolean(appointment.patient.email && appointment.patient.appointmentEmailConsent);

  useEffect(() => {
    if (!historyExpanded || historyLoaded) return;
    let current = true;
    listAppointmentEmails(appointment.id)
      .then(rows => { if (current) { setHistory(rows); setHistoryLoaded(true); } })
      .catch(() => { if (current) setHistoryLoaded(true); });
    return () => { current = false; };
  }, [appointment.id, historyExpanded, historyLoaded]);

  async function run(action: () => Promise<AppointmentEmailStatus>) {
    setBusy(true);
    setError('');
    try {
      const message = await action();
      setHistory(rows => [message, ...rows.filter(row => row.id !== message.id)]);
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
      {history.length ? <ul className="appointment-email-history" aria-label="Estado de avisos">
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
