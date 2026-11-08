import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { DemoBanner } from '../components/shell/demo-banner';
import { TopBar } from '../components/shell/top-bar';

import './globals.css';

export const metadata: Metadata = {
  title: 'Nexus Med',
  description: 'Gestión de consultoría médica para un cirujano general — prototipo local',
};

// App frame (UI_SPEC §2): top bar, persistent demo banner, and the page
// container. Every screen renders inside this shell.
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body>
        <TopBar />
        <DemoBanner />
        <div className="container">
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
