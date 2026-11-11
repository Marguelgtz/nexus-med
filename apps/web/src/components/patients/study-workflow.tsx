'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  type CreatePatientStudiesInput,
  type EncounterSummary,
  type StudyInput,
  type StudyRequest,
} from '@nexus-med/contracts';

import {
  createEncounterStudies,
  createPatientStudies,
  updateStudyStatus,
  ApiError,
} from '../../lib/api/client';
import { formatDateTime, STUDY_CATEGORY_LABELS } from '../../lib/format';
import { StudyStatusBadge } from '../appointments/badges';
import { Modal } from '../modal';
import { ErrorBanner } from '../primitives';
import { StudyFields } from './study-fields';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';
import { hasUnsavedStudyRequest } from '../../lib/study-draft';

type StudyDraft = StudyInput;

function normalizeRows(rows: readonly StudyDraft[]): StudyInput[] {
  return rows.map((row) => {
    const description = row.description?.trim();
    return {
      category: row.category,
      name: row.name.trim(),
      ...(description ? { description } : {}),
    };
  });
}

function StudyCreatePanel({
  patientId,
  encounters,
  encounterId,
  onSaved,
  onClose,
  dialogTitle,
}: {
  patientId: string;
  encounters: EncounterSummary[];
  encounterId?: string;
  onSaved?: () => void;
  onClose: () => void;
  dialogTitle?: string;
}) {
  const router = useRouter();
  const [selectedEncounterId, setSelectedEncounterId] = useState(encounterId ?? '');
  const [rows, setRows] = useState<StudyDraft[]>([{ category: 'laboratorio', name: '' }]);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = hasUnsavedStudyRequest(rows, selectedEncounterId, encounterId);
  useBeforeUnloadGuard(dirty && !saving);

  function cancel() {
    if (saving) return;
    if (dirty && !window.confirm('Hay una solicitud de estudios sin guardar. ¿Descartar los cambios?')) return;
    onClose();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setFieldError(null);
    const invalidIndex = rows.findIndex((row) => row.name.trim().length < 2);
    if (invalidIndex >= 0) {
      setFieldError(`Indica el estudio ${invalidIndex + 1} con al menos 2 caracteres.`);
      return;
    }

    setSaving(true);
    try {
      if (encounterId) {
        await createEncounterStudies(encounterId, { studies: normalizeRows(rows) });
      } else {
        const input: CreatePatientStudiesInput = {
          studies: normalizeRows(rows),
          ...(selectedEncounterId ? { encounterId: selectedEncounterId } : {}),
        };
        await createPatientStudies(patientId, input);
      }
      router.refresh();
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo guardar la solicitud. Los datos siguen en el formulario.');
      setSaving(false);
    }
  }

  const form = (
    <form className="study-create-panel" onSubmit={submit} noValidate aria-busy={saving}>
      {encounterId ? (
        <p className="field-hint">La solicitud quedará asociada a esta consulta y al paciente actual.</p>
      ) : (
        <div className="field">
          <label htmlFor="study-encounter">Consulta relacionada (opcional)</label>
          <select
            id="study-encounter"
            value={selectedEncounterId}
            onChange={(event) => setSelectedEncounterId(event.target.value)}
          >
            <option value="">Sin consulta asociada</option>
            {encounters.map((encounter) => (
              <option key={encounter.id} value={encounter.id}>
                {formatDateTime(encounter.occurredAt)} — {encounter.reason || 'Sin motivo'}
              </option>
            ))}
          </select>
          <p className="field-hint">La relación se guarda al crear la solicitud y no se puede cambiar después.</p>
        </div>
      )}

      <div className="field">
        <span className="section-label">Estudios</span>
        <div className="study-form-rows">
          {rows.map((row, index) => (
            <StudyFields key={index} value={row} index={index}
              onChange={(value) => setRows((current) => current.map((item, rowIndex) => rowIndex === index ? value : item))}
              onRemove={rows.length > 1 ? () => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index)) : undefined}
            />
          ))}
        </div>
        {fieldError ? <div className="field-error" role="alert">{fieldError}</div> : null}
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setRows((current) => [...current, { category: 'laboratorio', name: '' }])}
        >
          Agregar otro estudio
        </button>
      </div>

      {error ? <ErrorBanner message={error} /> : null}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? 'Guardando…' : 'Guardar solicitud'}
        </button>
        <button type="button" className="btn btn-ghost" onClick={cancel} disabled={saving}>
          Cancelar
        </button>
      </div>
    </form>
  );
  return dialogTitle ? <Modal title={dialogTitle} onClose={cancel} closeDisabled={saving}>{form}</Modal> : form;
}

export function EncounterStudyRequestForm({
  patientId,
  encounterId,
  encounters,
  patientName,
  onSaved,
  onClose,
}: {
  patientId: string;
  encounterId: string;
  patientName: string;
  encounters: EncounterSummary[];
  onSaved?: () => void;
  onClose: () => void;
}) {
  return (
    <StudyCreatePanel
      patientId={patientId}
      dialogTitle={`Solicitar estudio · ${patientName}`}
      encounterId={encounterId}
      encounters={encounters}
      onSaved={onSaved}
      onClose={onClose}
    />
  );
}

function StudyReviewActions({ study }: { study: StudyRequest }) {
  const router = useRouter();
  const [target, setTarget] = useState<'completed' | 'reviewed' | null>(null);
  const [note, setNote] = useState(study.resultNote ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const nextStatuses = study.status === 'ordered'
    ? ['completed', 'reviewed'] as const
    : study.status === 'completed'
      ? ['reviewed'] as const
      : [];

  async function save() {
    if (!target) return;
    setSaving(true);
    setError(null);
    try {
      await updateStudyStatus(study.id, {
        status: target,
        ...(note.trim() ? { resultNote: note.trim() } : {}),
      });
      setTarget(null);
      setSaving(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el estudio.');
      setSaving(false);
    }
  }

  return (
    <div className="study-review-actions">
      {nextStatuses.map((status) => (
        <button
          key={status}
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => { setTarget(status); setError(null); }}
        >
          {status === 'completed' ? 'Cambiar estado a Completada' : 'Marcar revisada'}
        </button>
      ))}
      {target ? (
        <div className="study-review-panel" aria-busy={saving}>
          <div className="field">
            <label htmlFor={`study-note-${study.id}`}>Nota del médico sobre el resultado (opcional)</label>
            <textarea
              id={`study-note-${study.id}`}
              rows={3}
              maxLength={1000}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Texto escrito por el médico; sin interpretación automática"
            />
          </div>
          {error ? <ErrorBanner message={error} /> : null}
          <div className="form-actions">
            <button type="button" className="btn btn-primary" onClick={() => void save()} disabled={saving}>
              {saving ? 'Guardando…' : 'Guardar cambio de estado'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setTarget(null)} disabled={saving}>
              Cancelar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StudyItem({ study, patientId }: { study: StudyRequest; patientId: string }) {
  return (
    <li className="patient-study-item" id={`study-${study.id}`}>
      <div className="patient-study-head">
        <div>
          <div className="study-item-title">
            <span className="study-category-label">{STUDY_CATEGORY_LABELS[study.category]}</span>
            <strong><Link href={`/patients/${patientId}/estudios/${encodeURIComponent(study.id)}`}>{study.name}</Link></strong>
            {study.description ? <p className="study-description">{study.description}</p> : null}
          </div>
          <p className="field-hint">Registrada {formatDateTime(study.createdAt)}</p>
          <p className="field-hint">
            {study.encounter ? (
              <>
                Consulta relacionada:{' '}
                <Link href={`/patients/${patientId}/consultas/${study.encounter.id}`}>
                  {formatDateTime(study.encounter.occurredAt)} — {study.encounter.reason || 'Ver consulta'}
                </Link>
              </>
            ) : 'Sin consulta asociada'}
          </p>
        </div>
        <StudyStatusBadge status={study.status} />
      </div>
      {study.resultNote ? (
        <blockquote className="study-result-note">
          <strong>Nota del médico:</strong> {study.resultNote}
        </blockquote>
      ) : null}
      <StudyReviewActions study={study} />
    </li>
  );
}

export function PatientStudyWorkflow({
  patientId,
  studies,
  encounters,
  initiallyCreating = false,
}: {
  patientId: string;
  studies: StudyRequest[];
  encounters: EncounterSummary[];
  initiallyCreating?: boolean;
}) {
  const [showCreate, setShowCreate] = useState(initiallyCreating);
  return (
    <section className="card" id="patient-studies" aria-labelledby="patient-studies-title">
      <div className="card-header">
        <h2 id="patient-studies-title">Estudios del paciente</h2>
        {!showCreate ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate(true)}>
            Solicitar estudio
          </button>
        ) : null}
      </div>
      <p className="study-status-caveat">
        “Completada” no confirma que el estudio se realizó ni cuándo se recibió un resultado.
      </p>
      {showCreate ? <p className="study-request-active" role="status">Solicitud sin guardar</p> : null}
      {showCreate ? (
        <StudyCreatePanel patientId={patientId} encounters={encounters} onClose={() => setShowCreate(false)} />
      ) : null}
      {studies.length === 0 ? (
        <p className="faint">Aún no hay estudios registrados.</p>
      ) : (
        <ul className="patient-study-list">
          {studies.map((study) => <StudyItem key={study.id} study={study} patientId={patientId} />)}
        </ul>
      )}
    </section>
  );
}

export function EncounterStudyWorkflow({
  patientId,
  studies,
}: {
  patientId: string;
  studies: StudyRequest[];
}) {
  return (
    <section className="card" aria-labelledby="encounter-studies-title">
      <div className="card-header">
        <h2 id="encounter-studies-title">Estudios de esta consulta</h2>
      </div>
      <p className="study-status-caveat">
        “Completada” no confirma que el estudio se realizó ni cuándo se recibió un resultado.
      </p>
      {studies.length === 0 ? (
        <p className="faint">Esta consulta no tiene estudios registrados.</p>
      ) : (
        <ul className="patient-study-list">
          {studies.map((study) => (
            <StudyItem key={study.id} study={study} patientId={patientId} />
          ))}
        </ul>
      )}
    </section>
  );
}
