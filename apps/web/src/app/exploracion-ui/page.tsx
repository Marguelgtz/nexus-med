import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import fixture from '../../../../../docs/demo-dataset.json';
import { PatientUIExploration } from '../../components/patients/ui-exploration';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Exploración de interfaz · Nexus Med',
  robots: { index: false, follow: false },
};

/** Local design sample. No session, database reads or application mutations. */
export default function UIExplorationPage() {
  if (process.env.NODE_ENV !== 'development') notFound();

  const patients = fixture.patients.map(({ id, fullName, dateOfBirth, externalIdentifier, phone, email, isArchived }) => ({
    id, fullName, dateOfBirth, externalIdentifier, phone, email, isArchived,
  }));

  return <PatientUIExploration initialPatients={patients} />;
}
