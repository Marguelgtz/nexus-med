'use client';
import { PatientDemographicsForm, type DemographicsProps, type DemographicValues } from './patient-demographics-form';
export function EditPatientForm(props: DemographicsProps & { patientId: string; initial: DemographicValues }) {
  return <PatientDemographicsForm {...props} />;
}
