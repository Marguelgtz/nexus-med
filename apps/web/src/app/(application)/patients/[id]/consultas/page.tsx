import { redirect } from 'next/navigation';

/** Preserve old bookmarks while keeping one patient activity destination. */
export default async function LegacyPatientConsultationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/patients/${id}/citas-y-consultas`);
}
