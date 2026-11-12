'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Icon } from '../icon';
import { formatAge, formatDate } from '../../lib/format';
import { confirmInAppNavigation } from '../../lib/use-before-unload-guard';
import { PreviewRegistration, type PreviewPatient } from './preview-registration';
import { UIPreviewVersions } from './ui-preview-versions';
import styles from './ui-exploration-v2.module.css';

type Filter = 'active' | 'archived' | 'all';
const filters: { value: Filter; label: string }[] = [
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
  { value: 'all', label: 'Todos' },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('');
}

export function PatientUIExploration2({ initialPatients }: { initialPatients: PreviewPatient[] }) {
  const [patients, setPatients] = useState(initialPatients);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('active');
  const [screen, setScreen] = useState<'directory' | 'registration'>('directory');
  const [selected, setSelected] = useState<PreviewPatient | null>(() =>
    initialPatients.filter(patient => !patient.isArchived).sort((a, b) => a.fullName.localeCompare(b.fullName, 'es-MX'))[0] ?? null,
  );
  const [notice, setNotice] = useState('');
  const headingRef = useRef<HTMLHeadingElement>(null);
  const detailRef = useRef<HTMLHeadingElement>(null);
  const newButtonRef = useRef<HTMLButtonElement>(null);
  const lastPatientButton = useRef<HTMLButtonElement | null>(null);
  const initialScreen = useRef(true);

  useEffect(() => {
    if (initialScreen.current) { initialScreen.current = false; return; }
    headingRef.current?.focus();
  }, [screen]);

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
  function choosePatient(patient: PreviewPatient, trigger: HTMLButtonElement) {
    lastPatientButton.current = trigger;
    setSelected(patient);
    requestAnimationFrame(() => detailRef.current?.focus());
  }

  return (
    <div className={styles.exploration}>
      <a className={styles.skipLink} href="#v2-content">Ir al contenido</a>
      <aside className={styles.sidebar} aria-label="Espacio de trabajo de muestra">
        <div className={styles.brand}>
          <span className={styles.brandMark} aria-hidden="true"><Icon name="activity" /></span>
          <span>Nexus<span className={styles.brandSuffix}>Med</span></span>
        </div>
        <div className={styles.practice}>Consultorio<span>Cirugía general</span></div>
        <nav className={styles.navigation} aria-label="Navegación de la muestra">
          <Link href="/recepcion"><Icon name="activity" />Recepción</Link>
          <button type="button" aria-current="page" onClick={() => { if (screen === 'registration') leaveRegistration(); }}>
            <Icon name="users" />Pacientes<span>{patients.length}</span>
          </button>
          <Link href="/calendar"><Icon name="calendar" />Calendario</Link>
          <Link href="/estudios"><Icon name="document" />Estudios</Link>
        </nav>
        <div className={styles.sidebarBottom}>
          <span className={styles.profileAvatar} aria-hidden="true">CG</span>
          <div>Vista médica<span>Consultorio</span></div>
        </div>
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <span className={styles.breadcrumb}>Consultorio <span aria-hidden="true">/</span> <strong>Pacientes</strong></span>
          <UIPreviewVersions current={2} />
        </header>

        <main id="v2-content" className={styles.main} tabIndex={-1}>
          <div className={styles.previewNotice}><span>Propuesta 2</span> Muestra interactiva · los cambios no se guardan</div>
          {screen === 'directory' ? (
            <>
              <div className={styles.pageHeading}>
                <div><h1 ref={headingRef} tabIndex={-1}>Pacientes</h1><p>Encuentra a cada paciente. Consulta sus datos en un mismo espacio.</p></div>
                <button ref={newButtonRef} className={styles.primaryButton} type="button" onClick={() => { setNotice(''); setScreen('registration'); }}>
                  <Icon name="plus" />Nuevo paciente
                </button>
              </div>
              {notice ? <div className={styles.successNotice} role="status"><Icon name="users" /><p>{notice}</p><button type="button" className={styles.closeButton} onClick={() => setNotice('')} aria-label="Cerrar confirmación">×</button></div> : null}

              <div className={styles.workbench}>
                <section className={styles.directory} aria-label="Directorio de pacientes">
                  <label className={styles.search}>
                    <span>Buscar paciente</span>
                    <div><Icon name="search" /><input type="search" placeholder="Nombre o identificador" value={query} onChange={event => { setQuery(event.target.value); setSelected(null); }} /></div>
                  </label>
                  <div className={styles.listToolbar}>
                    <div className={styles.filters} role="group" aria-label="Estado del paciente">
                      {filters.map(item => <button type="button" key={item.value} aria-pressed={filter === item.value} onClick={() => { setFilter(item.value); setSelected(null); }}>{item.label}</button>)}
                    </div>
                    <span role="status">{shown.length} {shown.length === 1 ? 'paciente' : 'pacientes'}</span>
                  </div>

                  {shown.length ? <div className={styles.patientGrid}>
                    {shown.map(patient => {
                      const age = formatAge(patient.dateOfBirth);
                      const isSelected = selected?.id === patient.id;
                      return (
                        <article key={patient.id} className={`${styles.patientCard} ${isSelected ? styles.selectedCard : ''}`}>
                          <div className={styles.cardHeading}>
                            <span className={styles.avatar} aria-hidden="true">{initials(patient.fullName)}</span>
                            <div><h2><button type="button" aria-expanded={isSelected} aria-controls="v2-patient-details" onClick={event => choosePatient(patient, event.currentTarget)}>{patient.fullName}</button></h2><span>{patient.isArchived ? 'Archivado' : 'Paciente activo'}</span></div>
                          </div>
                          <dl className={styles.cardMetadata}><div><dt>Edad</dt><dd>{age === null ? 'Sin registrar' : `${age} años`}</dd></div><div><dt>Identificador</dt><dd>{patient.externalIdentifier ?? 'Sin registrar'}</dd></div></dl>
                          <button className={styles.cardAction} type="button" aria-label={`Ver datos de ${patient.fullName}`} aria-controls="v2-patient-details" onClick={event => choosePatient(patient, event.currentTarget)}>
                            {isSelected ? 'Ficha seleccionada' : 'Ver datos'}<Icon name="arrow" />
                          </button>
                        </article>
                      );
                    })}
                  </div> : <div className={styles.emptyState}><Icon name="search" /><h2>Sin pacientes en esta búsqueda</h2><p>Prueba otro nombre o cambia el filtro.</p><button type="button" className={styles.secondaryButton} onClick={() => { setQuery(''); setFilter('active'); }}>Restablecer búsqueda</button></div>}
                </section>

                <aside id="v2-patient-details" className={styles.patientDetail} aria-labelledby="v2-detail-title" onKeyDown={event => { if (event.key === 'Escape') closeDetail(); }}>
                  <div className={styles.detailToolbar}><span>Ficha del paciente</span>{selected ? <button className={styles.closeButton} type="button" aria-label="Cerrar ficha del paciente" onClick={closeDetail}>×</button> : <Icon name="users" />}</div>
                  {selected ? <>
                    <div className={styles.detailIdentity}>
                      <span className={styles.largeAvatar} aria-hidden="true">{initials(selected.fullName)}</span>
                      <h2 id="v2-detail-title" ref={detailRef} tabIndex={-1}>{selected.fullName}</h2>
                      <span>{selected.externalIdentifier ?? 'Sin identificador'}</span>
                      <p><span className={styles.statusDot} />{selected.isArchived ? 'Archivado' : 'Paciente activo'}</p>
                    </div>
                    <div className={styles.detailBody}>
                      <h3>Identificación y contacto</h3>
                      <dl><div><dt>Fecha de nacimiento</dt><dd>{formatDate(selected.dateOfBirth)}</dd></div><div><dt>Teléfono</dt><dd>{selected.phone ?? 'Sin registrar'}</dd></div><div><dt>Correo electrónico</dt><dd>{selected.email ?? 'Sin registrar'}</dd></div></dl>
                      <p className={styles.detailFootnote}>Esta ficha muestra datos de ejemplo. El expediente clínico sigue en la aplicación actual.</p>
                    </div>
                  </> : <div className={styles.detailEmpty}><Icon name="users" /><h2 id="v2-detail-title">Selecciona un paciente</h2><p>Sus datos aparecerán aquí para que puedas consultarlos junto al directorio.</p></div>}
                </aside>
              </div>
            </>
          ) : (
            <>
              <button className={styles.backButton} type="button" onClick={leaveRegistration}>← Volver a pacientes</button>
              <div className={styles.pageHeading}><div><h1 ref={headingRef} tabIndex={-1}>Nuevo paciente</h1><p>Registra su identificación y sus datos de contacto.</p></div></div>
              <PreviewRegistration classNames={styles} patients={patients} prefill={shown.length === 0 ? query.trim() : ''} onCancel={leaveRegistration} onComplete={patient => {
                setPatients(current => [...current, patient]); setSelected(patient); setQuery(''); setFilter('active'); setScreen('directory');
                setNotice('Registro de prueba completado. Solo aparece en esta muestra y desaparece al recargar.');
              }} />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
