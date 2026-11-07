// Patient overview (UI_SPEC §3.3): the central clinical workspace.
// SSR fetches the patient plus its encounter list; information hierarchy:
// identity header → antecedentes card → historical timeline. All actions
// live in the header (UI_SPEC §3.3, item 4).

import { notFound } from 'next/navigation';
import Link from 'next/link';

import type { EncounterSummary, PatientDetail } from '@nexus-med/contracts';

import { Timeline } from '../../../components/patients/timeline';
import { ArchiveControl } from '../../../components/patients/archive-control';
import { PatientContext } from '../../../components/shell/patient-context';
import { Badge } from '../../../components/primitives';
import { apiGet } from '../../../lib/api/server';
import { formatDate, formatAge } from '../../../lib/format';

export const dynamic = 'force-dynamic';

function SublineItem({ label, value }: { label: string; value: string | null }) {
  return (
    <span className="subline-item">
      <span className="faint">{label}:</span>{' '}
      {value ?? <em className="faint">No registrado</em>}
    </span>
  );
}

const BACKGROUND_ROWS: { label: string; key: keyof PatientDetail }[] = [
  { label: 'Afecciones', key: 'medicalConditions' },
  { label: 'Cirugías previas', key: 'previousSurgeries' },
  { label: 'Alergias', key: 'allergies' },
  { label: 'Medicamentos actuales', key: 'currentMedications' },
];

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let patient: PatientDetail;
  let encounters: EncounterSummary[] = [];
  try {
    [patient, encounters] = await Promise.all([
      apiGet<PatientDetail>(`/api/patients/${encodeURIComponent(id)}`),
      apiGet<EncounterSummary[]>(`/api/patients/${encodeURIComponent(id)}/encounters`),
    ]);
  } catch {
    notFound();
  }

  const age = formatAge(patient.dateOfBirth);

  return (
    <>
      <PatientContext
        fullName={patient.fullName}
        externalIdentifier={patient.externalIdentifier}
        isArchived={patient.isArchived}
        backHref="/patients"
      />

      <div className="page-head">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {patient.fullName}
          {patient.isArchived ? <Badge tone="archived">Archivado</Badge> : null}
        </h1>
        <div className="actions">
          <Link href={`/patients/${patient.id}/consultas/nueva`} className="btn btn-primary">
            Nueva consulta
          </Link>
          <Link href={`/patients/${patient.id}/editar`} className="btn btn-secondary">
            Editar
          </Link>
          <Link href={`/patients/${patient.id}/antecedentes`} className="btn btn-secondary">
            Antecedentes
          </Link>
          {!patient.isArchived ? (
            <ArchiveControl patientId={patient.id} fullName={patient.fullName} />
          ) : null}
        </div>
      </div>

      <div className="subline">
        <SublineItem
          label="Nacimiento"
          value={
            patient.dateOfBirth
              ? `${formatDate(patient.dateOfBirth)}${age !== null ? ` (${age} años)` : ''}`
              : null
          }
        />
        <SublineItem label="Tel" value={patient.phone} />
        <SublineItem label="Correo" value={patient.email} />
        <SublineItem label="Identificador" value={patient.externalIdentifier} />
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Antecedentes médicos</h2>
          <Link href={`/patients/${patient.id}/antecedentes`} className="btn btn-ghost btn-sm">
            Editar
          </Link>
        </div>
        {BACKGROUND_ROWS.map((row) => {
          const value = patient[row.key];
          return (
            <div className="bg-row" key={row.key}>
              <span className="bg-label">{row.label}</span>
              <span className="bg-value">
                {value ? value : <em className="faint">No registrado</em>}
              </span>
            </div>
          );
        })}
      </div>

      <Timeline patientId={patient.id} encounters={encounters} />
    </>
  );
}
