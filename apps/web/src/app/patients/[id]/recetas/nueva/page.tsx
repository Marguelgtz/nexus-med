import { NewMedicalDocumentPage } from '../../../../../components/documents/new-document-page';

export const dynamic = 'force-dynamic';

export default async function NewPrescriptionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ encounterId?: string | string[]; returnTo?: string | string[] }>;
}) {
  const { id } = await params;
  return <NewMedicalDocumentPage patientId={id} kind="prescription" searchParams={searchParams} />;
}
