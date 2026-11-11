import { PatientTaskButton } from '../../../components/patients/patient-task-button';
// Focused overview: patient demographics and next action, not the complete record.
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { z } from 'zod';
import { appointmentSchema, patientDetailSchema, PENDING_STUDY_STATUSES, studyRequestSchema } from '@nexus-med/contracts';
import { AppointmentStatusBadge, AppointmentTypeBadge } from '../../../components/appointments/badges';
import { ArchiveControl } from '../../../components/patients/archive-control';
import { PatientSectionHeader } from '../../../components/patients/patient-section-header';
import { ErrorBanner } from '../../../components/primitives';
import { fetchServer } from '../../../lib/api/server';
import { formatDate, formatAge, formatDateTime, localDateOfInstant, practiceToday } from '../../../lib/format';
const BACKGROUND_FIELDS = [
  { key: 'allergies', label: 'Alergias' },
  { key: 'currentMedications', label: 'Medicamentos actuales' },
  { key: 'medicalConditions', label: 'Afecciones' },
  { key: 'previousSurgeries', label: 'Cirugías previas' },
] as const;
export const dynamic = 'force-dynamic';
function SublineItem({ label, value }: { label: string; value: string | null }) {
  return <span className="subline-item"><span className="faint">{label}:</span>{' '}{value ?? <em className="faint">No registrado</em>}</span>;
}
export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [patientRes, apptsRes, studiesRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/appointments`, z.array(appointmentSchema)),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/studies`, z.array(studyRequestSchema)),
  ]);
  if (!patientRes.ok) {
    if (patientRes.notFound) notFound();
    return <ErrorBanner message={patientRes.error} retryHref={`/patients/${id}`} />;
  }
  if (!apptsRes.ok) {
    if (apptsRes.notFound) notFound();
    return <ErrorBanner message={apptsRes.error} retryHref={`/patients/${id}`} />;
  }
  if (!studiesRes.ok) {
    if (studiesRes.notFound) notFound();
    return <ErrorBanner message={studiesRes.error} retryHref={`/patients/${id}`} />;
  }
  const patient = patientRes.data;
  const age = formatAge(patient.dateOfBirth);
  const nextAppointments = apptsRes.data.filter((a) => a.status === 'scheduled').reverse().slice(0, 1);
  const pendingStudies = studiesRes.data.filter((study) => PENDING_STUDY_STATUSES.some((status) => status === study.status));
  return <>
      <PatientSectionHeader
        patient={patient} title="Resumen" overview>
          <Link href={`/patients/${patient.id}/consultas/nueva`} className="btn btn-primary">
            Nueva consulta
          </Link>
          {!patient.isArchived ? <PatientTaskButton patient={patient} action="appointment" label="Nueva cita" /> : null}
          <Link href={`/patients/${patient.id}/estudios?solicitar=1`} className="btn btn-secondary">Solicitar estudio</Link>
          <details className="patient-more-actions">
            <summary className="btn btn-ghost">Más acciones</summary>
            <div className="patient-more-actions-menu">
              <Link href={`/patients/${patient.id}/citas-y-consultas`}>Ver citas y consultas</Link>
              {!patient.isArchived ? <Link href={`/patients/${patient.id}/recetas/nueva`}>Nueva receta</Link> : null}
              {!patient.isArchived ? <Link href={`/patients/${patient.id}/informes/nueva`}>Nuevo informe</Link> : null}
              <PatientTaskButton patient={patient} action="demographics" label="Editar datos" className="btn btn-ghost" />
              {!patient.isArchived ? <ArchiveControl patientId={patient.id} fullName={patient.fullName} /> : null}
            </div>
          </details>
      </PatientSectionHeader>

      <section className="card patient-demographics" aria-label="Datos del paciente"><div className="subline">
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
      </section>
      {pendingStudies.length > 0 || nextAppointments.length > 0 ? (
        <section className="card patient-pending-card" aria-labelledby="pending-work-title">
          <div className="card-header"><h2 id="pending-work-title">Pendiente de atención</h2></div>
          {nextAppointments.slice(0, 1).map((appt) => (
            <div key={appt.id} className="appt-row pending-appointment-row">
              <div className="pending-appointment-info">
                <span className="pending-kind">Cita programada</span>
                <Link href={`/patients/${patient.id}/citas/${appt.id}`} className="appt-row-date">{formatDateTime(appt.startAt)}</Link>
                {localDateOfInstant(appt.startAt) < practiceToday() ? <span className="field-hint">Fecha pasada · sigue programada</span> : null}
                <div className="pending-appointment-meta">
                  <span className="faint">Tipo de cita:</span>
                  <AppointmentTypeBadge type={appt.type} />
                  <AppointmentStatusBadge status={appt.status} />
                </div>
              </div>
              <div className="pending-appointment-actions">
                <Link href={`/patients/${patient.id}/citas/${appt.id}`} className="btn btn-ghost btn-sm">Ver cita</Link>
                {!appt.linkedEncounterId ? (
                  <Link href={`/patients/${patient.id}/consultas/nueva?appointmentId=${encodeURIComponent(appt.id)}`} className="btn btn-secondary btn-sm">Iniciar consulta</Link>
                ) : <Link href={`/patients/${patient.id}/consultas/${appt.linkedEncounterId}`} className="btn btn-secondary btn-sm">Consultar nota</Link>}
              </div>
            </div>
          ))}
          {pendingStudies.length > 0 ? <div className="appt-row">
            <span>{pendingStudies.length === 1 ? '1 estudio pendiente de revisión' : `${pendingStudies.length} estudios pendientes de revisión`}</span>
            <Link href={`/patients/${patient.id}/estudios`} className="text-link">Revisar estudios</Link>
          </div> : null}
        </section>
      ) : null}

      {pendingStudies.length === 0 && nextAppointments.length === 0 ? <section className="card"><h2>Sin pendientes de atención</h2><p className="faint">Puedes iniciar una consulta o programar una cita desde las acciones del resumen.</p></section> : null}
      <section className="patient-background-section" id="patient-background" aria-labelledby="patient-background-title">
        <div className="page-head"><h2 id="patient-background-title">Antecedentes</h2><PatientTaskButton patient={patient} action="background" label="Editar antecedentes" className="btn btn-ghost btn-sm" /></div>
        <p className="field-hint">Un campo sin registro no descarta el antecedente.</p>
        <div className="clinical-context-grid">{BACKGROUND_FIELDS.map(({ key, label }) => <section className="clinical-context-item" key={key}><h3>{label}</h3><p>{patient[key] || <em className="faint">No registrado</em>}</p></section>)}</div>
      </section>
    </>;
}
