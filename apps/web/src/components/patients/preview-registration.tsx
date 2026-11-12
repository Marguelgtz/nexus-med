'use client';

import { useRef, useState, type FormEvent } from 'react';
import { createPatientInputSchema, type PatientSummary } from '@nexus-med/contracts';
import { Icon } from '../icon';
import { practiceToday } from '../../lib/format';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';

export type PreviewPatient = PatientSummary & { phone: string | null; email: string | null };

const fields = [
  { key: 'fullName', label: 'Nombre completo', type: 'text', placeholder: 'Nombre y apellidos', autoComplete: 'name', required: true },
  { key: 'dateOfBirth', label: 'Fecha de nacimiento', type: 'date', autoComplete: 'bday' },
  { key: 'externalIdentifier', label: 'Identificador externo', type: 'text', placeholder: 'Ej. NM-008', autoComplete: 'off' },
  { key: 'phone', label: 'Teléfono', type: 'tel', placeholder: 'Ej. 55 1234 5678', autoComplete: 'tel' },
  { key: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'nombre@ejemplo.com', autoComplete: 'email' },
] as const;
type FieldName = (typeof fields)[number]['key'];

export function PreviewRegistration({ patients, prefill, onCancel, onComplete, classNames: styles }: {
  classNames: Record<string, string>;
  patients: PreviewPatient[];
  prefill: string;
  onCancel: () => void;
  onComplete: (patient: PreviewPatient) => void;
}) {
  const [values, setValues] = useState({ fullName: prefill, dateOfBirth: '', externalIdentifier: '', phone: '', email: '' });
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const formRef = useRef<HTMLFormElement>(null);
  const dirty = values.fullName !== prefill || fields.some(field => field.key !== 'fullName' && Boolean(values[field.key]));
  useBeforeUnloadGuard(dirty);
  const duplicate = patients.find(patient => patient.fullName.trim().toLocaleLowerCase('es-MX') === values.fullName.trim().toLocaleLowerCase('es-MX'));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const candidate = {
      fullName: values.fullName.trim(),
      dateOfBirth: values.dateOfBirth || null,
      ...(values.externalIdentifier.trim() ? { externalIdentifier: values.externalIdentifier.trim() } : {}),
      ...(values.phone.trim() ? { phone: values.phone.trim() } : {}),
      ...(values.email.trim() ? { email: values.email.trim() } : {}),
    };
    const result = createPatientInputSchema.safeParse(candidate);
    const nextErrors: Partial<Record<FieldName, string>> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0] as FieldName;
        nextErrors[key] ??= key === 'email' ? 'Escribe un correo electrónico válido.' : issue.message;
      }
    }
    if (values.dateOfBirth > practiceToday()) nextErrors.dateOfBirth = 'La fecha de nacimiento no puede ser futura.';
    setErrors(nextErrors);
    const firstInvalid = fields.find(field => nextErrors[field.key]);
    if (firstInvalid) {
      formRef.current?.querySelector<HTMLInputElement>(`[name="${firstInvalid.key}"]`)?.focus();
      return;
    }
    if (!result.success) return;
    onComplete({
      id: `preview-${crypto.randomUUID()}`,
      fullName: result.data.fullName,
      dateOfBirth: result.data.dateOfBirth ?? null,
      externalIdentifier: result.data.externalIdentifier ?? null,
      phone: result.data.phone ?? null,
      email: result.data.email ?? null,
      isArchived: false,
    });
  }

  function renderField(field: (typeof fields)[number]) {
    return <div className={`${styles.field} ${field.key === 'fullName' || field.key === 'email' ? styles.wideField : ''}`} key={field.key}>
      <label htmlFor={`preview-${field.key}`}>{field.label}<span>{'required' in field ? 'Obligatorio' : 'Opcional'}</span></label>
      <input id={`preview-${field.key}`} name={field.key} type={field.type} autoComplete={field.autoComplete}
        required={'required' in field} value={values[field.key]}
        placeholder={'placeholder' in field ? field.placeholder : undefined}
        max={field.key === 'dateOfBirth' ? practiceToday() : undefined}
        aria-invalid={Boolean(errors[field.key])} aria-describedby={errors[field.key] ? `preview-error-${field.key}` : undefined}
        onChange={event => {
          setValues(current => ({ ...current, [field.key]: event.target.value }));
          setErrors(current => ({ ...current, [field.key]: undefined }));
        }} />
      {errors[field.key] ? <p className={styles.fieldError} id={`preview-error-${field.key}`} role="alert">{errors[field.key]}</p> : null}
    </div>;
  }

  return <div className={styles.registrationLayout}>
    <form ref={formRef} onSubmit={submit} noValidate className={styles.registrationForm}>
      <section className={styles.formSection} aria-labelledby="identity-heading">
        <div className={styles.sectionHeading}><span>01</span><div><h2 id="identity-heading">Datos del paciente</h2><p>Los datos que identifican al paciente.</p></div></div>
        <div className={styles.formFields}>{fields.slice(0, 3).map(renderField)}</div>
      </section>
      <section className={styles.formSection} aria-labelledby="contact-heading">
        <div className={styles.sectionHeading}><span>02</span><div><h2 id="contact-heading">Datos de contacto</h2><p>Puedes completar esta información después.</p></div></div>
        <div className={styles.formFields}>{fields.slice(3).map(renderField)}</div>
      </section>
      {duplicate ? <p className={styles.duplicate} role="status">Ya hay un registro con este nombre: <strong>{duplicate.fullName}</strong>. Revisa el directorio antes de crear otro.</p> : null}
      <div className={styles.formFooter}>
        <div><strong>Antes de continuar</strong><span>Solo el nombre es obligatorio.</span></div>
        <div className={styles.footerActions}><button className={styles.textButton} type="button" onClick={onCancel}>Cancelar</button><button className={styles.primaryButton}>Completar prueba <Icon name="arrow" /></button></div>
      </div>
    </form>
    <aside className={styles.registrationAside}>
      <span className={styles.kicker}>Registro de paciente</span>
      <h2>Qué necesitas registrar</h2>
      <p>El nombre es obligatorio. Si no tienes la fecha de nacimiento o los datos de contacto, puedes completarlos después.</p>

      <p className={styles.asideFootnote}>Esta prueba no guarda información ni envía correos. Usa únicamente datos ficticios.</p>
    </aside>
  </div>;
}
