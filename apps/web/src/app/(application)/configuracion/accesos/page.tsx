import { z } from 'zod';
import { authMemberSchema, authSessionSchema, invitationSchema } from '@nexus-med/contracts';
import { AccessManagement } from '../../../../components/auth/access-management';
import { ApiError, apiGet } from '../../../../lib/api/server';

export const dynamic = 'force-dynamic';

export default async function AccessSettingsPage() {
  const session = await apiGet('/api/session', authSessionSchema);
  if (!session.canManageAccess) {
    return <section className="empty-state"><h1>Acceso restringido</h1><p>Solo la cuenta médica puede administrar invitaciones y cuentas.</p></section>;
  }

  const result = await loadAccessData();
  if ('error' in result) {
    const error = result.error;
    return <section className="empty-state"><h1>No se pudo cargar el acceso del equipo</h1><p>{error instanceof ApiError ? error.message : 'Intenta de nuevo en unos momentos.'}</p></section>;
  }
  return <><div className="page-head"><div><p className="section-label">Configuración</p><h1>Accesos del consultorio</h1><p className="muted">Invita y revoca el acceso del equipo.</p></div></div><AccessManagement initialInvitations={result.invitations} initialMembers={result.members} nowMs={result.nowMs} /></>;
}

async function loadAccessData() {
  const nowMs = Date.now();
  try {
    const [invitations, members] = await Promise.all([
      apiGet('/api/access/invitations', z.array(invitationSchema)),
      apiGet('/api/access/members', z.array(authMemberSchema)),
    ]);
    return { invitations, members, nowMs };
  } catch (error) {
    return { error };
  }
}

