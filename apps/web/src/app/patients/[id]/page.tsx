// Patient overview (UI_SPEC §3.3): the central clinical workspace.
// SSR fetches the patient plus its encounter list; information hierarchy:
// identity header → antecedentes card → historical timeline. All actions
// live in the header (UI_SPEC §3.3, item 4).

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';

import {
  appointmentSchema,
  encounterSummarySchema,
  patientDetailSchema,
  type PatientDetail,
} from '@nexus-med/contracts';

import {
  AppointmentStatusBadge,
  AppointmentTypeBadge,
} from '../../../components/appointments/badges';
import { Timeline } from '../../../components/patients/timeline';
import { ArchiveControl } from '../../../components/patients/archive-control';
import { PatientContext } from '../../../components/shell/patient-context';
import { Badge, ErrorBanner } from '../../../components/primitives';
import { fetchServer } from '../../../lib/api/server';
import {
  formatDate,
  formatAge,
  formatDateTime,
  localDateOfInstant,
  practiceToday,
} from '../../../lib/format';

export const dynamic = 'force-dynamic';

function SublineItem({ label, value }: { label: string; value: string | null }) {
  return (
    <span className="subline-item">
      <span className="faint">{label}:</span>{' '}
      {value ?? <em className="faint">No registrado</em>}
    </span>
  );
}

const BACKGROUND_ROWS: { label: string; key: keyof PatientDetail }[] = [
  { label: 'Afecciones', key: 'medicalConditions' },
  { label: 'Cirugías previas', key: 'previousSurgeries' },
  { label: 'Alergias', key: 'allergies' },
  { label: 'Medicamentos actuales', key: 'currentMedications' },
];

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [patientRes, encountersRes, apptsRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(
      `/api/patients/${encodeURIComponent(id)}/encounters`,
      z.array(encounterSummarySchema),
    ),
    fetchServer(
      `/api/patients/${encodeURIComponent(id)}/appointments`,
      z.array(appointmentSchema),
    ),
  ]);

  // A 404 means the record does not exist; anything else (API down, 5xx,
  // contract drift) is a recoverable error and must not masquerade as a
  // missing patient.
  if (!patientRes.ok) {
    if (patientRes.notFound) notFound();
    return (
      <>
        <h1>Paciente</h1>
        <ErrorBanner message={patientRes.error} retryHref={`/patients/${id}`} />
      </>
    );
  }
  if (!encountersRes.ok) {
    if (encountersRes.notFound) notFound();
    return (
      <>
        <h1>Paciente</h1>
        <ErrorBanner message={encountersRes.error} retryHref={`/patients/${id}`} />
      </>
    );
  }
  if (!apptsRes.ok) {
    if (apptsRes.notFound) notFound();
    return (
      <>
        <h1>Paciente</h1>
        <ErrorBanner message={apptsRes.error} retryHref={`/patients/${id}`} />
      </>
    );
  }

  const patient = patientRes.data;
  const encounters = encountersRes.data;
  const appointments = apptsRes.data;
  const age = formatAge(patient.dateOfBirth);
  const today = practiceToday();
  const nextAppointments = appointments
    .filter((a) => a.status === 'scheduled' && localDateOfInstant(a.startAt) >= today)
    .reverse()
    .slice(0, 3);

  return (
    <>
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref="/patients"
      />

      <div className="page-head">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {patient.fullName}
          {patient.isArchived ? <Badge tone="archived">Archivado</Badge> : null}
        </h1>
        <div className="actions">
          <Link href={`/patients/${patient.id}/consultas/nueva`} className="btn btn-primary">
            Nueva consulta
          </Link>
          <Link href={`/patients/${patient.id}/editar`} className="btn btn-secondary">
            Editar
          </Link>
          <Link href={`/patients/${patient.id}/antecedentes`} className="btn btn-secondary">
            Antecedentes
          </Link>
          {!patient.isArchived ? (
            <ArchiveControl patientId={patient.id} fullName={patient.fullName} />
          ) : null}
        </div>
      </div>

      <div className="subline">
        <SublineItem
          label="Nacimiento"
          value={
            patient.dateOfBirth
              ? `${formatDate(patient.dateOfBirth)}${age !== null ? ` (${age} años)` : ''}`
              : null
          }
        />
        <SublineItem label="Tel" value={patient.phone} />
        <SublineItem label="Correo" value={patient.email} />
        <SublineItem label="Identificador" value={patient.externalIdentifier} />
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Antecedentes médicos</h2>
          <Link href={`/patients/${patient.id}/antecedentes`} className="btn btn-ghost btn-sm">
            Editar
          </Link>
        </div>
        {BACKGROUND_ROWS.map((row) => {
          const value = patient[row.key];
          return (
            <div className="bg-row" key={row.key}>
              <span className="bg-label">{row.label}</span>
              <span className="bg-value">
                {value ? value : <em className="faint">No registrado</em>}
              </span>
            </div>
          );
        })}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Próximas citas</h2>
          <Link href={`/patients/${patient.id}/citas`} className="btn btn-ghost btn-sm">
            Ver todas
          </Link>
        </div>
        {nextAppointments.length === 0 ? (
          <p className="faint">Sin citas programadas.</p>
        ) : (
          nextAppointments.map((appt) => (
            <Link key={appt.id} href={`/patients/${patient.id}/citas/${appt.id}`} className="appt-row">
              <span className="appt-row-date">{formatDateTime(appt.startAt)}</span>
              <AppointmentTypeBadge type={appt.type} />
              <AppointmentStatusBadge status={appt.status} />
            </Link>
          ))
        )}
        {!patient.isArchived ? (
          <div className="form-actions">
            <Link href={`/patients/${patient.id}/citas/nueva`} className="btn btn-primary btn-sm">
              Nueva cita
            </Link>
          </div>
        ) : null}
      </div>

      <Timeline patientId={patient.id} encounters={encounters} />
    </>
  );
}
