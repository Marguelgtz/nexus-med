// Consultation detail page (UI_SPEC §3.7). SSR fetches the patient (for
// the context strip and 404 handling) and the encounter by id. A stale
// bookmark — unknown id, or an id belonging to another patient — renders
// the standard not-found page (§3.8).

import { notFound } from 'next/navigation';

import { encounterDetailSchema, patientDetailSchema } from '@nexus-med/contracts';

import { EncounterDetail as Detail } from '../../../../../components/patients/encounter-detail';
import { PatientContext } from '../../../../../components/shell/patient-context';
import { ErrorBanner } from '../../../../../components/primitives';
import { fetchServer } from '../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function EncounterPage({
  params,
}: {
  params: Promise<{ id: string; eid: string }>;
}) {
  const { id, eid } = await params;

  const [patientRes, encounterRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/encounters/${encodeURIComponent(eid)}`, encounterDetailSchema),
  ]);

  if (!patientRes.ok) {
    if (patientRes.notFound) notFound();
    return (
      <>
        <h1>Consulta</h1>
        <ErrorBanner message={patientRes.error} retryHref={`/patients/${id}`} />
      </>
    );
  }
  if (!encounterRes.ok) {
    if (encounterRes.notFound) notFound();
    return (
      <>
        <h1>Consulta</h1>
        <ErrorBanner message={encounterRes.error} retryHref={`/patients/${id}`} />
      </>
    );
  }

  const patient = patientRes.data;
  const encounter = encounterRes.data;
  if (encounter.patientId !== patient.id) {
    notFound();
  }

  return (
    <>
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref={`/patients/${patient.id}`}
      />
      <Detail encounter={encounter} />
    </>
  );
}
