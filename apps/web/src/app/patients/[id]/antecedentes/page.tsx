// Edit medical background route (UI_SPEC §3.5).

import { notFound } from 'next/navigation';

import type { PatientDetail } from '@nexus-med/contracts';

import { BackgroundForm } from '../../../../components/patients/background-form';
import { PatientContext } from '../../../../components/shell/patient-context';
import { apiGet } from '../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function EditBackgroundPage({ params }: { params: Promise<{ id: string }> }) {
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
        <h1>Editar antecedentes</h1>
      </div>

      <BackgroundForm
        patientId={patient.id}
        initial={{
          medicalConditions: patient.medicalConditions,
          previousSurgeries: patient.previousSurgeries,
          allergies: patient.allergies,
          currentMedications: patient.currentMedications,
        }}
      />
    </>
  );
}
