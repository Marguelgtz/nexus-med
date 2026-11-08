// Patient appointments (UI_SPEC §7.2): the patient's schedule in one
// place — próximas (scheduled, soonest first) and historial (completed /
// cancelled, newest first). All detail actions live in the detail page.

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
import { Badge, ErrorBanner } from '../../../../components/primitives';
import { fetchServer } from '../../../../lib/api/server';
import {
  formatDateTime,
  formatTimeRange,
  localDateOfInstant,
  practiceToday,
} from '../../../../lib/format';

export const dynamic = 'force-dynamic';

function ApptRow({ appt }: { appt: Appointment }) {
  return (
    <Link href={`/patients/${appt.patient.id}/citas/${appt.id}`} className="appt-row">
      <span className="appt-row-date">
        {formatDateTime(appt.startAt)}
        <span className="appt-row-range">
          {' '}
          · {formatTimeRange(appt.startAt, appt.durationMinutes)}
        </span>
      </span>
      <AppointmentTypeBadge type={appt.type} />
      <AppointmentStatusBadge status={appt.status} />
    </Link>
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
  const today = practiceToday();

  // Próximas: scheduled and not in the past, soonest first. The list comes
  // newest-first from the API, so reverse and filter.
  const proximas = appointments
    .filter((a) => a.status === 'scheduled' && localDateOfInstant(a.startAt) >= today)
    .reverse();
  const historial = appointments.filter((a) => a.status !== 'scheduled');

  return (
    <>
      <div className="page-head">
        <h1>
          Citas — {patient.fullName}
          {patient.isArchived ? <Badge tone="archived">Archivado</Badge> : null}
        </h1>
        <div className="actions">
          <Link href={`/patients/${id}`} className="btn btn-secondary">
            Volver al paciente
          </Link>
          {!patient.isArchived ? (
            <Link href={`/patients/${id}/citas/nueva`} className="btn btn-primary">
              Nueva cita
            </Link>
          ) : null}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Próximas</h2>
        </div>
        {proximas.length === 0 ? (
          <p className="faint">Sin citas programadas.</p>
        ) : (
          proximas.map((appt) => <ApptRow key={appt.id} appt={appt} />)
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Historial</h2>
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
