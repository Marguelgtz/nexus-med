import Link from 'next/link';
import { notFound } from 'next/navigation';
import { patientDetailSchema } from '@nexus-med/contracts';
import { PatientSectionHeader } from '../../../../components/patients/patient-section-header';
import { ErrorBanner } from '../../../../components/primitives';
import { fetchServer } from '../../../../lib/api/server';
export const dynamic = 'force-dynamic';
const FIELDS = [
  { key: 'allergies', label: 'Alergias' },
  { key: 'currentMedications', label: 'Medicamentos actuales' },
  { key: 'medicalConditions', label: 'Afecciones' },
  { key: 'previousSurgeries', label: 'Cirugías previas' },
] as const;
export default async function BackgroundPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema);
  if (!result.ok) {
    if (result.notFound) notFound();
    return <ErrorBanner message={result.error} retryHref={`/patients/${id}/contexto-clinico`} />;
  }
  const patient = result.data;
  return <>
    <PatientSectionHeader patient={patient} title="Antecedentes" description="Información del paciente que acompaña la atención. Un campo sin registro no descarta el antecedente.">
      <Link href={`/patients/${id}/antecedentes`} className="btn btn-secondary">Editar antecedentes</Link>
    </PatientSectionHeader>
    <section className="clinical-context-grid patient-background-view" aria-label="Antecedentes del paciente">
      {FIELDS.map(({ key, label }) => <section className="clinical-context-item" key={key}>
        <h2>{label}</h2><p>{patient[key] || <em className="faint">No registrado</em>}</p>
      </section>)}
    </section>
  </>;
}
