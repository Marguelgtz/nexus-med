import { PrismaD1 } from '@prisma/adapter-d1';
import { PrismaClient } from './generated/prisma-worker/client';

import { createApp } from './app';
import { withPrismaClient } from './infrastructure/database/runtime-client';
import { withStudyFileStorage } from './infrastructure/storage/runtime-study-files';

type D1Binding = ConstructorParameters<typeof PrismaD1>[0];

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

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const prisma = new PrismaClient({ adapter: new PrismaD1(env.DB) });
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
      );
    } finally {
      await prisma.$disconnect();
    }
  },
};
