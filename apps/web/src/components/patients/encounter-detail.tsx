'use client';

// Consultation detail + focused field editing. Clinical text remains verbatim;
// only the selected section becomes a form, and each change is explicitly saved.

import { useRef, useState } from 'react';
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
import { EncounterStudyRequestForm, EncounterStudyWorkflow } from './study-workflow';
import { EncounterAppointmentHandoff } from '../appointments/encounter-handoff';
import { AppointmentForm } from '../appointments/appointment-form';
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
  studies,
  appointment,
  documentKind,
  onDocumentKindChange,
  editing,
}: {
  patient: PatientDetail;
  encounter: EncounterDetail;
  encounters: EncounterSummary[];
  studies: StudyRequest[];
  appointment: Appointment | null;
  documentKind: MedicalDocumentKind | null;
  onDocumentKindChange: (kind: MedicalDocumentKind | null) => void;
  editing: boolean;
}) {
  const router = useRouter();
  const [savedDocumentMessage, setSavedDocumentMessage] = useState<string | null>(null);
  const [savedStudyMessage, setSavedStudyMessage] = useState(false);
  const [studyRequestOpen, setStudyRequestOpen] = useState(false);
  const [followUpOpen, setFollowUpOpen] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState<string | null>(null);
  const actionsHeading = useRef<HTMLHeadingElement>(null);

  return (
    <>
      <aside className="consultation-context-column">
        <ClinicalContext patient={patient} />
        {appointment ? <EncounterAppointmentHandoff appointment={appointment} encounter={encounter} /> : null}
        <section className="card consultation-actions-card" aria-labelledby="encounter-actions-title">
          <h2 id="encounter-actions-title" tabIndex={-1} ref={actionsHeading}>Acciones de esta consulta</h2>
          {savedDocumentMessage ? <p className="notice" role="status">{savedDocumentMessage}</p> : null}
          {followUpMessage ? <p className="notice" role="status">{followUpMessage}</p> : null}
          {savedStudyMessage ? <p className="notice" role="status">Estudio guardado en esta consulta.</p> : null}
          {editing ? (
            <p className="field-hint">Guarda o cancela la edición antes de iniciar otra acción de esta consulta.</p>
          ) : studyRequestOpen ? (
            <>
              <p className="study-request-active" role="status">Solicitud sin guardar</p>
              <EncounterStudyRequestForm
                patientId={patient.id}
                encounterId={encounter.id}
                encounters={encounters}
                onSaved={() => { setSavedStudyMessage(true); actionsHeading.current?.focus(); }}
                onClose={() => { setStudyRequestOpen(false); actionsHeading.current?.focus(); }}
              />
            </>
          ) : (
            <>
              <button type="button" className="btn btn-secondary" disabled={documentKind !== null} onClick={() => { setSavedStudyMessage(false); setStudyRequestOpen(true); }}>
                Solicitar estudio
              </button>
              <button type="button" className="btn btn-secondary" disabled={documentKind !== null} onClick={() => { setSavedDocumentMessage(null); onDocumentKindChange('prescription'); }}>
                Nueva receta
              </button>
              <button type="button" className="btn btn-secondary" disabled={documentKind !== null} onClick={() => { setSavedDocumentMessage(null); onDocumentKindChange('report'); }}>
                Nuevo informe
              </button>
              {documentKind === null ? (
                <button type="button" className="btn btn-ghost" onClick={() => setFollowUpOpen(true)}>
                  Programar seguimiento
                </button>
              ) : null}
            </>
          )}
        </section>
        <EncounterStudyWorkflow patientId={patient.id} studies={studies} />
      </aside>
      {followUpOpen ? <AppointmentForm patientId={patient.id} dialogTitle={`Programar seguimiento · ${patient.fullName}`}
        onCancel={() => setFollowUpOpen(false)}
        onCreated={(created) => { setFollowUpMessage(`Cita creada para ${formatDateTime(created.startAt)}.`); setFollowUpOpen(false); router.refresh(); }} /> : null}
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
              actionsHeading.current?.focus();
            }}
            onCancel={() => { onDocumentKindChange(null); actionsHeading.current?.focus(); }}
          />
        </section>
      ) : null}
    </>
  );
}

export function EncounterDetail({
  encounter,
  studies = [],
  patient,
  encounters,
  appointment,
}: {
  encounter: EncounterDetail;
  studies?: StudyRequest[];
  patient: PatientDetail;
  encounters: EncounterSummary[];
  appointment: Appointment | null;
}) {
  const [editingField, setEditingField] = useState<keyof SectionValues | 'type' | null>(null);
  const [draftValue, setDraftValue] = useState('');
  const [draftType, setDraftType] = useState<EncounterType>(encounter.type);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [documentKind, setDocumentKind] = useState<MedicalDocumentKind | null>(null);
  const router = useRouter();
  const edited = wasEdited(encounter.createdAt, encounter.updatedAt);

  const originalValue = editingField && editingField !== 'type' ? encounter[editingField] ?? '' : '';
  const dirty = editingField === 'type'
    ? draftType !== encounter.type
    : editingField !== null && draftValue !== originalValue;
  useBeforeUnloadGuard(dirty, 'Hay cambios sin guardar en este campo. Si sales, perderás el texto capturado.');

  function beginEdit(field: keyof SectionValues | 'type') {
    setEditingField(field);
    setDraftValue(field === 'type' ? '' : encounter[field] ?? '');
    setDraftType(encounter.type);
    setFieldErrors({});
    setBanner(null);
    setSavedMessage(null);
  }

  function cancelEdit() {
    if (dirty && !window.confirm('Hay cambios sin guardar. ¿Descartar este campo?')) return;
    setEditingField(null);
    setFieldErrors({});
    setBanner(null);
  }

  async function saveField() {
    if (!editingField) return;
    let candidate: UpdateEncounterInput;
    if (editingField === 'type') {
      candidate = { type: draftType };
    } else {
      const nextValue = draftValue.trim() || null;
      const otherSectionHasContent = SECTIONS.some(
        ({ key }) => key !== editingField && Boolean(encounter[key]?.trim()),
      );
      if (!nextValue && !otherSectionHasContent) {
        setBanner('La consulta no puede quedar completamente vacía.');
        return;
      }
      candidate = { [editingField]: nextValue } as UpdateEncounterInput;
    }

    setSaving(true);
    setBanner(null);
    try {
      await updateEncounter(encounter.id, candidate);
      const label = editingField === 'type'
        ? 'Tipo de atención'
        : SECTIONS.find(({ key }) => key === editingField)?.label ?? 'Campo';
      setEditingField(null);
      setFieldErrors({});
      setSavedMessage(`${label} actualizado.`);
      setSaving(false);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setBanner('No se pudieron guardar los cambios. El texto sigue en este campo.');
      }
      setSaving(false);
    }
  }

  const errorFor = (field: string) => fieldErrors[field]?.[0] ?? null;

  return (
    <div className="consultation-workspace">
      <section className="consultation-note-form" aria-labelledby="encounter-title">
        <div className="encounter-head">
          <h1 id="encounter-title">{formatDateTime(encounter.occurredAt)}</h1>
          {edited ? <Badge tone="edited">Editada el {formatDateTime(encounter.updatedAt)}</Badge> : null}
        </div>

        {savedMessage ? <p className="notice" role="status">{savedMessage}</p> : null}
        {banner ? <ErrorBanner message={banner} /> : null}

        <div className="card encounter-note-card">
          <section className="note-section note-type-section" aria-labelledby="note-type-label">
            <div className="note-section-heading">
              <div className="section-label" id="note-type-label">Tipo de atención</div>
              {editingField !== 'type' ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => beginEdit('type')}>
                  Editar
                </button>
              ) : null}
            </div>
            {editingField === 'type' ? (
              <form className="note-field-editor" onSubmit={(event) => { event.preventDefault(); void saveField(); }}>
                <label htmlFor="edit-type">Tipo de atención</label>
                <select id="edit-type" value={draftType} autoFocus
                  aria-invalid={errorFor('type') ? 'true' : undefined}
                  aria-describedby={errorFor('type') ? 'edit-type-error' : undefined}
                  onChange={(event) => setDraftType(event.target.value as EncounterType)}>
                  {encounterTypeSchema.options.map((type) => (
                    <option key={type} value={type}>{ENCOUNTER_TYPE_LABELS[type]}</option>
                  ))}
                </select>
                {errorFor('type') ? <div className="field-error" id="edit-type-error" role="alert">{errorFor('type')}</div> : null}
                <div className="form-actions">
                  <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>{saving ? 'Guardando…' : 'Guardar tipo'}</button>
                  <button type="button" className="btn btn-ghost" onClick={cancelEdit} disabled={saving}>Cancelar</button>
                </div>
              </form>
            ) : (
              <span className="badge badge-type">{ENCOUNTER_TYPE_LABELS[encounter.type]}</span>
            )}
          </section>

          {SECTIONS.map((section) => {
            const isEditing = editingField === section.key;
            return (
              <section className="note-section" key={section.key} aria-labelledby={`note-label-${section.key}`}>
                <div className="note-section-heading">
                  <div className="section-label" id={`note-label-${section.key}`}>{section.label}</div>
                  {!isEditing ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => beginEdit(section.key)} aria-label={`Editar ${section.label}`}>
                      Editar
                    </button>
                  ) : null}
                </div>
                {isEditing ? (
                  <form className="note-field-editor" onSubmit={(event) => { event.preventDefault(); void saveField(); }}>
                    <label htmlFor={`edit-${section.key}`}>{section.label}</label>
                    <textarea
                      id={`edit-${section.key}`}
                      rows={section.rows}
                      maxLength={MAX_CHARS}
                      value={draftValue}
                      onChange={(event) => setDraftValue(event.target.value)}
                      aria-invalid={errorFor(section.key) ? 'true' : undefined}
                      aria-describedby={errorFor(section.key) ? `edit-${section.key}-error` : undefined}
                      autoFocus
                    />
                    {errorFor(section.key) ? <div className="field-error" id={`edit-${section.key}-error`} role="alert">{errorFor(section.key)}</div> : null}
                    <div className="form-actions">
                      <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>{saving ? 'Guardando…' : 'Guardar campo'}</button>
                      <button type="button" className="btn btn-ghost" onClick={cancelEdit} disabled={saving}>Cancelar</button>
                    </div>
                  </form>
                ) : encounter[section.key] ? (
                  <div className="section-body">{encounter[section.key]}</div>
                ) : (
                  <em className="faint">No registrado</em>
                )}
              </section>
            );
          })}
        </div>
      </section>

      <EncounterContextActions
        patient={patient}
        encounter={encounter}
        encounters={encounters}
        studies={studies}
        appointment={appointment}
        documentKind={documentKind}
        onDocumentKindChange={setDocumentKind}
        editing={editingField !== null}
      />
    </div>
  );
}
