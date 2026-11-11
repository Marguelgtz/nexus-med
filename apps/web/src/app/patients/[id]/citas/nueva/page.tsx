// New appointment (UI_SPEC §7.2): the form lives under the patient so
// the patient is fixed; the form handles time, duration, type and the
// non-blocking overlap warning.

import { notFound } from 'next/navigation';
import Link from 'next/link';

import { patientDetailSchema } from '@nexus-med/contracts';

import { AppointmentForm } from '../../../../../components/appointments/appointment-form';
import { ErrorBanner } from '../../../../../components/primitives';
import { PatientContext } from '../../../../../components/shell/patient-context';
import { fetchServer } from '../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function NewAppointmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const requestedReturnTo = Array.isArray(query.returnTo) ? query.returnTo[0] : query.returnTo;
  const returnTo = requestedReturnTo?.startsWith(`/patients/${id}/consultas/`) && !requestedReturnTo.includes('//')
    ? requestedReturnTo
    : undefined;
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
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref={returnTo ?? `/patients/${patient.id}/citas-y-consultas`}
        backLabel={returnTo ? 'Volver a consulta' : 'Citas y consultas'}
      />
      <div className="page-head">
        <h1>Nueva cita — {patient.fullName}</h1>
        <div className="actions">
          <Link href={returnTo ?? `/patients/${id}/citas-y-consultas`} className="btn btn-secondary">
            {returnTo ? 'Volver a consulta' : 'Citas y consultas'}
          </Link>
        </div>
      </div>
      <div className="card">
        <AppointmentForm patientId={patient.id} returnTo={returnTo} />
      </div>
    </>
  );
}
