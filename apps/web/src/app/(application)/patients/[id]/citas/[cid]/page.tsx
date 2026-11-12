// Appointment detail (UI_SPEC §7.2): one appointment with all its
// actions. Server fetches the patient, the appointment (from the
// patient's list) and the patient's encounters (for the complete /
// link-encounter pickers); the client component renders the actions.

import { notFound } from 'next/navigation';
import { z } from 'zod';

import {
  appointmentSchema,
  encounterSummarySchema,
  patientDetailSchema,
  type EncounterSummary,
} from '@nexus-med/contracts';

import { AppointmentDetail } from '../../../../../../components/appointments/appointment-detail';
import { ErrorBanner } from '../../../../../../components/primitives';
import { fetchServer } from '../../../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function AppointmentDetailPage({
  params,
}: {
  params: Promise<{ id: string; cid: string }>;
}) {
  const { id, cid } = await params;

  const [patientRes, apptsRes, encountersRes] = await Promise.all([
    fetchServer(`/api/patients/${encodeURIComponent(id)}`, patientDetailSchema),
    fetchServer(`/api/patients/${encodeURIComponent(id)}/appointments`, z.array(appointmentSchema)),
    fetchServer(
      `/api/patients/${encodeURIComponent(id)}/encounters`,
      z.array(encounterSummarySchema),
    ),
  ]);

  if (!patientRes.ok) {
    if (patientRes.notFound) notFound();
    return (
      <>
        <h1>Cita</h1>
        <ErrorBanner message={patientRes.error} retryHref={`/patients/${id}/citas/${cid}`} />
      </>
    );
  }
  if (!apptsRes.ok) {
    if (apptsRes.notFound) notFound();
    return (
      <>
        <h1>Cita</h1>
        <ErrorBanner message={apptsRes.error} retryHref={`/patients/${id}/citas/${cid}`} />
      </>
    );
  }

  const appointment = apptsRes.data.find((a) => a.id === cid);
  if (!appointment) notFound();

  // Encounters are only needed for the pickers; a fetch failure degrades
  // to "no picker options", not to a broken detail page.
  const encounters: EncounterSummary[] = encountersRes.ok ? encountersRes.data : [];

  return (
    <AppointmentDetail
      patientId={id}
      patientName={patientRes.data.fullName}
      isArchived={patientRes.data.isArchived}
      appointment={appointment}
      encounters={encounters}
    />
  );
}
