#!/usr/bin/env node
// Root development orchestrator: `npm run dev`
//
// 1. Prepares the local environment (data directory).
// 2. Applies pending migrations (`prisma migrate deploy`).
// 3. Runs the idempotent demo seed (no-op when records already exist).
// 4. Starts the Hono API and waits for its health endpoint.
// 5. Starts the Next.js frontend.
// 6. Reports failures clearly; Ctrl+C stops both services.
//
// Local data persists across restarts in .local/data/medical.db.

import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const API_PORT = Number(process.env.API_PORT ?? 4000);
const WEB_PORT = Number(process.env.WEB_PORT ?? 3000);
const API_INTERNAL_URL = `http://127.0.0.1:${API_PORT}`;

const children = [];

function track(child) {
  children.push(child);
  return child;
}

function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd: rootDir, stdio: 'inherit' });
    child.on('exit', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} ${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function waitForUrl(url, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Timeout esperando ${url}`);
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  process.exit(code);
}

async function main() {
  console.log('[dev] Preparando entorno local…');
  mkdirSync(path.join(rootDir, '.local', 'data'), { recursive: true });

  console.log('[dev] Aplicando migraciones…');
  await run('npx', ['prisma', 'migrate', 'deploy']);

  console.log('[dev] Inicializando datos de demostración (idempotente)…');
  await run('npx', ['prisma', 'db', 'seed']);

  console.log('[dev] Iniciando API…');
  track(
    spawn('npx', ['tsx', 'apps/api/src/index.ts'], {
      cwd: rootDir,
      stdio: 'inherit',
      env: { ...process.env, API_PORT: String(API_PORT) },
    }),
  );
  await waitForUrl(`${API_INTERNAL_URL}/`);
  console.log(`[dev] API lista en ${API_INTERNAL_URL}`);

  track(
    spawn('npx', ['next', 'dev', '-p', String(WEB_PORT), '-H', '127.0.0.1'], {
      cwd: path.join(rootDir, 'apps', 'web'),
      stdio: 'inherit',
      env: { ...process.env, API_INTERNAL_URL },
    }),
  );

  console.log('');
  console.log(`[dev] Frontend: http://127.0.0.1:${WEB_PORT}`);
  console.log(`[dev] API:      ${API_INTERNAL_URL}`);
  console.log('[dev] Datos de demostración activos (pacientes ficticios).');
  console.log('[dev] Ctrl+C detiene ambos servicios.');

  children.forEach((child, i) => {
    child.on('exit', (code) => {
      // If either service dies on its own, take the other one down.
      const label = i === 0 ? 'API' : 'frontend';
      if (code !== 0 && code !== null) console.error(`[dev] El servicio ${label} terminó con código ${code}`);
      shutdown(code ?? 0);
    });
  });

  process.on('SIGINT', () => shutdown(0));
  process.on('SIGTERM', () => shutdown(0));
}

main().catch((error) => {
  console.error('[dev] Fallo al iniciar:', error.message);
  shutdown(1);
});
