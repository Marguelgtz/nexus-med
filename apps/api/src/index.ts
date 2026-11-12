// Node.js entry point for the local API (http://127.0.0.1:4000).
//
// The future Cloudflare Workers deployment will mount the same createApp()
// behind a Workers-compatible fetch handler; nothing here is Node-specific
// except this bootstrap file.

import { serve } from '@hono/node-server';
import path from 'node:path';
import './infrastructure/database/prisma';
import './infrastructure/storage/local-study-files';
import { resolveDbPath, resolveDemoDbPath } from '../../../prisma/lib/db-path';
import { PrismaClient } from './generated/prisma/client';
import { localPrisma, createLocalPrismaClient } from './infrastructure/database/prisma';
import { createSqliteAtomicWrite, withPrismaClient } from './infrastructure/database/runtime-client';
import { createLocalStudyFileStorage } from './infrastructure/storage/local-study-files';
import { withStudyFileStorage } from './infrastructure/storage/runtime-study-files';
import { createAuth } from './domains/auth/auth.config';
import { resolvePrincipal, withAuthRuntime } from './domains/auth/auth.context';
import { loadLocalAuthSecret } from './infrastructure/auth/local-secret';
import { createApp } from './app';

const demoDbPath = resolveDemoDbPath();
const demoPrisma = createLocalPrismaClient(demoDbPath);
const secret = loadLocalAuthSecret();
const appBaseUrl = process.env.APP_BASE_URL ?? 'http://127.0.0.1:3000';
const auth = createAuth(localPrisma, {
  secret,
  appBaseUrl,
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  production: process.env.NODE_ENV === 'production',
});
const app = createApp();

const localFetch = async (request: Request): Promise<Response> => {
  const principal = await resolvePrincipal(auth, request.headers);
  const useDemo = principal?.user.role === 'demo';
  const domainDatabase = useDemo ? demoPrisma : localPrisma;
  const filesDirectory = path.join(path.dirname(useDemo ? demoDbPath : resolveDbPath()), useDemo ? 'demo-study-files' : 'study-files');
  const scopedStorage = createLocalStudyFileStorage(filesDirectory);
  const authRuntime = {
    auth,
    database: localPrisma as PrismaClient,
    atomicWrite: createSqliteAtomicWrite(localPrisma),
    secret,
    appBaseUrl,
    googleEnabled: Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    localRuntime: true,
    principal,
  };

  return withAuthRuntime(authRuntime, () =>
    withPrismaClient(domainDatabase, () =>
      withStudyFileStorage(scopedStorage, () => app.fetch(request)),
    createSqliteAtomicWrite(domainDatabase)),
  );
};

const port = Number(process.env.API_PORT ?? 4000);

const server = serve(
  { fetch: localFetch, port, hostname: '127.0.0.1' },
  (info) => {
    console.log(`[api] Nexus Med API listening on http://127.0.0.1:${info.port}`);
  },
);

// Forward shutdown signals cleanly (used by the root dev orchestrator).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close();
    void localPrisma.$disconnect();
    void demoPrisma.$disconnect();
    process.exit(0);
  });
}
