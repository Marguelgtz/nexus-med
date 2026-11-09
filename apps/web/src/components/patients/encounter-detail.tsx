'use client';

// Consultation detail + in-place edit (UI_SPEC §3.7). Read view renders the
// full note verbatim (never a form); `Editar consulta` toggles edit mode
// with the same field layout as the new-consultation form, pre-filled.
// Save is explicit: `Guardar cambios` → PATCH → SSR re-render (a new
// `Editada` badge appears when the edit time differs from the occurrence).
// Editing never reassigns the patient (API-enforced).

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type Appointment,
  type EncounterDetail,
  type EncounterSummary,
  type EncounterType,
  type MedicalDocumentKind,
  type PatientDetail,
  type StudyRequest,
  type UpdateEncounterInput,
  encounterTypeSchema,
} from '@nexus-med/contracts';

import { ApiError, updateEncounter } from '../../lib/api/client';
import { Badge, ErrorBanner } from '../primitives';
import {
  ENCOUNTER_TYPE_LABELS,
  formatDateTime,
  wasEdited,
} from '../../lib/format';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';
import { ClinicalContext } from './clinical-context';
import { EncounterStudyWorkflow } from './study-workflow';
import { EncounterAppointmentHandoff } from '../appointments/encounter-handoff';
import { MedicalDocumentForm } from '../documents/document-form';

const SECTIONS: { key: keyof SectionValues; label: string; rows: number }[] = [
  { key: 'reason', label: 'Motivo de consulta', rows: 2 },
  { key: 'historyOfPresentIllness', label: 'Enfermedad actual', rows: 4 },
  { key: 'relevantHistory', label: 'Antecedentes relevantes', rows: 3 },
  { key: 'physicalExamination', label: 'Exploración física', rows: 4 },
  { key: 'assessment', label: 'Valoración', rows: 3 },
  { key: 'plan', label: 'Plan', rows: 4 },
  { key: 'followUp', label: 'Seguimiento', rows: 2 },
];

const MAX_CHARS = 10_000;

type SectionValues = {
  reason: string;
  historyOfPresentIllness: string;
  relevantHistory: string;
  physicalExamination: string;
  assessment: string;
  plan: string;
  followUp: string;
};

type FieldErrors = Record<string, string[]>;

function EncounterContextActions({
  patient,
  encounter,
  encounters,
  patientStudies,
  appointment,
  documentKind,
  onDocumentKindChange,
  editing,
}: {
  patient: PatientDetail;
  encounter: EncounterDetail;
  encounters: EncounterSummary[];
  patientStudies: StudyRequest[];
  appointment: Appointment | null;
  documentKind: MedicalDocumentKind | null;
  onDocumentKindChange: (kind: MedicalDocumentKind | null) => void;
  editing: boolean;
}) {
  const router = useRouter();
  const [savedDocumentMessage, setSavedDocumentMessage] = useState<string | null>(null);
  const returnTo = `/patients/${patient.id}/consultas/${encounter.id}`;
  const followUpQuery = new URLSearchParams({ returnTo }).toString();

  return (
    <>
      <aside className="consultation-context-column">
        <ClinicalContext patient={patient} encounters={encounters} studies={patientStudies} />
        {appointment ? <EncounterAppointmentHandoff appointment={appointment} encounter={encounter} /> : null}
        <section className="card consultation-actions-card" aria-labelledby="encounter-actions-title">
          <h2 id="encounter-actions-title">Acciones de esta consulta</h2>
          {savedDocumentMessage ? <p className="notice" role="status">{savedDocumentMessage}</p> : null}
          {editing ? (
            <p className="field-hint">Guarda o cancela la edición de la consulta antes de crear un documento.</p>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" disabled={documentKind !== null} onClick={() => { setSavedDocumentMessage(null); onDocumentKindChange('prescription'); }}>
                Nueva receta
              </button>
              <button type="button" className="btn btn-secondary" disabled={documentKind !== null} onClick={() => { setSavedDocumentMessage(null); onDocumentKindChange('report'); }}>
                Nuevo informe
              </button>
              {documentKind === null ? (
                <Link className="btn btn-ghost" href={`/patients/${patient.id}/citas/nueva?${followUpQuery}`}>
                  Programar seguimiento
                </Link>
              ) : null}
            </>
          )}
        </section>
      </aside>
      {!editing && documentKind ? (
        <section className="consultation-related-form" aria-labelledby="related-document-title">
          <div className="page-head">
            <h2 id="related-document-title">
              {documentKind === 'prescription' ? 'Nueva receta' : 'Nuevo informe'} — {patient.fullName}
            </h2>
          </div>
          <MedicalDocumentForm
            key={documentKind}
            patientId={patient.id}
            kind={documentKind}
            encounters={encounters}
            initialEncounterId={encounter.id}
            onSaved={() => {
              setSavedDocumentMessage(documentKind === 'prescription' ? 'Receta guardada.' : 'Informe guardado.');
              onDocumentKindChange(null);
              router.refresh();
            }}
            onCancel={() => onDocumentKindChange(null)}
          />
        </section>
      ) : null}
    </>
  );
}

function toValues(e: EncounterDetail): SectionValues {
  return {
    reason: e.reason ?? '',
    historyOfPresentIllness: e.historyOfPresentIllness ?? '',
    relevantHistory: e.relevantHistory ?? '',
    physicalExamination: e.physicalExamination ?? '',
    assessment: e.assessment ?? '',
    plan: e.plan ?? '',
    followUp: e.followUp ?? '',
  };
}

export function EncounterDetail({
  encounter,
  studies,
  patient,
  encounters,
  patientStudies,
  appointment,
}: {
  encounter: EncounterDetail;
  studies?: StudyRequest[];
  patient: PatientDetail;
  encounters: EncounterSummary[];
  patientStudies: StudyRequest[];
  appointment: Appointment | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<SectionValues>(() => toValues(encounter));
  const [type, setType] = useState<EncounterType>(encounter.type);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [documentKind, setDocumentKind] = useState<MedicalDocumentKind | null>(null);
  const list = studies ?? [];

  const edited = wasEdited(encounter.createdAt, encounter.updatedAt);

  // Dirty only while editing AND any field differs from the saved note.
  const dirty =
    editing &&
    (type !== encounter.type ||
      (Object.keys(values) as (keyof SectionValues)[]).some(
        (k) => values[k] !== toValues(encounter)[k],
      ));
  useBeforeUnloadGuard(dirty);

  const cancelEditing = () => {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Descartar la edición?')) return;
    setEditing(false);
  };

  const startEditing = () => {
    setValues(toValues(encounter));
    setType(encounter.type);
    setFieldErrors({});
    setBanner(null);
    setEditing(true);
  };

  const setSection = (field: keyof SectionValues) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setFieldErrors((fe) => {
      if (!fe[field]) return fe;
      const next = { ...fe };
      delete next[field];
      return next;
    });
  };

  const onSave = async () => {
    const candidate: UpdateEncounterInput = {
      type,
      reason: values.reason.trim() || null,
      historyOfPresentIllness: values.historyOfPresentIllness.trim() || null,
      relevantHistory: values.relevantHistory.trim() || null,
      physicalExamination: values.physicalExamination.trim() || null,
      assessment: values.assessment.trim() || null,
      plan: values.plan.trim() || null,
      followUp: values.followUp.trim() || null,
    };
    if (Object.values(candidate).every((v) => v === null)) {
      setBanner('La consulta no puede quedar completamente vacía.');
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      await updateEncounter(encounter.id, candidate);
      // SSR re-render shows the updated note and, when the time differs,
      // the `Editada` badge.
      setEditing(false);
      setSaving(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setBanner('No se pudieron guardar los cambios. Tu texto se conserva.');
      }
      setSaving(false);
    }
  };

  if (editing) {
    const errorFor = (field: string) => fieldErrors[field]?.[0] ?? null;
    return (
      <div className="consultation-workspace">
        <form
          className="consultation-note-form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void onSave();
          }}
        >
          <div className="consultation-note-header">
            <div>
              <p className="section-label">Editar consulta</p>
              <h2>{patient.fullName}</h2>
            </div>
            <span className="badge badge-status-ordered">{dirty ? 'Cambios sin guardar' : 'Editando'}</span>
          </div>
          <div className="card consultation-note-card">
          <div className="field">
            <label htmlFor="edit-type">Tipo de atención</label>
            <select
              id="edit-type"
              name="type"
              value={type}
              onChange={(e) => setType(e.target.value as EncounterType)}
            >
              {encounterTypeSchema.options.map((t) => (
                <option key={t} value={t}>
                  {ENCOUNTER_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          {SECTIONS.map((s) => (
            <div className="field" key={s.key}>
              <label htmlFor={`edit-${s.key}`}>{s.label}</label>
              <textarea
                id={`edit-${s.key}`}
                name={s.key}
                rows={s.rows}
                maxLength={MAX_CHARS}
                value={values[s.key]}
                onChange={setSection(s.key)}
                aria-invalid={errorFor(s.key) ? 'true' : undefined}
              />
              {errorFor(s.key) ? <div className="field-error">{errorFor(s.key)}</div> : null}
            </div>
          ))}
          </div>
          {banner ? <ErrorBanner message={banner} /> : null}
          <div className="btn-row consultation-save-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={cancelEditing}
              disabled={saving}
            >
              Cancelar edición
            </button>
          </div>
        </form>
        <EncounterContextActions
          patient={patient}
          encounter={encounter}
          encounters={encounters}
          patientStudies={patientStudies}
          appointment={appointment}
          documentKind={documentKind}
          onDocumentKindChange={setDocumentKind}
          editing={true}
        />
      </div>
    );
  }

  return (
    <div className="consultation-workspace">
      <section className="consultation-note-form">
      <div className="encounter-head">
        <h1>{formatDateTime(encounter.occurredAt)}</h1>
        <span className="badge badge-type">{ENCOUNTER_TYPE_LABELS[encounter.type]}</span>
        {edited ? (
          <Badge tone="edited">Editada el {formatDateTime(encounter.updatedAt)}</Badge>
        ) : null}
      </div>

      <div className="card">
        {SECTIONS.map((s) => (
          <div className="note-section" key={s.key}>
            <div className="section-label">{s.label}</div>
            {encounter[s.key] ? (
              <div className="section-body">{encounter[s.key]}</div>
            ) : (
              <em className="faint">No registrado</em>
            )}
          </div>
        ))}
      </div>

      <EncounterStudyWorkflow
        patientId={patient.id}
        encounterId={encounter.id}
        encounters={encounters}
        studies={list}
      />

      {banner ? <ErrorBanner message={banner} /> : null}

      <div className="btn-row">
        <button type="button" className="btn btn-secondary" disabled={documentKind !== null} onClick={startEditing}>
          Editar consulta
        </button>
      </div>
      </section>
      <EncounterContextActions
        patient={patient}
        encounter={encounter}
        encounters={encounters}
        patientStudies={patientStudies}
        appointment={appointment}
        documentKind={documentKind}
        onDocumentKindChange={setDocumentKind}
        editing={false}
      />
    </div>
  );
}
