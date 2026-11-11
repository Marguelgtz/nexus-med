'use client';
import { PatientDemographicsForm, type DemographicsProps } from './patient-demographics-form';
export function NewPatientForm(props: Omit<DemographicsProps, 'patientId' | 'initial'>) {
  return <PatientDemographicsForm {...props} />;
}
