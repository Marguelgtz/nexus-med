// Patient appointments (UI_SPEC §7.2): the patient's schedule in one
// place — scheduled (including past dates) and historical records.
// Scheduling stays distinct from the explicitly linked clinical note.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import {
  appointmentSchema,
  patientDetailSchema,
  type Appointment,
} from '@nexus-med/contracts';

import {
  AppointmentStatusBadge,
  AppointmentTypeBadge,
} from '../../../../components/appointments/badges';
import { PatientSectionHeader } from '../../../../components/patients/patient-section-header';
import { ErrorBanner } from '../../../../components/primitives';
import { fetchServer } from '../../../../lib/api/server';
import {
  formatDateTime,
  formatShortDate,
  formatTimeRange,
  localDateOfInstant,
  practiceToday,
} from '../../../../lib/format';

export const dynamic = 'force-dynamic';

function ApptRow({ appt }: { appt: Appointment }) {
  return (
    <div className="appt-row patient-appointment-row">
      <div className="patient-appointment-info">
        <Link href={`/patients/${appt.patient.id}/citas/${appt.id}`} className="appt-row-date" title={formatDateTime(appt.startAt)}>
          {formatShortDate(appt.startAt)}
          <span className="appt-row-range"> · {formatTimeRange(appt.startAt, appt.durationMinutes)}</span>
        </Link>
        <div className="patient-appointment-meta"><span className="faint">Tipo de cita:</span><AppointmentTypeBadge type={appt.type} /><AppointmentStatusBadge status={appt.status} /></div>
        {appt.status === 'scheduled' && localDateOfInstant(appt.startAt) < practiceToday() ? <span className="field-hint">Fecha pasada · sigue programada</span> : null}
      </div>
      <div className="actions">
        <Link href={`/patients/${appt.patient.id}/citas/${appt.id}`} className="btn btn-ghost btn-sm">Ver cita</Link>
        {appt.linkedEncounterId ? <Link href={`/patients/${appt.patient.id}/consultas/${appt.linkedEncounterId}`} className="btn btn-secondary btn-sm">Consultar nota</Link>
          : appt.status === 'scheduled' ? <Link href={`/patients/${appt.patient.id}/consultas/nueva?appointmentId=${encodeURIComponent(appt.id)}`} className="btn btn-secondary btn-sm">Iniciar consulta</Link> : null}
      </div>
    </div>
  );
}

export default async function PatientAppointmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [patientRes, apptsRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/appointments`, z.array(appointmentSchema)),
  ]);

  if (!patientRes.ok) {
    if (patientRes.notFound) notFound();
    return (
      <>
        <h1>Citas</h1>
        <ErrorBanner message={patientRes.error} retryHref={`/patients/${id}/citas`} />
      </>
    );
  }
  if (!apptsRes.ok) {
    if (apptsRes.notFound) notFound();
    return (
      <>
        <h1>Citas</h1>
        <ErrorBanner message={apptsRes.error} retryHref={`/patients/${id}/citas`} />
      </>
    );
  }

  const patient = patientRes.data;
  const appointments = apptsRes.data;

  // A past date never implies attendance or cancellation; keep all scheduled items visible.
  const proximas = appointments
    .filter((a) => a.status === 'scheduled')
    .reverse();
  const historial = appointments.filter((a) => a.status !== 'scheduled');

  return (
    <>
      <PatientSectionHeader patient={patient} title="Citas" description="Programación de la atención: fecha, hora y estado. La nota clínica se registra en Consultas.">
        {!patient.isArchived ? <Link href={`/patients/${id}/citas/nueva`} className="btn btn-primary">Nueva cita</Link> : null}
      </PatientSectionHeader>

      <div className="card">
        <div className="card-header">
          <h2>Programadas</h2>
        </div>
        {proximas.length === 0 ? (
          <p className="faint">Sin citas programadas.</p>
        ) : (
          proximas.map((appt) => <ApptRow key={appt.id} appt={appt} />)
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Historial de citas</h2>
        </div>
        {historial.length === 0 ? (
          <p className="faint">Aún no hay citas completadas o canceladas.</p>
        ) : (
          historial.map((appt) => <ApptRow key={appt.id} appt={appt} />)
        )}
      </div>
    </>
  );
}
