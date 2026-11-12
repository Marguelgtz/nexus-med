// Edit medical background route (UI_SPEC §3.5).

import { notFound } from 'next/navigation';

import { patientDetailSchema } from '@nexus-med/contracts';

import { BackgroundForm } from '../../../../../components/patients/background-form';
import { PatientContext } from '../../../../../components/shell/patient-context';
import { ErrorBanner } from '../../../../../components/primitives';
import { fetchServer } from '../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function EditBackgroundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const patientRes = await fetchServer(
    `/api/patients/${encodeURIComponent(id)}`,
    patientDetailSchema,
  );
  if (!patientRes.ok) {
    if (patientRes.notFound) notFound();
    return (
      <>
        <h1>Editar antecedentes</h1>
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
        backHref={`/patients/${patient.id}#patient-background`}
        backLabel="Resumen"
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
