'use client';

import { useState } from 'react';

import type {
  EncounterDetail,
  EncounterSummary,
  PatientDetail,
  StudyRequest,
} from '@nexus-med/contracts';

import { getEncounter } from '../../lib/api/client';
import {
  ENCOUNTER_TYPE_LABELS,
  STUDY_CATEGORY_LABELS,
  formatDateTime,
} from '../../lib/format';
import { StudyStatusBadge } from '../appointments/badges';
import { ErrorBanner } from '../primitives';

const NOTE_SECTIONS: { key: keyof EncounterDetail; label: string }[] = [
  { key: 'reason', label: 'Motivo de consulta' },
  { key: 'historyOfPresentIllness', label: 'Enfermedad actual' },
  { key: 'relevantHistory', label: 'Antecedentes relevantes' },
  { key: 'physicalExamination', label: 'Exploración física' },
  { key: 'assessment', label: 'Valoración' },
  { key: 'plan', label: 'Plan' },
  { key: 'followUp', label: 'Seguimiento' },
];

function ContextValue({ value }: { value: string | null }) {
  return value ? <span>{value}</span> : <em className="faint">No registrado</em>;
}

export function ClinicalContext({
  patient,
  encounters,
  studies,
}: {
  patient: PatientDetail;
  encounters: EncounterSummary[];
  studies: StudyRequest[];
}) {
  const [selected, setSelected] = useState<EncounterDetail | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function openEncounter(id: string) {
    setSelected(null);
    setLoadingId(id);
    setError(null);
    try {
      const encounter = await getEncounter(id);
      if (encounter.patientId !== patient.id) {
        throw new Error('La consulta no pertenece a este paciente.');
      }
      setSelected(encounter);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar la consulta.');
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <details className="consultation-context" open>
      <summary>Contexto clínico de {patient.fullName}</summary>
      <div className="consultation-context-body">
        <section aria-labelledby="context-safety-title">
          <h2 id="context-safety-title">Datos de seguridad</h2>
          <div className="context-value-block">
            <strong>Alergias</strong>
            <ContextValue value={patient.allergies} />
          </div>
          <div className="context-value-block">
            <strong>Medicamentos actuales</strong>
            <ContextValue value={patient.currentMedications} />
          </div>
        </section>

        <details className="context-background">
          <summary>Otros antecedentes médicos</summary>
          <div className="context-value-block">
            <strong>Afecciones</strong>
            <ContextValue value={patient.medicalConditions} />
          </div>
          <div className="context-value-block">
            <strong>Cirugías previas</strong>
            <ContextValue value={patient.previousSurgeries} />
          </div>
        </details>

        <section aria-labelledby="context-encounters-title">
          <h2 id="context-encounters-title">Consultas recientes</h2>
          {encounters.length === 0 ? (
            <p className="faint">No hay consultas anteriores.</p>
          ) : (
            <ul className="context-list">
              {encounters.slice(0, 5).map((encounter) => (
                <li key={encounter.id}>
                  <div>
                    <strong>{formatDateTime(encounter.occurredAt)}</strong>
                    <span className="context-secondary">
                      {ENCOUNTER_TYPE_LABELS[encounter.type]} · {encounter.reason || 'Sin motivo'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    disabled={loadingId !== null}
                    onClick={() => void openEncounter(encounter.id)}
                  >
                    {loadingId === encounter.id ? 'Cargando…' : 'Consultar nota'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {encounters.length > 5 ? (
            <details className="context-older-encounters">
              <summary>Ver {encounters.length - 5} consultas anteriores</summary>
              <ul className="context-list">
                {encounters.slice(5).map((encounter) => (
                  <li key={encounter.id}>
                    <div>
                      <strong>{formatDateTime(encounter.occurredAt)}</strong>
                      <span className="context-secondary">
                        {ENCOUNTER_TYPE_LABELS[encounter.type]} · {encounter.reason || 'Sin motivo'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      disabled={loadingId !== null}
                      onClick={() => void openEncounter(encounter.id)}
                    >
                      {loadingId === encounter.id ? 'Cargando…' : 'Consultar nota'}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
          {error ? <ErrorBanner message={error} /> : null}
          {selected ? (
            <div className="context-note" aria-live="polite">
              <div className="context-note-head">
                <strong>Nota del {formatDateTime(selected.occurredAt)}</strong>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                  Cerrar
                </button>
              </div>
              {NOTE_SECTIONS.map(({ key, label }) => (
                <div className="context-note-section" key={key}>
                  <strong>{label}</strong>
                  <ContextValue value={selected[key] as string | null} />
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section aria-labelledby="context-studies-title">
          <h2 id="context-studies-title">Estudios pendientes</h2>
          {studies.length === 0 ? (
            <p className="faint">No hay estudios pendientes de revisión.</p>
          ) : (
            <ul className="context-list">
              {studies.map((study) => (
                <li key={study.id}>
                  <div>
                    <strong>
                      {STUDY_CATEGORY_LABELS[study.category]} · {study.description}
                    </strong>
                    <span className="context-secondary">
                      {study.encounter
                        ? `Consulta del ${formatDateTime(study.encounter.occurredAt)}`
                        : 'Sin consulta asociada'}
                    </span>
                  </div>
                  <StudyStatusBadge status={study.status} />
                </li>
              ))}
            </ul>
          )}
          <p className="context-caveat">
            El estado Completada no registra por separado si el estudio se realizó o cuándo llegó el resultado.
          </p>
        </section>
      </div>
    </details>
  );
}
