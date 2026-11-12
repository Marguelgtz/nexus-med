import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wranglerEntrypoint = path.join(projectRoot, 'node_modules/wrangler/bin/wrangler.js');

function wrangler(args) {
  return spawnSync(process.execPath, [wranglerEntrypoint, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_WRITE_LOGS: 'false' },
  });
}

function reportCommand(label, args) {
  const result = wrangler(args);
  if (result.error) {
    console.log(`${label}: unavailable (${result.error.message})`);
    return false;
  }
  const succeeded = result.status === 0;
  console.log(`${label}: ${succeeded ? 'ready' : 'needs attention'}`);
  return succeeded;
}

const loggedIn = reportCommand('Cloudflare login', ['whoami']);
if (loggedIn) {
  reportCommand('D1 resources', ['d1', 'list', '--json', '--config', 'apps/api/wrangler.jsonc']);
  reportCommand('R2 resources', ['r2', 'bucket', 'list', '--config', 'apps/api/wrangler.jsonc']);
}
console.log(`Local Wrangler variables: ${existsSync(path.join(projectRoot, 'apps/api/.dev.vars')) ? 'present (values not displayed)' : 'not configured'}`);
console.log('Worker secrets are intentionally not read or printed by this status check.');
