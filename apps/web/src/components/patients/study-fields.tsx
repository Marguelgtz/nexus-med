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
  const isOther = value.category === 'otro';
  return (
    <div className={`study-form-row${isOther ? ' study-form-row-other' : ''}`}>
      <label className="study-field">
        <span>Categoría del estudio {index + 1}</span>
        <select value={value.category} onChange={(event) => {
          const category = studyCategorySchema.parse(event.target.value);
          const next = { ...value, category };
          if (category !== 'otro') delete next.description;
          onChange(next);
        }}>
          {studyCategorySchema.options.map((category) => (
            <option key={category} value={category}>{STUDY_CATEGORY_LABELS[category]}</option>
          ))}
        </select>
      </label>
      <label className="study-field">
        <span>Nombre del estudio {index + 1}</span>
        <input value={value.name} maxLength={200} placeholder="Ej. Biometría hemática"
          aria-invalid={invalid || undefined}
          onChange={(event) => onChange({ ...value, name: event.target.value })} />
      </label>
      {isOther ? (
        <label className="study-field">
          <span>Descripción adicional (opcional)</span>
          <input value={value.description ?? ''} maxLength={500} placeholder="Detalle útil para identificar el estudio"
            onChange={(event) => onChange({ ...value, description: event.target.value })} />
        </label>
      ) : null}
      {onRemove ? <button type="button" className="btn btn-ghost btn-sm" aria-label={`Quitar estudio ${index + 1}`} onClick={onRemove}>Quitar</button> : null}
    </div>
  );
}
