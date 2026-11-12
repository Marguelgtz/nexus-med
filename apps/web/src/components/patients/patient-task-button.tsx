'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { PatientDetail } from '@nexus-med/contracts';
import { AppointmentForm } from '../appointments/appointment-form';
import { BackgroundForm } from './background-form';
import { EditPatientForm } from './edit-patient-form';
import { Icon } from '../icon';
import { usePathname, useSearchParams } from 'next/navigation';
export function NewPatientButton({ label = 'Nuevo paciente', prefillName }: { label?: string; prefillName?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  return <button className="btn btn-primary" onClick={() => {
    const params = new URLSearchParams();
    if (prefillName) params.set('nombre', prefillName);
    const current = searchParams.toString();
    params.set('returnTo', current ? `${pathname}?${current}` : pathname);
    router.push(`/patients/new?${params.toString()}`);
  }}><Icon name="plus" />{label}</button>;
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
