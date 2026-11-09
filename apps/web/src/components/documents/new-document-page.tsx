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
  searchParams,
}: {
  patientId: string;
  kind: MedicalDocumentKind;
  searchParams?: Promise<{ encounterId?: string | string[]; returnTo?: string | string[] }>;
}) {
  const query = searchParams ? await searchParams : {};
  const encounterId = Array.isArray(query.encounterId) ? query.encounterId[0] : query.encounterId;
  const requestedReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo = requestedReturnTo?.startsWith(`/patients/${patientId}/consultas/`) && !requestedReturnTo.includes('//')
    ? requestedReturnTo
    : undefined;
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
  if (encounterId && !encountersRes.data.some((encounter) => encounter.id === encounterId)) {
    return <ErrorBanner message="La consulta seleccionada no pertenece a este paciente." retryHref={`/patients/${patient.id}`} />;
  }
  const title = kind === 'prescription' ? 'Nueva receta' : 'Nuevo informe';
  return (
    <>
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref={returnTo ?? `/patients/${patient.id}`}
        backLabel={returnTo ? 'Volver a consulta' : 'Ver paciente'}
      />
      <div className="page-head"><h1>{title}</h1></div>
      <MedicalDocumentForm
        patientId={patient.id}
        kind={kind}
        encounters={encountersRes.data}
        initialEncounterId={encounterId}
        returnTo={returnTo}
      />
    </>
  );
}
