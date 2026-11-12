// ESLint flat config (ESLint 9 + eslint-config-next 16, flat-native).
// Covers all workspaces; generated artifacts and local data are ignored.

import coreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const eslintConfig = [
  {
    ignores: [
      '**/.next/**',
      '**/.open-next/**',
      '**/node_modules/**',
      '**/dist/**',
      'prisma/**',
      '.local/**',
    ],
  },
  ...coreWebVitals,
  ...nextTs,
  {
    // App Router project: no `pages/` directory.
    rules: {
      'no-html-link-for-pages': 'off',
    },
  },
  {
    // Integration tests assert on raw HTTP response bodies; the wire
    // contract is enforced by the API's zod schemas and by the typed
    // client. `any` is a practical read type there, not a leak.
    files: ['apps/api/test/**'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];

export default eslintConfig;
