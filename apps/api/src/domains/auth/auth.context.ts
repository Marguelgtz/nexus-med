import { AsyncLocalStorage } from 'node:async_hooks';
import type { PrismaClient } from '../../generated/prisma/client';
import type { AtomicWrite } from '../../infrastructure/database/runtime-client';

export type AuthRole = 'pending' | 'doctor' | 'secretary' | 'administrator' | 'demo';
export type DemoView = 'doctor' | 'secretary';
export type MembershipRole = 'doctor' | 'secretary' | 'administrator';

export interface AuthPrincipal {
  session: {
    id: string;
    userId: string;
    createdAt: Date;
    expiresAt: Date;
    demoView: DemoView;
  };
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    role: AuthRole;
    disabledAt: Date | null;
  };
  clinicId: string | null;
  clinic: { id: string; name: string; timezone: string } | null;
  membership: { id: string; clinicId: string; role: MembershipRole; isAdmin: boolean } | null;
}

export interface BetterAuthInstance {
  handler(request: Request): Promise<Response>;
  api: {
    getSession(input: { headers: Headers }): Promise<unknown>;
  };
}

export interface AuthRuntime {
  auth: BetterAuthInstance;
  database: PrismaClient;
  atomicWrite: AtomicWrite;
  secret: string;
  appBaseUrl: string;
  googleEnabled: boolean;
  localRuntime: boolean;
  principal: AuthPrincipal | null;
}

const authRuntime = new AsyncLocalStorage<AuthRuntime>();

export function withAuthRuntime<TResult>(runtime: AuthRuntime, run: () => TResult | Promise<TResult>): Promise<TResult> {
  return authRuntime.run(runtime, async () => await run());
}

export function getAuthRuntime(): AuthRuntime {
  const runtime = authRuntime.getStore();
  if (!runtime) throw new Error('Authentication runtime is not configured for this request.');
  return runtime;
}

export function currentPrincipal(): AuthPrincipal | null {
  return authRuntime.getStore()?.principal ?? null;
}

export async function resolvePrincipal(auth: BetterAuthInstance, headers: Headers, database: PrismaClient): Promise<AuthPrincipal | null> {
  let result: unknown;
  try {
    result = await auth.api.getSession({ headers });
  } catch {
    return null; // A failed session lookup never authorizes a request.
  }
  if (!result || typeof result !== 'object' || !('session' in result) || !('user' in result)) return null;
  const { session, user } = result as { session: Record<string, unknown>; user: Record<string, unknown> };
  if (
    typeof session.id !== 'string' || typeof session.userId !== 'string' ||
    !(session.createdAt instanceof Date) || !(session.expiresAt instanceof Date) ||
    session.expiresAt.getTime() <= Date.now() ||
    typeof user.id !== 'string' || typeof user.name !== 'string' || typeof user.email !== 'string' ||
    session.userId !== user.id
  ) return null;

  const demoView: DemoView = session.demoView === 'secretary' ? 'secretary' : 'doctor';
  const base = {
    session: { id: session.id, userId: session.userId, createdAt: session.createdAt, expiresAt: session.expiresAt, demoView },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified === true,
      role: 'pending' as AuthRole,
      disabledAt: sessionDate(user.disabledAt),
    },
  };
  // The demonstration identity always uses the separate demo database. It
  // never gains membership administration privileges in the practice DB.
  if (user.role === 'demo') {
    return { ...base, user: { ...base.user, role: 'demo' }, clinicId: 'legacy-clinic', clinic: { id: 'legacy-clinic', name: 'Demostración', timezone: 'America/Mexico_City' }, membership: null };
  }

  // Resolve membership on every request. A signed-in session cannot retain
  // permissions from a revoked membership or from a stale role cookie.
  const membership = await database.clinicMembership.findFirst({
    where: {
      userId: user.id,
      status: 'active',
      clinic: { isActive: true },
      ...(typeof session.activeClinicId === 'string' ? { clinicId: session.activeClinicId } : {}),
    },
    include: { clinic: { select: { id: true, name: true, timezone: true } } },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  });
  if (!membership || !['doctor', 'secretary', 'administrator'].includes(membership.role)) {
    return { ...base, clinicId: null, clinic: null, membership: null };
  }
  const role = membership.role as MembershipRole;
  return {
    ...base,
    user: { ...base.user, role },
    clinicId: membership.clinicId,
    clinic: membership.clinic,
    membership: { id: membership.id, clinicId: membership.clinicId, role, isAdmin: membership.isAdmin },
  };
}

function sessionDate(value: unknown): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
