// Calendar (UI_SPEC §7.1): one route, three views (dia/semana/mes),
// Monday-start weeks, today highlighted, navigation via query params.
// SSR fetches the appointments for the visible range; the views render
// pure markup and navigate through links (no client state).

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';

import { appointmentSchema } from '@nexus-med/contracts';

import { DayView, MonthView, WeekView } from '../../components/appointments/calendar-views';
import { ErrorBanner } from '../../components/primitives';
import { fetchServer } from '../../lib/api/server';
import {
  addDays,
  formatDayLong,
  formatMonthLong,
  instantAtLocalTime,
  isValidCalendarDate,
  practiceToday,
  startOfMonth,
  weekDays,
} from '../../lib/format';

export const dynamic = 'force-dynamic';

type Vista = 'dia' | 'semana' | 'mes';
const VISTAS: Vista[] = ['dia', 'semana', 'mes'];

function rangeForVista(vista: Vista, fecha: string): { from: string; to: string } {
  const dayStart = (d: string) => instantAtLocalTime(d, 0, 0).toISOString();
  const dayEnd = (d: string) => instantAtLocalTime(addDays(d, 1), 0, 0).toISOString();
  switch (vista) {
    case 'dia':
      return { from: dayStart(fecha), to: dayEnd(fecha) };
    case 'semana': {
      const days = weekDays(fecha);
      return { from: dayStart(days[0] ?? fecha), to: dayEnd(days[6] ?? addDays(fecha, 6)) };
    }
    case 'mes': {
      // monthGrid bounds: from the Monday before the 1st to the day after
      // the last grid cell (the grid is always rectangular, 5–6 weeks).
      const first = startOfMonth(fecha);
      const gridStart = (() => {
        const dow = new Date(Date.UTC(Number(first.slice(0, 4)), Number(first.slice(5, 7)) - 1, 1)).getUTCDay();
        return addDays(first, dow === 0 ? -6 : 1 - dow);
      })();
      const nextMonthFirst = startOfMonth(addDays(first, 32));
      const gridEnd = addDays(nextMonthFirst, 28); // covers all grid cells
      return { from: dayStart(gridStart), to: dayEnd(addDays(gridEnd, 1)) };
    }
  }
  throw new Error(`Vista desconocida: ${vista as string}`);
}

function labelForVista(vista: Vista, fecha: string): string {
  if (vista === 'dia') return formatDayLong(fecha);
  if (vista === 'mes') return formatMonthLong(fecha);
  const days = weekDays(fecha);
  return `Semana del ${formatDayLong(days[0] ?? fecha).replace(/^\w+, /, '').toLowerCase()}`;
}

function stepDate(vista: Vista, fecha: string, dir: -1 | 1): string {
  if (vista === 'dia') return addDays(fecha, dir);
  if (vista === 'semana') return addDays(fecha, 7 * dir);
  const first = startOfMonth(fecha);
  return dir === -1 ? addDays(first, -1) : addDays(startOfMonth(addDays(first, 32)), 0);
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; fecha?: string }>;
}) {
  const { vista: vistaParam, fecha: fechaParam } = await searchParams;
  const vista: Vista = VISTAS.includes(vistaParam as Vista) ? (vistaParam as Vista) : 'semana';
  const today = practiceToday();
  if (fechaParam !== undefined && !isValidCalendarDate(fechaParam)) notFound();
  const fecha = fechaParam ?? today;
  const label = labelForVista(vista, fecha);
  const hoyHref = `/calendar?vista=${vista}&fecha=${today}`;

  const res = await fetchServer(
    `/api/appointments?from=${encodeURIComponent(rangeForVista(vista, fecha).from)}&to=${encodeURIComponent(
      rangeForVista(vista, fecha).to,
    )}`,
    z.array(appointmentSchema),
  );

  if (!res.ok) {
    if (res.notFound) {
      // Range queries never 404, but guard anyway.
      return (
        <>
          <h1>Calendario</h1>
          <p className="faint">Sin datos disponibles.</p>
        </>
      );
    }
    return (
      <>
        <h1>Calendario</h1>
        <ErrorBanner message={res.error} retryHref={`/calendar?vista=${vista}&fecha=${fecha}`} />
      </>
    );
  }

  const appointments = res.data;

  return (
    <>
      <div className="page-head">
        <h1>{label}</h1>
        <div className="actions">
          <div className="view-toggle" role="group" aria-label="Vista del calendario">
            {VISTAS.map((v) => (
              <Link
                key={v}
                href={`/calendar?vista=${v}&fecha=${fecha}`}
                aria-current={v === vista ? 'page' : undefined}
                className={`btn btn-sm ${v === vista ? 'btn-secondary active-toggle' : 'btn-ghost'}`}
              >
                {v === 'dia' ? 'Día' : v === 'semana' ? 'Semana' : 'Mes'}
              </Link>
            ))}
          </div>
          <div className="cal-nav">
            <Link href={`/calendar?vista=${vista}&fecha=${stepDate(vista, fecha, -1)}`} aria-label="Periodo anterior" className="btn btn-ghost btn-sm">
              ‹
            </Link>
            <Link href={hoyHref} className="btn btn-ghost btn-sm">
              Hoy
            </Link>
            <Link href={`/calendar?vista=${vista}&fecha=${stepDate(vista, fecha, 1)}`} aria-label="Periodo siguiente" className="btn btn-ghost btn-sm">
              ›
            </Link>
          </div>
        </div>
      </div>

      {vista === 'dia' ? (
        <DayView fecha={fecha} appointments={appointments} />
      ) : vista === 'semana' ? (
        <WeekView fecha={fecha} appointments={appointments} />
      ) : (
        <MonthView fecha={fecha} appointments={appointments} />
      )}
    </>
  );
}
