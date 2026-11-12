'use client';

// Top bar with primary navigation (UI_SPEC §2, §5.3). Client component
// only because it highlights the active link from the pathname — it
// renders no data.

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import type { AuthSession } from '@nexus-med/contracts';
import { Icon, type IconName } from '../icon';
import { confirmInAppNavigation } from '../../lib/use-before-unload-guard';

export function TopBar({ session }: { session: AuthSession }) {
  const pathname = usePathname();
  const router = useRouter();
  const [changingView, setChangingView] = useState(false);
  const [error, setError] = useState('');
  const administrative = pathname.startsWith('/secretaria');
  const patientsActive = pathname === '/patients' || pathname.startsWith('/patients/');
  const calendarActive = pathname === '/calendar' || pathname.startsWith('/calendar');
  const secretary = session.user.role === 'secretary' || (session.user.role === 'demo' && session.activeView === 'secretary') || administrative;
  const links = secretary ? [{ href: '/secretaria', label: 'Secretaría', active: true }] : [
    { href: '/recepcion', label: 'Recepción', active: pathname === '/recepcion' },
    { href: '/estudios', label: 'Estudios', active: pathname === '/estudios' },
    { href: '/patients', label: 'Pacientes', active: patientsActive },
    { href: '/calendar', label: 'Calendario', active: calendarActive },
  ];
  const renderLinks = () => links.map(({ href, label, active }) => (
    <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'active' : undefined}>
      <Icon name={({ Recepción: 'activity', Estudios: 'document', Pacientes: 'users', Calendario: 'calendar', Secretaría: 'grid' } as Record<string, IconName>)[ label] ?? 'grid'} />{label}
    </Link>
  ));

  return (
    <aside className="app-sidebar" aria-label="Nexus Med">
      <div className="sidebar-inner">
        <Link href={administrative ? '/secretaria' : '/patients'} className="topbar-brand">
          <span className="brand-symbol" aria-hidden="true"><Icon name="activity" /></span>
          Nexus Med
        </Link>
        <nav className="sidebar-nav" aria-label="Navegación principal">
          {renderLinks()}
        </nav>
        <div className="sidebar-account">
        {session.user.role === 'demo' ? (
          <label className="view-selector"><span className="sr-only">Vista de demostración</span>
            <select aria-label="Vista de demostración" disabled={changingView} value={session.activeView ?? 'doctor'} onChange={async (event) => {
              const select = event.currentTarget;
              const view = event.currentTarget.value;
              if (!confirmInAppNavigation()) {
                select.value = session.activeView ?? 'doctor';
                return;
              }
              setChangingView(true);
              setError('');
              try {
                const response = await fetch('/api/demo/view', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ view }),
                  cache: 'no-store',
                });
                if (!response.ok) throw new Error('No se pudo cambiar la vista.');
                const destination = view === 'secretary' ? '/secretaria' : '/recepcion';
                router.replace(destination);
                router.refresh();
              } catch {
                setError('No se pudo cambiar la vista. Intenta de nuevo.');
                select.value = session.activeView ?? 'doctor';
              } finally {
                setChangingView(false);
              }
            }}>
              <option value="doctor">Demo: Médico</option>
              <option value="secretary">Demo: Secretaría</option>
            </select>
          </label>
        ) : null}
        {session.canManageAccess ? <Link className="topbar-account-link" href="/configuracion/accesos">Accesos</Link> : null}
        <span className="topbar-user" title={session.user.name}>{session.user.name}</span>
        <button className="topbar-signout" type="button" onClick={async () => {
          if (!confirmInAppNavigation()) return;
          const response = await fetch('/api/auth/sign-out', { method: 'POST', cache: 'no-store' });
          if (response.ok) window.location.assign('/login');
          else setError('No se pudo cerrar la sesión. Intenta de nuevo.');
        }}>Salir</button></div>
      </div>
      {error ? <p className="topbar-feedback" role="status">{error}</p> : null}
    </aside>
  );
}
