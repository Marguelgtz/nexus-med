#!/usr/bin/env node
// Destructive local reset: `npm run db:reset -- --confirm`
//
// Drops the local SQLite database, re-applies all migrations, and reloads
// the demo dataset. Requires the explicit --confirm flag; without it the
// command refuses to run and explains what it would do.

import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (!process.argv.includes('--confirm')) {
  console.error('[db:reset] Este comando es DESTRUCTIVO.');
  console.error('[db:reset] Elimina la base de datos local y toda la información capturada.');
  console.error('[db:reset] Ejecuta `npm run db:reset -- --confirm` para continuar.');
  process.exit(1);
}

const steps = [
  ['npx', ['prisma', 'migrate', 'reset', '--force']],
  ['npx', ['prisma', 'db', 'seed']],
];

for (const [cmd, args] of steps) {
  const res = spawnSync(cmd, args, { cwd: rootDir, stdio: 'inherit' });
  if (res.status !== 0) {
    console.error(`[db:reset] Falló: ${cmd} ${args.join(' ')}`);
    process.exit(res.status ?? 1);
  }
}

console.log('[db:reset] Completado — base de datos reiniciada con datos de demostración.');
