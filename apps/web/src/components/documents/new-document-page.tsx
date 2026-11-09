import { notFound } from 'next/navigation';
import { z } from 'zod';

import { encounterSummarySchema, patientDetailSchema, type MedicalDocumentKind } from '@nexus-med/contracts';

import { MedicalDocumentForm } from './document-form';
import { ErrorBanner } from '../primitives';
import { PatientContext } from '../shell/patient-context';
import { fetchServer } from '../../lib/api/server';

export async function NewMedicalDocumentPage({
  patientId,
  kind,
}: {
  patientId: string;
  kind: MedicalDocumentKind;
}) {
  const [patientRes, encountersRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(patientId)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(patientId)}/encounters`, z.array(encounterSummarySchema)),
  ]);

  if (!patientRes.ok) {
    if (patientRes.notFound) notFound();
    return <ErrorBanner message={patientRes.error} retryHref={`/patients/${patientId}`} />;
  }
  if (!encountersRes.ok) {
    if (encountersRes.notFound) notFound();
    return <ErrorBanner message={encountersRes.error} retryHref={`/patients/${patientId}`} />;
  }

  const patient = patientRes.data;
  const title = kind === 'prescription' ? 'Nueva receta' : 'Nuevo informe';
  return (
    <>
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref={`/patients/${patient.id}`}
      />
      <div className="page-head"><h1>{title}</h1></div>
      <MedicalDocumentForm patientId={patient.id} kind={kind} encounters={encountersRes.data} />
    </>
  );
}
