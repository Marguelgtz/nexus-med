'use client';

// Patient registry (UI_SPEC §3.1): search, filter tabs, rows, and all
// list states. SSR provides the initial list; the client re-fetches on
// search/filter changes through the typed API client.

import { useCallback, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { PatientSummary } from '@nexus-med/contracts';

import { listPatients, type PatientListQuery } from '../../lib/api/client';
import { formatAge } from '../../lib/format';
import { NewPatientButton } from './patient-task-button';
import { EmptyState, ErrorBanner, Skeleton } from '../primitives';
import { Icon } from '../icon';

const SEARCH_DEBOUNCE_MS = 300;

const TABS: { value: 'active' | 'archived' | 'all'; label: string }[] = [
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
  { value: 'all', label: 'Todos' },
];

function PatientCard({ patient, selected, onSelect }: { patient: PatientSummary; selected: boolean; onSelect: () => void }) {
  const age = formatAge(patient.dateOfBirth);
  return (
    <article className={`patient-directory-card${selected ? ' selected' : ''}`}>
      <button type="button" className="patient-card-select" aria-pressed={selected} onClick={onSelect}>
        <span className="patient-avatar" aria-hidden="true">{patient.fullName.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join('')}</span>
        <span className="patient-card-name">{patient.fullName}</span>
        <span className="patient-card-meta">{age !== null ? `${age} años` : 'Edad sin registrar'}</span>
        <span className="patient-card-meta">{patient.externalIdentifier ?? 'Sin identificador'}</span>
        {patient.isArchived ? <span className="badge badge-archived">Archivado</span> : null}
      </button>
      <div className="registry-actions">
        {!patient.isArchived ? (
          <Link
            href={`/patients/${patient.id}/consultas/nueva`}
            className="btn btn-secondary btn-sm"
            aria-label={`Nueva consulta para ${patient.fullName}`}
          >
            Nueva consulta <Icon name="arrow" />
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function PatientRegistry({ initialPatients }: { initialPatients: PatientSummary[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [status, setStatus] = useState<'active' | 'archived' | 'all'>(() => {
    const s = searchParams.get('status');
    return s === 'archived' || s === 'all' ? s : 'active';
  });
  const [patients, setPatients] = useState<PatientSummary[]>(initialPatients);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(initialPatients.find((patient) => !patient.isArchived)?.id ?? initialPatients[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const requestSeq = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef(status);

  // Keep the URL shareable: mirror q/status into the query string (replaced,
  // so the back button never walks through keystrokes).
  const syncUrl = useCallback(
    (q: string, s: PatientListQuery['status']) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set('q', q);
      else params.delete('q');
      if (s && s !== 'active') params.set('status', s);
      else params.delete('status');
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const fetchList = useCallback(
    async (q: string, s: PatientListQuery['status']) => {
      const seq = ++requestSeq.current;
      setLoading(true);
      setError(null);
      try {
        const rows = await listPatients({ q: q || undefined, status: s });
        if (seq !== requestSeq.current) return;
        setPatients(rows);
        setHasSearched(true);
      } catch (err) {
        if (seq !== requestSeq.current) return;
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        if (seq === requestSeq.current) setLoading(false);
      }
    },
    [],
  );

  // Fetches are triggered by the user's own events (search keystrokes,
  // tab change, clear) — never by an effect. SSR already provided the
  // list for the initial (possibly URL-parameterized) view.
  const onSearch = (value: string) => {
    setQuery(value);
    syncUrl(value, status);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(
      () => void fetchList(value, statusRef.current),
      SEARCH_DEBOUNCE_MS,
    );
  };

  const onTab = (s: (typeof TABS)[number]['value']) => {
    statusRef.current = s;
    setStatus(s);
    syncUrl(query, s);
    void fetchList(query, s);
  };

  const onClear = () => {
    setQuery('');
    syncUrl('', status);
    void fetchList('', statusRef.current);
  };

  const noResults = !loading && error === null && patients.length === 0;
  const hasSearch = query.trim().length > 0;

  return (
    <>
      <div className="page-head">
<div><p className="section-label">Directorio clínico</p><h1>Pacientes</h1><p className="muted">Cada paciente, su historia y el siguiente paso.</p></div>
        <NewPatientButton />
      </div>

      <div className="registry-search"><label className="registry-search-label" htmlFor="patient-registry-search">Buscar por nombre o identificador</label><Icon name="search" />
        <input
          id="patient-registry-search"
          type="search"
          className="search-input"
          placeholder="Buscar por nombre o identificador"
          value={query}
          onChange={(e) => onSearch(e.target.value)}
          aria-label="Buscar pacientes"
        />
      </div>

      <div className="segmented" role="group" aria-label="Filtrar por estado">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            aria-pressed={status === tab.value}
            className={status === tab.value ? 'active' : undefined}
            onClick={() => onTab(tab.value)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <p className="registry-count" role="status">{loading ? 'Actualizando directorio…' : `${patients.length} pacientes en esta vista`}</p>

      {error !== null ? (
        <ErrorBanner message={error} retryHref={pathname} />
      ) : loading && hasSearched ? (
        <div className="row-list">
          <Skeleton variant="row" />
          <Skeleton variant="row" />
          <Skeleton variant="row" />
        </div>
      ) : noResults ? (
        hasSearch ? (
          <div className="empty-state">
            <div className="empty-title">Sin resultados para “{query.trim()}”</div>
            <div className="btn-row" style={{ justifyContent: 'center' }}>
              <button type="button" className="btn btn-ghost" onClick={onClear}>
                Limpiar búsqueda
              </button>
              <NewPatientButton label="Crear un paciente con este nombre" prefillName={query.trim()} />
            </div>
          </div>
        ) : (
          <EmptyState title="Aún no hay pacientes">
            <NewPatientButton />
          </EmptyState>
        )
      ) : (
        <div className="patient-directory-layout">
        <div className="patient-card-grid">
          {patients.map((p) => (
            <PatientCard key={p.id} patient={p} selected={p.id === (patients.some((patient) => patient.id === selectedPatientId) ? selectedPatientId : patients.find((patient) => !patient.isArchived)?.id ?? patients[0]?.id)} onSelect={() => setSelectedPatientId(p.id)} />
          ))}
        </div>
        {(() => {
          const selected = patients.find((patient) => patient.id === selectedPatientId) ?? patients.find((patient) => !patient.isArchived) ?? patients[0];
          return selected ? <aside className="patient-directory-detail" aria-labelledby="patient-directory-detail-title">
            <p className="section-label">Ficha seleccionada</p>
            <h2 id="patient-directory-detail-title">{selected.fullName}</h2>
            <dl><div><dt>Edad</dt><dd>{formatAge(selected.dateOfBirth) !== null ? `${formatAge(selected.dateOfBirth)} años` : 'Sin registrar'}</dd></div><div><dt>Identificador</dt><dd>{selected.externalIdentifier ?? 'Sin registrar'}</dd></div><div><dt>Estado</dt><dd>{selected.isArchived ? 'Archivado' : 'Activo'}</dd></div></dl>
            <Link className="btn btn-primary" href={`/patients/${selected.id}`}>Abrir expediente</Link>
            {!selected.isArchived ? <Link className="btn btn-secondary" href={`/patients/${selected.id}/consultas/nueva`}>Nueva consulta</Link> : null}
          </aside> : null;
        })()}
        </div>
      )}
    </>
  );
}
