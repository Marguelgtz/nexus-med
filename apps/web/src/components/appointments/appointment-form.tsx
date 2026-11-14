'use client';

// Appointment create/edit form (UI_SPEC §7.2). Fields: date, time,
// planned duration, type. The overlap check is a non-blocking warning:
// the API never rejects overlaps (UI_SPEC §7.1), the form just tells the
// doctor a conflict exists. On success the form redirects to the detail
// page (create) or refreshes in place (edit).

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { Appointment, AppointmentType, ClinicDoctor } from '@nexus-med/contracts';

import {
  addDays,
  APPOINTMENT_TYPE_LABELS,
  formatTime,
  instantAtLocalTime,
  isValidCalendarDate,
  localDateOfInstant,
} from '../../lib/format';
import { overlappingScheduledAppointments, overlapCheckFeedback, type OverlapCheckResult } from '../../lib/calendar';
import { Modal } from '../modal';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';
import { createAppointment, listAppointmentsInRange, listClinicDoctors, updateAppointment } from '../../lib/api/client';

const DURATIONS = [15, 20, 30, 45, 60, 90, 120];
const TYPES = Object.keys(APPOINTMENT_TYPE_LABELS);

type Props = {
  patientId: string;
  initial?: Appointment;
  /** Called after a successful edit with the latest appointment record. */
  onSaved?: (appointment: Appointment) => void;
  /** Keep the current clinical workspace mounted after an in-context create. */
  onCreated?: (appointment: Appointment) => void;
  /** Return here after a standalone follow-up appointment is saved. */
  returnTo?: string;
  onCancel?: () => void;
  dialogTitle?: string;
  defaultDate?: string;
};

function toIso(dateStr: string, timeStr: string): string {
  const sep = timeStr.indexOf(':');
  const h = Number(timeStr.slice(0, sep === -1 ? timeStr.length : sep)) || 0;
  const m = sep === -1 ? 0 : Number(timeStr.slice(sep + 1));
  return instantAtLocalTime(dateStr, h, m).toISOString();
}

export function AppointmentForm({ patientId, initial, onSaved, onCreated, returnTo, onCancel, dialogTitle, defaultDate }: Props) {
  const router = useRouter();
  const [baseline] = useState(() => ({
    date: initial ? localDateOfInstant(initial.startAt) : defaultDate ?? localDateOfInstant(new Date().toISOString()),
    time: initial ? formatTime(initial.startAt) : '09:00', duration: initial?.durationMinutes ?? 30,
    type: initial?.type ?? 'consulta', doctorId: initial?.doctor?.id ?? '', version: initial?.version,
  }));
  const [date, setDate] = useState(baseline.date);
  const [time, setTime] = useState(baseline.time);
  const [duration, setDuration] = useState(baseline.duration);
  const [type, setType] = useState<AppointmentType>(baseline.type);
  const [doctorId, setDoctorId] = useState(baseline.doctorId);
  const [doctors, setDoctors] = useState<ClinicDoctor[]>([]);
  const [doctorsError, setDoctorsError] = useState<string | null>(null);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorsAttempt, setDoctorsAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    listClinicDoctors().then(value => { if (active) setDoctors(value); }).catch(() => { if (active) setDoctorsError('No se pudo cargar la lista de médicos.'); }).finally(() => { if (active) setDoctorsLoading(false); });
    return () => { active = false; };
  }, [doctorsAttempt]);
  const [error, setError] = useState<string | null>(null);
  const [overlapResult, setOverlapResult] = useState<OverlapCheckResult | null>(null);
  const [overlapAttempt, setOverlapAttempt] = useState(0);
  const [busy, setBusy] = useState(false);

  const dirty = doctorId !== baseline.doctorId || date !== baseline.date || time !== baseline.time ||
    duration !== baseline.duration || type !== baseline.type;
  useBeforeUnloadGuard(dirty && !busy);
  function cancel() {
    if (busy || (dirty && !window.confirm('Hay una cita sin guardar. ¿Descartar los cambios?'))) return;
    onCancel?.();
  }

  // Non-blocking overlap check, debounced: candidate [start, start+duration)
  // against that patient's appointments that day.
  const candidateStart = useMemo(() => isValidCalendarDate(date) && /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? toIso(date, time) : null, [date, time]);
  const overlapKey = candidateStart ? JSON.stringify([candidateStart, duration, doctorId, patientId, initial?.id ?? null, overlapAttempt]) : null;
  useEffect(() => {
    if (!candidateStart || !overlapKey) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const day = localDateOfInstant(candidateStart);
        const range = await listAppointmentsInRange({
          from: instantAtLocalTime(day, 0, 0).toISOString(),
          to: instantAtLocalTime(addDays(day, 1), 0, 0).toISOString(),
          ...(doctorId ? { doctorId } : {}),
        });
        if (cancelled) return;
        const hits = overlappingScheduledAppointments(range, candidateStart, duration, initial?.id)
          .map((a) => `${formatTime(a.startAt)} (${a.patient.fullName})`);
        setOverlapResult({ key: overlapKey, hits, failed: false });
      } catch {
        if (!cancelled) setOverlapResult({ key: overlapKey, hits: [], failed: true });
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [candidateStart, duration, patientId, initial?.id, doctorId, overlapKey]);
  const overlapFeedback = overlapCheckFeedback(overlapKey, overlapResult);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (doctorsLoading || doctorsError) { setError(doctorsError ?? 'Espera a que cargue la lista de médicos.'); return; }
    if (!candidateStart) { setError('Revisa la fecha y hora de la cita.'); return; }
    if (initial?.arrivedAt && !window.confirm('Reprogramar reinicia la recepción de esta cita. ¿Continuar?')) return;
    setBusy(true);
    const startAt = candidateStart;
    try {
      if (initial) {
        const updated = await updateAppointment(initial.id, {
          expectedVersion: baseline.version, doctorId: doctorId || null,
          startAt,
          durationMinutes: duration,
          type,
        });
        onSaved?.(updated);
        router.refresh();
      } else {
        const appt = await createAppointment(patientId, {
          doctorId: doctorId || null,
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

  const form = (
    <form className="appt-form" onSubmit={handleSubmit} aria-busy={busy}>
      <label>Médico asignado
        <select value={doctorId} disabled={busy || doctorsLoading || Boolean(doctorsError)} onChange={event => setDoctorId(event.target.value)}>
          <option value="">Sin asignar</option>
          {initial?.doctor && !doctors.some(doctor => doctor.id === initial.doctor?.id) ? <option value={initial.doctor.id}>{initial.doctor.name} (sin acceso activo)</option> : null}
          {doctors.map(doctor => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}
        </select>
      </label>
      {doctorsLoading ? <p role="status">Cargando médicos…</p> : null}
      {doctorsError ? <div role="alert"><p className="error">{doctorsError}</p><button type="button" className="btn btn-ghost" onClick={() => { setDoctorsError(null); setDoctorsLoading(true); setDoctorsAttempt(value => value + 1); }}>Reintentar carga de médicos</button></div> : null}
      <div className="form-row">
        <label>
          Fecha
          <input
            type="date"
            disabled={busy}
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
            disabled={busy}
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            aria-label="Hora de la cita"
          />
        </label>
        <label>
          Duración (min)
          <select disabled={busy} value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tipo
          <select disabled={busy} value={type} onChange={(e) => setType(e.target.value as AppointmentType)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {APPOINTMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
      </div>

      {overlapFeedback ? <p className="notice" role="status">{overlapFeedback}</p> : null}
      {overlapResult?.key === overlapKey && overlapResult.failed ? <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setOverlapAttempt(value => value + 1)}>Reintentar comprobación</button> : null}
      {error ? <p className="error" role="alert">{error}</p> : null}

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy || doctorsLoading || Boolean(doctorsError) || !date || !time}>
          {busy
            ? 'Guardando…'
            : initial?.status === 'cancelled'
              ? 'Reprogramar'
              : initial
                ? 'Guardar cambios'
                : 'Crear cita'}
        </button>
        {onCancel ? (
          <button type="button" className="btn btn-ghost" onClick={cancel} disabled={busy}>
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  );
  return dialogTitle ? (
    <Modal title={dialogTitle} description={initial ? initial.patient.fullName : "Revisa la fecha, hora y paciente antes de guardar."} onClose={cancel} closeDisabled={busy}>
      {form}
    </Modal>
  ) : form;
}
