import Link from 'next/link';
import type { Appointment, EncounterSummary } from '@nexus-med/contracts';
import { AppointmentStatusBadge, AppointmentTypeBadge } from '../appointments/badges';
import { APPOINTMENT_TYPE_LABELS, ENCOUNTER_TYPE_LABELS, formatDateTime, formatShortDate, formatShortDateTime, formatTime, formatTimeRange, shouldShowEncounterTypeBadge, wasEdited } from '../../lib/format';
import { buildPatientActivity } from '../../lib/patient-activity';

function AppointmentRow({ patientId, appointment, pastDate = false }: { patientId: string; appointment: Appointment; pastDate?: boolean }) {
  return <div className="appt-row patient-appointment-row">
    <div className="patient-appointment-info">
      <Link href={`/patients/${patientId}/citas/${appointment.id}`} className="appt-row-date" title={formatDateTime(appointment.startAt)}>
        {formatShortDate(appointment.startAt)}<span className="appt-row-range"> · {formatTimeRange(appointment.startAt, appointment.durationMinutes)}</span>
      </Link>
      <div className="patient-appointment-meta"><span className="faint">Tipo:</span><AppointmentTypeBadge type={appointment.type} /><AppointmentStatusBadge status={appointment.status} /></div>
      {pastDate ? <span className="field-hint">Fecha pasada · sigue programada</span> : null}
    </div>
    <div className="actions">
      <Link href={`/patients/${patientId}/citas/${appointment.id}`} className="btn btn-ghost btn-sm">Ver cita</Link>
      {appointment.linkedEncounterId ? <Link href={`/patients/${patientId}/consultas/${appointment.linkedEncounterId}`} className="btn btn-secondary btn-sm">Ver consulta</Link>
        : appointment.status === 'scheduled' ? <Link href={`/patients/${patientId}/consultas/nueva?appointmentId=${encodeURIComponent(appointment.id)}`} className="btn btn-secondary btn-sm">Iniciar consulta</Link> : null}
    </div>
  </div>;
}

function HistoryRow({ patientId, item }: { patientId: string; item: ReturnType<typeof buildPatientActivity<Appointment, EncounterSummary>>[number] }) {
  if (item.kind === 'appointment') {
    const appointment = item.value;
    return <li className="timeline-item patient-activity-appointment">
      <div className="timeline-entry-content">
        <Link href={`/patients/${patientId}/citas/${appointment.id}`} className="timeline-link">
          <div className="timeline-entry-meta">
            <time className="timeline-date" dateTime={appointment.startAt} title={formatDateTime(appointment.startAt)}>{formatShortDate(appointment.startAt)}</time>
            <time className="timeline-time" dateTime={appointment.startAt}>{formatTime(appointment.startAt)}</time>
            <span className="badge badge-type">Cita</span><AppointmentStatusBadge status={appointment.status} />
          </div>
          <span className="timeline-reason">{APPOINTMENT_TYPE_LABELS[appointment.type]} · {appointment.durationMinutes} min</span>
        </Link>
        <div className="activity-actions"><Link href={`/patients/${patientId}/citas/${appointment.id}`} className="btn btn-ghost btn-sm">Ver cita</Link>
          {appointment.linkedEncounterId ? <Link href={`/patients/${patientId}/consultas/${appointment.linkedEncounterId}`} className="btn btn-secondary btn-sm">Ver consulta</Link> : null}
        </div>
      </div>
    </li>;
  }

  const encounter = item.value;
  const edited = wasEdited(encounter.createdAt, encounter.updatedAt);
  return <li className="timeline-item patient-activity-consultation">
    <Link href={`/patients/${patientId}/consultas/${encounter.id}`} className="timeline-link">
      <div className="timeline-entry-content">
        <div className="timeline-entry-meta">
          <time className="timeline-date" dateTime={encounter.occurredAt} title={formatDateTime(encounter.occurredAt)}>{formatShortDate(encounter.occurredAt)}</time>
          <time className="timeline-time" dateTime={encounter.occurredAt}>{formatTime(encounter.occurredAt)}</time>
            <span className="badge badge-type">Consulta</span>
            {shouldShowEncounterTypeBadge(encounter.type) ? <span className="badge badge-type">{ENCOUNTER_TYPE_LABELS[encounter.type]}</span> : null}
        </div>
        <span className="timeline-reason">{encounter.reason || <em className="faint">Sin motivo registrado</em>}</span>
        {edited ? <span className="edited">Actualizada {formatShortDateTime(encounter.updatedAt)}</span> : null}
      </div>
    </Link>
  </li>;
}

export function PatientActivityHistory({ patientId, appointments, encounters }: {
  patientId: string; appointments: Appointment[]; encounters: EncounterSummary[];
}) {
  const activity = buildPatientActivity(appointments, encounters);
  const consultationCount = activity.filter(item => item.kind === 'consultation').length;
  const appointmentCount = activity.length - consultationCount;
  const summary = `${consultationCount} ${consultationCount === 1 ? 'consulta' : 'consultas'} · ${appointmentCount} ${appointmentCount === 1 ? 'cita' : 'citas'}`;
  return <section className="card" aria-labelledby="activity-history-title">
    <div className="card-header"><h2 id="activity-history-title">Historial de atención</h2><span className="faint">{summary}</span></div>
    {!activity.length ? <p className="faint">Aún no hay citas concluidas ni consultas registradas.</p>
      : <ul className="timeline patient-activity-history">{activity.map(item => <HistoryRow key={`${item.kind}-${item.id}`} patientId={patientId} item={item} />)}</ul>}
  </section>;
}

export { AppointmentRow };
