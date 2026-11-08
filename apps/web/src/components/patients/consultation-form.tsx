'use client';

// Consultation form (UI_SPEC §3.6). Explicit save only — never autosave.
// The patient context strip is rendered by the page; this form is the note
// body. Clinical content is verbatim: no suggestions anywhere.

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type CreateEncounterInput,
  type EncounterType,
  type StudyCategory,
  createEncounterInputSchema,
  encounterTypeSchema,
  studyCategorySchema,
} from '@nexus-med/contracts';

import { ApiError, createEncounter } from '../../lib/api/client';
import { ENCOUNTER_TYPE_LABELS, STUDY_CATEGORY_LABELS } from '../../lib/format';
import { ErrorBanner } from '../primitives';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';

type FieldErrors = Record<string, string[]>;

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
const COUNTER_AT = 9_500;

type SectionValues = {
  reason: string;
  historyOfPresentIllness: string;
  relevantHistory: string;
  physicalExamination: string;
  assessment: string;
  plan: string;
  followUp: string;
};

/** One study row in the form (UI_SPEC §7.3, U-15). Zero rows = no studies. */
type StudyRowInput = { category: StudyCategory; description: string };

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

export function ConsultationForm({ patientId }: { patientId: string }) {
  const router = useRouter();
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
    studies.length > 0;
  useBeforeUnloadGuard(dirty);

  const setSection = (field: keyof SectionValues) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValues((v) => ({ ...v, [field]: e.target.value }));
    setFieldErrors((fe) => {
      if (!fe[field]) return fe;
      const next = { ...fe };
      delete next[field];
      return next;
    });
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBanner(null);

    const occurredIso = localToIso(occurredAt);
    if (!occurredIso) {
      setFieldErrors({ occurredAt: ['Indica la fecha y hora de la consulta'] });
      return;
    }
    if (new Date(occurredIso).getTime() > Date.now() + 60_000) {
      setFieldErrors({ occurredAt: ['La fecha de la consulta no puede estar en el futuro'] });
      return;
    }

    // Client check on kept study rows (server repeats it with per-row
    // fieldErrors, e.g. `studies.0.description`).
    const rowErrors: FieldErrors = {};
    studies.forEach((row, i) => {
      if (row.description.trim() === '') {
        rowErrors[`studies.${i}.description`] = ['Indica el estudio'];
      }
    });
    if (Object.keys(rowErrors).length > 0) {
      setFieldErrors(rowErrors);
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
              description: s.description.trim(),
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
      setFieldErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const created = await createEncounter(patientId, candidate);
      router.push(`/patients/${patientId}/consultas/${created.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setBanner('No se pudo guardar la consulta. Tu texto se conserva.');
      }
      setSaving(false);
    }
  };

  const errorFor = (field: string) => fieldErrors[field]?.[0] ?? null;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="card">
        <div className="field">
          <label htmlFor="occurredAt">
            Fecha y hora de la consulta <span className="required">*</span>
          </label>
          <input
            id="occurredAt"
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
          <label htmlFor="encounterType">Tipo de consulta</label>
          <select
            id="encounterType"
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
            <label htmlFor={s.key}>
              {s.label}
              {values[s.key].length > COUNTER_AT ? (
                <span className="faint"> {values[s.key].length.toLocaleString('es-MX')} / {MAX_CHARS.toLocaleString('es-MX')}</span>
              ) : null}
            </label>
            <textarea
              id={s.key}
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

        <div className="field">
          <div className="section-label">Estudios solicitados</div>
          {studies.length > 0 ? (
            <div className="study-form-rows">
              {studies.map((row, i) => (
                <div className="study-form-row" key={i}>
                  <select
                    aria-label={`Categoría del estudio ${i + 1}`}
                    value={row.category}
                    onChange={(e) =>
                      setStudies((rows) =>
                        rows.map((r, j) =>
                          j === i ? { ...r, category: e.target.value as StudyCategory } : r,
                        ),
                      )
                    }
                  >
                    {studyCategorySchema.options.map((c) => (
                      <option key={c} value={c}>
                        {STUDY_CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    aria-label={`Descripción del estudio ${i + 1}`}
                    placeholder="Ej. Biometría hemática"
                    maxLength={200}
                    value={row.description}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStudies((rows) => rows.map((r, j) => (j === i ? { ...r, description: value } : r)));
                      setFieldErrors((fe) => {
                        const key = `studies.${i}.description`;
                        if (!fe[key]) return fe;
                        const next = { ...fe };
                        delete next[key];
                        return next;
                      });
                    }}
                    aria-invalid={errorFor(`studies.${i}.description`) ? 'true' : undefined}
                  />
                  {studies.length > 1 ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => setStudies((rows) => rows.filter((_, j) => j !== i))}
                    >
                      Quitar
                    </button>
                  ) : null}
                </div>
              ))}
              {studies.map((_, i) =>
                errorFor(`studies.${i}.description`) ? (
                  <div className="field-error" key={`err-${i}`}>{errorFor(`studies.${i}.description`)}</div>
                ) : null,
              )}
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setStudies((rows) => [...rows, { category: 'laboratorio', description: '' }])}
          >
            Agregar estudio
          </button>
        </div>
      </div>

      {banner ? <ErrorBanner message={banner} /> : null}

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar consulta'}
        </button>
        <Link href={`/patients/${patientId}`} className="btn btn-ghost">
          Cancelar
        </Link>
      </div>
    </form>
  );
}
