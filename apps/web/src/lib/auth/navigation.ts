import type { AuthSession } from '@nexus-med/contracts';
import { applicationPathForSession } from './api';

export function shouldUseAdministrativeNavigation(session: AuthSession, pathname: string): boolean {
  return !session.canReadClinical || pathname.startsWith('/secretaria');
}

export function currentRoleLabel(session: AuthSession): string {
  if (session.user.role === 'demo') return session.activeView === 'secretary' ? 'Demo · Secretaría' : 'Demo · Médico';
  const role = session.user.role === 'administrator' ? 'Administración'
    : session.user.role === 'secretary' ? 'Secretaría'
    : 'Médico';
  return session.canManageAccess && session.user.role !== 'administrator' ? `${role} · Administrador` : role;
}

export function applicationRedirectPath(session: AuthSession, currentPath: string): string | null {
  if (session.onboardingRequired) return currentPath === '/onboarding' ? null : '/onboarding';
  if (currentPath === '/onboarding') return applicationPathForSession(session);

  const allowedAdministrativeRoute = currentPath.startsWith('/secretaria') ||
    (currentPath === '/configuracion/accesos' && session.canManageAccess);
  if (!session.canReadClinical && !allowedAdministrativeRoute) return '/secretaria';
  if (session.canReadClinical && currentPath.startsWith('/secretaria')) return applicationPathForSession(session);
  return null;
}
