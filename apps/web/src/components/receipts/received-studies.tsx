'use client';
import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PatientSummary, StudyReceipt } from '@nexus-med/contracts';
import { receiptFileUrl, reviewStudyReceipt } from '../../lib/api/client';
import { formatDateTime, formatDate } from '../../lib/format';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';
import { Modal } from '../modal';
import { PatientPicker } from '../patients/patient-picker';
import { ReceiptForm } from './receipt-form';

function ReviewDialog({ receipt, onClose }: { receipt: StudyReceipt; onClose: () => void }) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useBeforeUnloadGuard(!!note && !busy);
  function close() { if (!busy && (!note || window.confirm('Hay una nota de revisión sin guardar. ¿Descartarla?'))) onClose(); }
  return <Modal title="Registrar revisión médica" description={`${receipt.patient.fullName} · ${receipt.title}`} onClose={close} closeDisabled={busy}>
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(null); try { await reviewStudyReceipt(receipt.id, note); onClose(); router.refresh(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); setBusy(false); } }}>
      <p>Abre los archivos antes de registrar la revisión. Esta acción no cambia la solicitud original.</p>
      <div className="field"><label htmlFor="review-note">Nota del médico (opcional)</label><textarea id="review-note" rows={4} value={note} maxLength={1000} disabled={busy} onChange={e => setNote(e.target.value)} /></div>
      {error ? <p role="alert" className="error">{error}</p> : null}
      <div className="btn-row"><button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Marcar como revisado'}</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={close}>Cancelar</button></div>
    </form>
  </Modal>;
}
export function ReceivedStudies({ receipts, patients, administrative = false, fixedPatient, initialEncounterId }: {
  receipts: StudyReceipt[]; patients: PatientSummary[]; administrative?: boolean; fixedPatient?: { id: string; fullName: string }; initialEncounterId?: string;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [query, setQuery] = useState('');
  const [picker, setPicker] = useState(false);
  const [patient, setPatient] = useState<{ id: string; fullName: string } | null>(null);
  const [review, setReview] = useState<StudyReceipt | null>(null);
  useEffect(() => {
    if (picker || patient || review) return;
    const refresh = () => { if (document.visibilityState === 'visible') router.refresh(); };
    const timer = window.setInterval(refresh, 15000);
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refresh); };
  }, [picker, patient, review, router]);
  const pending = receipts.filter(row => !row.reviewedAt).length;
  const rows = receipts.filter(row => (filter === 'all' || !row.reviewedAt) && `${row.title} ${row.patient.fullName}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section className="received-studies" aria-label="Estudios recibidos">
    <div className="page-head"><div><h2>Estudios recibidos</h2><p className="muted" aria-live="polite">{pending} pendiente{pending !== 1 ? 's' : ''} de revisión médica</p></div><div className="actions"><button className="btn btn-primary" onClick={() => fixedPatient ? setPatient(fixedPatient) : setPicker(true)}>Agregar estudio</button><button className="btn btn-ghost" disabled={refreshing} onClick={() => startTransition(() => router.refresh())}>{refreshing ? 'Actualizando…' : 'Actualizar'}</button></div></div>
    <div className="workspace-toolbar"><div className="segmented" role="group" aria-label="Filtrar estudios"><button className={filter === 'pending' ? 'active' : ''} aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>Pendientes ({pending})</button><button className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todos</button></div><div className="field"><label htmlFor="receipt-search">Buscar estudio o paciente</label><input type="search" id="receipt-search" value={query} onChange={e => setQuery(e.target.value)} /></div></div>
    {!rows.length ? <div className="workspace-empty"><h3>{query ? 'Sin coincidencias' : filter === 'pending' ? 'No hay estudios pendientes de revisión' : 'Aún no hay estudios recibidos'}</h3><p className="muted">Los archivos recibidos se conservan en el expediente del paciente.</p></div> : <ul className="receipt-list">{rows.map(row => <li key={row.id}>
      <div className="receipt-heading"><div><h3>{row.title}</h3><p>{administrative ? row.patient.fullName : <Link href={`/patients/${row.patient.id}/estudios`}>{row.patient.fullName}</Link>}</p></div><span className={`badge ${row.reviewedAt ? 'badge-edited' : 'badge-archived'}`}>{row.reviewedAt ? 'Revisado' : 'Pendiente de revisión'}</span></div>
      <p className="field-hint">Recibido: {formatDateTime(row.receivedAt)}{row.studyDate ? ` · Fecha del estudio: ${formatDate(row.studyDate)}` : ''}</p>
      <p className="field-hint">{row.encounter ? `Consulta: ${formatDateTime(row.encounter.occurredAt)}` : 'Asociado al paciente, sin consulta'}{row.requestId ? ' · Con solicitud relacionada' : ' · Sin solicitud previa'}</p>
      {row.receiptNote ? <p className="receipt-note">{row.receiptNote}</p> : null}
      <ul className="receipt-files">{row.files.map(file => <li key={file.id}><a href={receiptFileUrl(file.id)} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" aria-label={`Abrir ${file.name} en otra pestaña`}>{file.mimeType === 'application/pdf' ? 'PDF' : 'Imagen'} · {file.name} ↗</a><span className="field-hint">{Math.ceil(file.size / 1024)} KB</span></li>)}</ul>
      {!administrative && row.reviewNote ? <p className="receipt-note"><strong>Nota del médico: </strong>{row.reviewNote}</p> : null}
      {row.reviewedAt ? <p className="field-hint">Revisión registrada: {formatDateTime(row.reviewedAt)}</p> : !administrative ? <button className="btn btn-ghost" onClick={() => setReview(row)}>Registrar revisión</button> : null}
    </li>)}</ul>}
    {picker ? <PatientPicker title="Agregar estudio: elegir paciente" patients={patients} onClose={() => setPicker(false)} onSelect={selected => { setPicker(false); setPatient(selected); }} /> : null}
    {patient ? <ReceiptForm patient={patient} initialEncounterId={initialEncounterId} onClose={() => setPatient(null)} /> : null}
    {review ? <ReviewDialog receipt={review} onClose={() => setReview(null)} /> : null}
  </section>;
}
