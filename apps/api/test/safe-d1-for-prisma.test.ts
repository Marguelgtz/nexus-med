import { describe, expect, it } from 'vitest';
import { safeD1ForPrisma } from '../src/infrastructure/database/safe-d1-for-prisma';

describe('D1 errors passed to Prisma', () => {
  it('removes raw messages, causes and stacks while retaining unique-constraint classification', async () => {
    const sensitive = 'synthetic-private-value';
    const statement = {
      bind() { return this; },
      async run() { throw new Error(`D1_ERROR: UNIQUE constraint failed: appointments.${sensitive}`); },
      async raw() { throw new Error(`D1_ERROR: database failure ${sensitive}`); },
    };
    const binding = safeD1ForPrisma({ prepare() { return statement; } });
    await expect(binding.prepare().bind().run()).rejects.toThrow('D1_ERROR: UNIQUE constraint failed');
    await expect(binding.prepare().bind().run()).rejects.not.toThrow(sensitive);
    await expect(binding.prepare().bind().raw()).rejects.toThrow('D1_ERROR: database operation failed');
    await expect(binding.prepare().bind().raw()).rejects.not.toThrow(sensitive);
    try {
      await binding.prepare().bind().raw();
      expect.fail('expected sanitized error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).stack).not.toContain(sensitive);
      expect(error).not.toHaveProperty('cause');
    }
  });

  it('sanitizes synchronous prepare failures and asynchronous exec failures', async () => {
    const binding = safeD1ForPrisma({
      prepare() { throw new Error('synthetic-private-prepare'); },
      async exec() { throw new Error('synthetic-private-exec'); },
    });
    expect(() => binding.prepare()).toThrow('D1_ERROR: database operation failed');
    expect(() => binding.prepare()).not.toThrow('synthetic-private-prepare');
    await expect(binding.exec()).rejects.toThrow('D1_ERROR: database operation failed');
    await expect(binding.exec()).rejects.not.toThrow('synthetic-private-exec');
  });
});
