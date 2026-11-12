// New patient page (UI_SPEC §3.2). The active-registry name list is passed
// server-side for the non-blocking duplicate notice (UI_SPEC §1.1).

import { z } from 'zod';

import { patientSummarySchema } from '@nexus-med/contracts';

import { NewPatientForm } from '../../../../components/patients/new-patient-form';
import { fetchServer } from '../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function NewPatientPage({
  searchParams,
}: {
  searchParams: Promise<{ nombre?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const prefillName = params.nombre?.trim() || undefined;
  const returnTo = safePatientReturn(params.returnTo);

  let existing: { id: string; fullName: string }[] = [];
  const res = await fetchServer(
    '/api/patients?status=active',
    z.array(patientSummarySchema),
  );
  if (res.ok) {
    existing = res.data.map((p) => ({ id: p.id, fullName: p.fullName }));
  }
  // Duplicate detection is a convenience; its absence must not block creation.

  return (
    <section className="patient-registration-page">
      <div className="patient-registration-heading">
        <p className="section-label">Alta de paciente</p>
        <h1>Nuevo paciente</h1>
        <p className="muted">Registra sus datos de identificación y contacto. La historia clínica se documenta después.</p>
      </div>
      <NewPatientForm prefillName={prefillName} existingPatients={existing} returnTo={returnTo} />
    </section>
  );
}

function safePatientReturn(value?: string) {
  if (!value || !value.startsWith('/patients') || value.startsWith('//') || value.includes('\\')) return '/patients';
  return value;
}
