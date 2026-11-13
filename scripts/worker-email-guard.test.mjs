// Local workerd regression: all bindings and data are temporary and synthetic.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('scheduled Worker keeps the synthetic outbox untouched while delivery is disabled', { timeout: 60_000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nexus-worker-email-guard-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bundle = path.join(directory, 'bundle');
  execFileSync(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'deploy', '--dry-run', '--config', 'apps/api/wrangler.pilot.jsonc', '--outdir', bundle], {
    cwd: root,
    env: { ...process.env, WRANGLER_WRITE_LOGS: 'false', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false' },
    stdio: 'pipe',
  });

  const wasm = (await readdir(bundle)).find(name => name.endsWith('-query_compiler_fast_bg.wasm'));
  assert.ok(wasm, 'Wrangler bundle must include the Prisma query compiler');
  const base = {
    modules: [{ type: 'ESModule', path: path.join(bundle, 'worker.js') }, { type: 'CompiledWasm', path: path.join(bundle, wasm) }],
    rootPath: bundle, modulesRoot: bundle,
    compatibilityDate: '2026-11-11', compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB', 'DEMO_DB'], r2Buckets: ['STUDY_FILES'],
    host: '127.0.0.1', port: 0, cf: false, enableDevRegistry: false,
    telemetry: { enabled: false }, resourcePersistencePath: path.join(directory, 'storage'),
    log: new Log(LogLevel.NONE),
  };
  const secret = 'synthetic-secret-'.repeat(3);
  const disabled = {
    BETTER_AUTH_SECRET: secret, EMAIL_DELIVERY_DISABLED: 'true',
    SMTP_SENDER_EMAIL: 'sender@example.test', SMTP_HOST: '127.0.0.1',
    SMTP_USERNAME: 'synthetic', SMTP_PASSWORD: 'synthetic',
  };
  const mf = new Miniflare(convertV4MiniflareOptions({ ...base, bindings: disabled }));
  try {
    let database = await mf.getD1Database('DB');
    const migrations = path.join(root, 'prisma/cloudflare-migrations');
    for (const name of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
      const sql = await readFile(path.join(migrations, name), 'utf8');
      await database.batch(unstable_splitSqlQuery(sql).map(statement => database.prepare(statement)));
    }
    await database.prepare(`INSERT INTO email_outbox
      (id,kind,recipient,subject,encryptedBody,idempotencyKey,status,attempts,availableAt,leaseExpiresAt,createdAt,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`).bind(
      'synthetic', 'verify_email', 'recipient@example.test', 'Synthetic', 'unused', 'synthetic-key', 'sending', 1,
      '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z', '2000-01-01T00:00:00.000Z',
    ).run();
    let worker = await mf.getWorker();
    assert.equal((await worker.scheduled({ cron: '*/5 * * * *' })).outcome, 'ok');
    assert.equal((await database.prepare('SELECT status FROM email_outbox WHERE id=?').bind('synthetic').first()).status, 'sending');

    // Without the guard an expired sending lease becomes uncertain. SMTP is
    // omitted entirely, so this control cannot contact a mail server.
    await mf.setOptions(convertV4MiniflareOptions({ ...base, bindings: { BETTER_AUTH_SECRET: secret, EMAIL_DELIVERY_DISABLED: 'false' } }));
    worker = await mf.getWorker();
    assert.equal((await worker.scheduled({ cron: '*/5 * * * *' })).outcome, 'ok');
    database = await mf.getD1Database('DB');
    assert.equal((await database.prepare('SELECT status FROM email_outbox WHERE id=?').bind('synthetic').first()).status, 'uncertain');
  } finally {
    await mf.dispose();
  }
});
