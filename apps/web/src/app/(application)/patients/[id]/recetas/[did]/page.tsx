import { MedicalDocumentDetailPage } from '../../../../../../components/documents/medical-document-detail-page';

export const dynamic = 'force-dynamic';

export default async function PrescriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string; did: string }>;
}) {
  const { id, did } = await params;
  return <MedicalDocumentDetailPage patientId={id} documentId={did} kind="prescription" />;
}
