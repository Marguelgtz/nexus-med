'use client';

// Appointment create/edit form (UI_SPEC §7.2). Fields: date, time,
// planned duration, type. The overlap check is a non-blocking warning:
// the API never rejects overlaps (UI_SPEC §7.1), the form just tells the
// doctor a conflict exists. On success the form redirects to the detail
// page (create) or refreshes in place (edit).

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Appointment, AppointmentType } from '@nexus-med/contracts';

import {
  addDays,
  APPOINTMENT_TYPE_LABELS,
  formatTime,
  instantAtLocalTime,
  localDateOfInstant,
} from '../../lib/format';
import { overlappingScheduledAppointments } from '../../lib/calendar';
import { createAppointment, listAppointmentsInRange, updateAppointment } from '../../lib/api/client';

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];
const TYPES = Object.keys(APPOINTMENT_TYPE_LABELS);

type Props = {
  patientId: string;
  initial?: Appointment;
  /** Called after a successful edit; the parent refreshes server data. */
  onSaved?: () => void;
  /** Keep the current clinical workspace mounted after an in-context create. */
  onCreated?: (appointment: Appointment) => void;
  /** Return here after a standalone follow-up appointment is saved. */
  returnTo?: string;
};

function toIso(dateStr: string, timeStr: string): string {
  const sep = timeStr.indexOf(':');
  const h = Number(timeStr.slice(0, sep === -1 ? timeStr.length : sep)) || 0;
  const m = sep === -1 ? 0 : Number(timeStr.slice(sep + 1));
  return instantAtLocalTime(dateStr, h, m).toISOString();
}

export function AppointmentForm({ patientId, initial, onSaved, onCreated, returnTo }: Props) {
  const router = useRouter();
  const [date, setDate] = useState(() =>
    initial ? localDateOfInstant(initial.startAt) : localDateOfInstant(new Date().toISOString()),
  );
  const [time, setTime] = useState(() => (initial ? formatTime(initial.startAt) : '09:00'));
  const [duration, setDuration] = useState(initial?.durationMinutes ?? 30);
  const [type, setType] = useState<AppointmentType>(initial?.type ?? 'consulta');
  const [error, setError] = useState<string | null>(null);
  const [overlap, setOverlap] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  // Non-blocking overlap check, debounced: candidate [start, start+duration)
  // against that patient's appointments that day.
  const candidateStart = useMemo(() => toIso(date, time), [date, time]);
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const day = localDateOfInstant(candidateStart);
        const range = await listAppointmentsInRange({
          from: instantAtLocalTime(day, 0, 0).toISOString(),
          to: instantAtLocalTime(addDays(day, 1), 0, 0).toISOString(),
        });
        if (cancelled) return;
        const hits = overlappingScheduledAppointments(range, candidateStart, duration, initial?.id)
          .map((a) => `${formatTime(a.startAt)} (${a.patient.fullName})`);
        setOverlap(hits);
      } catch {
        if (!cancelled) setOverlap([]);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [candidateStart, duration, patientId, initial?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const startAt = toIso(date, time);
    try {
      if (initial) {
        await updateAppointment(initial.id, {
          startAt,
          durationMinutes: duration,
          type,
        });
        onSaved?.();
        router.refresh();
      } else {
        const appt = await createAppointment(patientId, {
          startAt,
          durationMinutes: duration,
          type,
        });
        if (onCreated) {
          onCreated(appt);
        } else {
          router.push(returnTo ?? `/patients/${appt.patient.id}/citas/${appt.id}`);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar la cita.');
      setBusy(false);
    }
  }

  return (
    <form className="appt-form" onSubmit={handleSubmit} aria-busy={busy}>
      <div className="form-row">
        <label>
          Fecha
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            aria-label="Fecha de la cita"
          />
        </label>
        <label>
          Hora
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            aria-label="Hora de la cita"
          />
        </label>
        <label>
          Duración (min)
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select value={type} onChange={(e) => setType(e.target.value as AppointmentType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {APPOINTMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {overlap.length > 0 ? (
        <p className="notice">
          Se superpone con: {overlap.join(', ')}. Puedes guardar igualmente.
        </p>
      ) : null}
      {error ? <p className="error" role="alert">{error}</p> : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || !date || !time}>
          {busy
            ? 'Guardando…'
            : initial?.status === 'cancelled'
              ? 'Reprogramar'
              : initial
                ? 'Guardar cambios'
                : 'Crear cita'}
        </button>
        {initial && onSaved ? (
          <button type="button" className="btn btn-ghost" onClick={onSaved}>
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
}
