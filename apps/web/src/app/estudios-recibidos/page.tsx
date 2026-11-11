import { z } from 'zod';
import { patientSummarySchema, studyReceiptSchema } from '@nexus-med/contracts';
import { ReceivedStudies } from '../../components/receipts/received-studies';
import { ErrorBanner } from '../../components/primitives';
import { fetchServer } from '../../lib/api/server';
export const dynamic = 'force-dynamic';
export default async function ReceivedStudiesPage() {
  const [receipts, patients] = await Promise.all([
    fetchServer('/api/study-receipts?review=all', z.array(studyReceiptSchema)),
    fetchServer('/api/patients?status=active', z.array(patientSummarySchema)),
  ]);
  if (!receipts.ok || !patients.ok) return <ErrorBanner message="No se pudieron cargar los estudios recibidos." retryHref="/estudios-recibidos" />;
  return <><h1>Bandeja de estudios</h1><p className="muted">Archivos recibidos para su revisión médica.</p><ReceivedStudies receipts={receipts.data} patients={patients.data} /></>;
}
