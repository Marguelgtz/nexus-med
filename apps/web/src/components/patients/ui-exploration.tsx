'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

import { Icon } from '../icon';
import { formatAge, formatDate } from '../../lib/format';
import { confirmInAppNavigation } from '../../lib/use-before-unload-guard';
import { PreviewRegistration, type PreviewPatient } from './preview-registration';
import { UIPreviewVersions } from './ui-preview-versions';
import styles from './ui-exploration.module.css';

type Filter = 'active' | 'archived' | 'all';
const filters: { value: Filter; label: string }[] = [
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
  { value: 'all', label: 'Todos' },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');
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
      <div className={styles.practiceLabel}>Consultorio<span>Cirugía general</span></div>
      <nav className={styles.navigation} aria-label="Navegación de la muestra">
        <button type="button" className={styles.navActive} aria-current="page" onClick={() => { if (screen === 'registration') leaveRegistration(); }}><Icon name="users" />Pacientes<span className={styles.navCount}>{patients.length}</span></button>
        <Link href="/recepcion"><Icon name="activity" />Recepción<small>↗</small></Link>
        <Link href="/calendar"><Icon name="calendar" />Calendario<small>↗</small></Link>
        <Link href="/estudios"><Icon name="document" />Estudios<small>↗</small></Link>
      </nav>

      <div className={styles.sidebarBottom}><span className={styles.accountAvatar}>CG</span><div>Vista médica<span>Muestra de diseño</span></div><span aria-hidden="true">· · ·</span></div>
    </aside>

    <div className={styles.workspace}>
      <header className={styles.utilityBar}><span>Espacio clínico <span aria-hidden="true">/</span> <strong>Pacientes</strong></span><UIPreviewVersions current={1} /></header>
      <main id="exploration-content" className={styles.main} tabIndex={-1}>
        <div className={styles.previewLabel}><span className={styles.previewDot} />Muestra de interfaz<span>Vista de prueba · los cambios no se guardan</span></div>
        {screen === 'directory' ? <>
          <div className={styles.pageHeading}><div><p className={styles.kicker}>Directorio del consultorio</p><h1 ref={headingRef} tabIndex={-1}>Pacientes</h1><p>Busca un paciente o registra uno nuevo.</p></div><button ref={newButtonRef} type="button" className={styles.primaryButton} onClick={() => { setNotice(''); setSelected(null); setScreen('registration'); }}><Icon name="plus" />Nuevo paciente</button></div>
          {notice ? <div className={styles.successNotice} role="status"><Icon name="users" /><span>{notice}</span><button type="button" className={styles.textButton} onClick={() => setNotice('')} aria-label="Cerrar confirmación">×</button></div> : null}
          <div className={styles.directory}>
            <div className={styles.directoryToolbar}><div className={styles.filters} role="group" aria-label="Estado del paciente">{filters.map(item => <button type="button" key={item.value} aria-pressed={filter === item.value} className={filter === item.value ? styles.filterActive : undefined} onClick={() => { setFilter(item.value); setSelected(null); }}>{item.label}{item.value === 'active' ? <span>{patients.filter(patient => !patient.isArchived).length}</span> : null}</button>)}</div><label className={styles.search}><Icon name="search" /><span className={styles.searchLabel}>Buscar pacientes</span><input type="search" placeholder="Nombre o identificador" value={query} onChange={event => { setQuery(event.target.value); setSelected(null); }} /></label></div>
            <div className={styles.directoryContent}>
              <div className={styles.tableArea}>
                <table className={styles.patientTable}><caption className={styles.srOnly}>Directorio de pacientes de prueba</caption><thead><tr><th scope="col">Paciente</th><th scope="col">Edad</th><th scope="col">Identificador</th><th scope="col"><span className={styles.srOnly}>Acciones</span></th></tr></thead><tbody>{shown.map((patient, index) => <tr key={patient.id} className={selected?.id === patient.id ? styles.selectedRow : undefined}><td><div className={styles.patientIdentity}><span className={`${styles.avatar} ${index % 3 === 1 ? styles.avatarWarm : index % 3 === 2 ? styles.avatarSage : ''}`} aria-hidden="true">{initials(patient.fullName)}</span><div><button type="button" className={styles.patientName} aria-expanded={selected?.id === patient.id} aria-controls="preview-patient-detail" onClick={event => { lastPatientButton.current = event.currentTarget; setSelected(patient); }}>{patient.fullName}</button><span className={styles.patientSubline}>{patient.isArchived ? 'Registro archivado' : 'Registro activo'}</span></div></div></td><td data-label="Edad">{formatAge(patient.dateOfBirth) ? `${formatAge(patient.dateOfBirth)} años` : 'Sin registrar'}</td><td data-label="Identificador" className={styles.identifier}>{patient.externalIdentifier ?? 'Sin registrar'}</td><td className={styles.rowAction}><button type="button" aria-label={`Ver datos de ${patient.fullName}`} aria-controls="preview-patient-detail" onClick={event => { lastPatientButton.current = event.currentTarget; setSelected(patient); }}>Ver datos <Icon name="arrow" /></button></td></tr>)}</tbody></table>
                {shown.length === 0 ? <div className={styles.emptyState}><Icon name="search" /><h2>No encontramos pacientes.</h2><p>Prueba otro nombre o identificador, o cambia el filtro.</p><button type="button" className={styles.secondaryButton} onClick={() => { setQuery(''); setFilter('active'); }}>Restablecer búsqueda</button></div> : null}
              </div>
              {selected ? <aside id="preview-patient-detail" className={styles.patientDetail} aria-labelledby="detail-title" onKeyDown={event => { if (event.key === 'Escape') closeDetail(); }}><div className={styles.detailTop}><span className={styles.kicker}>Datos del paciente</span><button type="button" className={styles.closeButton} onClick={closeDetail} aria-label="Cerrar vista rápida">×</button></div><span className={`${styles.avatar} ${styles.largeAvatar}`} aria-hidden="true">{initials(selected.fullName)}</span><h2 id="detail-title" ref={detailRef} tabIndex={-1}>{selected.fullName}</h2><p>{selected.externalIdentifier ?? 'Sin identificador'} · {selected.isArchived ? 'Archivado' : 'Activo'}</p><dl><div><dt>Fecha de nacimiento</dt><dd>{formatDate(selected.dateOfBirth)}</dd></div><div><dt>Teléfono</dt><dd>{selected.phone ?? 'Sin registrar'}</dd></div><div><dt>Correo electrónico</dt><dd>{selected.email ?? 'Sin registrar'}</dd></div></dl><p className={styles.detailNote}>Vista de identificación y contacto. El expediente clínico conserva su flujo actual.</p><button type="button" className={styles.secondaryButton} onClick={closeDetail}>Volver al directorio</button></aside> : null}
            </div>
            <div className={styles.tableFooter}><span role="status">{shown.length} {shown.length === 1 ? 'paciente' : 'pacientes'} en esta vista</span><span>Orden alfabético <span aria-hidden="true">↓</span></span></div>
          </div>

        </> : <>
          <button type="button" className={styles.backButton} onClick={leaveRegistration}><span aria-hidden="true">←</span>Volver a pacientes</button>
          <div className={styles.pageHeading}><div><p className={styles.kicker}>Registro de paciente</p><h1 ref={headingRef} tabIndex={-1}>Nuevo paciente</h1><p>Identificación y contacto. Solo el nombre es obligatorio.</p></div><span className={styles.formBadge}>Registro en página</span></div>
          <PreviewRegistration classNames={styles} patients={patients} prefill={shown.length === 0 ? query.trim() : ''} onCancel={leaveRegistration} onComplete={patient => {
            setPatients(current => [...current, patient]); setQuery(''); setFilter('active'); setScreen('directory');
            setNotice('Registro de prueba completado. Solo aparece en esta muestra y desaparece al recargar.');
          }} />
        </>}
      </main>
      <footer className={styles.workspaceFooter}><span>Nexus Med · Exploración de interfaz</span><span>Diseñada para una lectura cómoda</span></footer>
    </div>
  </div>;
}
