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

const SEARCH_DEBOUNCE_MS = 300;

const TABS: { value: 'active' | 'archived' | 'all'; label: string }[] = [
  { value: 'active', label: 'Activos' },
  { value: 'archived', label: 'Archivados' },
  { value: 'all', label: 'Todos' },
];

function PatientRow({ patient }: { patient: PatientSummary }) {
  const age = formatAge(patient.dateOfBirth);
  return (
    <article className="row registry-row">
      <Link href={`/patients/${patient.id}`} className="registry-person">
        <span className="main">{patient.fullName}</span>
        <span className="cell">{age !== null ? `${age} años` : '—'}</span>
        <span className="cell mono">{patient.externalIdentifier ?? '—'}</span>
        <span className="registry-state">
          {patient.isArchived ? <span className="badge badge-archived">Archivado</span> : null}
        </span>
      </Link>
      <div className="registry-actions">
        {!patient.isArchived ? (
          <Link
            href={`/patients/${patient.id}/consultas/nueva`}
            className="btn btn-secondary btn-sm"
            aria-label={`Nueva consulta para ${patient.fullName}`}
          >
            Nueva consulta
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
        <h1>Pacientes</h1>
        <NewPatientButton patients={patients} />
      </div>

      <div style={{ marginBottom: 12 }}>
        <input
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
              <NewPatientButton patients={patients} label="Crear un paciente con este nombre" prefillName={query.trim()} />
            </div>
          </div>
        ) : (
          <EmptyState title="Aún no hay pacientes">
            <NewPatientButton patients={patients} />
          </EmptyState>
        )
      ) : (
        <div className="row-list">
          {patients.map((p) => (
            <PatientRow key={p.id} patient={p} />
          ))}
        </div>
      )}
    </>
  );
}
