// Vitest global setup: prepare an isolated SQLite database for the API test
// suite and apply the real migrations to it (the same path production-style
// boot uses via `prisma migrate deploy`).
//
// The environment variable change propagates to the worker processes that
// run the test files, so the API's Prisma boundary reads this test database.

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');
const testDataDir = path.join(repoRoot, '.local', 'test');

export default function setup(): void {
  rmSync(testDataDir, { recursive: true, force: true });
  mkdirSync(testDataDir, { recursive: true });

  const testDbFile = path.join(testDataDir, 'api.test.db');
  process.env.DATABASE_URL = `file:${testDbFile}`;

  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
}
