// Patient overview (UI_SPEC §3.3) — first increment: identity and
// demographics. Background card, timeline, and actions arrive with the
// next slices.

import { notFound } from 'next/navigation';

import type { PatientDetail } from '@nexus-med/contracts';

import { PatientContext } from '../../../components/shell/patient-context';
import { Badge } from '../../../components/primitives';
import { apiGet } from '../../../lib/api/server';
import { formatDate, formatAge } from '../../../lib/format';

export const dynamic = 'force-dynamic';

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="field" style={{ marginBottom: 8 }}>
      <span className="faint" style={{ fontSize: 13, display: 'block' }}>
        {label}
      </span>
      <span>{value ?? <em className="faint">No registrado</em>}</span>
    </div>
  );
}

export default async function PatientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let patient: PatientDetail | null = null;
  try {
    patient = await apiGet<PatientDetail>(`/api/patients/${encodeURIComponent(id)}`);
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
      </div>

      <div className="card">
        <InfoRow
          label="Nacimiento"
          value={
            patient.dateOfBirth
              ? `${formatDate(patient.dateOfBirth)}${age !== null ? ` (${age} años)` : ''}`
              : null
          }
        />
        <InfoRow label="Teléfono" value={patient.phone} />
        <InfoRow label="Correo electrónico" value={patient.email} />
        <InfoRow label="Identificador externo" value={patient.externalIdentifier} />
      </div>
    </>
  );
}
