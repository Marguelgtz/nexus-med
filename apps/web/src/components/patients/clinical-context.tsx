import Link from 'next/link';

import type { PatientDetail } from '@nexus-med/contracts';

/** Compact encounter-side summary; complete context lives on its own page. */
export function ClinicalContext({ patient }: { patient: PatientDetail }) {
  return (
    <section className="card clinical-context-summary" aria-labelledby="clinical-context-title">
      <div className="card-header">
        <h2 id="clinical-context-title">Antecedentes del paciente</h2>
      </div>
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
      <Link href={`/patients/${patient.id}/contexto-clinico`} className="text-link">
        Ver antecedentes
      </Link>
    </section>
  );
}
