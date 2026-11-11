import { ReceivedStudies } from '../../../../../components/receipts/received-studies';
// Consultation detail page (UI_SPEC §3.7). SSR fetches the patient (for
// the context strip and 404 handling) and the encounter by id. A stale
// bookmark — unknown id, or an id belonging to another patient — renders
// the standard not-found page (§3.8).

import { notFound } from 'next/navigation';
import { z } from 'zod';

import {
  appointmentSchema,
  encounterSummarySchema,
  encounterDetailSchema,
  patientDetailSchema,
  studyRequestSchema,
  studyReceiptSchema,
  type Appointment,
} from '@nexus-med/contracts';

import { EncounterDetail as Detail } from '../../../../../components/patients/encounter-detail';
import { PatientContext } from '../../../../../components/shell/patient-context';
import { ErrorBanner } from '../../../../../components/primitives';
import { fetchServer } from '../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function EncounterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; eid: string }>;
  searchParams: Promise<{ appointmentId?: string | string[] }>;
}) {
  const [{ id, eid }, query] = await Promise.all([params, searchParams]);
  const appointmentId = Array.isArray(query.appointmentId) ? query.appointmentId[0] : query.appointmentId;

  const [patientRes, encounterRes, studiesRes, encountersRes, appointmentRes, receiptsRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/encounters/${encodeURIComponent(eid)}`, encounterDetailSchema),
    fetchServer(
      `/api/encounters/${encodeURIComponent(eid)}/studies`,
      z.array(studyRequestSchema),
    ),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/encounters`, z.array(encounterSummarySchema)),
    appointmentId
      ? fetchServer(`/api/appointments/${encodeURIComponent(appointmentId)}`, appointmentSchema)
      : Promise.resolve(null),
    fetchServer(`/api/study-receipts?patientId=${encodeURIComponent(id)}&review=all`, z.array(studyReceiptSchema)),
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
  if (!studiesRes.ok) {
    if (studiesRes.notFound) notFound();
    return (
      <>
        <h1>Consulta</h1>
        <ErrorBanner message={studiesRes.error} retryHref={`/patients/${id}`} />
      </>
    );
  }
  if (!encountersRes.ok) {
    if (encountersRes.notFound) notFound();
    return <ErrorBanner message={encountersRes.error} retryHref={`/patients/${id}/consultas/${eid}`} />;
  }
  const patient = patientRes.data;
  const encounter = encounterRes.data;
  if (encounter.patientId !== patient.id) {
    notFound();
  }

  let appointment: Appointment | null = null;
  if (appointmentRes) {
    if (!appointmentRes.ok) {
      if (appointmentRes.notFound) notFound();
      return <ErrorBanner message={appointmentRes.error} retryHref={`/patients/${id}/consultas/${eid}`} />;
    }
    if (appointmentRes.data.patient.id !== patient.id) notFound();
    appointment = appointmentRes.data;
  }

  return (
    <>
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref={`/patients/${patient.id}/citas-y-consultas`}
        backLabel="Citas y consultas"
      />
      <Detail
        encounter={encounter}
        studies={studiesRes.data}
        patient={patient}
        encounters={encountersRes.data}
        appointment={appointment}
      />
      {receiptsRes.ok ? <ReceivedStudies receipts={receiptsRes.data.filter(receipt => receipt.encounter?.id === encounter.id)} patients={[]} fixedPatient={patient} initialEncounterId={encounter.id} /> : <ErrorBanner message="No se pudieron cargar los archivos recibidos de esta consulta." retryHref={`/patients/${id}/consultas/${eid}`} />}
    </>
  );
}
