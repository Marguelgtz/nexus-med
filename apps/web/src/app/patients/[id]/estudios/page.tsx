import { ReceivedStudies } from '../../../../components/receipts/received-studies';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { patientDetailSchema, studyRequestSchema, encounterSummarySchema, studyReceiptSchema } from '@nexus-med/contracts';
import { PatientSectionHeader } from '../../../../components/patients/patient-section-header';
import { ErrorBanner } from '../../../../components/primitives';
import { fetchServer } from '../../../../lib/api/server';
import { PatientStudyWorkflow } from '../../../../components/patients/study-workflow';

export const dynamic = 'force-dynamic';

export default async function PatientSectionPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ solicitar?: string }> }) {
  const { id } = await params;
  const [patientResult, items, encounters, receipts] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/studies`, z.array(studyRequestSchema)),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/encounters`, z.array(encounterSummarySchema)),
    fetchServer(`/api/study-receipts?patientId=${encodeURIComponent(id)}&review=all`, z.array(studyReceiptSchema)),
  ]);
  if (!patientResult.ok) {
    if (patientResult.notFound) notFound();
    return <ErrorBanner message={patientResult.error} retryHref={`/patients/${id}/estudios`} />;
  }
  if (!items.ok) {
    if (items.notFound) notFound();
    return <ErrorBanner message={items.error} retryHref={`/patients/${id}/estudios`} />;
  }
  const query = await searchParams;
  if (!encounters.ok) {
    if (encounters.notFound) notFound();
    return <ErrorBanner message={encounters.error} retryHref={`/patients/${id}/estudios`} />;
  }
  const patient = patientResult.data;
  return <>
      <PatientSectionHeader
        patient={patient} title="Estudios" description="Solicitudes, estado de revisión y notas de resultados del paciente." />
      {receipts.ok ? <ReceivedStudies receipts={receipts.data} patients={[]} fixedPatient={patient} /> : <ErrorBanner message="No se pudieron cargar los archivos recibidos." retryHref={`/patients/${id}/estudios`} />}
      <PatientStudyWorkflow patientId={id} studies={items.data} encounters={encounters.data} initiallyCreating={query.solicitar === '1'} />
  </>;
}
