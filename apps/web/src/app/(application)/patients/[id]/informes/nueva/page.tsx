import { NewMedicalDocumentPage } from '../../../../../../components/documents/new-document-page';

export const dynamic = 'force-dynamic';

export default async function NewReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ encounterId?: string | string[]; returnTo?: string | string[] }>;
}) {
  const { id } = await params;
  return <NewMedicalDocumentPage patientId={id} kind="report" searchParams={searchParams} />;
}
