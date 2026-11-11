'use client';

// Top bar with primary navigation (UI_SPEC §2, §5.3). Client component
// only because it highlights the active link from the pathname — it
// renders no data.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Icon, type IconName } from '../icon';
import { confirmInAppNavigation } from '../../lib/use-before-unload-guard';

export function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const administrative = pathname.startsWith('/secretaria');
  const patientsActive = pathname === '/patients' || pathname.startsWith('/patients/');
  const calendarActive = pathname === '/calendar' || pathname.startsWith('/calendar');
  const links = administrative ? [{ href: '/secretaria', label: 'Secretaría', active: true }] : [
    { href: '/recepcion', label: 'Recepción', active: pathname === '/recepcion' },
    { href: '/estudios-recibidos', label: 'Estudios recibidos', active: pathname === '/estudios-recibidos' },
    { href: '/patients', label: 'Pacientes', active: patientsActive },
    { href: '/calendar', label: 'Calendario', active: calendarActive },
  ];
  const renderLinks = () => links.map(({ href, label, active }) => (
    <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'active' : undefined}>
      <Icon name={({ Recepción: 'activity', 'Estudios recibidos': 'document', Pacientes: 'users', Calendario: 'calendar', Secretaría: 'grid' } as Record<string, IconName>)[ label] ?? 'grid'} />{label}
    </Link>
  ));

  return (
    <header className="topbar">
      <div className="topbar-inner">
        <Link href={administrative ? '/secretaria' : '/patients'} className="topbar-brand">
          <span className="brand-symbol" aria-hidden="true"><Icon name="activity" /></span>
          Nexus Med
        </Link>
        <nav className="topbar-nav" aria-label="Navegación principal">
          {renderLinks()}
        </nav>
        <label className="view-selector"><span className="sr-only">Vista de trabajo</span><select aria-label="Vista de trabajo" value={administrative ? 'secretary' : 'medical'} onChange={e => { if (confirmInAppNavigation()) router.push(e.target.value === 'secretary' ? '/secretaria' : '/recepcion'); else e.currentTarget.value = administrative ? 'secretary' : 'medical'; }}><option value="medical">Vista: Médico</option><option value="secretary">Vista: Secretaría</option></select></label>
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
