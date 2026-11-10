'use client';

import { useState } from 'react';
import { studyInputSchema, type StudyInput } from '@nexus-med/contracts';
import { Modal } from '../modal';
import { StudyFields } from './study-fields';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';

/** Collects a local order; the consultation's existing atomic save owns persistence. */
export function StagedStudyDialog({ patientName, initial, onConfirm, onCancel }: {
  patientName: string;
  initial?: StudyInput;
  onConfirm: (study: StudyInput) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<StudyInput>(initial ?? { category: 'laboratorio', name: '' });
  const [error, setError] = useState(false);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial ?? { category: 'laboratorio', name: '' });
  useBeforeUnloadGuard(dirty);
  function cancel() {
    if (!dirty || window.confirm('Hay un estudio sin guardar. ¿Descartar los cambios?')) onCancel();
  }
  return (
    <Modal title={`Solicitar estudio · ${patientName}`} onClose={cancel}
      description="La solicitud quedará asociada automáticamente a esta consulta y al paciente. Se guardará junto con la nota al pulsar Guardar consulta.">
      <form noValidate onSubmit={(event) => {
        event.preventDefault();
        const parsed = studyInputSchema.safeParse(value);
        if (!parsed.success) { setError(true); return; }
        onConfirm(parsed.data);
      }}>
        <StudyFields value={value} index={0} invalid={error} onChange={(next) => { setValue(next); setError(false); }} />
        {error ? <p className="field-error" role="alert">Indica un nombre de estudio de 2 a 200 caracteres.</p> : null}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary">Incluir solicitud</button>
          <button type="button" className="btn btn-ghost" onClick={cancel}>Cancelar</button>
        </div>
      </form>
    </Modal>
  );
}
