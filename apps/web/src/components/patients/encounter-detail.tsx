'use client';

// Consultation detail + in-place edit (UI_SPEC §3.7). Read view renders the
// full note verbatim (never a form); `Editar consulta` toggles edit mode
// with the same field layout as the new-consultation form, pre-filled.
// Save is explicit: `Guardar cambios` → PATCH → SSR re-render (a new
// `Editada` badge appears when the edit time differs from the occurrence).
// Editing never reassigns the patient (API-enforced).

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { EncounterDetail, UpdateEncounterInput } from '@nexus-med/contracts';

import { ApiError, updateEncounter } from '../../lib/api/client';
import { Badge, ErrorBanner } from '../primitives';
import { formatDateTime, wasEdited } from '../../lib/format';

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
  patientId,
  encounter,
}: {
  patientId: string;
  encounter: EncounterDetail;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [values, setValues] = useState<SectionValues>(() => toValues(encounter));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const edited = wasEdited(encounter.occurredAt, encounter.updatedAt);

  const startEditing = () => {
    setValues(toValues(encounter));
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
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
      >
        <div className="card">
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
        <div className="btn-row">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setEditing(false)}
            disabled={saving}
          >
            Cancelar edición
          </button>
        </div>
      </form>
    );
  }

  return (
    <>
      <div className="encounter-head">
        <h1>{formatDateTime(encounter.occurredAt)}</h1>
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

      {banner ? <ErrorBanner message={banner} /> : null}

      <div className="btn-row">
        <button type="button" className="btn btn-secondary" onClick={startEditing}>
          Editar consulta
        </button>
      </div>
    </>
  );
}
