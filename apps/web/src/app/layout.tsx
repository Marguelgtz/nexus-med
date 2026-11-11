import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { PatientWorkflowNav } from '../components/shell/patient-workflow-nav';
import { TopBar } from '../components/shell/top-bar';

import './globals.css';

export const metadata: Metadata = {
  title: 'Nexus Med',
  description: 'Gestión de consultoría médica para un cirujano general',
};

// App frame (UI_SPEC §2): top bar, persistent demo banner, and the page
// container. Every screen renders inside this shell.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <a href="#main-content" className="skip-link">Ir al contenido</a>
        <TopBar />
        <div className="container">
          <main id="main-content" tabIndex={-1}>
            <div className="patient-workspace-shell">
              <PatientWorkflowNav />
              <div className="patient-workspace-content">{children}</div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
