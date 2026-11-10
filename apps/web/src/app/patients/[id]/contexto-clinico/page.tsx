// Full patient context, separated from the consultation note so the clinical
// history can be reviewed without competing with the active encounter form.

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import {
  encounterSummarySchema,
  patientDetailSchema,
  studyRequestSchema,
} from '@nexus-med/contracts';

import { ContextAppointmentAction } from '../../../../components/patients/context-appointment-action';
import { PatientContext } from '../../../../components/shell/patient-context';
import { ErrorBanner } from '../../../../components/primitives';
import { StudyStatusBadge } from '../../../../components/appointments/badges';
import { fetchServer } from '../../../../lib/api/server';
import {
  ENCOUNTER_TYPE_LABELS,
  formatDateTime,
  formatShortDateTime,
  STUDY_CATEGORY_LABELS,
} from '../../../../lib/format';

export const dynamic = 'force-dynamic';

const BACKGROUND_FIELDS = [
  { key: 'allergies', label: 'Alergias' },
  { key: 'currentMedications', label: 'Medicamentos actuales' },
  { key: 'medicalConditions', label: 'Afecciones' },
  { key: 'previousSurgeries', label: 'Cirugías previas' },
] as const;

export default async function ClinicalContextPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const pendingStudyQuery = new URLSearchParams();
  pendingStudyQuery.append('status', 'ordered');
  pendingStudyQuery.append('status', 'completed');

  const [patientRes, encountersRes, studiesRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/encounters`, z.array(encounterSummarySchema)),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/studies?${pendingStudyQuery.toString()}`, z.array(studyRequestSchema)),
  ]);

  if (!patientRes.ok) {
    if (patientRes.notFound) notFound();
    return <ErrorBanner message={patientRes.error} retryHref={`/patients/${id}/contexto-clinico`} />;
  }
  if (!encountersRes.ok) {
    if (encountersRes.notFound) notFound();
    return <ErrorBanner message={encountersRes.error} retryHref={`/patients/${id}/contexto-clinico`} />;
  }
  if (!studiesRes.ok) {
    if (studiesRes.notFound) notFound();
    return <ErrorBanner message={studiesRes.error} retryHref={`/patients/${id}/contexto-clinico`} />;
  }

  const patient = patientRes.data;

  return (
    <>
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref={`/patients/${patient.id}`}
        backLabel="Resumen"
      />

      <header className="page-head clinical-context-page-head">
        <div>
          <p className="section-label">Expediente de {patient.fullName}</p>
          <h1>Contexto clínico</h1>
          <p className="field-hint">Un campo sin registro no significa que el antecedente esté descartado.</p>
        </div>
        <Link href={`/patients/${patient.id}/antecedentes`} className="btn btn-secondary">
          Editar antecedentes
        </Link>
      </header>

      <section className="card" id="antecedentes" aria-labelledby="background-context-title">
        <div className="card-header">
          <h2 id="background-context-title">Antecedentes del paciente</h2>
        </div>
        <div className="clinical-context-grid">
          {BACKGROUND_FIELDS.map(({ key, label }) => (
            <div className={`clinical-context-item clinical-context-${key}`} key={key}>
              <strong>{label}</strong>
              <p>{patient[key] || <em className="faint">No registrado</em>}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="card" aria-labelledby="recent-consultations-title">
        <div className="card-header">
          <h2 id="recent-consultations-title">Consultas recientes</h2>
          <span className="faint">{encountersRes.data.length}</span>
        </div>
        {encountersRes.data.length === 0 ? (
          <div className="empty-state">
            <p className="empty-title">Este paciente aún no tiene consultas</p>
            <Link href={`/patients/${patient.id}/consultas/nueva`} className="btn btn-primary">Nueva consulta</Link>
          </div>
        ) : (
          <ul className="context-history-list">
            {encountersRes.data.map((encounter) => (
              <li key={encounter.id}>
                <div className="context-history-main">
                  <div className="context-history-meta">
                    <time dateTime={encounter.occurredAt} title={formatDateTime(encounter.occurredAt)}>
                      {formatShortDateTime(encounter.occurredAt)}
                    </time>
                    <span className="badge badge-type">{ENCOUNTER_TYPE_LABELS[encounter.type]}</span>
                  </div>
                  <p>{encounter.reason || <em className="faint">Sin motivo registrado</em>}</p>
                </div>
                <Link href={`/patients/${patient.id}/consultas/${encounter.id}`} className="btn btn-ghost btn-sm">
                  Consultar nota
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="context-pending-studies-title">
        <div className="card-header">
          <h2 id="context-pending-studies-title">Estudios pendientes de revisión</h2>
          <span className="faint">{studiesRes.data.length}</span>
        </div>
        <p className="study-status-caveat">
          “Completada” no confirma que el estudio se realizó ni cuándo se recibió un resultado.
        </p>
        {studiesRes.data.length === 0 ? (
          <p className="faint">No hay estudios pendientes de revisión.</p>
        ) : (
          <ul className="context-history-list context-study-list">
            {studiesRes.data.map((study) => (
              <li key={study.id}>
                <div className="context-history-main">
                  <div className="context-history-meta">
                    <span className="study-category-label">{STUDY_CATEGORY_LABELS[study.category]}</span>
                    <strong>{study.name}</strong>
                    {study.description ? <p className="study-description">{study.description}</p> : null}
                    <StudyStatusBadge status={study.status} />
                  </div>
                  <p>
                    {study.encounter ? (
                      <Link href={`/patients/${patient.id}/consultas/${study.encounter.id}`}>
                        Consulta del {formatShortDateTime(study.encounter.occurredAt)}
                      </Link>
                    ) : 'Sin consulta asociada'}
                  </p>
                </div>
                {study.encounter ? (
                  <Link href={`/patients/${patient.id}/consultas/${study.encounter.id}`} className="btn btn-ghost btn-sm">
                    Revisar
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>

      {!patient.isArchived ? <ContextAppointmentAction patientId={patient.id} /> : null}
    </>
  );
}
