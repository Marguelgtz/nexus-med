import { AsyncLocalStorage } from 'node:async_hooks';

import type { PrismaClient } from '../../generated/prisma/client';

export type AtomicSqlValue = string | number | bigint | Uint8Array | null;

export interface AtomicSqlStatement {
  sql: string;
  values: AtomicSqlValue[];
}

export type AtomicWrite = (statements: AtomicSqlStatement[]) => Promise<void>;

interface RuntimeClient {
  client: PrismaClient;
  atomicWrite: AtomicWrite;
}

const requestClient = new AsyncLocalStorage<RuntimeClient>();
let defaultClient: RuntimeClient | undefined;

function createSqliteAtomicWrite(client: PrismaClient): AtomicWrite {
  return async (statements) => {
    await client.$transaction(async (tx) => {
      for (const statement of statements) {
        await tx.$executeRawUnsafe(statement.sql, ...statement.values);
      }
    });
  };
}

export function setDefaultPrismaClient(client: PrismaClient): void {
  defaultClient = { client, atomicWrite: createSqliteAtomicWrite(client) };
}

export function getCurrentPrismaClient(): PrismaClient {
  const runtime = requestClient.getStore() ?? defaultClient;
  if (!runtime) throw new Error('No database client is configured for this request.');
  return runtime.client;
}

export function executeAtomicWrite(statements: AtomicSqlStatement[]): Promise<void> {
  const runtime = requestClient.getStore() ?? defaultClient;
  if (!runtime) throw new Error('No database client is configured for this request.');
  return runtime.atomicWrite(statements);
}

export function withPrismaClient<TClient, TResult>(
  client: TClient,
  run: () => TResult | Promise<TResult>,
  atomicWrite: AtomicWrite,
): Promise<TResult> {
  const runtime = { client: client as unknown as PrismaClient, atomicWrite };
  return requestClient.run(runtime, async () => await run());
}

/** Domain modules use this request-scoped facade; the database stays runtime-owned. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getCurrentPrismaClient();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
