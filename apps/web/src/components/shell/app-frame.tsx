import type { ReactNode } from 'react';
import type { AuthSession } from '@nexus-med/contracts';

import { PatientWorkflowNav } from './patient-workflow-nav';
import { TopBar } from './top-bar';

export function AppFrame({ session, children }: { session: AuthSession; children: ReactNode }) {
  return (
    <>
      <a href="#main-content" className="skip-link">Ir al contenido</a>
      <div className="app-layout">
        <TopBar session={session} />
        <div className="app-main">
        {session.user.role === 'demo' ? (
          <div className="demo-notice" role="status">
            <strong>Demostración compartida.</strong> Los cambios se conservan para las siguientes visitas.
          </div>
        ) : null}
        <main id="main-content" tabIndex={-1}>
          <div className="patient-workspace-shell">
            <PatientWorkflowNav />
            <div className="patient-workspace-content">{children}</div>
          </div>
        </main>
        </div>
      </div>
    </>
  );
}

