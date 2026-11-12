// Compatibility route: background now belongs to the patient overview.
import { redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export default async function ClinicalContextRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/patients/${encodeURIComponent(id)}#patient-background`);
}
