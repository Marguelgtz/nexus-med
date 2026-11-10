import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { patientDetailSchema, medicalDocumentSchema } from '@nexus-med/contracts';
import { PatientSectionHeader } from '../../../../components/patients/patient-section-header';
import { ErrorBanner } from '../../../../components/primitives';
import { fetchServer } from '../../../../lib/api/server';
import { formatDateTime } from '../../../../lib/format';
import type { MedicalDocument } from '@nexus-med/contracts';

export const dynamic = 'force-dynamic';

function documentPreview(document: MedicalDocument): string {
  const content = document.title || (document.kind === 'prescription'
    ? document.lines[0]?.medication || document.body
    : document.body);
  const firstLine = content?.split('\n')[0]?.trim() || (document.kind === 'prescription' ? 'Receta' : 'Informe médico');
  return firstLine.length > 110 ? `${firstLine.slice(0, 107)}…` : firstLine;
}

export default async function PatientSectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [patientResult, items] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/documents`, z.array(medicalDocumentSchema)),
  ]);
  if (!patientResult.ok) {
    if (patientResult.notFound) notFound();
    return <ErrorBanner message={patientResult.error} retryHref={`/patients/${id}/documentos`} />;
  }
  if (!items.ok) {
    if (items.notFound) notFound();
    return <ErrorBanner message={items.error} retryHref={`/patients/${id}/documentos`} />;
  }
  const patient = patientResult.data;
  return <>
      <PatientSectionHeader
        patient={patient} title="Recetas e informes" description="Documentos redactados para el paciente y sus consultas.">{!patient.isArchived ? <><Link href={`/patients/${id}/recetas/nueva`} className="btn btn-primary">Nueva receta</Link><Link href={`/patients/${id}/informes/nueva`} className="btn btn-secondary">Nuevo informe</Link></> : null}</PatientSectionHeader>
      <section className="card" id="patient-documents" aria-label="Documentos del paciente">
        {items.data.length === 0 ? <p className="faint">Sin recetas ni informes.</p> : items.data.map((document) => <Link key={document.id} className="document-row" href={`/patients/${id}/${document.kind === 'prescription' ? 'recetas' : 'informes'}/${document.id}`}>
          <span className="badge badge-document-kind">{document.kind === 'prescription' ? 'Receta' : 'Informe'}</span>
          <span className="document-row-title">{documentPreview(document)}</span>
          <time dateTime={document.createdAt}>{formatDateTime(document.createdAt)}</time>
        </Link>)}
      </section>
  </>;
}
