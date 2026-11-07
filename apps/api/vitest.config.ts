import { defineConfig } from 'vitest/config';

// API tests run against an isolated SQLite database (see test/global-setup.ts).
// Serial execution keeps the shared test database deterministic.
export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: ['./test/global-setup.ts'],
    fileParallelism: false,
    include: ['test/**/*.test.ts'],
  },
});
