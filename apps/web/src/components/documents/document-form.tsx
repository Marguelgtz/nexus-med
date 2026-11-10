'use client';

// Explicit doctor-authored document form (UI_SPEC §7.4). Text is stored
// verbatim; this component never suggests clinical content.

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type {
  CreateMedicalDocumentInput,
  EncounterSummary,
  MedicalDocument,
  MedicalDocumentKind,
  PrescriptionLineInput,
} from '@nexus-med/contracts';
import { createMedicalDocumentInputSchema } from '@nexus-med/contracts';

import { ApiError, createMedicalDocument, updateMedicalDocument } from '../../lib/api/client';
import { formatDateTime } from '../../lib/format';
import { MedicationEditor, type MedicationValues } from './medication-editor';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';

type LineValues = MedicationValues;
type FieldErrors = Record<string, string[]>;

function initialLines(document?: MedicalDocument): LineValues[] {
  if (document?.kind === 'prescription') {
    return document.lines.map((line) => ({
      medication: line.medication,
      dose: line.dose ?? '',
      route: line.route ?? '',
      frequency: line.frequency ?? '',
      duration: line.duration ?? '',
      instructions: line.instructions ?? '',
    }));
  }
  return [];
}

function lineInput(line: LineValues): PrescriptionLineInput {
  return {
    medication: line.medication.trim(),
    dose: line.dose.trim() || null,
    route: line.route.trim() || null,
    frequency: line.frequency.trim() || null,
    duration: line.duration.trim() || null,
    instructions: line.instructions.trim() || null,
  };
}

export function MedicalDocumentForm({
  patientId,
  patientName,
  kind,
  encounters,
  initialEncounterId,
  returnTo,
  initial,
  onSaved,
  onCancel,
}: {
  patientId: string;
  patientName: string;
  kind: MedicalDocumentKind;
  encounters: EncounterSummary[];
  initialEncounterId?: string;
  returnTo?: string;
  initial?: MedicalDocument;
  onSaved?: (document: MedicalDocument) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [encounterId, setEncounterId] = useState(initial?.encounter?.id ?? initialEncounterId ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [lines, setLines] = useState<LineValues[]>(() => initialLines(initial));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [editingMedication, setEditingMedication] = useState<number | 'new' | null>(null);
  useBeforeUnloadGuard(dirty && !saving);

  const errorFor = (field: string) => fieldErrors[field]?.[0] ?? null;
  const changed = () => {
    setDirty(true);
    setBanner(null);
  };

  function showErrors(errors: FieldErrors) {
    setFieldErrors(errors);
    const lineKey = Object.keys(errors).find((key) => /^lines\.\d+\./.test(key));
    if (lineKey) setEditingMedication(Number(lineKey.split('.')[1]));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);
    setFieldErrors({});

    const input: CreateMedicalDocumentInput = kind === 'prescription'
      ? {
          kind,
          title: title.trim() || null,
          encounterId: encounterId || null,
          body: body.trim() || null,
          lines: lines
            .filter((line) => Object.values(line).some((value) => value.trim() !== ''))
            .map(lineInput),
        }
      : {
          kind,
          title: title.trim() || null,
          encounterId: encounterId || null,
          body,
        };

    if (kind === 'prescription' && input.kind === 'prescription' && input.lines.length === 0) {
      setFieldErrors({ lines: ['Agrega al menos un medicamento.'] });
      return;
    }

    const parsed = createMedicalDocumentInputSchema.safeParse(input);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path.join('.') || '_form';
        (errors[field] ??= []).push(issue.message);
      }
      showErrors(errors);
      return;
    }

    setSaving(true);
    try {
      const saved = initial
        ? await updateMedicalDocument(initial.id, parsed.data)
        : await createMedicalDocument(patientId, parsed.data);
      setDirty(false);
      if (onSaved) onSaved(saved);
      else if (returnTo) router.push(returnTo);
      else router.push(`/patients/${patientId}/${kind === 'prescription' ? 'recetas' : 'informes'}/${saved.id}`);
      router.refresh();
    } catch (error) {
      if (error instanceof ApiError && Object.keys(error.fieldErrors).length > 0) {
        showErrors(error.fieldErrors);
      } else {
        setBanner(error instanceof Error ? error.message : 'No se pudo guardar el documento. El texto se conserva.');
      }
      setSaving(false);
    }
  }

  return (<>
    <form className="document-form" onSubmit={submit} noValidate aria-busy={saving}>
      <section className="card">
        <div className="field">
          <label htmlFor="document-title">Título</label>
          <input
            id="document-title"
            disabled={saving}
            autoFocus={Boolean(onSaved)}
            value={title}
            maxLength={120}
            placeholder={kind === 'prescription' ? 'Ej. Receta — control de dolor' : 'Ej. Informe de evolución'}
            onChange={(event) => { changed(); setTitle(event.target.value); }}
            aria-invalid={errorFor('title') ? 'true' : undefined}
          />
          {errorFor('title') ? <div className="field-error">{errorFor('title')}</div> : null}
        </div>

        <div className="field">
          <label htmlFor="related-encounter">Consulta relacionada</label>
          <select
            id="related-encounter"
            disabled={saving}
            value={encounterId}
            onChange={(event) => { changed(); setEncounterId(event.target.value); }}
            aria-invalid={errorFor('encounterId') ? 'true' : undefined}
          >
            <option value="">Sin consulta relacionada</option>
            {initial?.encounter && !encounters.some((encounter) => encounter.id === initial.encounter?.id) ? (
              <option value={initial.encounter.id}>
                {formatDateTime(initial.encounter.occurredAt)} — {initial.encounter.reason || 'Sin motivo'}
              </option>
            ) : null}
            {encounters.map((encounter) => (
              <option key={encounter.id} value={encounter.id}>
                {formatDateTime(encounter.occurredAt)} — {encounter.reason || 'Sin motivo'}
              </option>
            ))}
          </select>
          {errorFor('encounterId') ? <div className="field-error">{errorFor('encounterId')}</div> : null}
        </div>

        {kind === 'prescription' ? (
          <>
            <div className="document-form-section">
              <h2>Medicamentos</h2>
              {lines.length === 0 ? <p className="faint">Sin medicamentos en la receta.</p> : <ul className="compact-record-list prescription-medications">
                {lines.map((line, index) => <li key={index}>
                  <details>
                    <summary><strong>{index + 1}. {line.medication}</strong><span className="field-hint">{[line.dose, line.frequency, line.duration].filter(Boolean).join(' · ') || 'Pauta sin registrar'}</span></summary>
                    <dl className="medication-details">{([
                      ['dose', 'Dosis'], ['route', 'Vía'], ['frequency', 'Frecuencia'], ['duration', 'Duración'],
                    ] as const).map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{line[key] || <em className="faint">No registrado</em>}</dd></div>)}</dl>
                    {line.instructions ? <p>Indicaciones específicas registradas: {line.instructions}</p> : null}
                  </details>
                  <div className="actions">
                    <button type="button" className="btn btn-ghost btn-sm" disabled={saving} aria-label={`Editar medicamento ${index + 1}`} onClick={() => setEditingMedication(index)}>Editar</button>
                    <button type="button" className="btn btn-ghost btn-sm" disabled={saving} aria-label={`Quitar medicamento ${index + 1}`} onClick={() => { changed(); setLines((current) => current.filter((_, i) => i !== index)); }}>Quitar</button>
                  </div>
                </li>)}
              </ul>}
              {errorFor('lines') ? <div className="field-error" role="alert">{errorFor('lines')}</div> : null}
              <button type="button" className="btn btn-secondary btn-sm" disabled={saving || lines.length >= 50} onClick={() => setEditingMedication('new')}>Agregar medicamento</button>
            </div>

            <div className="field">
              <label htmlFor="document-body">Indicaciones generales</label>
              <textarea
                id="document-body"
              disabled={saving}
                rows={3}
                maxLength={2000}
                value={body}
                onChange={(event) => { changed(); setBody(event.target.value); }}
                aria-invalid={errorFor('body') ? 'true' : undefined}
              />
              {errorFor('body') ? <div className="field-error">{errorFor('body')}</div> : null}
            </div>
          </>
        ) : (
          <div className="field">
            <label htmlFor="document-body">Texto del informe <span className="required">*</span></label>
            <textarea
              id="document-body"
              disabled={saving}
              rows={12}
              maxLength={20000}
              required
              value={body}
              onChange={(event) => { changed(); setBody(event.target.value); }}
              aria-invalid={errorFor('body') ? 'true' : undefined}
            />
            {body.length > 19500 ? <div className="field-hint">{body.length} / 20,000</div> : null}
            {errorFor('body') ? <div className="field-error">{errorFor('body')}</div> : null}
          </div>
        )}

        {banner ? <div className="error-banner" role="alert">{banner}</div> : null}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Guardando…' : initial ? 'Guardar cambios' : kind === 'prescription' ? 'Guardar receta' : 'Guardar informe'}
          </button>
          {onCancel ? (
            <button
              type="button"
              className="btn btn-ghost"
              disabled={saving}
              onClick={() => {
                if (!dirty || window.confirm('Hay un documento sin guardar. ¿Descartar los cambios?')) onCancel();
              }}
            >
              Cancelar
            </button>
          ) : (
            <Link href={returnTo ?? `/patients/${patientId}/documentos`} className="btn btn-ghost">Cancelar</Link>
          )}
        </div>
      </section>
    </form>
    {editingMedication !== null ? <MedicationEditor patientName={patientName}
      initial={typeof editingMedication === 'number' ? lines[editingMedication] : undefined}
      initialError={typeof editingMedication === 'number' ? Object.entries(fieldErrors).filter(([key]) => key.startsWith(`lines.${editingMedication}.`)).flatMap(([, errors]) => errors).join(' ') || undefined : undefined}
      onCancel={() => setEditingMedication(null)}
      onConfirm={(line) => {
        changed();
        setLines((current) => typeof editingMedication === 'number' ? current.map((item, index) => index === editingMedication ? line : item) : [...current, line]);
        setFieldErrors({});
        setEditingMedication(null);
      }} /> : null}
    </>
  );
}
