'use client';

// Appointment detail actions (UI_SPEC §7.2). Status → available actions:
//   scheduled → editar, completar (duración real + optional consulta),
//               cancelar (inline confirmation)
//   completed → enlazar consulta (if not linked)
//   cancelled → reprogramar (inline edit)
// Every action refreshes the server component after success; errors show
// inline. No confirm() dialogs — cancellation is confirmed inline.

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import type { Appointment, EncounterSummary } from '@nexus-med/contracts';

import {
  AppointmentStatusBadge,
  AppointmentTypeBadge,
} from './badges';
import { AppointmentForm } from './appointment-form';
import { AppointmentEmail } from './appointment-email';
import {
  cancelAppointment,
  completeAppointment,
  linkEncounter,
} from '../../lib/api/client';
import {
  formatDateTime,
  formatTimeRange,
} from '../../lib/format';

type Mode = 'view' | 'edit' | 'complete' | 'cancel-confirm' | 'link';

type Props = {
  patientId: string;
  patientName: string;
  isArchived: boolean;
  appointment: Appointment;
  encounters: EncounterSummary[];
};

export function AppointmentDetail({
  patientId,
  patientName,
  isArchived,
  appointment: appt,
  encounters,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('view');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const pending = busy || refreshing;
  const [actualDuration, setActualDuration] = useState(appt.durationMinutes);
  const [encounterId, setEncounterId] = useState('');

  const run = async (fn: () => Promise<unknown>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
      setMode('view');
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La operación no se pudo completar.');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setError(null);
    setMode('view');
  };

  return (
    <>
      <div className="page-head">
        <h1>
          Cita — {patientName}
        </h1>
        <div className="actions">
          {appt.status === 'scheduled' && !isArchived ? (
            <Link
              href={`/patients/${patientId}/consultas/nueva?appointmentId=${encodeURIComponent(appt.id)}`}
              className="btn btn-primary"
            >
              Atender paciente
            </Link>
          ) : null}
          <Link href={`/patients/${patientId}/citas-y-consultas`} className="btn btn-secondary">
            Citas y consultas
          </Link>
        </div>
      </div>

      <div className="card">
        <div className="appt-detail-head">
          <div>
            <strong>{formatDateTime(appt.startAt)}</strong><p className="field-hint">Médico: {appt.doctor?.name ?? 'Sin asignar'}</p>
            <span className="appt-row-range">
              {' '}
              · {formatTimeRange(appt.startAt, appt.durationMinutes)} · {appt.durationMinutes} min
            </span>
          </div>
          <div className="badge-row">
            <AppointmentTypeBadge type={appt.type} />
            <AppointmentStatusBadge status={appt.status} />
          </div>
        </div>

        {appt.status === 'completed' ? (
          <div className="appt-extra">
            <span>
              Duración real:{' '}
              <strong>{appt.actualDurationMinutes ?? appt.durationMinutes} min</strong>
            </span>
            {appt.linkedEncounterId ? (
              <Link href={`/patients/${patientId}/consultas/${appt.linkedEncounterId}`}>
                Ver consulta enlazada →
              </Link>
            ) : (
              !isArchived && appt.status === 'completed' && mode !== 'link' && (
                <button className="btn btn-ghost btn-sm" disabled={pending} onClick={() => setMode('link')}>
                  Enlazar consulta
                </button>
              )
            )}
          </div>
        ) : null}

        {appt.status === 'cancelled' ? <p className="faint">Cita cancelada.</p> : null}

        {!isArchived ? <AppointmentEmail appointment={appt} showHistory /> : null}

        {error ? <p className="error">{error}</p> : null}

        {mode === 'edit' ? (
          <AppointmentForm patientId={patientId} initial={appt} onSaved={close} />
        ) : mode === 'complete' ? (
          <div className="panel">
            <h3>Completar cita</h3>
            <div className="form-row">
              <label>
                Duración real (min)
                <input
                  type="number"
                  min={5}
                  max={480}
                  step={5}
                  value={actualDuration}
                  disabled={pending}
                  onChange={(e) => setActualDuration(Number(e.target.value))}
                />
              </label>
              <label>
                Consulta (opcional)
                <select value={encounterId} disabled={pending} onChange={(e) => setEncounterId(e.target.value)}>
                  <option value="">Sin consulta</option>
                  {encounters.map((en) => (
                    <option key={en.id} value={en.id}>
                      {formatDateTime(en.occurredAt)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary"
                disabled={pending || actualDuration < 1}
                onClick={() =>
                  run(() =>
                    completeAppointment(appt.id, {
                      actualDurationMinutes: actualDuration,
                      encounterId: encounterId || undefined,
                    }),
                  )
                }
              >
                {busy ? 'Completando…' : 'Confirmar'}
              </button>
              <button className="btn btn-ghost" disabled={pending} onClick={close}>
                Cancelar
              </button>
            </div>
          </div>
        ) : mode === 'cancel-confirm' ? (
          <div className="panel">
            <h3>¿Cancelar esta cita?</h3>
            <p className="faint">
              Se conservará en el historial. Podrás reprogramarla después.
            </p>
            <div className="form-actions">
              <button
                className="btn btn-danger"
                disabled={pending}
                onClick={() => run(() => cancelAppointment(appt.id))}
              >
                {busy ? 'Cancelando…' : 'Sí, cancelar cita'}
              </button>
              <button className="btn btn-ghost" disabled={pending} onClick={close}>
                No
              </button>
            </div>
          </div>
        ) : mode === 'link' ? (
          <div className="panel">
            <h3>Enlazar consulta</h3>
            <div className="form-row">
              <label>
                Consulta
                <select value={encounterId} disabled={pending} onChange={(e) => setEncounterId(e.target.value)}>
                  <option value="" disabled>
                    Elige una consulta…
                  </option>
                  {encounters.map((en) => (
                    <option key={en.id} value={en.id}>
                      {formatDateTime(en.occurredAt)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="form-actions">
              <button
                className="btn btn-primary"
                disabled={pending || !encounterId}
                onClick={() => run(() => linkEncounter(appt.id, encounterId))}
              >
                {busy ? 'Enlazando…' : 'Enlazar'}
              </button>
              <button className="btn btn-ghost" disabled={pending} onClick={close}>
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          !isArchived && (
            <div className="appt-actions">
              {appt.status === 'scheduled' ? (
                <>
                  <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => setMode('edit')}>
                    Editar
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={pending} onClick={() => setMode('complete')}>
                    Completar
                  </button>
                  <button className="btn btn-danger btn-sm" disabled={pending} onClick={() => setMode('cancel-confirm')}>
                    Cancelar cita
                  </button>
                </>
              ) : appt.status === 'cancelled' ? (
                <button className="btn btn-secondary btn-sm" disabled={pending} onClick={() => setMode('edit')}>
                  Reprogramar
                </button>
              ) : null}
            </div>
          )
        )}
      </div>
    </>
  );
}
