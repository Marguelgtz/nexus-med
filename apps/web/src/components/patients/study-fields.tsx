'use client';

import { type StudyInput, studyCategorySchema } from '@nexus-med/contracts';
import { STUDY_CATEGORY_LABELS } from '../../lib/format';

/** Shared entry row; persistence, draft state and validation stay with the owning form. */
export function StudyFields({ value, index, onChange, onRemove, invalid }: {
  value: StudyInput;
  index: number;
  onChange: (value: StudyInput) => void;
  onRemove?: () => void;
  invalid?: boolean;
}) {
  return (
    <div className="study-form-row">
      <label className="study-field">
        <span>Categoría del estudio {index + 1}</span>
        <select value={value.category} onChange={(event) => onChange({ ...value, category: studyCategorySchema.parse(event.target.value) })}>
          {studyCategorySchema.options.map((category) => (
            <option key={category} value={category}>{STUDY_CATEGORY_LABELS[category]}</option>
          ))}
        </select>
      </label>
      <label className="study-field">
        <span>Descripción del estudio {index + 1}</span>
        <input value={value.description} maxLength={200} placeholder="Ej. Biometría hemática"
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange({ ...value, description: event.target.value })} />
      </label>
      {onRemove ? <button type="button" className="btn btn-ghost btn-sm" aria-label={`Quitar estudio ${index + 1}`} onClick={onRemove}>Quitar</button> : null}
    </div>
  );
}
