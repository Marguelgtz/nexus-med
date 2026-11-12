// Database access boundary for the API.
//
// Prisma 7 + better-sqlite3 driver adapter on the local SQLite file. This
// module is the ONLY place in the API that constructs the Prisma client;
// domain modules import the exported singleton and never touch the adapter
// or the file system.

import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import { PrismaClient } from '../../generated/prisma/client';
import { resolveDbPath } from '../../../../../prisma/lib/db-path';
import { prisma, setDefaultPrismaClient } from './runtime-client';

export function createLocalPrismaClient(dbPath = resolveDbPath()): PrismaClient {
  // better-sqlite3 does not create parent directories; ensure the data dir
  // exists before first use (also covers direct API development).
  mkdirSync(path.dirname(dbPath), { recursive: true });
  const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}` });
  return new PrismaClient({ adapter });
}

export const localPrisma = createLocalPrismaClient();
setDefaultPrismaClient(localPrisma);

export { prisma };
