import { spawnSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wranglerEntrypoint = path.join(projectRoot, 'node_modules/wrangler/bin/wrangler.js');
const apiConfigPath = path.join(projectRoot, 'apps/api/wrangler.jsonc');

function wrangler(args) {
  const result = spawnSync(process.execPath, [wranglerEntrypoint, ...args], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', WRANGLER_WRITE_LOGS: 'false' },
  });
  if (result.error) throw result.error;
  return { status: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

function requireSuccess(result, command) {
  if (result.status !== 0) {
    throw new Error(`${command} failed. Run "npm run cloudflare:status" to inspect login and resource access.`);
  }
}

async function readApiConfig() {
  return JSON.parse(await readFile(apiConfigPath, 'utf8'));
}

async function writeDatabaseId(binding, id) {
  const config = await readApiConfig();
  const database = config.d1_databases.find((entry) => entry.binding === binding);
  if (!database) throw new Error(`Missing ${binding} in apps/api/wrangler.jsonc.`);
  if (database.database_id !== id) {
    database.database_id = id;
    await writeFile(apiConfigPath, `${JSON.stringify(config, null, 2)}\n`);
  }
}

async function ensureDatabase(binding, name, existing) {
  const match = existing.find((database) => database.name === name);
  if (match) {
    const id = match.uuid ?? match.database_id ?? match.id;
    if (typeof id !== 'string') throw new Error(`Wrangler did not return an ID for D1 database ${name}.`);
    await writeDatabaseId(binding, id);
    console.log(`D1 ready: ${binding} (${name})`);
    return;
  }

  const created = wrangler(['d1', 'create', name, '--location', 'wnam', '--update-config', '--binding', binding, '--config', 'apps/api/wrangler.jsonc']);
  requireSuccess(created, `wrangler d1 create ${name}`);
  const config = await readApiConfig();
  const database = config.d1_databases.find((entry) => entry.binding === binding);
  if (!database || database.database_id === '00000000000000000000000000000000') {
    throw new Error(`D1 database ${name} was created but Wrangler did not write its ID to apps/api/wrangler.jsonc.`);
  }
  console.log(`D1 created: ${binding} (${name})`);
}

function bucketExists(stdout, name) {
  return stdout.split(/\s+/).includes(name);
}

async function main() {
  const identity = wrangler(['whoami']);
  requireSuccess(identity, 'wrangler whoami');
  const d1List = wrangler(['d1', 'list', '--json', '--config', 'apps/api/wrangler.jsonc']);
  requireSuccess(d1List, 'wrangler d1 list');
  let databases;
  try {
    databases = JSON.parse(d1List.stdout);
  } catch {
    throw new Error('Could not parse Wrangler D1 resource list. No resources were changed.');
  }
  if (!Array.isArray(databases)) throw new Error('Wrangler D1 list returned an unexpected format.');

  await ensureDatabase('DB', 'nexus-med-practice', databases);
  const refreshedList = wrangler(['d1', 'list', '--json', '--config', 'apps/api/wrangler.jsonc']);
  requireSuccess(refreshedList, 'wrangler d1 list');
  await ensureDatabase('DEMO_DB', 'nexus-med-demo', JSON.parse(refreshedList.stdout));

  const bucketList = wrangler(['r2', 'bucket', 'list', '--config', 'apps/api/wrangler.jsonc']);
  requireSuccess(bucketList, 'wrangler r2 bucket list');
  if (bucketExists(bucketList.stdout, 'nexus-med-study-files')) {
    console.log('R2 ready: nexus-med-study-files');
  } else {
    const created = wrangler(['r2', 'bucket', 'create', 'nexus-med-study-files', '--location', 'wnam', '--config', 'apps/api/wrangler.jsonc']);
    requireSuccess(created, 'wrangler r2 bucket create nexus-med-study-files');
    console.log('R2 created: nexus-med-study-files');
  }

  console.log('Cloudflare resources are configured. This command does not change the account plan, enable billing, deploy Workers, or set secrets.');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Cloudflare setup failed.');
  process.exitCode = 1;
});
