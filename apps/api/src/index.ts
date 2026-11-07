// Node.js entry point for the local API (http://127.0.0.1:4000).
//
// The future Cloudflare Workers deployment will mount the same createApp()
// behind a Workers-compatible fetch handler; nothing here is Node-specific
// except this bootstrap file.

import { serve } from '@hono/node-server';

import { createApp } from './app';

const port = Number(process.env.API_PORT ?? 4000);

const server = serve(
  { fetch: createApp().fetch, port, hostname: '127.0.0.1' },
  (info) => {
    console.log(`[api] Nexus Med API listening on http://127.0.0.1:${info.port}`);
  },
);

// Forward shutdown signals cleanly (used by the root dev orchestrator).
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close();
    process.exit(0);
  });
}
