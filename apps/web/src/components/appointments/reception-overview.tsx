import type { Appointment } from '@nexus-med/contracts';
import { summarizeReception } from '../../lib/reception-summary';
import { APPOINTMENT_TYPE_LABELS, formatTime, practiceToday } from '../../lib/format';
import { Icon, type IconName } from '../icon';

export function ReceptionOverview({ appointments, queue, date, asOf }: {
  appointments: Appointment[]; queue: Appointment[]; date: string; asOf: string;
}) {
  const summary = summarizeReception(appointments, queue, asOf);
  const metrics: { label: string; value: number; detail: string; icon: IconName }[] = [
    { label: date === practiceToday(new Date(asOf)) ? 'Citas de hoy' : 'Citas del día', value: summary.total, detail: `${summary.cancelled} canceladas`, icon: 'calendar' },
    { label: 'En espera', value: summary.waiting, detail: 'Recepción · todas las fechas', icon: 'users' },
    { label: 'En consulta', value: summary.attending, detail: 'Recepción · todas las fechas', icon: 'activity' },
    { label: 'Completadas', value: summary.completed, detail: 'De la fecha seleccionada', icon: 'document' },
  ];
  return <section className="reception-overview" aria-label="Resumen de recepción">
    <div className="reception-metrics">{metrics.map(metric => <div className="reception-metric" key={metric.label}>
      <span className="metric-icon"><Icon name={metric.icon} /></span>
      <span className="metric-label">{metric.label}</span><strong>{metric.value}</strong><span className="metric-detail">{metric.detail}</span>
    </div>)}</div>
    <div className="reception-briefing">
      <div className="reception-next"><span className="briefing-symbol"><Icon name="calendar" /></span><div>
        <p className="section-label">Siguiente en agenda</p>
        {summary.next ? <><h2>{formatTime(summary.next.startAt)} <span>· {summary.next.patient.fullName}</span></h2><p className="muted">{APPOINTMENT_TYPE_LABELS[summary.next.type]} · {summary.next.durationMinutes} min · Pendiente de llegada</p></> : <><h2>Sin próximas citas por recibir</h2><p className="muted">No hay citas futuras pendientes de llegada en esta fecha.</p></>}
      </div><a className="btn btn-ghost btn-sm" href="#agenda-title">Ver agenda <Icon name="arrow" /></a></div>
      <div className="reception-progress"><div><span>Avance de la agenda</span><strong>{summary.completed} / {summary.total}</strong></div>
        <progress max={summary.total || 1} value={summary.completed} aria-label="Citas completadas de la fecha" />
        <p>{summary.plannedMinutes} min programados{summary.total === 0 ? ' · Sin citas en esta fecha' : ' · Sin incluir canceladas'}</p>
      </div>
    </div>
  </section>;
}
