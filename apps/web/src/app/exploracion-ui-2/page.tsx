import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import fixture from '../../../../../docs/demo-dataset.json';
import { PatientUIExploration2 } from '../../components/patients/ui-exploration-v2';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Propuesta 2 · Nexus Med',
  robots: { index: false, follow: false },
};

export default function UIExploration2Page() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const patients = fixture.patients.map(({ id, fullName, dateOfBirth, externalIdentifier, phone, email, isArchived }) => ({
    id, fullName, dateOfBirth, externalIdentifier, phone, email, isArchived,
  }));
  return <PatientUIExploration2 initialPatients={patients} />;
}
