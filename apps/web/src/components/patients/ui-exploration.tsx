'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { createPatientInputSchema, type PatientSummary } from '@nexus-med/contracts';

import { Icon } from '../icon';
import { formatAge, formatDate, practiceToday } from '../../lib/format';
import { useBeforeUnloadGuard, confirmInAppNavigation } from '../../lib/use-before-unload-guard';
import styles from './ui-exploration.module.css';

type PreviewPatient = PatientSummary & { phone: string | null; email: string | null };
type Filter = 'active' | 'archived' | 'all';
const filters: { value: Filter; label: string }[] = [
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
  { value: 'all', label: 'Todos' },
];
const fields = [
  { key: 'fullName', label: 'Nombre completo', type: 'text', placeholder: 'Nombre y apellidos', autoComplete: 'name', required: true },
  { key: 'dateOfBirth', label: 'Fecha de nacimiento', type: 'date', autoComplete: 'bday' },
  { key: 'externalIdentifier', label: 'Identificador externo', type: 'text', placeholder: 'Ej. NM-008', autoComplete: 'off' },
  { key: 'phone', label: 'Teléfono', type: 'tel', placeholder: 'Ej. 55 1234 5678', autoComplete: 'tel' },
  { key: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'nombre@ejemplo.com', autoComplete: 'email' },
] as const;
type FieldName = (typeof fields)[number]['key'];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');
}

function Registration({ patients, prefill, onCancel, onComplete }: {
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
        <div className={styles.sectionHeading}><span>01</span><div><h2 id="identity-heading">Primero, lo esencial.</h2><p>Los datos que identifican al paciente.</p></div></div>
        <div className={styles.formFields}>{fields.slice(0, 3).map(renderField)}</div>
      </section>
      <section className={styles.formSection} aria-labelledby="contact-heading">
        <div className={styles.sectionHeading}><span>02</span><div><h2 id="contact-heading">Cómo contactarle.</h2><p>Puedes completar esta información después.</p></div></div>
        <div className={styles.formFields}>{fields.slice(3).map(renderField)}</div>
      </section>
      {duplicate ? <p className={styles.duplicate} role="status">Ya hay un registro con este nombre: <strong>{duplicate.fullName}</strong>. Revisa el directorio antes de crear otro.</p> : null}
      <div className={styles.formFooter}>
        <div><strong>Todo en su lugar.</strong><span>Solo el nombre es obligatorio.</span></div>
        <div className={styles.footerActions}><button className={styles.textButton} type="button" onClick={onCancel}>Cancelar</button><button className={styles.primaryButton}>Completar prueba <Icon name="arrow" /></button></div>
      </div>
    </form>
    <aside className={styles.registrationAside}>
      <span className={styles.kicker}>ALTA DE PACIENTE</span>
      <h2>Un comienzo<br />más sencillo.</h2>
      <p>Identificación y contacto, en un solo espacio. Los antecedentes se completan en el expediente.</p>
      <div className={styles.paperIllustration} aria-hidden="true"><span>n.</span><i /><i /><i /><div>Un paciente.<br />Una historia.</div></div>
      <p className={styles.asideFootnote}>Esta prueba no guarda información ni envía correos. Usa únicamente datos ficticios.</p>
    </aside>
  </div>;
}

export function PatientUIExploration({ initialPatients }: { initialPatients: PreviewPatient[] }) {
  const [patients, setPatients] = useState(initialPatients);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [screen, setScreen] = useState<'directory' | 'registration'>('directory');
  const [selected, setSelected] = useState<PreviewPatient | null>(null);
  const [notice, setNotice] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const detailRef = useRef<HTMLHeadingElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const lastPatientButton = useRef<HTMLButtonElement | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    headingRef.current?.focus();
  }, [screen]);

  useEffect(() => { if (selected) detailRef.current?.focus(); }, [selected]);

  const normalized = query.trim().toLocaleLowerCase('es-MX');
  const shown = patients.filter(patient =>
    (filter === 'all' || patient.isArchived === (filter === 'archived')) &&
    `${patient.fullName} ${patient.externalIdentifier ?? ''}`.toLocaleLowerCase('es-MX').includes(normalized),
  ).sort((a, b) => a.fullName.localeCompare(b.fullName, 'es-MX'));

  function leaveRegistration() {
    if (!confirmInAppNavigation()) return;
    setScreen('directory');
    requestAnimationFrame(() => newButtonRef.current?.focus());
  }

  function closeDetail() {
    setSelected(null);
    lastPatientButton.current?.focus();
  }

  return <div className={styles.exploration}>
    <a className={styles.skipLink} href="#exploration-content">Ir al contenido</a>
    <aside className={styles.sidebar} aria-label="Espacio de trabajo de muestra">
      <div className={styles.brand}><span className={styles.brandMark} aria-hidden="true">n<span>+</span></span><span>nexus<span className={styles.brandSuffix}>med</span></span></div>
      <div className={styles.practiceLabel}>CONSULTORIO<span>Cirugía general</span></div>
      <nav className={styles.navigation} aria-label="Navegación de la muestra">
        <button type="button" className={styles.navActive} aria-current="page" onClick={() => { if (screen === 'registration') leaveRegistration(); }}><Icon name="users" />Pacientes<span className={styles.navCount}>{patients.length}</span></button>
        <Link href="/recepcion"><Icon name="activity" />Recepción<small>↗</small></Link>
        <Link href="/calendar"><Icon name="calendar" />Calendario<small>↗</small></Link>
        <Link href="/estudios"><Icon name="document" />Estudios<small>↗</small></Link>
      </nav>
      <div className={styles.sidebarNote}><span className={styles.smallCross} aria-hidden="true">+</span><p>Más espacio para<br /><strong>lo que importa.</strong></p><span>La atención, con continuidad.</span></div>
      <div className={styles.sidebarBottom}><span className={styles.accountAvatar}>CG</span><div>Vista médica<span>Muestra de diseño</span></div><span aria-hidden="true">· · ·</span></div>
    </aside>

    <div className={styles.workspace}>
      <header className={styles.utilityBar}><span>Espacio clínico <span aria-hidden="true">/</span> <strong>Pacientes</strong></span><Link href="/patients">Comparar con la interfaz actual <span aria-hidden="true">↗</span></Link></header>
      <main id="exploration-content" className={styles.main} tabIndex={-1}>
        <div className={styles.previewLabel}><span className={styles.previewDot} />EXPLORACIÓN 01<span>Vista de prueba · los cambios no se guardan</span></div>
        {screen === 'directory' ? <>
          <div className={styles.pageHeading}><div><p className={styles.kicker}>CADA PERSONA, SU HISTORIA</p><h1 ref={headingRef} tabIndex={-1}>Pacientes<span>.</span></h1><p>Un espacio para conocer, encontrar y dar continuidad.</p></div><button ref={newButtonRef} type="button" className={styles.primaryButton} onClick={() => { setNotice(''); setSelected(null); setScreen('registration'); }}><Icon name="plus" />Nuevo paciente</button></div>
          {notice ? <div className={styles.successNotice} role="status"><Icon name="users" /><span>{notice}</span><button type="button" className={styles.textButton} onClick={() => setNotice('')} aria-label="Cerrar confirmación">×</button></div> : null}
          <div className={styles.directory}>
            <div className={styles.directoryToolbar}><div className={styles.filters} role="group" aria-label="Estado del paciente">{filters.map(item => <button type="button" key={item.value} aria-pressed={filter === item.value} className={filter === item.value ? styles.filterActive : undefined} onClick={() => { setFilter(item.value); setSelected(null); }}>{item.label}{item.value === 'active' ? <span>{patients.filter(patient => !patient.isArchived).length}</span> : null}</button>)}</div><label className={styles.search}><Icon name="search" /><span className={styles.srOnly}>Buscar pacientes</span><input type="search" placeholder="Nombre o identificador" value={query} onChange={event => { setQuery(event.target.value); setSelected(null); }} /></label></div>
            <div className={styles.directoryContent}>
              <div className={styles.tableArea}>
                <table className={styles.patientTable}><caption className={styles.srOnly}>Directorio de pacientes de prueba</caption><thead><tr><th scope="col">PACIENTE</th><th scope="col">EDAD</th><th scope="col">IDENTIFICADOR</th><th scope="col"><span className={styles.srOnly}>Acciones</span></th></tr></thead><tbody>{shown.map((patient, index) => <tr key={patient.id} className={selected?.id === patient.id ? styles.selectedRow : undefined}><td><div className={styles.patientIdentity}><span className={`${styles.avatar} ${index % 3 === 1 ? styles.avatarWarm : index % 3 === 2 ? styles.avatarSage : ''}`} aria-hidden="true">{initials(patient.fullName)}</span><div><button type="button" className={styles.patientName} aria-expanded={selected?.id === patient.id} aria-controls="preview-patient-detail" onClick={event => { lastPatientButton.current = event.currentTarget; setSelected(patient); }}>{patient.fullName}</button><span className={styles.patientSubline}>{patient.isArchived ? 'Registro archivado' : 'Registro activo'}</span></div></div></td><td data-label="Edad">{formatAge(patient.dateOfBirth) ? `${formatAge(patient.dateOfBirth)} años` : 'Sin registrar'}</td><td data-label="Identificador" className={styles.identifier}>{patient.externalIdentifier ?? 'Sin registrar'}</td><td className={styles.rowAction}><button type="button" aria-label={`Ver datos de ${patient.fullName}`} aria-controls="preview-patient-detail" onClick={event => { lastPatientButton.current = event.currentTarget; setSelected(patient); }}><Icon name="arrow" /></button></td></tr>)}</tbody></table>
                {shown.length === 0 ? <div className={styles.emptyState}><Icon name="search" /><h2>No encontramos pacientes.</h2><p>Prueba otro nombre o identificador, o cambia el filtro.</p><button type="button" className={styles.secondaryButton} onClick={() => { setQuery(''); setFilter('active'); }}>Restablecer búsqueda</button></div> : null}
              </div>
              {selected ? <aside id="preview-patient-detail" className={styles.patientDetail} aria-labelledby="detail-title" onKeyDown={event => { if (event.key === 'Escape') closeDetail(); }}><div className={styles.detailTop}><span className={styles.kicker}>VISTA RÁPIDA</span><button type="button" className={styles.closeButton} onClick={closeDetail} aria-label="Cerrar vista rápida">×</button></div><span className={`${styles.avatar} ${styles.largeAvatar}`} aria-hidden="true">{initials(selected.fullName)}</span><h2 id="detail-title" ref={detailRef} tabIndex={-1}>{selected.fullName}</h2><p>{selected.externalIdentifier ?? 'Sin identificador'} · {selected.isArchived ? 'Archivado' : 'Activo'}</p><dl><div><dt>Fecha de nacimiento</dt><dd>{formatDate(selected.dateOfBirth)}</dd></div><div><dt>Teléfono</dt><dd>{selected.phone ?? 'Sin registrar'}</dd></div><div><dt>Correo electrónico</dt><dd>{selected.email ?? 'Sin registrar'}</dd></div></dl><p className={styles.detailNote}>Vista de identificación y contacto. El expediente clínico conserva su flujo actual.</p><button type="button" className={styles.secondaryButton} onClick={closeDetail}>Volver al directorio</button></aside> : null}
            </div>
            <div className={styles.tableFooter}><span role="status">{shown.length} {shown.length === 1 ? 'paciente' : 'pacientes'} en esta vista</span><span>Orden alfabético <span aria-hidden="true">↓</span></span></div>
          </div>
          <div className={styles.bottomNote}><span>EL CUIDADO ESTÁ EN LOS DETALLES.</span><p>Encuentra un paciente o inicia una nueva historia.</p><span className={styles.wordmark} aria-hidden="true">n.</span></div>
        </> : <>
          <button type="button" className={styles.backButton} onClick={leaveRegistration}><span aria-hidden="true">←</span>Volver a pacientes</button>
          <div className={styles.pageHeading}><div><p className={styles.kicker}>UNA NUEVA HISTORIA</p><h1 ref={headingRef} tabIndex={-1}>Nuevo paciente<span>.</span></h1><p>Empieza con lo esencial. Completa el resto cuando lo necesites.</p></div><span className={styles.formBadge}>Registro en página</span></div>
          <Registration patients={patients} prefill={shown.length === 0 ? query.trim() : ''} onCancel={leaveRegistration} onComplete={patient => {
            setPatients(current => [...current, patient]); setQuery(''); setFilter('active'); setScreen('directory');
            setNotice('Registro de prueba completado. Solo aparece en esta muestra y desaparece al recargar.');
          }} />
        </>}
      </main>
      <footer className={styles.workspaceFooter}><span>Nexus Med · Exploración de interfaz</span><span>Papel / Tinta / Terracota</span></footer>
    </div>
  </div>;
}
