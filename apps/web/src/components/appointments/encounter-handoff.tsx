'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Appointment, EncounterDetail } from '@nexus-med/contracts';

import { completeAppointment, linkEncounter } from '../../lib/api/client';
import { formatDateTime } from '../../lib/format';
import { ErrorBanner } from '../primitives';

export function EncounterAppointmentHandoff({
  appointment,
  encounter,
}: {
  appointment: Appointment;
  encounter: EncounterDetail;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [duration, setDuration] = useState(appointment.actualDurationMinutes ?? appointment.durationMinutes);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const alreadyLinkedHere = appointment.linkedEncounterId === encounter.id;

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (appointment.status === 'scheduled') {
        await completeAppointment(appointment.id, {
          actualDurationMinutes: duration,
          ...(appointment.linkedEncounterId ? {} : { encounterId: encounter.id }),
        });
      } else {
        await linkEncounter(appointment.id, encounter.id);
      }
      setConfirming(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la cita.');
      setSaving(false);
    }
  }

  return (
    <section className="card appointment-handoff" aria-labelledby="appointment-handoff-title">
      <div className="card-header">
        <h2 id="appointment-handoff-title">Cita relacionada</h2>
        <span className="faint">{formatDateTime(appointment.startAt)}</span>
      </div>
      {alreadyLinkedHere && appointment.status === 'scheduled' ? (
        <div className="appointment-handoff-actions">
          <p role="status">Esta consulta ya está enlazada; la cita sigue programada.</p>
          <button type="button" className="btn btn-secondary" onClick={() => { setError(null); setConfirming(true); }}>
            Completar cita
          </button>
        </div>
      ) : alreadyLinkedHere ? (
        <p role="status">Esta consulta ya está enlazada a la cita.</p>
      ) : appointment.linkedEncounterId ? (
        <p className="notice">La cita ya está enlazada a otra consulta.</p>
      ) : appointment.status === 'cancelled' ? (
        <p className="faint">La cita está cancelada; no se puede completar ni enlazar desde aquí.</p>
      ) : confirming ? (
        <div className="panel">
          <p>La cita se completará y quedará enlazada con esta consulta.</p>
          {appointment.status === 'scheduled' ? (
            <div className="field">
              <label htmlFor="actual-duration">Duración real (minutos)</label>
              <input
                id="actual-duration"
                type="number"
                min={5}
                max={480}
                step={5}
                value={duration}
                onChange={(event) => setDuration(Number(event.target.value))}
              />
            </div>
          ) : null}
          {error ? <ErrorBanner message={error} /> : null}
          <div className="form-actions">
            <button
              type="button"
              className="btn btn-primary"
              disabled={saving || (appointment.status === 'scheduled' && (duration < 5 || duration > 480))}
              onClick={() => void save()}
            >
              {saving
                ? 'Guardando…'
                : appointment.status === 'scheduled'
                  ? appointment.linkedEncounterId ? 'Completar cita' : 'Completar y enlazar'
                  : 'Enlazar consulta'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirming(false)} disabled={saving}>
              Dejar sin cambios
            </button>
          </div>
        </div>
      ) : appointment.status === 'scheduled' || appointment.status === 'completed' ? (
        <div className="appointment-handoff-actions">
          <p>
            {appointment.status === 'scheduled'
              ? 'La cita sigue programada hasta que confirmes la relación.'
              : 'La cita está completada y aún no tiene una consulta enlazada.'}
          </p>
          <button type="button" className="btn btn-secondary" onClick={() => { setError(null); setConfirming(true); }}>
            {appointment.status === 'scheduled' ? 'Completar cita y enlazar esta consulta' : 'Enlazar esta consulta'}
          </button>
        </div>
      ) : null}
    </section>
  );
}
