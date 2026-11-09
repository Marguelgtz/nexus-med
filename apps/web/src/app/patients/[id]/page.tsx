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
} from '../../../components/appointments/badges';
import { Timeline } from '../../../components/patients/timeline';
import { PatientStudyWorkflow } from '../../../components/patients/study-workflow';
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

function documentPreview(document: MedicalDocument): string {
  const content = document.title || (document.kind === 'prescription'
    ? document.lines[0]?.medication || document.body
    : document.body);
  const firstLine = content?.split('\n')[0]?.trim() || (document.kind === 'prescription' ? 'Receta' : 'Informe médico');
  return firstLine.length > 110 ? `${firstLine.slice(0, 107)}…` : firstLine;
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
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
      `/api/patients/${encodeURIComponent(id)}/studies`,
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
  const pendingStudies = studiesRes.data.filter((study) =>
    PENDING_STUDY_STATUSES.some((status) => status === study.status),
  );
  const documents = documentsRes.data;

  return (
    <>
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref="/patients"
      />

      <div className="page-head patient-workspace-head">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {patient.fullName}
          {patient.isArchived ? <Badge tone="archived">Archivado</Badge> : null}
        </h1>
        <div className="actions">
          <Link href={`/patients/${patient.id}/consultas/nueva`} className="btn btn-primary">
            Nueva consulta
          </Link>
          {!patient.isArchived ? <Link href={`/patients/${patient.id}/citas/nueva`} className="btn btn-secondary">Nueva cita</Link> : null}
          <a href="#patient-studies" className="btn btn-secondary">Solicitar estudio</a>
          <details className="patient-more-actions">
            <summary className="btn btn-ghost">Más acciones</summary>
            <div className="patient-more-actions-menu">
              <Link href={`/patients/${patient.id}/citas`}>Ver citas</Link>
              {!patient.isArchived ? <Link href={`/patients/${patient.id}/recetas/nueva`}>Nueva receta</Link> : null}
              {!patient.isArchived ? <Link href={`/patients/${patient.id}/informes/nueva`}>Nuevo informe</Link> : null}
              <Link href={`/patients/${patient.id}/editar`}>Editar datos</Link>
              <Link href={`/patients/${patient.id}/antecedentes`}>Editar antecedentes</Link>
              {!patient.isArchived ? <ArchiveControl patientId={patient.id} fullName={patient.fullName} /> : null}
            </div>
          </details>
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

      <section className="card patient-safety-card" aria-labelledby="patient-safety-title">
        <div className="card-header">
          <h2 id="patient-safety-title">Contexto de seguridad</h2>
          <Link href={`/patients/${patient.id}/antecedentes`} className="btn btn-ghost btn-sm">Editar antecedentes</Link>
        </div>
        <div className="patient-safety-grid">
          {(['allergies', 'currentMedications'] as const).map((key) => (
            <div className="patient-safety-item" key={key}>
              <strong>{key === 'allergies' ? 'Alergias' : 'Medicamentos actuales'}</strong>
              <span>{patient[key] || <em className="faint">No registrado</em>}</span>
            </div>
          ))}
        </div>
        <details className="patient-background-details">
          <summary>Ver otros antecedentes médicos</summary>
          {BACKGROUND_ROWS.filter((row) => row.key === 'medicalConditions' || row.key === 'previousSurgeries').map((row) => (
            <div className="bg-row" key={row.key}>
              <span className="bg-label">{row.label}</span>
              <span className="bg-value">{patient[row.key] || <em className="faint">No registrado</em>}</span>
            </div>
          ))}
        </details>
      </section>

      {pendingStudies.length > 0 || nextAppointments.length > 0 ? (
        <section className="card patient-pending-card" aria-labelledby="pending-work-title">
          <div className="card-header"><h2 id="pending-work-title">Pendiente de atención</h2></div>
          {nextAppointments.slice(0, 1).map((appt) => (
            <Link key={appt.id} href={`/patients/${patient.id}/citas/${appt.id}`} className="appt-row">
              <span className="pending-kind">Próxima cita</span>
              <span className="appt-row-date">{formatDateTime(appt.startAt)}</span>
              <AppointmentTypeBadge type={appt.type} />
              <AppointmentStatusBadge status={appt.status} />
            </Link>
          ))}
          {pendingStudies.slice(0, 3).map((study) => (
            <div className="appt-row" key={study.id}>
              <span className="pending-kind">Estudio por revisar</span>
              <span className="study-row-label">{study.description}</span>
              <a href={`#study-${study.id}`}>Revisar estudio</a>
            </div>
          ))}
        </section>
      ) : null}

      <Timeline patientId={patient.id} encounters={encounters} />

      <div className="card">
        <div className="card-header">
          <h2>Recetas e informes</h2>
          <span className="badge badge-type">{documents.length}</span>
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

      <PatientStudyWorkflow patientId={patient.id} studies={studiesRes.data} encounters={encounters} />
    </>
  );
}
