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
  const links = [
    { href: '/patients', label: 'Pacientes', active: patientsActive },
    { href: '/calendar', label: 'Calendario', active: calendarActive },
  ];
  const renderLinks = () => links.map(({ href, label, active }) => (
    <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'active' : undefined}>
      {label}
    </Link>
  ));

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href="/patients" className="topbar-brand">
          Nexus Med
        </Link>
        <nav className="topbar-nav" aria-label="Navegación principal">
          {renderLinks()}
        </nav>
        <details className="topbar-mobile-menu">
          <summary aria-label="Navegación principal">
            <span className="topbar-menu-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
          </summary>
          <nav className="topbar-mobile-panel" aria-label="Navegación principal">
            {renderLinks()}
          </nav>
        </details>
      </div>
    </header>
  );
}
