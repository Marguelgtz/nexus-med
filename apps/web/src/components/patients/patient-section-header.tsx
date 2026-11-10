import type { ReactNode } from 'react';
import type { PatientDetail } from '@nexus-med/contracts';
import { PatientContext } from '../shell/patient-context';

/** Consistent identity and title across the patient's focused views. */
export function PatientSectionHeader({ patient, title, description, children, overview = false }: {
  patient: PatientDetail;
  title: string;
  description?: string;
  children?: ReactNode;
  overview?: boolean;
}) {
  return <>
    <PatientContext fullName={patient.fullName} externalIdentifier={patient.externalIdentifier}
      isArchived={patient.isArchived} backHref={overview ? '/patients' : `/patients/${patient.id}`}
      backLabel={overview ? 'Pacientes' : 'Resumen'} />
    <header className="page-head patient-section-head">
      <div><h1>{title}</h1>{description ? <p className="field-hint">{description}</p> : null}</div>
      {children ? <div className="actions">{children}</div> : null}
    </header>
  </>;
}
