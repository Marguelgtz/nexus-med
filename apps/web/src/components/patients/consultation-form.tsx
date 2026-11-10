'use client';

// Consultation form (UI_SPEC §3.6). Explicit save only — never autosave.
// The patient context strip is rendered by the page; this form is the note
// body. Clinical content is verbatim: no suggestions anywhere.

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type Appointment,
  type CreateEncounterInput,
  type EncounterType,
  type PatientDetail,
  type StudyInput,
  createEncounterInputSchema,
  encounterTypeSchema,
} from '@nexus-med/contracts';

import { ApiError, createEncounter } from '../../lib/api/client';
import {
  APPOINTMENT_TYPE_LABELS,
  ENCOUNTER_TYPE_LABELS,
  formatDateTime,
} from '../../lib/format';
import { Badge, ErrorBanner } from '../primitives';
import { ClinicalContext } from './clinical-context';
import { StagedStudyDialog } from './staged-study-dialog';
import { CONSULTATION_SECTIONS as SECTIONS, CONSULTATION_STAGES, type ConsultationValues } from './consultation-sections';
import { STUDY_CATEGORY_LABELS } from '../../lib/format';
import { AppointmentForm } from '../appointments/appointment-form';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';

type FieldErrors = Record<string, string[]>;

const MAX_CHARS = 10_000;
const COUNTER_AT = 9_500;

type SectionValues = ConsultationValues;

/** One study row in the form (UI_SPEC §7.3, U-15). Zero rows = no studies. */
type StudyRowInput = StudyInput;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local "YYYY-MM-DDTHH:mm" from a datetime-local value, with an explicit
 * practice-timezone offset (dates must never round-trip through UTC). */
function localToIso(value: string): string | null {
  if (!value) return null;
  const [datePart, timePart] = value.split('T');
  if (!datePart || !timePart) return null;
  const [y, m, d] = datePart.split('-').map(Number);
  const [hh, mm] = timePart.split(':').map(Number);
  if (!y || !m || !d || hh === undefined || mm === undefined) return null;
  const local = new Date(y, m - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(local.getTime())) return null;
  const offsetMinutes = local.getTimezoneOffset();
  const sign = offsetMinutes <= 0 ? '+' : '-';
  const off = `${pad(Math.floor(Math.abs(offsetMinutes) / 60))}:${pad(Math.abs(offsetMinutes) % 60)}`;
  const y4 = String(y).padStart(4, '0');
  return `${y4}-${pad(m)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00${sign}${off}`;
}

function nowLocalInput(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
}

/** Event-time check; never run during render or against the initial form timestamp. */
function consultationIsFuture(occurredIso: string): boolean {
  return new Date(occurredIso).getTime() > Date.now() + 60_000;
}

export function ConsultationForm({
  patient,
  appointment,
}: {
  patient: PatientDetail;
  appointment: Appointment | null;
}) {
  const router = useRouter();
  const [stage, setStage] = useState(0);
  const [studyEditor, setStudyEditor] = useState<number | 'new' | null>(null);
  const stageHeading = useRef<HTMLHeadingElement>(null);
  function changeStage(next: number) {
    setStage(next);
    requestAnimationFrame(() => stageHeading.current?.focus());
  }
  function showErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    const key = Object.keys(errors)[0] ?? 'form';
    const field = SECTIONS.find((section) => section.key === key);
    setStage(key === 'occurredAt' ? 0 : field?.stage ?? 2);
    requestAnimationFrame(() => {
      const target = document.getElementById(key);
      (target ?? stageHeading.current)?.focus();
    });
  }
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [createdFollowUp, setCreatedFollowUp] = useState<Appointment | null>(null);
  const [initialOccurredAt] = useState(() => nowLocalInput());
  const [occurredAt, setOccurredAt] = useState(initialOccurredAt);
  const [type, setType] = useState<EncounterType>('consulta');
  const [values, setValues] = useState<SectionValues>({
    reason: '',
    historyOfPresentIllness: '',
    relevantHistory: '',
    physicalExamination: '',
    assessment: '',
    plan: '',
    followUp: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [studies, setStudies] = useState<StudyRowInput[]>([]);

  // Dirty while any section has text, the datetime moved off the default,
  // or a study row was added.
  const dirty =
    Object.values(values).some((v) => v.trim() !== '') ||
    occurredAt !== initialOccurredAt ||
    type !== 'consulta' ||
    studies.length > 0;
  useBeforeUnloadGuard(
    dirty || showFollowUp,
    'Hay cambios sin guardar. Si sales, perderás la consulta, los estudios agregados o la cita en captura.',
  );

  const setSection = (field: keyof SectionValues) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setFieldErrors((fe) => {
      if (!fe[field]) return fe;
      const next = { ...fe };
      delete next[field];
      return next;
    });
  };

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stage < 2) { changeStage(stage + 1); return; }
    setBanner(null);

    const occurredIso = localToIso(occurredAt);
    if (!occurredIso) {
      showErrors({ occurredAt: ['Indica la fecha y hora de la consulta'] });
      return;
    }
    if (consultationIsFuture(occurredIso)) {
      showErrors({ occurredAt: ['La fecha de la consulta no puede estar en el futuro'] });
      return;
    }

    // Client check on kept study rows (server repeats it with per-row
    // fieldErrors, e.g. `studies.0.name`).
    const rowErrors: FieldErrors = {};
    studies.forEach((row, i) => {
      if (row.name.trim().length < 2) {
        rowErrors[`studies.${i}.name`] = ['Indica el nombre del estudio'];
      }
    });
    if (Object.keys(rowErrors).length > 0) {
      showErrors(rowErrors);
      return;
    }

    const candidate: CreateEncounterInput = {
      occurredAt: occurredIso,
      type,
      reason: values.reason.trim() || null,
      historyOfPresentIllness: values.historyOfPresentIllness.trim() || null,
      relevantHistory: values.relevantHistory.trim() || null,
      physicalExamination: values.physicalExamination.trim() || null,
      assessment: values.assessment.trim() || null,
      plan: values.plan.trim() || null,
      followUp: values.followUp.trim() || null,
      ...(studies.length > 0
        ? {
            studies: studies.map((s) => ({
              category: s.category,
              name: s.name.trim(),
              ...(s.description?.trim() ? { description: s.description.trim() } : {}),
            })),
          }
        : {}),
    };

    const parsed = createEncounterInputSchema.safeParse(candidate);
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? 'form');
        (errs[key] ??= []).push(issue.message);
      }
      showErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const created = await createEncounter(patient.id, candidate);
      const appointmentQuery = appointment
        ? `?appointmentId=${encodeURIComponent(appointment.id)}`
        : '';
      router.push(`/patients/${patient.id}/consultas/${created.id}${appointmentQuery}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        showErrors(err.fieldErrors);
      } else {
        setBanner('No se pudo guardar la consulta. Tu texto se conserva.');
      }
      setSaving(false);
    }
  };

  const errorFor = (field: string) => fieldErrors[field]?.[0] ?? null;

  return (
    <div className="consultation-workspace">
      <form className="consultation-note-form" onSubmit={onSubmit} noValidate aria-busy={saving}>
        <header className="consultation-note-header">
          <div>
            <p className="section-label">Paciente</p>
            <h2>{patient.fullName}</h2>
            {patient.isArchived ? <Badge tone="archived">Archivado</Badge> : null}
            <div className="consultation-visit-context">
              <span>{appointment ? 'Atención con cita' : 'Consulta sin cita'}</span>
              {appointment ? (
                <span>
                  {formatDateTime(appointment.startAt)} · {APPOINTMENT_TYPE_LABELS[appointment.type]}
                </span>
              ) : null}
              {patient.externalIdentifier ? <span>Identificador: {patient.externalIdentifier}</span> : null}
            </div>
            <Link href={`/patients/${patient.id}`} className="btn btn-ghost btn-sm consultation-patient-link">
              ← Ver paciente
            </Link>
          </div>
          <span className="badge badge-status-ordered">Sin guardar</span>
        </header>

        <nav className="consultation-step-nav" aria-label="Etapas de la consulta">
          {CONSULTATION_STAGES.map((label, index) => <button type="button" key={label}
            aria-current={stage === index ? 'step' : undefined} disabled={saving} onClick={() => changeStage(index)}>
            <span>{index + 1}</span>{label}
          </button>)}
        </nav>
        <div className="consultation-stage-tools">
          <h2 ref={stageHeading} tabIndex={-1}>{CONSULTATION_STAGES[stage]}</h2>
          <div className="actions">
          <button type="button" className="btn btn-secondary btn-sm" aria-haspopup="dialog" disabled={saving} onClick={() => setStudyEditor('new')}>
            Solicitar estudio{studies.length > 0 ? ` (${studies.length})` : ''}
          </button>
          <button type="button" className="btn btn-ghost btn-sm" aria-haspopup="dialog" disabled={saving} onClick={() => setShowFollowUp(true)}>Programar seguimiento</button>
          </div>
        </div>
        <div className="card consultation-note-card">
        {stage === 0 ? <div className="consultation-meta-grid">
        <div className="field">
          <label htmlFor="occurredAt">
            Fecha y hora de la consulta <span className="required">*</span>
          </label>
          <input
            id="occurredAt"
            disabled={saving}
            name="occurredAt"
            type="datetime-local"
            value={occurredAt}
            onChange={(e) => {
              setOccurredAt(e.target.value);
              setFieldErrors((fe) => {
                if (!fe.occurredAt) return fe;
                const next = { ...fe };
                delete next.occurredAt;
                return next;
              });
            }}
            aria-invalid={errorFor('occurredAt') ? 'true' : undefined}
          />
          {errorFor('occurredAt') ? (
            <div className="field-error">{errorFor('occurredAt')}</div>
          ) : null}
        </div>

        <div className="field">
          <label htmlFor="encounterType">Tipo de atención</label>
          <select
            id="encounterType"
            disabled={saving}
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

        </div> : null}

        {SECTIONS.filter((section) => section.stage === stage).map((s) => (
          <div className="field" key={s.key}>
            <label htmlFor={s.key}>
              {s.label}
              {values[s.key].length > COUNTER_AT ? (
                <span className="faint"> {values[s.key].length.toLocaleString('es-MX')} / {MAX_CHARS.toLocaleString('es-MX')}</span>
              ) : null}
            </label>
            <textarea
              id={s.key}
              disabled={saving}
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

        {stage === 2 ? <>
          <details className="consultation-review">
            <summary>Revisar nota completa</summary>
            <dl>{SECTIONS.map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{values[key] || <em className="faint">No registrado</em>}</dd></div>)}</dl>
          </details>
          <section className="staged-studies" aria-labelledby="staged-study-title">
            <h3 id="staged-study-title">Solicitudes de estudio · {studies.length}</h3>
            <p className="field-hint">Se guardan y se asocian a esta consulta al guardar la nota.</p>
            {studies.length === 0 ? <p className="faint">Sin solicitudes preparadas.</p> : <ul className="compact-record-list">{studies.map((study, index) => <li key={index}>
              <div><strong>{study.name}</strong><span className="field-hint">{STUDY_CATEGORY_LABELS[study.category]}</span>{study.description ? <p>{study.description}</p> : null}</div>
              <div className="actions"><button type="button" className="btn btn-ghost btn-sm" disabled={saving} aria-label={`Editar estudio ${index + 1}`} onClick={() => setStudyEditor(index)}>Editar</button>
              <button type="button" className="btn btn-ghost btn-sm" disabled={saving} aria-label={`Quitar estudio ${index + 1}`} onClick={() => setStudies((current) => current.filter((_, i) => i !== index))}>Quitar</button></div>
            </li>)}</ul>}
          </section>
        </> : null}
        </div>

        {Object.keys(fieldErrors).length > 0 ? <ErrorBanner message={Object.values(fieldErrors).flat().join(" ")} /> : null}
        {banner ? <ErrorBanner message={banner} /> : null}

        <div className="btn-row consultation-save-actions">
          {stage > 0 ? <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => changeStage(stage - 1)}>Anterior</button> : null}
          {stage < 2 ? <button key="next-stage" type="button" className="btn btn-primary" onClick={() => changeStage(stage + 1)}>Continuar</button> :
            <button key="save-note" type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar consulta'}</button>}
          <Link href={appointment ? `/patients/${patient.id}/citas/${appointment.id}` : `/patients/${patient.id}/consultas`} className="btn btn-ghost">
            Cancelar
          </Link>
        </div>
      </form>

      <aside className="consultation-context-column">
        <ClinicalContext patient={patient} />
        {createdFollowUp ? <p className="notice" role="status">Cita creada para {formatDateTime(createdFollowUp.startAt)}. <Link href={`/patients/${patient.id}/citas/${createdFollowUp.id}`}>Ver cita</Link></p> : null}
      </aside>

      {studyEditor !== null ? <StagedStudyDialog patientName={patient.fullName}
        initial={typeof studyEditor === 'number' ? studies[studyEditor] : undefined}
        onCancel={() => setStudyEditor(null)}
        onConfirm={(study) => {
          setStudies((current) => typeof studyEditor === 'number' ? current.map((value, index) => index === studyEditor ? study : value) : [...current, study]);
          setStudyEditor(null);
        }} /> : null}
      {showFollowUp ? (
        <AppointmentForm patientId={patient.id} dialogTitle={`Programar seguimiento · ${patient.fullName}`}
          onCancel={() => setShowFollowUp(false)}
          onCreated={(created) => { setCreatedFollowUp(created); setShowFollowUp(false); }} />
      ) : null}
    </div>
  );
}
