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
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';

type LineValues = {
  medication: string;
  dose: string;
  route: string;
  frequency: string;
  duration: string;
  instructions: string;
};

type FieldErrors = Record<string, string[]>;

const blankLine = (): LineValues => ({
  medication: '', dose: '', route: '', frequency: '', duration: '', instructions: '',
});

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
  return [blankLine()];
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
  kind,
  encounters,
  initialEncounterId,
  returnTo,
  initial,
  onSaved,
  onCancel,
}: {
  patientId: string;
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
  useBeforeUnloadGuard(dirty && !saving);

  const errorFor = (field: string) => fieldErrors[field]?.[0] ?? null;
  const changed = () => {
    setDirty(true);
    setBanner(null);
  };

  function updateLine(index: number, field: keyof LineValues, value: string) {
    changed();
    setLines((current) => current.map((line, i) => (i === index ? { ...line, [field]: value } : line)));
    setFieldErrors((current) => {
      const next = { ...current };
      delete next[`lines.${index}.${field}`];
      return next;
    });
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
      setFieldErrors(errors);
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
        setFieldErrors(error.fieldErrors);
      } else {
        setBanner(error instanceof Error ? error.message : 'No se pudo guardar el documento. El texto se conserva.');
      }
      setSaving(false);
    }
  }

  return (
    <form className="document-form" onSubmit={submit} noValidate>
      <section className="card">
        <div className="field">
          <label htmlFor="document-title">Título</label>
          <input
            id="document-title"
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
              {lines.map((line, index) => (
                <fieldset className="document-line" key={index}>
                  <legend>Medicamento {index + 1}</legend>
                  <div className="document-line-fields">
                    <div className="field">
                      <label htmlFor={`medication-${index}`}>Medicamento <span className="required">*</span></label>
                      <input
                        id={`medication-${index}`}
                        value={line.medication}
                        maxLength={200}
                        onChange={(event) => updateLine(index, 'medication', event.target.value)}
                        aria-invalid={errorFor(`lines.${index}.medication`) ? 'true' : undefined}
                      />
                      {errorFor(`lines.${index}.medication`) ? <div className="field-error">{errorFor(`lines.${index}.medication`)}</div> : null}
                    </div>
                    {([
                      ['dose', 'Dosis', 'Ej. 500 mg'],
                      ['route', 'Vía', 'Ej. Oral'],
                      ['frequency', 'Frecuencia', 'Ej. Cada 8 h'],
                      ['duration', 'Duración', 'Ej. 5 días'],
                      ['instructions', 'Indicaciones', 'Ej. Tomar con alimentos'],
                    ] as const).map(([field, label, placeholder]) => (
                      <div className="field" key={field}>
                        <label htmlFor={`${field}-${index}`}>{label}</label>
                        <input
                          id={`${field}-${index}`}
                          value={line[field]}
                          placeholder={placeholder}
                          maxLength={field === 'instructions' ? 500 : field === 'frequency' ? 120 : field === 'route' ? 80 : 100}
                          onChange={(event) => updateLine(index, field, event.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                  {lines.length > 1 ? (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => { changed(); setLines((current) => current.filter((_, i) => i !== index)); }}
                    >
                      Quitar
                    </button>
                  ) : null}
                </fieldset>
              ))}
              {errorFor('lines') ? <div className="field-error">{errorFor('lines')}</div> : null}
              <button type="button" className="btn btn-ghost btn-sm" disabled={lines.length >= 50} onClick={() => { changed(); setLines((current) => [...current, blankLine()]); }}>
                Agregar medicamento
              </button>
            </div>

            <div className="field">
              <label htmlFor="document-body">Indicaciones generales</label>
              <textarea
                id="document-body"
                rows={4}
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
            <button type="button" className="btn btn-ghost" onClick={onCancel}>Cancelar edición</button>
          ) : (
            <Link href={returnTo ?? `/patients/${patientId}`} className="btn btn-ghost">Cancelar</Link>
          )}
        </div>
      </section>
    </form>
  );
}
