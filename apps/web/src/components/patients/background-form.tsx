'use client';

// Edit medical background form (UI_SPEC §3.5). Four free-text fields that
// belong to the patient, never to one encounter; historical notes are never
// rewritten (server-guaranteed). Empty input clears the field; blank means
// "not recorded", never a confirmed negative finding (WORKFLOWS §4).

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type MedicalBackgroundInput,
  medicalBackgroundInputSchema,
} from '@nexus-med/contracts';

import { ApiError, updateMedicalBackground } from '../../lib/api/client';
import { Modal } from '../modal';
import { ErrorBanner } from '../primitives';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';

type FieldErrors = Record<string, string[]>;

const FIELDS: { key: keyof MedicalBackgroundInput; label: string; rows: number }[] = [
  { key: 'medicalConditions', label: 'Afecciones', rows: 3 },
  { key: 'previousSurgeries', label: 'Cirugías previas', rows: 3 },
  { key: 'allergies', label: 'Alergias', rows: 2 },
  { key: 'currentMedications', label: 'Medicamentos actuales', rows: 3 },
];

export function BackgroundForm({
  patientId,
  initial, onSaved, onCancel, dialogTitle,
}: {
  patientId: string;
  initial: MedicalBackgroundInput;
  onSaved?: () => void;
  onCancel?: () => void;
  dialogTitle?: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState({
    medicalConditions: initial.medicalConditions ?? '',
    previousSurgeries: initial.previousSurgeries ?? '',
    allergies: initial.allergies ?? '',
    currentMedications: initial.currentMedications ?? '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Dirty while any field differs from the saved record the form loaded with.
  const dirty =
    values.medicalConditions !== (initial.medicalConditions ?? '') ||
    values.previousSurgeries !== (initial.previousSurgeries ?? '') ||
    values.allergies !== (initial.allergies ?? '') ||
    values.currentMedications !== (initial.currentMedications ?? '');
  useBeforeUnloadGuard(dirty && !saving);
  const close = () => { if (!saving && (!dirty || window.confirm('Hay antecedentes sin guardar. ¿Descartar los cambios?'))) onCancel?.(); };

  const set = (field: keyof typeof values) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

    const candidate: MedicalBackgroundInput = {
      medicalConditions: values.medicalConditions.trim() || null,
      previousSurgeries: values.previousSurgeries.trim() || null,
      allergies: values.allergies.trim() || null,
      currentMedications: values.currentMedications.trim() || null,
    };

    const parsed = medicalBackgroundInputSchema.safeParse(candidate);
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
      await updateMedicalBackground(patientId, candidate);
      if (onSaved) onSaved(); else router.push(`/patients/${patientId}#patient-background`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fieldErrors).length > 0) {
        setFieldErrors(err.fieldErrors);
      } else {
        setBanner(
          err instanceof Error
            ? 'No se pudieron guardar los antecedentes. Tu texto se conserva.'
            : 'No se pudieron guardar los antecedentes.',
        );
      }
      setSaving(false);
    }
  };

  const errorFor = (field: string) => fieldErrors[field]?.[0] ?? null;

  const form = (
    <form onSubmit={onSubmit} noValidate>
      <div className={dialogTitle ? undefined : "card"}>
        {FIELDS.map((f) => (
          <div className="field" key={f.key}>
            <label htmlFor={f.key}>
              {f.label} <span className="faint">(vacío = no registrado)</span>
            </label>
            <textarea
              id={f.key}
              name={f.key}
              rows={f.rows}
              disabled={saving}
              value={values[f.key]}
              onChange={set(f.key)}
              aria-invalid={errorFor(f.key) ? 'true' : undefined}
            />
            {errorFor(f.key) ? <div className="field-error">{errorFor(f.key)}</div> : null}
          </div>
        ))}
      </div>

      {banner ? <ErrorBanner message={banner} /> : null}

      <div className="btn-row">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar antecedentes'}
        </button>
        {onCancel ? <button type="button" className="btn btn-ghost" disabled={saving} onClick={close}>Cancelar</button> : <Link href={`/patients/${patientId}#patient-background`} className="btn btn-ghost">
          Cancelar
        </Link>}
      </div>
    </form>
  );
  return dialogTitle ? <Modal title={dialogTitle} onClose={close} closeDisabled={saving}>{form}</Modal> : form;
}
