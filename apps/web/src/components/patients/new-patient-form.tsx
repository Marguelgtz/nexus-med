'use client';
import { useRouter } from 'next/navigation';
import { PatientDemographicsForm, type DemographicsProps } from './patient-demographics-form';
export function NewPatientForm(props: Omit<DemographicsProps, 'patientId' | 'initial'> & { returnTo?: string }) {
  const router = useRouter();
  const { returnTo, onCancel, onSaved, ...formProps } = props;
  return <PatientDemographicsForm {...formProps}
    onCancel={onCancel ?? (() => router.push(returnTo ?? '/patients'))}
    onSaved={onSaved ?? (patient => router.push(`/patients/${patient.id}`))} />;
}
