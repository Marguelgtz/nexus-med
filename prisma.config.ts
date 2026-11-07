// Prisma ORM 7 CLI configuration.
// The local database path is resolved in prisma/lib/db-path.ts so the CLI,
// the API runtime, and the seed always agree on the same file.

import { defineConfig } from 'prisma/config';
import { resolveDbUrl } from './lib/db-path.js';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    // Prisma 7 does not run seeding automatically; the seed command is
    // explicit and idempotent (see prisma/seed.ts).
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: resolveDbUrl(),
  },
});
