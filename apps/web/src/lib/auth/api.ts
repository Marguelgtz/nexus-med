import { authSessionSchema, type AuthSession } from '@nexus-med/contracts';

interface ApiErrorBody {
  error?: string | { code?: string; message?: string };
  message?: string;
}

function messageFromApiError(body: ApiErrorBody | null, fallback: string): string {
  return typeof body?.error === 'string' ? body.error : body?.error?.message ?? body?.message ?? fallback;
}

export async function postAuthSession(path: '/api/onboarding/clinic' | '/api/invitations/accept', body: unknown): Promise<AuthSession> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const value: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(messageFromApiError(value as ApiErrorBody | null, 'No se pudo completar la solicitud.'));
  }
  const parsed = authSessionSchema.safeParse(value);
  if (!parsed.success) throw new Error('La respuesta de acceso no cumple el contrato esperado.');
  return parsed.data;
}

export function applicationPathForSession(session: AuthSession): string {
  if (session.onboardingRequired) return '/onboarding';
  return session.canReadClinical ? '/recepcion' : '/secretaria';
}

export async function signOut(fetcher: typeof fetch = fetch): Promise<void> {
  const response = await fetcher('/api/auth/sign-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
    credentials: 'same-origin',
    cache: 'no-store',
  });
  if (response.ok) return;
  const body = await response.json().catch(() => null) as ApiErrorBody | null;
  throw new Error(messageFromApiError(body, 'No se pudo cerrar la sesión. Intenta de nuevo.'));
}
