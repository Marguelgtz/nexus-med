// New consultation route (UI_SPEC §3.6). The patient context strip is
// mandatory — the doctor always sees whose note they are writing.

import { notFound } from 'next/navigation';

import {
  appointmentSchema,
  patientDetailSchema,
  type Appointment,
} from '@nexus-med/contracts';

import { ConsultationForm } from '../../../../../../components/patients/consultation-form';
import { ErrorBanner } from '../../../../../../components/primitives';
import { fetchServer } from '../../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function NewConsultationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ appointmentId?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const appointmentId = Array.isArray(query.appointmentId) ? query.appointmentId[0] : query.appointmentId;

  const [patientRes, appointmentRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    appointmentId
      ? fetchServer(`/api/appointments/${encodeURIComponent(appointmentId)}`, appointmentSchema)
      : Promise.resolve(null),
  ]);

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
  let appointment: Appointment | null = null;
  if (appointmentRes) {
    if (!appointmentRes.ok) {
      if (appointmentRes.notFound) notFound();
      return <ErrorBanner message={appointmentRes.error} retryHref={`/patients/${id}/citas/${appointmentId}`} />;
    }
    if (appointmentRes.data.patient.id !== patient.id || appointmentRes.data.status !== 'scheduled') {
      return <ErrorBanner message="La cita ya no está disponible para iniciar una consulta." retryHref={`/patients/${id}/citas/${appointmentId}`} />;
    }
    appointment = appointmentRes.data;
  }

  return (
    <>
      <div className="page-head">
        <h1>Nueva consulta</h1>
      </div>

      <ConsultationForm
        patient={patient}
        appointment={appointment}
      />
    </>
  );
}
