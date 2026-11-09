// New consultation route (UI_SPEC §3.6). The patient context strip is
// mandatory — the doctor always sees whose note they are writing.

import { notFound } from 'next/navigation';
import { z } from 'zod';

import {
  appointmentSchema,
  encounterSummarySchema,
  patientDetailSchema,
  studyRequestSchema,
  type Appointment,
} from '@nexus-med/contracts';

import { ConsultationForm } from '../../../../../components/patients/consultation-form';
import { ErrorBanner } from '../../../../../components/primitives';
import { fetchServer } from '../../../../../lib/api/server';

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
  const pendingStudyQuery = new URLSearchParams();
  pendingStudyQuery.append('status', 'ordered');
  pendingStudyQuery.append('status', 'completed');

  const [patientRes, encountersRes, studiesRes, appointmentRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/encounters`, z.array(encounterSummarySchema)),
    fetchServer(
      `/api/patients/${encodeURIComponent(id)}/studies?${pendingStudyQuery.toString()}`,
      z.array(studyRequestSchema),
    ),
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
  if (!encountersRes.ok) {
    if (encountersRes.notFound) notFound();
    return <ErrorBanner message={encountersRes.error} retryHref={`/patients/${id}/consultas/nueva`} />;
  }
  if (!studiesRes.ok) {
    if (studiesRes.notFound) notFound();
    return <ErrorBanner message={studiesRes.error} retryHref={`/patients/${id}/consultas/nueva`} />;
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
        encounters={encountersRes.data}
        pendingStudies={studiesRes.data}
        appointment={appointment}
      />
    </>
  );
}
