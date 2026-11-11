import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { patientDetailSchema, studyReceiptSchema, studyRequestSchema } from '@nexus-med/contracts';
import { StudyStatusBadge } from '../../../../../components/appointments/badges';
import { PatientSectionHeader } from '../../../../../components/patients/patient-section-header';
import { ReceivedStudies } from '../../../../../components/receipts/received-studies';
import { ErrorBanner } from '../../../../../components/primitives';
import { fetchServer } from '../../../../../lib/api/server';
import { formatDateTime, STUDY_CATEGORY_LABELS } from '../../../../../lib/format';

export const dynamic = 'force-dynamic';

export default async function PatientStudyDetailPage({ params }: { params: Promise<{ id: string; studyId: string }> }) {
  const { id, studyId } = await params;
  const [patientResult, studiesResult, receiptsResult] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/studies`, z.array(studyRequestSchema)),
    fetchServer(`/api/study-receipts?patientId=${encodeURIComponent(id)}&review=all`, z.array(studyReceiptSchema)),
  ]);

  if (!patientResult.ok) {
    if (patientResult.notFound) notFound();
    return <ErrorBanner message={patientResult.error} retryHref={`/patients/${id}/estudios/${studyId}`} />;
  }
  if (!studiesResult.ok) {
    if (studiesResult.notFound) notFound();
    return <ErrorBanner message={studiesResult.error} retryHref={`/patients/${id}/estudios/${studyId}`} />;
  }
  if (!receiptsResult.ok) {
    if (receiptsResult.notFound) notFound();
    return <ErrorBanner message={receiptsResult.error} retryHref={`/patients/${id}/estudios/${studyId}`} />;
  }

  const patient = patientResult.data;
  const study = studiesResult.data.find(item => item.id === studyId);
  if (!study) notFound();
  const receipts = receiptsResult.data.filter(receipt => receipt.requestId === study.id);

  return <>
    <PatientSectionHeader patient={patient} title="Estudio" description="Solicitud, nota de resultado y archivos recibidos.">
      <Link href={`/patients/${id}/estudios`} className="btn btn-secondary">Volver a estudios</Link>
    </PatientSectionHeader>

    <section className="card" aria-labelledby="study-detail-title">
      <div className="patient-study-head">
        <div>
          <div className="study-item-title">
            <span className="study-category-label">{STUDY_CATEGORY_LABELS[study.category]}</span>
            <h2 id="study-detail-title" className="study-detail-title">{study.name}</h2>
          </div>
          <p className="field-hint">Solicitada {formatDateTime(study.createdAt)}</p>
          {study.encounter ? <p className="field-hint">Consulta relacionada: <Link className="text-link" href={`/patients/${id}/consultas/${study.encounter.id}`}>{formatDateTime(study.encounter.occurredAt)}</Link></p> : <p className="field-hint">Sin consulta asociada</p>}
        </div>
        <StudyStatusBadge status={study.status} />
      </div>
      {study.description ? <p>{study.description}</p> : null}
      <section className="study-result-note" aria-labelledby="study-result-title">
        <h3 id="study-result-title">Nota de resultado</h3>
        {study.resultNote ? <p>{study.resultNote}</p> : <p className="faint">Sin nota registrada.</p>}
      </section>
    </section>

    <ReceivedStudies receipts={receipts} patients={[]} fixedPatient={patient} requestId={study.id}
      heading="Archivos recibidos" allowAdd={false} initialFilter="all" asOf={new Date().toISOString()} />
  </>;
}
