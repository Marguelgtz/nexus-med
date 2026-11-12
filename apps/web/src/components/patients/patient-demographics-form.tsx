'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createPatientInputSchema, updatePatientInputSchema, type AdministrativePatient } from '@nexus-med/contracts';
import { ApiError, createAdministrativePatient, createPatient, updatePatient, updateAdministrativePatient } from '../../lib/api/client';
import { practiceToday } from '../../lib/format';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';
import { Modal } from '../modal';

export type DemographicValues = Pick<AdministrativePatient, 'fullName' | 'dateOfBirth' | 'phone' | 'email' | 'externalIdentifier' | 'appointmentEmailConsent'>;
type SavedPatient = { id: string; fullName: string };
export type DemographicsProps = {
  patientId?: string;
  initial?: DemographicValues;
  prefillName?: string;
  existingPatients?: SavedPatient[];
  administrative?: boolean;
  onSaved?: (patient: SavedPatient) => void;
  onOpenExisting?: (patient: SavedPatient) => void;
  onCancel?: () => void;
  dialogTitle?: string;
};
const FIELDS = [
  { key: 'fullName', label: 'Nombre completo', type: 'text', required: true, placeholder: 'Ej. Ana López' },
  { key: 'dateOfBirth', label: 'Fecha de nacimiento', type: 'date' },
  { key: 'phone', label: 'Teléfono', type: 'tel', placeholder: 'Ej. 55 1234 5678' },
  { key: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'Ej. nombre@correo.com' },
  { key: 'externalIdentifier', label: 'Identificador externo', type: 'text', placeholder: 'Ej. NX-001' },
] as const;

/** Shared by registration, demographic edits, and administrative dialogs. */
export function PatientDemographicsForm({ patientId, initial, prefillName, existingPatients = [], administrative, onSaved, onOpenExisting, onCancel, dialogTitle }: DemographicsProps) {
  const router = useRouter();
  const pristine = { fullName: initial?.fullName ?? prefillName ?? '', dateOfBirth: initial?.dateOfBirth ?? '', phone: initial?.phone ?? '', email: initial?.email ?? '', externalIdentifier: initial?.externalIdentifier ?? '', appointmentEmailConsent: initial?.appointmentEmailConsent ?? false };
  const [values, setValues] = useState(pristine);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const dirty = FIELDS.some(({ key }) => values[key] !== pristine[key]) || values.appointmentEmailConsent !== pristine.appointmentEmailConsent;
  useBeforeUnloadGuard(dirty && !saving);
  const duplicate = !patientId && existingPatients.find(p => p.fullName.trim().toLocaleLowerCase() === values.fullName.trim().toLocaleLowerCase());
  function close() {
    if (saving || (dirty && !window.confirm('Hay datos sin guardar. ¿Descartar los cambios?'))) return;
    onCancel?.();
  }
  function openDuplicate() {
    if (!duplicate || (dirty && !window.confirm('Al abrir este registro se descartarán los datos sin guardar. ¿Continuar?'))) return;
    if (onOpenExisting) {
      onOpenExisting(duplicate);
      return;
    }
    router.push(administrative ? '/secretaria?seccion=pacientes' : `/patients/${duplicate.id}`);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const candidate = { fullName: values.fullName.trim(), dateOfBirth: values.dateOfBirth || null,
      appointmentEmailConsent: values.appointmentEmailConsent,
      ...(patientId ? { phone: values.phone.trim() || null, email: values.email.trim() || null, externalIdentifier: values.externalIdentifier.trim() || null }
        : { ...(values.phone.trim() ? { phone: values.phone.trim() } : {}), ...(values.email.trim() ? { email: values.email.trim() } : {}), ...(values.externalIdentifier.trim() ? { externalIdentifier: values.externalIdentifier.trim() } : {}) }) };
    const parsed = (patientId ? updatePatientInputSchema : createPatientInputSchema).safeParse(candidate);
    const nextErrors: Record<string, string[]> = {};
    if (!parsed.success) for (const issue of parsed.error.issues) (nextErrors[String(issue.path[0])] ??= []).push(issue.message);
    if (values.dateOfBirth > practiceToday()) nextErrors.dateOfBirth = ['La fecha de nacimiento no puede ser futura'];
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      event.currentTarget.querySelector<HTMLInputElement>(`[name="${Object.keys(nextErrors)[0]}"]`)?.focus();
      return;
    }
    setSaving(true);
    try {
      const saved = patientId
        ? await (administrative ? updateAdministrativePatient : updatePatient)(patientId, updatePatientInputSchema.parse(candidate))
        : await (administrative ? createAdministrativePatient : createPatient)(createPatientInputSchema.parse(candidate));
      if (onSaved) onSaved(saved); else router.push(`/patients/${saved.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError) setErrors(err.fieldErrors);
      setError(err instanceof Error ? err.message : 'No se pudo guardar. Tus datos siguen en el formulario.');
      setSaving(false);
    }
  }
  const form = <form className={dialogTitle ? 'dialog-form' : undefined} onSubmit={submit} noValidate aria-busy={saving}>
    <div className={dialogTitle ? 'demographics-fields' : 'card'}>
      {FIELDS.map(field => <div className="field" key={field.key}>
        <label htmlFor={`demographic-${field.key}`}>{field.label}{'required' in field ? ' *' : ''}</label>
        <input id={`demographic-${field.key}`} name={field.key} type={field.type} value={values[field.key]} disabled={saving}
          placeholder={'placeholder' in field ? field.placeholder : undefined}
          aria-invalid={errors[field.key]?.length ? true : undefined} aria-describedby={errors[field.key]?.length ? `${field.key}-error` : undefined}
          onChange={e => { setValues(v => ({ ...v, [field.key]: e.target.value,
            ...(field.key === 'email' && e.target.value.trim().toLowerCase() !== pristine.email.trim().toLowerCase() ? { appointmentEmailConsent: false } : {}),
          })); setErrors(v => ({ ...v, [field.key]: [] })); }} />
        {errors[field.key]?.length ? <p className="field-error" id={`${field.key}-error`}>{errors[field.key]?.[0]}</p> : null}
      </div>)}
      <div className="field field-checkbox">
        <label htmlFor="appointment-email-consent">
          <input id="appointment-email-consent" type="checkbox" checked={values.appointmentEmailConsent}
            disabled={saving || !values.email.trim()}
            onChange={event => setValues(value => ({ ...value, appointmentEmailConsent: event.target.checked }))} />
          Acepta recibir por correo confirmaciones, cambios y cancelaciones de citas
        </label>
        <p className="faint">El correo solo incluye información de coordinación; no contiene notas ni datos clínicos. Si cambias el correo, confirma el permiso de nuevo.</p>
      </div>
    </div>
    {duplicate ? <div className="notice" aria-live="polite"><p>Ya existe un paciente con este nombre: {duplicate.fullName}. Revisa antes de crear otro registro.</p>
      <button className="btn btn-secondary btn-sm" type="button" onClick={openDuplicate}>Abrir registro existente</button>
    </div> : null}
    {error ? <p role="alert" className="error">{error}</p> : null}
    <div className="btn-row"><button className="btn btn-primary" disabled={saving}>{saving ? 'Guardando…' : patientId ? 'Guardar cambios' : 'Guardar paciente'}</button>
      {onCancel ? <button className="btn btn-ghost" type="button" disabled={saving} onClick={close}>Cancelar</button>
        : <Link className="btn btn-ghost" href={patientId ? `/patients/${patientId}` : '/patients'}>Cancelar</Link>}
    </div>
  </form>;
  return dialogTitle ? <Modal title={dialogTitle} description={initial?.fullName} closeDisabled={saving} onClose={close}>{form}</Modal> : form;
}
