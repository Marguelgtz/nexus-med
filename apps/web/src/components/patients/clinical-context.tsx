'use client';

import { useSyncExternalStore } from 'react';
import Link from 'next/link';

import type { PatientDetail } from '@nexus-med/contracts';

function subscribe(listener: () => void) {
  const query = window.matchMedia('(max-width: 900px)');
  query.addEventListener('change', listener);
  return () => query.removeEventListener('change', listener);
}
const compactSnapshot = () => window.matchMedia('(max-width: 900px)').matches;
const serverSnapshot = () => true;

/** Safety context stays available without displacing narrow-screen note entry. */
export function ClinicalContext({ patient }: { patient: PatientDetail }) {
  const compact = useSyncExternalStore(subscribe, compactSnapshot, serverSnapshot);
  return (
    <details className="card clinical-context-summary" open={!compact}>
      <summary>Antecedentes del paciente</summary>
      <div className="clinical-context-safety">
        <div>
          <strong>Alergias</strong>
          <span>{patient.allergies || <em className="faint">No registrado</em>}</span>
        </div>
        <div>
          <strong>Medicamentos actuales</strong>
          <span>{patient.currentMedications || <em className="faint">No registrado</em>}</span>
        </div>
      </div>
      <Link href={`/patients/${patient.id}#patient-background`} className="text-link">
        Ver antecedentes
      </Link>
    </details>
  );
}
