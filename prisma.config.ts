// Prisma ORM 7 CLI configuration.
//
// NOTE: the Prisma config loader cannot resolve imported TypeScript modules,
// so this file is deliberately self-contained. The runtime equivalent of the
// db-path logic lives in prisma/lib/db-path.ts (used by the API boundary and
// the seed); both resolve <repo root>/.local/data/medical.db by default and
// honor a DATABASE_URL=file:… override. Commands run from the repo root
// (as the npm scripts and the seed command assume).

import path from 'node:path';

import { defineConfig } from 'prisma/config';

const rootDir = process.cwd();
const defaultDbUrl = `file:${path.join(rootDir, '.local', 'data', 'medical.db')}`;
const envUrl = process.env.DATABASE_URL;

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Prisma 7 does not run seeding automatically; the seed command is
    // explicit and idempotent (see prisma/seed.ts).
    seed: 'node --import tsx prisma/seed.ts',
  },
  datasource: {
    url: envUrl && envUrl.startsWith('file:') ? envUrl : defaultDbUrl,
  },
});
