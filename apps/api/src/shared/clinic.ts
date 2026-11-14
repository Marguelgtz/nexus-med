import { currentPrincipal } from '../domains/auth/auth.context';
import { ForbiddenError } from './http/errors';

/** Authenticated requests never fall back to the legacy clinic. The fallback
 * exists solely for the isolated, authentication-disabled domain harness. */
export function currentClinicId(): string {
  const principal = currentPrincipal();
  if (!principal) return 'legacy-clinic';
  if (!principal.clinicId) throw new ForbiddenError('Completa el registro de tu clínica.');
  return principal.clinicId;
}

export function clinicScope() { return { clinicId: currentClinicId() }; }

export function currentActorId(): string | null {
  const principal = currentPrincipal();
  // Demo identity lives in the separate authentication database, not demo DB.
  return principal && principal.user.role !== 'demo' ? principal.user.id : null;
}
