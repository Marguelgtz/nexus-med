// Calendar views (UI_SPEC §7.1): day (time grid), week (7 columns),
// month (grid of chips). Pure server components — navigation happens
// through <Link>, so no client state is needed here.

import Link from 'next/link';
import type { Appointment } from '@nexus-med/contracts';

import {
  CALENDAR_DAY_END_HOUR,
  CALENDAR_DAY_START_HOUR,
  CALENDAR_HOUR_HEIGHT_PX,
  CALENDAR_MAX_CHIPS_PER_DAY,
  splitDayAppointments,
  visibleAppointmentSlice,
} from '../../lib/calendar';
import {
  formatDate,
  formatDayHeader,
  formatTime,
  localDateOfInstant,
  monthGrid,
  practiceToday,
  sameMonth,
  weekDays,
} from '../../lib/format';
import { AppointmentStatusBadge, AppointmentTypeBadge } from './badges';

type Placed = { appt: Appointment; top: number; height: number; left: number; width: number };

function minutesOfDay(iso: string): number {
  const t = formatTime(iso);
  const sep = t.indexOf(':');
  if (sep === -1) return 0;
  return Number(t.slice(0, sep)) * 60 + Number(t.slice(sep + 1));
}

/** Greedy overlap layout: clusters of overlapping blocks share columns. */
function placeBlocks(appts: Appointment[]): Placed[] {
  const sorted = [...appts].sort((a, b) => a.startAt.localeCompare(b.startAt));
  const placed: Placed[] = [];
  let cluster: Placed[] = [];
  let clusterEnd = -1;

  const flush = () => {
    const columns: number[] = []; // end minute per column
    const colOf = new Map<Placed, number>();
    for (const block of cluster) {
      const start = minutesOfDay(block.appt.startAt);
      const end = start + block.appt.durationMinutes;
      let col = columns.findIndex((endMin) => endMin <= start);
      if (col === -1) {
        col = columns.length;
        columns.push(end);
      } else {
        columns[col] = end;
      }
      colOf.set(block, col);
    }
    for (const block of cluster) {
      const col = colOf.get(block) ?? 0;
      block.left = (col * 100) / columns.length;
      block.width = 100 / columns.length;
      placed.push(block);
    }
    cluster = [];
    clusterEnd = -1;
  };

  for (const appt of sorted) {
    const start = minutesOfDay(appt.startAt);
    if (cluster.length > 0 && start >= clusterEnd) flush();
    cluster.push({
      appt,
      top: ((start - CALENDAR_DAY_START_HOUR * 60) / 60) * CALENDAR_HOUR_HEIGHT_PX,
      height: Math.max((appt.durationMinutes / 60) * CALENDAR_HOUR_HEIGHT_PX, 24),
      left: 0,
      width: 100,
    });
    clusterEnd = Math.max(clusterEnd, start + appt.durationMinutes);
  }
  if (cluster.length > 0) flush();
  return placed;
}

function apptHref(appt: Appointment): string {
  return `/patients/${appt.patient.id}/citas/${appt.id}`;
}

function chipClasses(appt: Appointment, today: string): string {
  return [
    'cal-chip',
    `cal-type-${appt.type}`,
    appt.status === 'cancelled' ? 'cal-cancelled' : '',
    localDateOfInstant(appt.startAt) === today ? 'cal-today-item' : '',
  ]
    .filter(Boolean)
    .join(' ');
}

/** Real time grid, 06:00–22:00 (UI_SPEC §7.1). */
export function DayView({ fecha, appointments }: { fecha: string; appointments: Appointment[] }) {
  const { inGrid, outsideHours } = splitDayAppointments(appointments, fecha);
  const placed = placeBlocks(inGrid);
  const hours = Array.from(
    { length: CALENDAR_DAY_END_HOUR - CALENDAR_DAY_START_HOUR },
    (_, i) => CALENDAR_DAY_START_HOUR + i,
  );

  return (
    <>
      <div className="day-grid">
        <div className="day-grid-body">
          {hours.map((h) => (
            <div className="day-grid-hour" key={h}>
              <span className="day-grid-label">{String(h).padStart(2, '0')}:00</span>
            </div>
          ))}
          <div className="day-grid-end">
            <span className="day-grid-label">{String(CALENDAR_DAY_END_HOUR).padStart(2, '0')}:00</span>
          </div>
          {placed.map(({ appt, top, height, left, width }) => (
            <Link
              key={appt.id}
              href={apptHref(appt)}
              className={`cal-block cal-type-${appt.type}${appt.status === 'cancelled' ? ' cal-cancelled' : ''}`}
              style={{ top, height, left: `${left}%`, width: `calc(${width}% - 4px)` }}
            >
              <strong>{formatTime(appt.startAt)}</strong> {appt.patient.fullName}
            </Link>
          ))}
          {inGrid.length === 0 && outsideHours.length === 0 ? (
            <div className="empty empty-inline">Sin citas en este día.</div>
          ) : null}
        </div>
      </div>
      {outsideHours.length > 0 ? (
        <section className="calendar-outside-hours" aria-labelledby="outside-hours-heading">
          <h2 id="outside-hours-heading">Fuera del horario mostrado (06:00–22:00)</h2>
          <ul>
            {outsideHours.map((appt) => (
              <li key={appt.id}>
                <Link href={apptHref(appt)} className="calendar-outside-link">
                  <time>{formatTime(appt.startAt)}</time>
                  <span className="calendar-outside-name">{appt.patient.fullName}</span>
                  <AppointmentTypeBadge type={appt.type} />
                  <AppointmentStatusBadge status={appt.status} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function WeekColumn({ day, appointments }: { day: string; appointments: Appointment[] }) {
  const today = practiceToday();
  const items = appointments.filter((a) => localDateOfInstant(a.startAt) === day);
  const { visible, remaining } = visibleAppointmentSlice(items, CALENDAR_MAX_CHIPS_PER_DAY);
  return (
    <div className={`cal-week-col${day === today ? ' cal-today-col' : ''}`}>
      <Link href={`/calendar?vista=dia&fecha=${day}`} className="cal-col-head">
        {formatDayHeader(day)}
      </Link>
      <div className="cal-col-items">
        {visible.map((appt) => (
          <Link key={appt.id} href={apptHref(appt)} title={`${formatTime(appt.startAt)} ${appt.patient.fullName}`} className={chipClasses(appt, today)}>
            {formatTime(appt.startAt)} {appt.patient.fullName}
          </Link>
        ))}
        {remaining > 0 ? (
          <Link href={`/calendar?vista=dia&fecha=${day}`} className="cal-more">
            +{remaining} más
          </Link>
        ) : null}
        {items.length === 0 ? <span className="faint">—</span> : null}
      </div>
    </div>
  );
}

export function WeekView({ fecha, appointments }: { fecha: string; appointments: Appointment[] }) {
  return (
    <div className="week-grid">
      {weekDays(fecha).map((day) => (
        <WeekColumn key={day} day={day} appointments={appointments} />
      ))}
    </div>
  );
}

function MonthCell({ day, month, selectedDay, appointments }: {
  day: string;
  month: string;
  selectedDay: string;
  appointments: Appointment[];
}) {
  const today = practiceToday();
  const items = appointments.filter((a) => localDateOfInstant(a.startAt) === day);
  const { visible, remaining } = visibleAppointmentSlice(items);
  const isSelected = selectedDay === day;
  const dayNumber = Number(day.slice(8, 10));
  const monthForSelection = sameMonth(day, month) ? month : day;
  return (
    <div className={`cal-month-cell${day === today ? ' cal-today-col' : ''}${isSelected ? ' cal-month-selected' : ''}`}>
      <Link href={`/calendar?vista=dia&fecha=${day}`} aria-label={`Ver citas del ${formatDate(day)}`} className="cal-month-daynum cal-month-open-day">
        {dayNumber}
      </Link>
      <Link
        href={`/calendar?vista=mes&fecha=${monthForSelection}&dia=${day}`}
        aria-label={`Seleccionar ${formatDate(day)}${items.length ? `, ${items.length} ${items.length === 1 ? 'cita' : 'citas'}` : ', sin citas'}`}
        aria-current={isSelected ? 'date' : undefined}
        className="cal-month-daynum cal-month-select-day"
      >
        {dayNumber}
      </Link>
      <span className="cal-month-count" aria-hidden="true">
        {items.length || ''}
      </span>
      <div className="cal-month-items">
        {visible.map((appt) => (
          <Link key={appt.id} href={apptHref(appt)} title={`${formatTime(appt.startAt)} ${appt.patient.fullName}`} className={chipClasses(appt, today)}>
            {formatTime(appt.startAt)} {appt.patient.fullName}
          </Link>
        ))}
        {remaining > 0 ? (
          <Link href={`/calendar?vista=dia&fecha=${day}`} className="cal-more">
            +{remaining}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function MonthAgenda({ selectedDay, appointments }: { selectedDay: string; appointments: Appointment[] }) {
  const dayItems = appointments
    .filter((appointment) => localDateOfInstant(appointment.startAt) === selectedDay)
    .sort((left, right) => left.startAt.localeCompare(right.startAt));

  return (
    <section className="month-agenda" aria-labelledby="month-agenda-title">
      <div className="month-agenda-head">
        <h2 id="month-agenda-title">Citas · {formatDate(selectedDay)}</h2>
        <span className="faint">{dayItems.length}</span>
      </div>
      {dayItems.length === 0 ? (
        <p className="faint">Sin citas para este día.</p>
      ) : (
        <ul>
          {dayItems.map((appointment) => (
            <li key={appointment.id}>
              <Link href={apptHref(appointment)} className="month-agenda-item">
                <time dateTime={appointment.startAt}>{formatTime(appointment.startAt)}</time>
                <span className="month-agenda-patient">{appointment.patient.fullName}</span>
                <AppointmentTypeBadge type={appointment.type} />
                <AppointmentStatusBadge status={appointment.status} />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function MonthView({ fecha, appointments, selectedDay }: {
  fecha: string;
  appointments: Appointment[];
  selectedDay: string;
}) {
  return (
    <>
      <div className="month-grid">
        <div className="month-head">
          {['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'].map((d) => (
            <span key={d} className="faint">
              {d}
            </span>
          ))}
        </div>
        {monthGrid(fecha).map((day) => (
          <div className={`cal-month-wrap${sameMonth(day, fecha) ? '' : ' dimmed'}`} key={day}>
            <MonthCell day={day} month={fecha} selectedDay={selectedDay} appointments={appointments} />
          </div>
        ))}
      </div>
      <MonthAgenda selectedDay={selectedDay} appointments={appointments} />
    </>
  );
}
