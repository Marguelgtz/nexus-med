import { NewMedicalDocumentPage } from '../../../../../components/documents/new-document-page';

export const dynamic = 'force-dynamic';

export default async function NewReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <NewMedicalDocumentPage patientId={id} kind="report" />;
}
