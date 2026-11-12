import { AuthPanel } from '../../components/auth/auth-panel';
import { safeInternalReturnPath } from '../../lib/auth/return-path';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string; verified?: string; reset?: string; error?: string }> }) {
  const params = await searchParams;
  const notice = params.verified === '1' ? 'Correo verificado. Ya puedes iniciar sesión.'
    : params.reset === '1' ? 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.'
    : params.error === 'google' ? 'No se pudo completar el acceso con Google. Revisa la invitación o inténtalo de nuevo.'
    : undefined;
  return <main className="auth-status-page"><AuthPanel mode="login" returnTo={safeInternalReturnPath(params.returnTo)} notice={notice} /></main>;
}

