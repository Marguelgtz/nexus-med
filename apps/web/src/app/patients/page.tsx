// Foundation smoke page (O-001). Verifies frontend -> Hono API connectivity
// and that seeded demo data is reachable through the real HTTP path.
// Replaced by the patient registry (O-003 slice 2).

import type { PatientSummary } from '@nexus-med/contracts';

import { apiGet } from '../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function PatientsPage() {
  let connected = false;
  let patientCount: number | null = null;
  let apiError: string | null = null;

  try {
    const patients = await apiGet<PatientSummary[]>('/api/patients?status=all');
    connected = true;
    patientCount = patients.length;
  } catch (error) {
    apiError = error instanceof Error ? error.message : 'Error desconocido';
  }

  return (
    <>
      <div className="page-head">
        <h1>Registro de pacientes</h1>
      </div>
      <p className="muted">
        Vista técnica de fundación — el registro completo llega con la implementación del diseño (O-003).
      </p>

      <div className="card">
        {connected ? (
          <>
            <span className="badge badge-edited">API conectada</span>
            <p>
              {patientCount !== null
                ? `${patientCount} registros de pacientes disponibles (datos de demostración).`
                : 'La API responde, pero no fue posible leer los pacientes.'}
            </p>
          </>
        ) : (
          <div className="error-banner">
            <span>API sin conexión: {apiError ?? 'No se pudo contactar la API.'}</span>
          </div>
        )}
      </div>
    </>
  );
}
