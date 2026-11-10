'use client';

// Top bar with primary navigation (UI_SPEC §2, §5.3). Client component
// only because it highlights the active link from the pathname — it
// renders no data.

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function TopBar() {
  const pathname = usePathname();
  const patientsActive = pathname === '/patients' || pathname.startsWith('/patients/');
  const calendarActive = pathname === '/calendar' || pathname.startsWith('/calendar');

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/patients" className="topbar-brand">
          Nexus Med
        </Link>
        <nav className="topbar-nav" aria-label="Navegación principal">
          <Link href="/patients" aria-current={patientsActive ? 'page' : undefined} className={patientsActive ? 'active' : undefined}>
            Pacientes
          </Link>
          <Link href="/calendar" aria-current={calendarActive ? 'page' : undefined} className={calendarActive ? 'active' : undefined}>
            Calendario
          </Link>
        </nav>
      </div>
    </header>
  );
}
