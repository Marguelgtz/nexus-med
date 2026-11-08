// Patient registry page (UI_SPEC §3.1). Server component performs the
// initial SSR fetch (no caching); the client component owns search/filter
// afterwards. If the API is down on first load we render an explicit error
// state instead of stale or empty data.

import { z } from 'zod';

import { patientSummarySchema } from '@nexus-med/contracts';

import { PatientRegistry } from '../../components/patients/registry';
import { ErrorBanner } from '../../components/primitives';
import { fetchServer } from '../../lib/api/server';

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

  const query = new URLSearchParams();
  if (q) query.set('q', q);
  query.set('status', status);

  const res = await fetchServer(
    `/api/patients?${query.toString()}`,
    z.array(patientSummarySchema),
  );

  if (!res.ok) {
    // A registry failure is a recoverable error state, never a blank list.
    return (
      <>
        <h1>Pacientes</h1>
        <ErrorBanner
          message={res.notFound ? 'No se pudo cargar el listado de pacientes.' : res.error}
          retryHref="/patients"
        />
      </>
    );
  }

  return <PatientRegistry initialPatients={res.data} />;
}
