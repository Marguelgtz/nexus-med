// New consultation route (UI_SPEC §3.6). The patient context strip is
// mandatory — the doctor always sees whose note they are writing.

import { notFound } from 'next/navigation';

import { patientDetailSchema } from '@nexus-med/contracts';

import { ConsultationForm } from '../../../../../components/patients/consultation-form';
import { PatientContext } from '../../../../../components/shell/patient-context';
import { ErrorBanner } from '../../../../../components/primitives';
import { fetchServer } from '../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function NewConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const patientRes = await fetchServer(
    `/api/patients/${encodeURIComponent(id)}`,
    patientDetailSchema,
  );
  if (!patientRes.ok) {
    if (patientRes.notFound) notFound();
    return (
      <>
        <h1>Nueva consulta</h1>
        <ErrorBanner message={patientRes.error} retryHref={`/patients/${id}`} />
      </>
    );
  }
  const patient = patientRes.data;

  return (
    <>
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref={`/patients/${patient.id}`}
      />

      <div className="page-head">
        <h1>Nueva consulta</h1>
      </div>

      <ConsultationForm patientId={patient.id} />
    </>
  );
}
