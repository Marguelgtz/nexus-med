import { AsyncLocalStorage } from 'node:async_hooks';

import type { PrismaClient } from '../../generated/prisma/client';

const requestClient = new AsyncLocalStorage<unknown>();
let defaultClient: PrismaClient | undefined;

export function setDefaultPrismaClient(client: PrismaClient): void {
  defaultClient = client;
}

export function getCurrentPrismaClient(): PrismaClient {
  const client = (requestClient.getStore() as PrismaClient | undefined) ?? defaultClient;
  if (!client) throw new Error('No database client is configured for this request.');
  return client;
}

export function withPrismaClient<TClient, TResult>(
  client: TClient,
  run: () => TResult | Promise<TResult>,
): Promise<TResult> {
  return requestClient.run(client, async () => await run());
}

/** Domain modules use this request-scoped facade; the database stays runtime-owned. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getCurrentPrismaClient();
    const value = Reflect.get(client, property, client) as unknown;
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
