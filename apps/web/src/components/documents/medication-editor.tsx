'use client';

import { useState } from 'react';
import { prescriptionLineInputSchema } from '@nexus-med/contracts';
import { Modal } from '../modal';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';

export type MedicationValues = {
  medication: string; dose: string; route: string; frequency: string; duration: string; instructions: string;
};
const blankMedication: MedicationValues = { medication: '', dose: '', route: '', frequency: '', duration: '', instructions: '' };
const FIELDS = [
  { key: 'medication', label: 'Medicamento', max: 200 },
  { key: 'dose', label: 'Dosis', max: 100 },
  { key: 'route', label: 'Vía', max: 80 },
  { key: 'frequency', label: 'Frecuencia', max: 120 },
  { key: 'duration', label: 'Duración', max: 100 },
] as const;

export function MedicationEditor({ patientName, initial, initialError, onConfirm, onCancel }: {
  patientName: string;
  initial?: MedicationValues;
  initialError?: string;
  onConfirm: (line: MedicationValues) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial ?? blankMedication);
  const [error, setError] = useState(initialError ?? null);
  const dirty = JSON.stringify(value) !== JSON.stringify(initial ?? blankMedication);
  useBeforeUnloadGuard(dirty);
  function cancel() {
    if (!dirty || window.confirm('Hay un medicamento sin guardar. ¿Descartar los cambios?')) onCancel();
  }
  return <Modal title={`${initial ? 'Editar' : 'Agregar'} medicamento · ${patientName}`} onClose={cancel}
    description="La pauta se incorporará a la receta. La receta se guarda al confirmar el formulario completo.">
    <form noValidate onSubmit={(event) => {
      event.preventDefault();
      const parsed = prescriptionLineInputSchema.safeParse(value);
      if (!parsed.success) { setError('Indica el medicamento y revisa los campos de la pauta.'); return; }
      onConfirm(value);
    }}>
      <div className="medication-editor-grid">
        {FIELDS.map(({ key, label, max }) => <div className={`field medication-field-${key}`} key={key}>
          <label htmlFor={`medication-editor-${key}`}>{label}{key === 'medication' ? <span className="required"> *</span> : null}</label>
          <input id={`medication-editor-${key}`} value={value[key]} maxLength={max}
            aria-invalid={key === 'medication' && error ? 'true' : undefined}
            onChange={(event) => { setValue((current) => ({ ...current, [key]: event.target.value })); setError(null); }} />
        </div>)}
      </div>
      {value.instructions ? <p className="notice-info">Indicaciones específicas registradas: {value.instructions}</p> : null}
      {error ? <p className="field-error" role="alert">{error}</p> : null}
      <div className="form-actions">
        <button type="submit" className="btn btn-primary">{initial ? 'Actualizar medicamento' : 'Incluir medicamento'}</button>
        <button type="button" className="btn btn-ghost" onClick={cancel}>Cancelar</button>
      </div>
    </form>
  </Modal>;
}
