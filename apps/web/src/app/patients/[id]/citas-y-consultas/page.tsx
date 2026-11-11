import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { appointmentSchema, encounterSummarySchema, patientDetailSchema } from '@nexus-med/contracts';
import { PatientTaskButton } from '../../../../components/patients/patient-task-button';
import { AppointmentRow, PatientActivityHistory } from '../../../../components/patients/patient-activity';
import { PatientSectionHeader } from '../../../../components/patients/patient-section-header';
import { ErrorBanner } from '../../../../components/primitives';
import { fetchServer } from '../../../../lib/api/server';
import { localDateOfInstant, practiceToday } from '../../../../lib/format';

export const dynamic = 'force-dynamic';

export default async function PatientActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [patientResult, appointmentsResult, encountersResult] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/appointments`, z.array(appointmentSchema)),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/encounters`, z.array(encounterSummarySchema)),
  ]);

  if (!patientResult.ok) {
    if (patientResult.notFound) notFound();
    return <ErrorBanner message={patientResult.error} retryHref={`/patients/${id}/citas-y-consultas`} />;
  }
  if (!appointmentsResult.ok) {
    if (appointmentsResult.notFound) notFound();
    return <ErrorBanner message={appointmentsResult.error} retryHref={`/patients/${id}/citas-y-consultas`} />;
  }
  if (!encountersResult.ok) {
    if (encountersResult.notFound) notFound();
    return <ErrorBanner message={encountersResult.error} retryHref={`/patients/${id}/citas-y-consultas`} />;
  }

  const patient = patientResult.data;
  const scheduled = appointmentsResult.data.filter(appointment => appointment.status === 'scheduled');
  const today = practiceToday();
  const upcoming = scheduled.filter(appointment => localDateOfInstant(appointment.startAt) >= today)
    .sort((left, right) => Date.parse(left.startAt) - Date.parse(right.startAt));
  const pastScheduled = scheduled.filter(appointment => localDateOfInstant(appointment.startAt) < today)
    .sort((left, right) => Date.parse(right.startAt) - Date.parse(left.startAt));

  return <>
    <PatientSectionHeader patient={patient} title="Citas y consultas"
      description="Consulta la agenda y el historial clínico del paciente en un mismo lugar.">
      <Link href={`/patients/${id}/consultas/nueva`} className="btn btn-primary">Nueva consulta</Link>
      {!patient.isArchived ? <PatientTaskButton patient={patient} action="appointment" label="Nueva cita" className="btn btn-secondary" /> : null}
    </PatientSectionHeader>

    <section className="card" aria-labelledby="upcoming-appointments-title">
      <div className="card-header"><h2 id="upcoming-appointments-title">Próximas citas</h2><span className="faint">{upcoming.length}</span></div>
      {!upcoming.length ? <p className="faint">No hay citas próximas programadas.</p>
        : upcoming.map(appointment => <AppointmentRow key={appointment.id} patientId={id} appointment={appointment} />)}
    </section>

    {pastScheduled.length ? <section className="card" aria-labelledby="past-appointments-title">
      <div className="card-header"><h2 id="past-appointments-title">Citas pendientes con fecha pasada</h2><span className="faint">{pastScheduled.length}</span></div>
      {pastScheduled.map(appointment => <AppointmentRow key={appointment.id} patientId={id} appointment={appointment} pastDate />)}
    </section> : null}

    <PatientActivityHistory patientId={id} appointments={appointmentsResult.data} encounters={encountersResult.data} />
  </>;
}
