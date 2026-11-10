import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { patientDetailSchema, encounterSummarySchema } from '@nexus-med/contracts';
import { PatientSectionHeader } from '../../../../components/patients/patient-section-header';
import { ErrorBanner } from '../../../../components/primitives';
import { fetchServer } from '../../../../lib/api/server';
import { Timeline } from '../../../../components/patients/timeline';

export const dynamic = 'force-dynamic';

export default async function PatientSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [patientResult, items] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/encounters`, z.array(encounterSummarySchema)),
  ]);
  if (!patientResult.ok) {
    if (patientResult.notFound) notFound();
    return <ErrorBanner message={patientResult.error} retryHref={`/patients/${id}/consultas`} />;
  }
  if (!items.ok) {
    if (items.notFound) notFound();
    return <ErrorBanner message={items.error} retryHref={`/patients/${id}/consultas`} />;
  }
  const patient = patientResult.data;
  return <>
      <PatientSectionHeader
        patient={patient} title="Consultas" description="Notas clínicas de las atenciones del paciente. Cada nota reúne lo que se documentó durante la consulta."><Link href={`/patients/${id}/consultas/nueva`} className="btn btn-primary">Nueva consulta</Link></PatientSectionHeader>
      <Timeline patientId={id} encounters={items.data} />
  </>;
}
