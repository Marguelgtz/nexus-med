// Single source of truth for the local SQLite file location.
// Shared by the Prisma CLI config, the API runtime, and the seed so that all
// of them agree on the same database file.
//
// Resolution order:
//   1. DATABASE_URL environment variable (file: URLs only) — used by tests
//      to point at an isolated database.
//   2. <repo root>/.local/data/medical.db — the default local development DB.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(here, '..', '..');

export const DEFAULT_DB_PATH = path.join(rootDir, '.local', 'data', 'medical.db');
export const DEFAULT_DEMO_DB_PATH = path.join(rootDir, '.local', 'data', 'demo.db');

export function resolveDbPath(): string {
  const url = process.env.DATABASE_URL;
  if (url && url.startsWith('file:')) {
    return url.slice('file:'.length);
  }
  return DEFAULT_DB_PATH;
}

export function resolveDbUrl(): string {
  return `file:${resolveDbPath()}`;
}

export function resolveDemoDbPath(): string {
  const url = process.env.DEMO_DATABASE_URL;
  if (url && url.startsWith('file:')) return url.slice('file:'.length);
  return DEFAULT_DEMO_DB_PATH;
}
