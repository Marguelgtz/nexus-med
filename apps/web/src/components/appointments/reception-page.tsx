import { notFound } from 'next/navigation';
import { z } from 'zod';
import { appointmentSchema, patientSummarySchema, studyReceiptSchema } from '@nexus-med/contracts';
import { addDays, instantAtLocalTime, isValidCalendarDate, practiceToday } from '../../lib/format';
import { fetchServer } from '../../lib/api/server';
import { ErrorBanner } from '../primitives';
import { ReceptionWorkspace } from './reception-workspace';
export async function ReceptionPage({ searchParams, administrative }: { searchParams: Promise<{ fecha?: string; seccion?: string }>; administrative: boolean }) {
  const query = await searchParams;
  const date = query.fecha ?? practiceToday();
  if (!isValidCalendarDate(date)) notFound();
  const section = administrative && (query.seccion === 'pacientes' || query.seccion === 'estudios') ? query.seccion : 'agenda';
  const range = new URLSearchParams({ from: instantAtLocalTime(date, 0, 0).toISOString(), to: instantAtLocalTime(addDays(date, 1), 0, 0).toISOString() });
  const [appointments, queue, patients, receipts] = await Promise.all([
    fetchServer(`/api/appointments?${range}`, z.array(appointmentSchema)),
    fetchServer('/api/reception', z.array(appointmentSchema)),
    fetchServer('/api/patients?status=all', z.array(patientSummarySchema)),
    section === 'estudios' ? fetchServer('/api/study-receipts?view=administrative&review=all', z.array(studyReceiptSchema)) : Promise.resolve({ ok: true as const, data: [] }),
  ]);
  const failed = [appointments, queue, patients, receipts].find(result => !result.ok);
  if (failed && !failed.ok) return <ErrorBanner message={failed.notFound ? 'No se pudo cargar el espacio de trabajo.' : failed.error} retryHref={administrative ? '/secretaria' : '/recepcion'} />;
  if (!appointments.ok || !queue.ok || !patients.ok || !receipts.ok) return null;
  return <ReceptionWorkspace asOf={new Date().toISOString()} appointments={appointments.data} queue={queue.data} patients={patients.data} receipts={receipts.data} date={date} administrative={administrative} section={section} />;
}
