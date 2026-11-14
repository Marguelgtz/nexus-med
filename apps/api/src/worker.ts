import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from './generated/prisma-worker/client';
import type { PrismaClient as NodePrismaClient } from './generated/prisma/client';

import { createApp } from './app';
import { type AtomicWrite, withPrismaClient } from './infrastructure/database/runtime-client';
import { withStudyFileStorage } from './infrastructure/storage/runtime-study-files';
import { createAuth } from './domains/auth/auth.config';
import { resolvePrincipal, withAuthRuntime } from './domains/auth/auth.context';
import { dispatchEmailOutbox } from './domains/email/dispatcher';

type PrismaD1Argument = ConstructorParameters<typeof PrismaD1>[0];
type D1Binding = Exclude<
  PrismaD1Argument,
  {
    CLOUDFLARE_D1_TOKEN: string;
    CLOUDFLARE_ACCOUNT_ID: string;
    CLOUDFLARE_DATABASE_ID: string;
    CLOUDFLARE_SHADOW_DATABASE_ID?: string;
  }
>;

interface R2Binding {
  put(key: string, value: Uint8Array): Promise<unknown>;
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer> } | null>;
  delete(key: string): Promise<void>;
}

interface Env {
  DB: D1Binding;
  DEMO_DB: D1Binding;
  STUDY_FILES: R2Binding;
  BETTER_AUTH_SECRET: string;
  APP_BASE_URL?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SMTP_SENDER_EMAIL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_TLS_MODE?: string;
  SMTP_USERNAME?: string;
  SMTP_PASSWORD?: string;
  EMAIL_TEST_RECIPIENTS?: string;
}

const app = createApp();

function createD1AtomicWrite(binding: D1Binding): AtomicWrite {
  return async (statements) => {
    const results = await binding.batch(
      statements.map(({ sql, values }) => binding.prepare(sql).bind(...values)),
    );
    const failedResult = results.find((result) => !result.success);
    if (failedResult) throw new Error(`D1 atomic write failed: ${failedResult.error ?? 'unknown database error'}`);
  };
}

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) {
      return new Response('Service configuration is incomplete.', { status: 503 });
    }
    const appBaseUrl = (env.APP_BASE_URL ?? new URL(request.url).origin).replace(/\/$/, '');
    const practicePrisma = new PrismaClient({ adapter: new PrismaD1(env.DB) });
    const demoPrisma = new PrismaClient({ adapter: new PrismaD1(env.DEMO_DB) });
    const auth = createAuth(practicePrisma as unknown as NodePrismaClient, {
      secret: env.BETTER_AUTH_SECRET,
      appBaseUrl,
      googleClientId: env.GOOGLE_CLIENT_ID,
      googleClientSecret: env.GOOGLE_CLIENT_SECRET,
      production: true,
    });

    try {
      const principal = await resolvePrincipal(auth, request.headers, practicePrisma as unknown as NodePrismaClient);
      const isDemo = principal?.user.role === 'demo';
      const domainPrisma = isDemo ? demoPrisma : practicePrisma;
      const databaseBinding = isDemo ? env.DEMO_DB : env.DB;
      const namespace = isDemo ? 'demo' : 'practice';
      const atomicWrite = createD1AtomicWrite(databaseBinding);

      return await withAuthRuntime({
        auth,
        database: practicePrisma as unknown as NodePrismaClient,
        atomicWrite: createD1AtomicWrite(env.DB),
        secret: env.BETTER_AUTH_SECRET,
        appBaseUrl,
        googleEnabled: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
        localRuntime: false,
        principal,
      }, () => withPrismaClient(domainPrisma, () =>
        withStudyFileStorage({
          put: async (key, bytes) => { await env.STUDY_FILES.put(`${namespace}/${key}`, bytes); },
          get: async (key) => {
            const object = await env.STUDY_FILES.get(`${namespace}/${key}`);
            return object ? new Uint8Array(await object.arrayBuffer()) : null;
          },
          delete: (key) => env.STUDY_FILES.delete(`${namespace}/${key}`),
        }, () => app.fetch(request, env)), atomicWrite));
    } finally {
      await practicePrisma.$disconnect();
      await demoPrisma.$disconnect();
    }
  },

  async scheduled(_controller: unknown, env: Env): Promise<void> {
    if (!env.BETTER_AUTH_SECRET || env.BETTER_AUTH_SECRET.length < 32) return;
    const practicePrisma = new PrismaClient({ adapter: new PrismaD1(env.DB) });
    try {
      const result = await dispatchEmailOutbox(practicePrisma as unknown as NodePrismaClient, env.BETTER_AUTH_SECRET, {
        senderEmail: env.SMTP_SENDER_EMAIL,
        smtpHost: env.SMTP_HOST,
        smtpPort: env.SMTP_PORT ? Number(env.SMTP_PORT) : undefined,
        smtpTlsMode: env.SMTP_TLS_MODE,
        smtpUsername: env.SMTP_USERNAME,
        smtpPassword: env.SMTP_PASSWORD,
        allowedRecipients: (env.EMAIL_TEST_RECIPIENTS ?? '').split(',').map(value => value.trim()).filter(Boolean),
      });
      console.log(`[email] ${JSON.stringify(result)}`);
    } finally {
      await practicePrisma.$disconnect();
    }
  },
};

export default worker;
