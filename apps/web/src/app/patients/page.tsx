// Patient registry page (UI_SPEC §3.1). Server component performs the
// initial SSR fetch (no caching); the client component owns search/filter
// afterwards. If the API is down on first load we render an explicit error
// state instead of stale or empty data.

import type { PatientSummary } from '@nexus-med/contracts';

import { PatientRegistry } from '../../components/patients/registry';
import { ErrorBanner } from '../../components/primitives';
import { apiGet } from '../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function PatientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim();
  const status =
    params.status === 'archived' || params.status === 'all' ? params.status : 'active';

  let initial: PatientSummary[] | null = null;
  let error: string | null = null;
  try {
    const query = new URLSearchParams();
    if (q) query.set('q', q);
    query.set('status', status);
    initial = await apiGet<PatientSummary[]>(`/api/patients?${query.toString()}`);
  } catch (err) {
    error = err instanceof Error ? err.message : 'Error desconocido';
  }

  if (error !== null || initial === null) {
    return (
      <>
        <h1>Pacientes</h1>
        <ErrorBanner
          message={error ?? 'No se pudo cargar el listado de pacientes.'}
          retryHref="/patients"
        />
      </>
    );
  }

  return <PatientRegistry initialPatients={initial} />;
}
