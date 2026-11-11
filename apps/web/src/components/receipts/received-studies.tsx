'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import type { PatientSummary, StudyReceipt } from '@nexus-med/contracts';
import { listStudyReceipts, receiptFileUrl, reviewStudyReceipt } from '../../lib/api/client';
import { formatDateTime, formatDate, formatTime } from '../../lib/format';
import { SHARED_REFRESH_INTERVAL_MS } from '../../lib/refresh-policy';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';
import { Modal } from '../modal';
import { PatientPicker } from '../patients/patient-picker';
import { ReceiptForm } from './receipt-form';
import { Icon } from '../icon';

function ReviewDialog({ receipt, onClose, onSaved }: { receipt: StudyReceipt; onClose: () => void; onSaved: (receipt: StudyReceipt) => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useBeforeUnloadGuard(!!note && !busy);
  function close() { if (!busy && (!note || window.confirm('Hay una nota de revisión sin guardar. ¿Descartarla?'))) onClose(); }
  return <Modal title="Registrar revisión médica" description={`${receipt.patient.fullName} · ${receipt.title}`} onClose={close} closeDisabled={busy}>
    <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(null); try { const saved = await reviewStudyReceipt(receipt.id, note); onSaved(saved); onClose(); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); setBusy(false); } }}>
      <p>Abre los archivos antes de registrar la revisión. Esta acción no cambia la solicitud original.</p>
      <div className="field"><label htmlFor="review-note">Nota del médico (opcional)</label><textarea id="review-note" rows={4} value={note} maxLength={1000} disabled={busy} onChange={e => setNote(e.target.value)} /></div>
      {error ? <p role="alert" className="error">{error}</p> : null}
      <div className="btn-row"><button className="btn btn-primary" disabled={busy}>{busy ? 'Guardando…' : 'Marcar como revisado'}</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={close}>Cancelar</button></div>
    </form>
  </Modal>;
}
export function ReceivedStudies({ receipts, patients, administrative = false, fixedPatient, initialEncounterId, asOf }: {
  receipts: StudyReceipt[]; patients: PatientSummary[]; administrative?: boolean; fixedPatient?: { id: string; fullName: string }; initialEncounterId?: string; asOf?: string;
}) {
  const [receiptRows, setReceiptRows] = useState(receipts);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<string | null>(asOf ?? null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);
  const refreshInProgress = useRef(false);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [query, setQuery] = useState('');
  const [picker, setPicker] = useState(false);
  const [patient, setPatient] = useState<{ id: string; fullName: string } | null>(null);
  const [review, setReview] = useState<StudyReceipt | null>(null);
  const refreshReceipts = useCallback(async () => {
    if (refreshInProgress.current) return;
    refreshInProgress.current = true;
    setRefreshing(true);
    try {
      const latest = await listStudyReceipts({
        ...(fixedPatient ? { patientId: fixedPatient.id } : {}),
        view: administrative ? 'administrative' : 'medical',
        review: 'all',
      });
      setReceiptRows(initialEncounterId ? latest.filter(row => row.encounter?.id === initialEncounterId) : latest);
      setLastUpdatedAt(new Date().toISOString());
      setRefreshError(null);
    } catch {
      setRefreshError('No se pudo actualizar esta lista. Los datos visibles se conservaron.');
    } finally {
      refreshInProgress.current = false;
      setRefreshing(false);
    }
  }, [administrative, fixedPatient, initialEncounterId]);
  useEffect(() => {
    if (picker || patient || review) return;
    const refreshIfVisible = () => { if (document.visibilityState === 'visible') void refreshReceipts(); };
    const timer = window.setInterval(refreshIfVisible, SHARED_REFRESH_INTERVAL_MS);
    window.addEventListener('focus', refreshIfVisible);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', refreshIfVisible); };
  }, [picker, patient, review, refreshReceipts]);
  function saveReceipt(receipt: StudyReceipt) {
    if (fixedPatient && receipt.patient.id !== fixedPatient.id) return;
    if (initialEncounterId && receipt.encounter?.id !== initialEncounterId) return;
    setReceiptRows(current => [receipt, ...current.filter(row => row.id !== receipt.id)]
      .sort((left, right) => right.receivedAt.localeCompare(left.receivedAt)));
  }
  const pending = receiptRows.filter(row => !row.reviewedAt).length;
  const rows = receiptRows.filter(row => (filter === 'all' || !row.reviewedAt) && `${row.title} ${row.patient.fullName}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()));
  return <section className="received-studies" aria-label="Estudios">
      <div className="page-head"><div><h2>Estudios</h2><p className="muted">{pending} pendiente{pending !== 1 ? 's' : ''} de revisión médica</p><p className="sync-status">Se actualiza cada 30 segundos{lastUpdatedAt ? ` · Última consulta: ${formatTime(lastUpdatedAt)}` : ''}</p></div><div className="actions"><button className="btn btn-primary" onClick={() => fixedPatient ? setPatient(fixedPatient) : setPicker(true)}>Agregar estudio</button><button className="btn btn-ghost btn-sm btn-icon" type="button" disabled={refreshing} onClick={() => void refreshReceipts()} aria-label={refreshing ? 'Actualizando estudios' : 'Actualizar estudios'} title="Actualizar ahora"><Icon name="refresh" /><span className="sr-only">{refreshing ? 'Actualizando…' : 'Actualizar estudios'}</span></button></div></div>
    {refreshError ? <p className="error" role="alert">{refreshError} <button className="btn btn-ghost btn-sm" onClick={() => void refreshReceipts()}>Reintentar</button></p> : null}
    <div className="workspace-toolbar"><div className="segmented" role="group" aria-label="Filtrar estudios"><button className={filter === 'pending' ? 'active' : ''} aria-pressed={filter === 'pending'} onClick={() => setFilter('pending')}>Pendientes ({pending})</button><button className={filter === 'all' ? 'active' : ''} aria-pressed={filter === 'all'} onClick={() => setFilter('all')}>Todos</button></div><div className="field"><label htmlFor="receipt-search">Buscar estudio o paciente</label><input type="search" id="receipt-search" value={query} onChange={e => setQuery(e.target.value)} /></div></div>
    {!rows.length ? <div className="workspace-empty"><h3>{query ? 'Sin coincidencias' : filter === 'pending' ? 'No hay estudios pendientes de revisión' : 'Aún no hay estudios'}</h3><p className="muted">Los archivos se conservan en el expediente del paciente.</p></div> : <ul className="receipt-list">{rows.map(row => <li key={row.id}>
      <div className="receipt-heading"><div><h3>{row.title}</h3><p>{administrative ? row.patient.fullName : <Link href={`/patients/${row.patient.id}/estudios`}>{row.patient.fullName}</Link>}</p></div><span className={`badge ${row.reviewedAt ? 'badge-edited' : 'badge-archived'}`}>{row.reviewedAt ? 'Revisado' : 'Pendiente de revisión'}</span></div>
      <p className="field-hint">Recibido: {formatDateTime(row.receivedAt)}{row.studyDate ? ` · Fecha del estudio: ${formatDate(row.studyDate)}` : ''}</p>
      <p className="field-hint">{row.encounter ? `Consulta: ${formatDateTime(row.encounter.occurredAt)}` : 'Asociado al paciente, sin consulta'}{row.requestId ? ' · Con solicitud relacionada' : ' · Sin solicitud previa'}</p>
      {row.receiptNote ? <p className="receipt-note">{row.receiptNote}</p> : null}
      <ul className="receipt-files">{row.files.map(file => <li key={file.id}><a href={receiptFileUrl(file.id)} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" aria-label={`Abrir ${file.name} en otra pestaña`}>{file.mimeType === 'application/pdf' ? 'PDF' : 'Imagen'} · {file.name} ↗</a><span className="field-hint">{Math.ceil(file.size / 1024)} KB</span></li>)}</ul>
      {!administrative && row.reviewNote ? <p className="receipt-note"><strong>Nota del médico: </strong>{row.reviewNote}</p> : null}
      {row.reviewedAt ? <p className="field-hint">Revisión registrada: {formatDateTime(row.reviewedAt)}</p> : !administrative ? <button className="btn btn-ghost" onClick={() => setReview(row)}>Registrar revisión</button> : null}
    </li>)}</ul>}
    {picker ? <PatientPicker title="Agregar estudio: elegir paciente" patients={patients} onClose={() => setPicker(false)} onSelect={selected => { setPicker(false); setPatient(selected); }} /> : null}
    {patient ? <ReceiptForm patient={patient} initialEncounterId={initialEncounterId} onClose={() => setPatient(null)} onSaved={saveReceipt} /> : null}
    {review ? <ReviewDialog receipt={review} onClose={() => setReview(null)} onSaved={saveReceipt} /> : null}
  </section>;
}
