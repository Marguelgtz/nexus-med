// Foundation smoke page (O-001). Verifies frontend -> Hono API connectivity
// and that seeded demo data is reachable through the real HTTP path.
// The actual patient registry UI arrives with the UX/UI design phase (O-002).

import type { PatientSummary } from '@nexus-med/contracts';

import { apiGet } from '../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function PatientsPage() {
  let connected = false;
  let patientCount: number | null = null;
  let apiError: string | null = null;

  try {
    await apiGet('/');
    connected = true;
    const patients = await apiGet<PatientSummary[]>('/api/patients?status=all');
    patientCount = patients.length;
  } catch (error) {
    apiError = error instanceof Error ? error.message : 'Error desconocido';
  }

  return (
    <main>
      <h1>Registro de pacientes</h1>
      <p className="muted">
        Vista técnica de fundación — el registro completo llega con el diseño UX/UI.
      </p>

      <div className="card">
        {connected ? (
          <>
            <span className="badge ok">API conectada</span>
            <p>
              {patientCount !== null
                ? `${patientCount} registros de pacientes disponibles (datos de demostración).`
                : 'La API responde, pero no fue posible leer los pacientes.'}
            </p>
          </>
        ) : (
          <>
            <span className="badge fail">API sin conexión</span>
            <p>{apiError ?? 'No se pudo contactar la API.'}</p>
          </>
        )}
      </div>

      <div className="demo-note">
        Los registros actuales son datos ficticios de demostración, no información
        de pacientes reales.
      </div>
    </main>
  );
}
