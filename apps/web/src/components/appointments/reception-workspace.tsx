'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AdministrativePatient, Appointment, PatientSummary, StudyReceipt } from '@nexus-med/contracts';
import { cancelAppointment, completeAppointment, getAdministrativePatient, updateReception } from '../../lib/api/client';
import { addDays, APPOINTMENT_TYPE_LABELS, formatAge, formatDayLong, formatTime, formatDateTime } from '../../lib/format';
import { NewPatientForm } from '../patients/new-patient-form';
import { EditPatientForm } from '../patients/edit-patient-form';
import { PatientPicker } from '../patients/patient-picker';
import { ReceivedStudies } from '../receipts/received-studies';
import { AppointmentForm } from './appointment-form';

type Patient = { id: string; fullName: string };
type Dialog = null | { kind: 'picker' } | { kind: 'new'; scheduleAfter: boolean } | { kind: 'appointment'; patient: Patient; initial?: Appointment } | { kind: 'patient'; patient: AdministrativePatient };
export function ReceptionWorkspace({ appointments, queue, patients, receipts, date, administrative, section }: {
  appointments: Appointment[]; queue: Appointment[]; patients: PatientSummary[]; receipts: StudyReceipt[];
  date: string; administrative: boolean; section: 'agenda' | 'pacientes' | 'estudios';
}) {
  const router = useRouter();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const base = administrative ? '/secretaria' : '/recepcion';
  const refresh = () => startTransition(() => router.refresh());
  const waiting = queue.filter(a => !a.attentionStartedAt);
  const attending = queue.filter(a => a.attentionStartedAt);
  useEffect(() => {
    if (dialog || section !== 'agenda' || busy) return;
    const timer = window.setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, 15000);
    const onFocus = () => router.refresh();
    window.addEventListener('focus', onFocus);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', onFocus); };
  }, [dialog, section, busy, router]);
  async function perform(operation: () => Promise<unknown>, success: string) {
    setError(null); setMessage(null); setBusy(true);
    try { await operation(); setMessage(success); refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar el cambio.'); }
    finally { setBusy(false); }
  }
  async function editPatient(patient: PatientSummary) {
    setBusy(true); setError(null);
    try { setDialog({ kind: 'patient', patient: await getAdministrativePatient(patient.id) }); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo cargar al paciente.'); }
    finally { setBusy(false); }
  }
  const disabled = busy || refreshing;
  const filtered = patients.filter(p => `${p.fullName} ${p.externalIdentifier ?? ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  function appointmentActions(a: Appointment) {
    return <div className="actions">
      {a.status === 'scheduled' && !a.arrivedAt ? <button className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => perform(() => updateReception(a.id, { action: 'arrive' }), 'Llegada registrada. El paciente aparece en recepción.')}>Registrar llegada</button> : null}
      {a.status !== 'completed' ? <button className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => setDialog({ kind: 'appointment', patient: a.patient, initial: a })}>Reprogramar</button> : null}
      {a.status === 'scheduled' ? <button className="btn btn-ghost-danger btn-sm" disabled={disabled} onClick={() => { if (window.confirm(`¿Cancelar la cita de ${a.patient.fullName}?`)) void perform(() => cancelAppointment(a.id), 'Cita cancelada.'); }}>Cancelar cita</button> : null}
    </div>;
  }
  return <>
    <header className="page-head"><div><p className="section-label">{administrative ? 'Gestión del consultorio' : 'Atención del día'}</p><h1>{administrative ? 'Secretaría' : 'Recepción'}</h1><p className="muted">Agenda, pacientes y coordinación de la atención.</p></div><div className="actions"><button className="btn btn-primary" onClick={() => setDialog({ kind: 'picker' })}>Nueva cita</button><button className="btn btn-secondary" onClick={() => setDialog({ kind: 'new', scheduleAfter: false })}>Nuevo paciente</button></div></header>
    {administrative ? <nav className="workspace-tabs" aria-label="Trabajo de secretaría">{(['agenda', 'pacientes', 'estudios'] as const).map(tab => <Link key={tab} href={`${base}?seccion=${tab}&fecha=${date}`} aria-current={tab === section ? 'page' : undefined}>{tab === 'agenda' ? 'Hoy y agenda' : tab === 'pacientes' ? 'Pacientes' : 'Estudios recibidos'}</Link>)}</nav> : null}
    {error ? <p role="alert" className="error">{error}</p> : null}{message ? <p role="status" className="notice">{message}</p> : null}
    {section === 'estudios' ? <ReceivedStudies receipts={receipts} patients={patients} administrative={administrative} /> : section === 'pacientes' ? <section aria-label="Pacientes administrativos">
      <div className="workspace-toolbar"><div className="field"><label htmlFor="admin-patient-search">Buscar paciente por nombre o identificador</label><input id="admin-patient-search" type="search" value={query} onChange={e => setQuery(e.target.value)} /></div><span className="muted">{filtered.length} pacientes</span></div>
      <ul className="admin-patient-list">{filtered.map(patient => <li key={patient.id}><div><strong>{patient.fullName}</strong><p className="field-hint">{patient.externalIdentifier ?? 'Sin identificador'} · {formatAge(patient.dateOfBirth) !== null ? `${formatAge(patient.dateOfBirth)} años` : 'Edad sin registro'}{patient.isArchived ? ' · Archivado' : ''}</p></div><div className="actions"><button className="btn btn-secondary btn-sm" disabled={disabled} onClick={() => editPatient(patient)}>Datos y contacto</button>{!patient.isArchived ? <button className="btn btn-ghost btn-sm" onClick={() => setDialog({ kind: 'appointment', patient })}>Nueva cita</button> : null}</div></li>)}</ul>
      {!filtered.length ? <div className="workspace-empty"><h2>No hay coincidencias</h2><p>Revisa el nombre o registra un nuevo paciente.</p></div> : null}
    </section> : <>
      <div className="workspace-toolbar"><form action={base} className="workspace-date"><input type="hidden" name="seccion" value="agenda" /><label htmlFor="reception-date">Fecha de agenda</label><input id="reception-date" name="fecha" type="date" defaultValue={date} required /><button className="btn btn-secondary btn-sm">Ver</button></form><div className="actions"><Link href={`${base}?fecha=${addDays(date, -1)}`} className="btn btn-ghost btn-sm" aria-label="Día anterior">‹</Link><Link href={base} className="btn btn-ghost btn-sm">Hoy</Link><Link href={`${base}?fecha=${addDays(date, 1)}`} className="btn btn-ghost btn-sm" aria-label="Día siguiente">›</Link><button className="btn btn-secondary btn-sm" onClick={refresh} disabled={disabled}>{refreshing ? 'Actualizando…' : 'Actualizar'}</button></div></div>
      <div className="reception-grid"><section className="reception-agenda" aria-labelledby="agenda-title"><div className="card-header"><h2 id="agenda-title">{formatDayLong(date)}</h2><span className="muted">{appointments.length} {appointments.length === 1 ? 'cita' : 'citas'}</span></div>
        {!appointments.length ? <div className="workspace-empty"><h3>La agenda está libre</h3><p className="muted">Puedes programar una cita o registrar una atención sin cita previa.</p><button className="btn btn-secondary" onClick={() => setDialog({ kind: 'picker' })}>Agendar paciente</button></div> : <ul className="reception-appointments">{appointments.map(a => <li key={a.id} className={a.status === 'cancelled' ? 'appointment-cancelled' : ''}><div className="reception-time"><strong>{formatTime(a.startAt)}</strong><span>{a.durationMinutes} min</span></div><div className="reception-person"><strong>{a.patient.fullName}</strong><p className="field-hint">{APPOINTMENT_TYPE_LABELS[a.type]} · {a.status === 'completed' ? 'Completada' : a.status === 'cancelled' ? 'Cancelada' : a.attentionStartedAt ? 'En atención' : a.arrivedAt ? 'En espera' : 'Por llegar'}</p>{appointmentActions(a)}</div></li>)}</ul>}
      </section><aside className="reception-queue" aria-labelledby="queue-title"><div className="card-header"><h2 id="queue-title">Recepción compartida</h2><span className="badge badge-edited">{waiting.length} en espera</span></div><p className="field-hint">Llegadas pendientes de finalizar, incluidas las de otra fecha. Se actualiza cada 15 segundos.</p>
        {!queue.length ? <div className="workspace-empty"><h3>Nadie en espera</h3><p className="muted">Registra la llegada desde la agenda.</p></div> : <ul className="reception-waiting">{[...attending, ...waiting].map(a => <li key={a.id}><strong>{a.patient.fullName}</strong><span className="badge badge-edited">{a.attentionStartedAt ? 'En atención' : 'En espera'}</span><p className="field-hint">Llegada: {formatDateTime(a.arrivedAt)}</p><div className="actions">{!a.attentionStartedAt ? <><button className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => { if (window.confirm(`¿Corregir la llegada de ${a.patient.fullName}?`)) void perform(() => updateReception(a.id, { action: 'undoArrival' }), 'Llegada corregida.'); }}>Corregir llegada</button>{!administrative ? <button className="btn btn-primary btn-sm" disabled={disabled} onClick={() => perform(() => updateReception(a.id, { action: 'start' }), 'Inicio de atención registrado.')}>Iniciar atención</button> : null}</> : !administrative ? <><Link className="btn btn-primary btn-sm" href={`/patients/${a.patient.id}/consultas/nueva?appointmentId=${a.id}`}>Abrir consulta</Link><button className="btn btn-ghost btn-sm" disabled={disabled} onClick={() => { if (window.confirm(`¿Finalizar la cita de ${a.patient.fullName}? Esto no guarda ni enlaza una nota clínica.`)) void perform(() => completeAppointment(a.id, {}), 'Cita finalizada.'); }}>Finalizar cita</button></> : null}</div></li>)}</ul>}
      </aside></div>
    </>}
    {dialog?.kind === 'picker' ? <PatientPicker title="Nueva cita: elegir paciente" patients={patients} onClose={() => setDialog(null)} onSelect={patient => setDialog({ kind: 'appointment', patient })} onCreate={() => setDialog({ kind: 'new', scheduleAfter: true })} /> : null}
    {dialog?.kind === 'new' ? <NewPatientForm administrative existingPatients={patients} dialogTitle="Registrar paciente" onCancel={() => setDialog(null)} onSaved={patient => { setMessage('Paciente registrado.'); setDialog(dialog.scheduleAfter ? { kind: 'appointment', patient } : null); refresh(); }} /> : null}
    {dialog?.kind === 'patient' ? <EditPatientForm patientId={dialog.patient.id} initial={dialog.patient} administrative dialogTitle={`Datos de ${dialog.patient.fullName}`} onCancel={() => setDialog(null)} onSaved={() => { setDialog(null); setMessage('Datos del paciente guardados.'); refresh(); }} /> : null}
    {dialog?.kind === 'appointment' ? <AppointmentForm patientId={dialog.patient.id} initial={dialog.initial} defaultDate={date} dialogTitle={`${dialog.initial ? 'Reprogramar cita' : 'Nueva cita'} — ${dialog.patient.fullName}`} onCancel={() => setDialog(null)} onSaved={() => { setDialog(null); refresh(); }} onCreated={() => { setDialog(null); setMessage('Cita programada.'); refresh(); }} /> : null}
  </>;
}
