// Consultation detail page (UI_SPEC §3.7). SSR fetches the patient (for
// the context strip and 404 handling) and the encounter by id. A stale
// bookmark — unknown id, or an id belonging to another patient — renders
// the standard not-found page (§3.8).

import { notFound } from 'next/navigation';

import type { EncounterDetail, PatientDetail } from '@nexus-med/contracts';

import { EncounterDetail as Detail } from '../../../../../components/patients/encounter-detail';
import { PatientContext } from '../../../../../components/shell/patient-context';
import { apiGet } from '../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function EncounterPage({
  params,
}: {
  params: Promise<{ id: string; eid: string }>;
}) {
  const { id, eid } = await params;

  let patient: PatientDetail;
  let encounter: EncounterDetail;
  try {
    [patient, encounter] = await Promise.all([
      apiGet<PatientDetail>(`/api/patients/${encodeURIComponent(id)}`),
      apiGet<EncounterDetail>(`/api/encounters/${encodeURIComponent(eid)}`),
    ]);
  } catch {
    notFound();
  }
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
