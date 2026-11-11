// @nexus-med/contracts — shared API contracts for Nexus Med.
//
// This package is the single source of truth for API request/response shapes
// and runtime validation schemas. It is browser-safe (no Node APIs): both the
// Hono API and the Next.js frontend import from here.

export * from './common';
export * from './patients';
export * from './encounters';
export * from './appointments';
export * from './studies';
export * from './documents';

export * from './receipts';
