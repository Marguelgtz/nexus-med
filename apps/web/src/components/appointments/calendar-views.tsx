// Calendar views (UI_SPEC §7.1): day (time grid), week (7 columns),
// month (grid of chips). Pure server components — navigation happens
// through <Link>, so no client state is needed here.

import Link from 'next/link';
import type { Appointment } from '@nexus-med/contracts';

import {
  formatDayHeader,
  formatTime,
  localDateOfInstant,
  monthGrid,
  practiceToday,
  sameMonth,
  weekDays,
} from '../../lib/format';

const DAY_START_HOUR = 6;
const DAY_END_HOUR = 22;
const HOUR_HEIGHT = 56; // px per hour in the day grid

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
      top: ((start - DAY_START_HOUR * 60) / 60) * HOUR_HEIGHT,
      height: Math.max((appt.durationMinutes / 60) * HOUR_HEIGHT, 24),
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
  const dayAppts = appointments.filter((a) => localDateOfInstant(a.startAt) === fecha);
  const placed = placeBlocks(dayAppts);
  const hours = Array.from({ length: DAY_END_HOUR - DAY_START_HOUR }, (_, i) => DAY_START_HOUR + i);

  return (
    <div className="day-grid">
      <div className="day-grid-body">
        {hours.map((h) => (
          <div className="day-grid-hour" key={h}>
            <span className="day-grid-label">{String(h).padStart(2, '0')}:00</span>
          </div>
        ))}
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
        {dayAppts.length === 0 ? (
          <div className="empty empty-inline">Sin citas en este día.</div>
        ) : null}
      </div>
    </div>
  );
}

function WeekColumn({ day, appointments }: { day: string; appointments: Appointment[] }) {
  const today = practiceToday();
  const items = appointments.filter((a) => localDateOfInstant(a.startAt) === day);
  const visible = items.slice(0, 8);
  return (
    <div className={`cal-week-col${day === today ? ' cal-today-col' : ''}`}>
      <Link href={`/calendar?vista=dia&fecha=${day}`} className="cal-col-head">
        {formatDayHeader(day)}
      </Link>
      <div className="cal-col-items">
        {visible.map((appt) => (
          <Link key={appt.id} href={apptHref(appt)} className={chipClasses(appt, today)}>
            {formatTime(appt.startAt)} {appt.patient.fullName}
          </Link>
        ))}
        {items.length > visible.length ? (
          <Link href={`/calendar?vista=dia&fecha=${day}`} className="cal-more">
            +{items.length - visible.length} más
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

function MonthCell({ day, appointments }: { day: string; appointments: Appointment[] }) {
  const today = practiceToday();
  const items = appointments.filter((a) => localDateOfInstant(a.startAt) === day);
  const visible = items.slice(0, 3);
  return (
    <div className={`cal-month-cell${day === today ? ' cal-today-col' : ''}`}>
      <Link href={`/calendar?vista=dia&fecha=${day}`} className="cal-month-daynum">
        {Number(day.slice(8, 10))}
      </Link>
      <div className="cal-month-items">
        {visible.map((appt) => (
          <Link key={appt.id} href={apptHref(appt)} className={chipClasses(appt, today)}>
            {formatTime(appt.startAt)} {appt.patient.fullName}
          </Link>
        ))}
        {items.length > visible.length ? (
          <Link href={`/calendar?vista=dia&fecha=${day}`} className="cal-more">
            +{items.length - visible.length}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

export function MonthView({ fecha, appointments }: { fecha: string; appointments: Appointment[] }) {
  return (
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
          <MonthCell day={day} appointments={appointments} />
        </div>
      ))}
    </div>
  );
}
