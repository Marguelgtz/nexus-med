import { describe, expect, it, vi } from 'vitest';
import { applicationPathForSession, signOut } from '../src/lib/auth/api';
import { applicationRedirectPath, currentRoleLabel, shouldUseAdministrativeNavigation } from '../src/lib/auth/navigation';
import { invitationReturnPath, safeInternalReturnPath } from '../src/lib/auth/return-path';
import type { AuthSession } from '@nexus-med/contracts';

function session(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    user: { id: 'user-1', name: 'Dra. Ejemplo', role: 'doctor' },
    activeView: null,
    onboardingRequired: false,
    clinic: { id: 'clinic-1', name: 'Consultorio', timezone: 'America/Mexico_City' },
    canManagePatients: true,
    canReadClinical: true,
    canReceiveStudies: true,
    canReviewStudies: true,
    canManageAccess: true,
    ...overrides,
  };
}

describe('auth navigation', () => {
  it('keeps the invitation token in a same-site return path', () => {
    const token = 'a+b/c?d';
    const invitePath = invitationReturnPath(token);
    expect(new URL(invitePath, 'https://nexus.test').searchParams.get('token')).toBe(token);
    expect(safeInternalReturnPath(invitePath)).toBe(invitePath);
  });

  it('rejects external return destinations', () => {
    expect(safeInternalReturnPath('https://outside.test/')).toBe('/');
    expect(safeInternalReturnPath('//outside.test/')).toBe('/');
    expect(safeInternalReturnPath('/\u005c\u005coutside.test')).toBe('/');
  });

  it('routes clinic bootstrap and active role sessions to the right first page', () => {
    expect(applicationPathForSession(session({ onboardingRequired: true, clinic: null }))).toBe('/onboarding');
    expect(applicationPathForSession(session({ user: { id: 'user-1', name: 'Equipo', role: 'secretary' }, canReadClinical: false, canReviewStudies: false }))).toBe('/secretaria');
    expect(applicationPathForSession(session())).toBe('/recepcion');
    expect(applicationPathForSession(session({ user: { id: 'demo', name: 'Demo', role: 'demo' }, activeView: 'secretary', canReadClinical: false, canReviewStudies: false }))).toBe('/secretaria');
  });

  it('keeps administrators out of clinical routes while allowing clinic access settings', () => {
    const administrator = session({
      user: { id: 'admin-1', name: 'Admin', role: 'administrator' },
      canReadClinical: false,
      canReviewStudies: false,
    });
    expect(applicationRedirectPath(administrator, '/patients/123')).toBe('/secretaria');
    expect(applicationRedirectPath(administrator, '/configuracion/accesos')).toBeNull();
    expect(shouldUseAdministrativeNavigation(administrator, '/configuracion/accesos')).toBe(true);
    expect(applicationPathForSession(administrator)).toBe('/secretaria');
    expect(applicationRedirectPath(administrator, '/estudios')).toBe('/secretaria');
    expect(currentRoleLabel(administrator)).toBe('Administración');
    expect(currentRoleLabel(session({ canManageAccess: true }))).toBe('Médico · Administrador');
  });

  it('keeps clinical navigation for a doctor and routes secretaries to reception', () => {
    expect(applicationRedirectPath(session(), '/patients')).toBeNull();
    expect(applicationRedirectPath(session(), '/secretaria')).toBe('/recepcion');
    expect(applicationRedirectPath(session({ user: { id: 'staff-1', name: 'Equipo', role: 'secretary' }, canReadClinical: false, canReviewStudies: false }), '/calendar')).toBe('/secretaria');
  });

  it('allows onboarding only until the clinic is configured', () => {
    const pending = session({
      user: { id: 'pending-1', name: 'Pendiente', role: 'pending' },
      onboardingRequired: true,
      clinic: null,
      canReadClinical: false,
      canManagePatients: false,
      canReceiveStudies: false,
      canReviewStudies: false,
      canManageAccess: false,
    });
    expect(applicationRedirectPath(pending, '/patients')).toBe('/onboarding');
    expect(applicationRedirectPath(pending, '/onboarding')).toBeNull();
  });

  it('sends a JSON sign-out request required by BetterAuth', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(null, { status: 200 }));
    await signOut(fetcher);
    expect(fetcher).toHaveBeenCalledWith('/api/auth/sign-out', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    }));
  });

  it('surfaces sign-out failures instead of claiming success', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => Response.json({ error: { message: 'No disponible.' } }, { status: 503 }));
    await expect(signOut(fetcher)).rejects.toThrow('No disponible.');
  });
});
