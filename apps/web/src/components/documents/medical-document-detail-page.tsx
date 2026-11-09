import Link from 'next/link';
import { z } from 'zod';

import {
  encounterSummarySchema,
  medicalDocumentSchema,
  patientDetailSchema,
  type MedicalDocumentKind,
} from '@nexus-med/contracts';

import { MedicalDocumentDetail } from './medical-document-detail';
import { EmptyState, ErrorBanner } from '../primitives';
import { PatientContext } from '../shell/patient-context';
import { fetchServer } from '../../lib/api/server';

export async function MedicalDocumentDetailPage({
  patientId,
  documentId,
  kind,
}: {
  patientId: string;
  documentId: string;
  kind: MedicalDocumentKind;
}) {
  const [patientRes, documentRes, encountersRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(patientId)}`, patientDetailSchema),
    fetchServer(`/api/documents/${encodeURIComponent(documentId)}`, medicalDocumentSchema),
    fetchServer(`/api/patients/${encodeURIComponent(patientId)}/encounters`, z.array(encounterSummarySchema)),
  ]);

  if (!patientRes.ok) {
    if (patientRes.notFound) return <EmptyState title="Paciente no encontrado"><p>El registro no existe o fue eliminado.</p><Link href="/patients" className="btn btn-primary">Volver al listado</Link></EmptyState>;
    return <ErrorBanner message={patientRes.error} retryHref={`/patients/${patientId}`} />;
  }
  if (!documentRes.ok) {
    if (documentRes.notFound) {
      const label = kind === 'prescription' ? 'Receta' : 'Informe';
      return <EmptyState title={`${label} no encontrada`}><p>El registro no existe o fue eliminado.</p><Link href={`/patients/${patientId}`} className="btn btn-primary">Volver al paciente</Link></EmptyState>;
    }
    return <ErrorBanner message={documentRes.error} retryHref={`/patients/${patientId}`} />;
  }
  if (documentRes.data.patientId !== patientRes.data.id || documentRes.data.kind !== kind) {
    const label = kind === 'prescription' ? 'Receta' : 'Informe';
    return <EmptyState title={`${label} no encontrada`}><p>El registro no existe o fue eliminado.</p><Link href={`/patients/${patientId}`} className="btn btn-primary">Volver al paciente</Link></EmptyState>;
  }

  const patient = patientRes.data;
  const encountersError = encountersRes.ok
    ? null
    : encountersRes.notFound
      ? 'El paciente no existe o ya no está disponible.'
      : encountersRes.error;
  return (
    <>
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref={`/patients/${patient.id}`}
      />
      {encountersError ? <ErrorBanner message={encountersError} retryHref={`/patients/${patient.id}`} /> : null}
      <MedicalDocumentDetail
        initialDocument={documentRes.data}
        encounters={encountersRes.ok ? encountersRes.data : []}
      />
    </>
  );
}
