import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from './generated/prisma-worker/client';

import { createApp } from './app';
import { type AtomicWrite, withPrismaClient } from './infrastructure/database/runtime-client';
import { withStudyFileStorage } from './infrastructure/storage/runtime-study-files';

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
  STUDY_FILES: R2Binding;
}

const app = createApp();

const worker = {
  async fetch(request: Request, env: Env): Promise<Response> {
    const prisma = new PrismaClient({ adapter: new PrismaD1(env.DB) });
    const atomicWrite: AtomicWrite = async (statements) => {
      const results = await env.DB.batch(
        statements.map(({ sql, values }) => env.DB.prepare(sql).bind(...values)),
      );
      const failedResult = results.find((result) => !result.success);
      if (failedResult) {
        throw new Error(`D1 atomic write failed: ${failedResult.error ?? 'unknown database error'}`);
      }
    };

    try {
      return await withPrismaClient(prisma, () =>
        withStudyFileStorage(
          {
            put: async (key, bytes) => {
              await env.STUDY_FILES.put(key, bytes);
            },
            get: async (key) => {
              const object = await env.STUDY_FILES.get(key);
              return object ? new Uint8Array(await object.arrayBuffer()) : null;
            },
            delete: (key) => env.STUDY_FILES.delete(key),
          },
          () => app.fetch(request, env),
        ),
        atomicWrite,
      );
    } finally {
      await prisma.$disconnect();
    }
  },
};

export default worker;
