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
  medicalDocumentSchema,
  patientDetailSchema,
  PENDING_STUDY_STATUSES,
  studyRequestSchema,
  type MedicalDocument,
  type PatientDetail,
} from '@nexus-med/contracts';

import {
  AppointmentStatusBadge,
  AppointmentTypeBadge,
  StudyStatusBadge,
} from '../../../components/appointments/badges';
import { Timeline } from '../../../components/patients/timeline';
import { ArchiveControl } from '../../../components/patients/archive-control';
import { PatientContext } from '../../../components/shell/patient-context';
import { Badge, ErrorBanner } from '../../../components/primitives';
import { fetchServer } from '../../../lib/api/server';
import {
  STUDY_CATEGORY_LABELS,
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

function documentPreview(document: MedicalDocument): string {
  const content = document.title || (document.kind === 'prescription'
    ? document.lines[0]?.medication || document.body
    : document.body);
  const firstLine = content?.split('\n')[0]?.trim() || (document.kind === 'prescription' ? 'Receta' : 'Informe médico');
  return firstLine.length > 110 ? `${firstLine.slice(0, 107)}…` : firstLine;
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const pendingStudyQuery = new URLSearchParams();
  PENDING_STUDY_STATUSES.forEach((status) => pendingStudyQuery.append('status', status));

  const [patientRes, encountersRes, apptsRes, studiesRes, documentsRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(
      `/api/patients/${encodeURIComponent(id)}/encounters`,
      z.array(encounterSummarySchema),
    ),
    fetchServer(
      `/api/patients/${encodeURIComponent(id)}/appointments`,
      z.array(appointmentSchema),
    ),
    fetchServer(
      `/api/patients/${encodeURIComponent(id)}/studies?${pendingStudyQuery.toString()}`,
      z.array(studyRequestSchema),
    ),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/documents`, z.array(medicalDocumentSchema)),
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
  if (!studiesRes.ok) {
    if (studiesRes.notFound) notFound();
    return (
      <>
        <h1>Paciente</h1>
        <ErrorBanner message={studiesRes.error} retryHref={`/patients/${id}`} />
      </>
    );
  }
  if (!documentsRes.ok) {
    if (documentsRes.notFound) notFound();
    return (
      <>
        <h1>Paciente</h1>
        <ErrorBanner message={documentsRes.error} retryHref={`/patients/${id}`} />
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
  // The server filter includes ordered and completed studies until review.
  const pendingStudies = studiesRes.data;
  const documents = documentsRes.data;

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

      <div className="card">
        <div className="card-header">
          <h2>Recetas e informes</h2>
          <span className="badge badge-type">{documents.length}</span>
          <div className="actions">
            <Link href={`/patients/${patient.id}/recetas/nueva`} className="btn btn-secondary btn-sm">Nueva receta</Link>
            <Link href={`/patients/${patient.id}/informes/nueva`} className="btn btn-ghost btn-sm">Nuevo informe</Link>
          </div>
        </div>
        {documents.length === 0 ? (
          <p className="faint">Sin recetas ni informes</p>
        ) : (
          documents.map((document) => (
            <Link
              key={document.id}
              className="document-row"
              href={`/patients/${patient.id}/${document.kind === 'prescription' ? 'recetas' : 'informes'}/${document.id}`}
            >
              <span className="badge badge-document-kind">{document.kind === 'prescription' ? 'Receta' : 'Informe'}</span>
              <span className="document-row-title">{documentPreview(document)}</span>
              <time dateTime={document.createdAt}>{formatDateTime(document.createdAt)}</time>
            </Link>
          ))
        )}
      </div>

      {pendingStudies.length > 0 ? (
        <div className="card">
          <div className="card-header">
            <h2>Estudios pendientes</h2>
            <span className="badge badge-type">{pendingStudies.length}</span>
          </div>
          {pendingStudies.map((study) => (
            <div className="appt-row" key={study.id}>
              <div className="study-row-main">
                <div className="study-row-label">
                  {STUDY_CATEGORY_LABELS[study.category] ?? study.category} · {study.description}
                </div>
                <div className="appt-row-range">
                  Solicitada en {formatDateTime(study.encounter.occurredAt)} —{' '}
                  <Link href={`/patients/${patient.id}/consultas/${study.encounter.id}`}>
                    {study.encounter.reason ?? 'Ver consulta'}
                  </Link>
                </div>
              </div>
              <StudyStatusBadge status={study.status} />
            </div>
          ))}
        </div>
      ) : null}

      <Timeline patientId={patient.id} encounters={encounters} />
    </>
  );
}
