'use client';

// Top bar with primary navigation (UI_SPEC §2, §5.3). Client component
// only because it highlights the active link from the pathname — it
// renders no data.

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import type { AuthSession } from '@nexus-med/contracts';
import { Icon } from '../icon';
import { confirmInAppNavigation } from '../../lib/use-before-unload-guard';
import { currentRoleLabel, shouldUseAdministrativeNavigation } from '../../lib/auth/navigation';
import { signOut } from '../../lib/auth/api';
import { getPrimaryNavigationLinks } from './primary-navigation';

export function TopBar({ session }: { session: AuthSession }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [changingView, setChangingView] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const administrative = shouldUseAdministrativeNavigation(session, pathname);
  const secretary = administrative;
  const links = getPrimaryNavigationLinks({
    secretary,
    pathname,
    section: searchParams.get('seccion'),
    date: searchParams.get('fecha'),
  });
  const renderLinks = () => links.map(({ href, label, active, icon }) => (
    <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={active ? 'active' : undefined}>
      <Icon name={icon} />{label}
    </Link>
  ));

  return (
    <aside className="app-sidebar" aria-label="Nexus Med">
      <div className="sidebar-inner">
        <Link href={administrative ? '/secretaria' : '/patients'} className="topbar-brand">
          <span className="brand-symbol" aria-hidden="true"><Icon name="activity" /></span>
          Nexus Med
        </Link>
        <div role="group" aria-label="Contexto de sesión" style={{ gridColumn: '1 / -1', gridRow: 2, display: 'grid', gap: 2, minWidth: 0, marginTop: -16, color: '#e4ebfb', fontSize: 14, lineHeight: 1.35 }}>
          <strong title={session.clinic?.name ?? 'Sin clínica activa'} style={{ minWidth: 0, overflowWrap: 'anywhere', color: '#fff' }}>{session.clinic?.name ?? 'Sin clínica activa'}</strong>
          <span>{currentRoleLabel(session)}</span>
        </div>
        <nav className="sidebar-nav" aria-label="Navegación principal" style={{ gridRow: 3 }}>
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
        {session.canManageAccess ? <Link className="topbar-account-link" href="/configuracion/accesos" style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap' }}>Accesos</Link> : null}
        <span className="topbar-user" title={session.user.name}>{session.user.name}</span>
        <button className="topbar-signout" type="button" disabled={signingOut} onClick={async () => {
          if (!confirmInAppNavigation()) return;
          setSigningOut(true);
          setError('');
          try {
            await signOut();
            router.replace('/login');
            router.refresh();
          } catch (reason) {
            setError(reason instanceof Error ? reason.message : 'No se pudo cerrar la sesión. Intenta de nuevo.');
          } finally {
            setSigningOut(false);
          }
        }}>{signingOut ? 'Saliendo…' : 'Salir'}</button></div>
      </div>
      {error ? <p className="topbar-feedback" role="status">{error}</p> : null}
    </aside>
  );
}
