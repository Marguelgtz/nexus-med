'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { createStudyReceiptSchema, RECEIPT_MAX_FILES, RECEIPT_MAX_FILE_BYTES, RECEIPT_MAX_TOTAL_FILE_BYTES, type ReceiptOptions } from '@nexus-med/contracts';
import { createStudyReceipt, getReceiptOptions } from '../../lib/api/client';
import { formatDateTime } from '../../lib/format';
import { useBeforeUnloadGuard } from '../../lib/use-before-unload-guard';
import { Modal } from '../modal';
export function ReceiptForm({ patient, onClose, onSaved, initialEncounterId }: { patient: { id: string; fullName: string }; onClose: () => void; onSaved?: () => void; initialEncounterId?: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [note, setNote] = useState('');
  const [requestId, setRequest] = useState('');
  const [encounterId, setEncounter] = useState(initialEncounterId ?? '');
  const [files, setFiles] = useState<File[]>([]);
  const [options, setOptions] = useState<ReceiptOptions | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dirty = !!(title || date || note || requestId || encounterId !== (initialEncounterId ?? '') || files.length);
  useBeforeUnloadGuard(dirty && !busy);
  useEffect(() => { let active = true; getReceiptOptions(patient.id).then(value => { if (active) setOptions(value); }).catch(() => { if (active) setLoadError(true); }); return () => { active = false; }; }, [patient.id, retry]);
  function close() { if (!busy && (!dirty || window.confirm('Hay un estudio sin guardar. ¿Descartar los cambios?'))) onClose(); }
  const request = options?.requests.find(item => item.id === requestId);
  async function save(event: FormEvent) {
    event.preventDefault(); setError(null);
    const metadata = createStudyReceiptSchema.safeParse({ title, studyDate: date || null, receiptNote: note || null, encounterId: request?.encounterId || encounterId || null, requestId: requestId || null });
    if (!metadata.success) { setError('Revisa el título (2–200 caracteres), la fecha y la nota (máximo 1,000 caracteres).'); return; }
    if (!files.length || files.length > RECEIPT_MAX_FILES || files.some(file => file.size === 0 || file.size > RECEIPT_MAX_FILE_BYTES) || files.reduce((sum, file) => sum + file.size, 0) > RECEIPT_MAX_TOTAL_FILE_BYTES) { setError('Adjunta de 1 a 5 archivos: máximo 10 MB por archivo y 24 MB en total.'); return; }
    setBusy(true);
    try { await createStudyReceipt(patient.id, metadata.data, files); onSaved?.(); onClose(); router.refresh(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo recibir el estudio.'); setBusy(false); }
  }
  return <Modal title="Agregar estudio recibido" description={patient.fullName} onClose={close} closeDisabled={busy}>
    <form onSubmit={save} aria-busy={busy}>
      <div className="field"><label htmlFor="receipt-title">Nombre del estudio *</label><input id="receipt-title" value={title} maxLength={200} required disabled={busy} onChange={e => setTitle(e.target.value)} /></div>
      <div className="field"><label htmlFor="receipt-date">Fecha del estudio (opcional)</label><input id="receipt-date" type="date" value={date} disabled={busy} onChange={e => setDate(e.target.value)} /></div>
      {loadError ? <p className="error" role="alert">No se pudieron cargar las asociaciones. <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setLoadError(false); setRetry(v => v + 1); }}>Reintentar</button></p> : !options ? <p role="status">Cargando consultas y solicitudes…</p> : <>
        <div className="field"><label htmlFor="receipt-request">Solicitud relacionada (opcional)</label><select id="receipt-request" value={requestId} disabled={busy} onChange={e => { setRequest(e.target.value); const order = options.requests.find(item => item.id === e.target.value); if (!title && order) setTitle(order.name); }}><option value="">Estudio externo / sin solicitud</option>{options.requests.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label htmlFor="receipt-encounter">Consulta relacionada (opcional)</label><select id="receipt-encounter" value={request?.encounterId || encounterId} disabled={busy || !!request?.encounterId} onChange={e => setEncounter(e.target.value)}><option value="">Solo al paciente</option>{options.consultations.map(item => <option value={item.id} key={item.id}>{formatDateTime(item.occurredAt)}</option>)}</select></div>
      </>}
      <div className="field"><label htmlFor="receipt-files">Archivos PDF, PNG o JPEG *</label><input id="receipt-files" type="file" accept="application/pdf,image/png,image/jpeg" multiple disabled={busy} onChange={e => setFiles(Array.from(e.target.files ?? []))} aria-describedby="receipt-files-help" /><p id="receipt-files-help" className="field-hint">Hasta 5 archivos; 10 MB por archivo y 24 MB en total.</p>{files.map((file, index) => <p className="field-hint" key={`${index}-${file.name}`}>{file.name} · {(file.size / 1024).toFixed(0)} KB</p>)}</div>
      <div className="field"><label htmlFor="receipt-note">Nota de recepción (opcional)</label><textarea id="receipt-note" rows={2} value={note} maxLength={1000} disabled={busy} onChange={e => setNote(e.target.value)} /><p className="field-hint">Datos de entrega o procedencia. La revisión médica se registra después.</p></div>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="btn-row"><button className="btn btn-primary" disabled={busy || !options}>{busy ? 'Guardando archivos…' : 'Guardar estudio recibido'}</button><button type="button" className="btn btn-ghost" disabled={busy} onClick={close}>Cancelar</button></div>
    </form>
  </Modal>;
}
