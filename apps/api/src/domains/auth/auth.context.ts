import { AsyncLocalStorage } from 'node:async_hooks';
import type { PrismaClient } from '../../generated/prisma/client';
import type { AtomicWrite } from '../../infrastructure/database/runtime-client';

export type AuthRole = 'doctor' | 'secretary' | 'demo';
export type DemoView = 'doctor' | 'secretary';

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

export async function resolvePrincipal(auth: BetterAuthInstance, headers: Headers): Promise<AuthPrincipal | null> {
  const result = await auth.api.getSession({ headers });
  if (!result || typeof result !== 'object' || !('session' in result) || !('user' in result)) return null;

  const { session, user } = result as {
    session: Record<string, unknown>;
    user: Record<string, unknown>;
  };
  const role = user.role;
  if (role !== 'doctor' && role !== 'secretary' && role !== 'demo') return null;
  if (
    typeof session.id !== 'string' || typeof session.userId !== 'string' ||
    !(session.createdAt instanceof Date) || !(session.expiresAt instanceof Date)
  ) return null;
  if (typeof user.id !== 'string' || typeof user.name !== 'string' || typeof user.email !== 'string') return null;

  const demoView = session.demoView === 'secretary' ? 'secretary' : 'doctor';
  return {
    session: { id: session.id, userId: session.userId, createdAt: session.createdAt, expiresAt: session.expiresAt, demoView },
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified === true,
      role,
      disabledAt: sessionDate(user.disabledAt),
    },
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
