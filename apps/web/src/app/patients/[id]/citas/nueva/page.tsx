// New appointment (UI_SPEC §7.2): the form lives under the patient so
// the patient is fixed; the form handles time, duration, type and the
// non-blocking overlap warning.

import { notFound } from 'next/navigation';
import Link from 'next/link';

import { patientDetailSchema } from '@nexus-med/contracts';

import { AppointmentForm } from '../../../../../components/appointments/appointment-form';
import { ErrorBanner } from '../../../../../components/primitives';
import { fetchServer } from '../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function NewAppointmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const res = await fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema);
  if (!res.ok) {
    if (res.notFound) notFound();
    return (
      <>
        <h1>Nueva cita</h1>
        <ErrorBanner message={res.error} retryHref={`/patients/${id}/citas/nueva`} />
      </>
    );
  }
  const patient = res.data;

  return (
    <>
      <div className="page-head">
        <h1>Nueva cita — {patient.fullName}</h1>
        <div className="actions">
          <Link href={`/patients/${id}/citas`} className="btn btn-secondary">
            Volver a citas
          </Link>
        </div>
      </div>
      <div className="card">
        <AppointmentForm patientId={patient.id} />
      </div>
    </>
  );
}
