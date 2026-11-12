// Edit demographics route (UI_SPEC §3.4). The server loads the current
// record and passes it to the pre-filled client form.

import { notFound } from 'next/navigation';

import { patientDetailSchema } from '@nexus-med/contracts';

import { EditPatientForm } from '../../../../../components/patients/edit-patient-form';
import { PatientContext } from '../../../../../components/shell/patient-context';
import { ErrorBanner } from '../../../../../components/primitives';
import { fetchServer } from '../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function EditPatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const patientRes = await fetchServer(
    `/api/patients/${encodeURIComponent(id)}`,
    patientDetailSchema,
  );
  if (!patientRes.ok) {
    if (patientRes.notFound) notFound();
    return (
      <>
        <h1>Editar paciente</h1>
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
        <h1>Editar a {patient.fullName}</h1>
      </div>

      <EditPatientForm
        patientId={patient.id}
        initial={{
          fullName: patient.fullName,
          dateOfBirth: patient.dateOfBirth,
          phone: patient.phone,
          email: patient.email,
          appointmentEmailConsent: patient.appointmentEmailConsent,
          externalIdentifier: patient.externalIdentifier,
        }}
      />
    </>
  );
}
