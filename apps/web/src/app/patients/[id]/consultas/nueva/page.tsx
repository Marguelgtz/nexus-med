// New consultation route (UI_SPEC §3.6). The patient context strip is
// mandatory — the doctor always sees whose note they are writing.

import { notFound } from 'next/navigation';

import type { PatientDetail } from '@nexus-med/contracts';

import { ConsultationForm } from '../../../../../components/patients/consultation-form';
import { PatientContext } from '../../../../../components/shell/patient-context';
import { apiGet } from '../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function NewConsultationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let patient: PatientDetail;
  try {
    patient = await apiGet<PatientDetail>(`/api/patients/${encodeURIComponent(id)}`);
  } catch {
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

      <div className="page-head">
        <h1>Nueva consulta</h1>
      </div>

      <ConsultationForm patientId={patient.id} />
    </>
  );
}
