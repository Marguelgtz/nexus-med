'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PatientDetail, PatientSummary } from '@nexus-med/contracts';
import { AppointmentForm } from '../appointments/appointment-form';
import { BackgroundForm } from './background-form';
import { EditPatientForm } from './edit-patient-form';
import { NewPatientForm } from './new-patient-form';
import { Icon } from '../icon';
export function NewPatientButton({ patients, label = 'Nuevo paciente', prefillName }: { patients: PatientSummary[]; label?: string; prefillName?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return <><button className="btn btn-primary" onClick={() => setOpen(true)}><Icon name="plus" />{label}</button>{open ? <NewPatientForm prefillName={prefillName} existingPatients={patients} dialogTitle="Registrar paciente" onCancel={() => setOpen(false)} onSaved={patient => { setOpen(false); router.push(`/patients/${patient.id}`); router.refresh(); }} /> : null}</>;
}
export function PatientTaskButton({ patient, action, label, className = 'btn btn-secondary' }: { patient: PatientDetail; action: 'appointment' | 'demographics' | 'background'; label: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const saved = () => { setOpen(false); router.refresh(); };
  return <><button type="button" className={className} onClick={() => setOpen(true)}>{label}</button>{open ? action === 'appointment'
    ? <AppointmentForm patientId={patient.id} dialogTitle={`Nueva cita — ${patient.fullName}`} onCancel={() => setOpen(false)} onCreated={saved} />
    : action === 'demographics' ? <EditPatientForm patientId={patient.id} initial={patient} dialogTitle={`Datos de ${patient.fullName}`} onCancel={() => setOpen(false)} onSaved={saved} />
      : <BackgroundForm patientId={patient.id} initial={patient} dialogTitle={`Antecedentes — ${patient.fullName}`} onCancel={() => setOpen(false)} onSaved={saved} /> : null}</>;
}
