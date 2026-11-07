import { defineConfig } from 'vitest/config';

// Presentation-layer unit tests run in node; no app boot or database needed.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
});
