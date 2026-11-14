import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { createLocalBackup, parseRecoveryArguments, restoreLocalBackup } from './local-recovery.mjs';

async function fixture(t, { realMigrations = false } = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'nexus-recovery-test-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const databasePath = path.join(root, 'source.sqlite');
  const filesDirectory = path.join(root, 'source-files');
  await mkdir(filesDirectory);
  if (realMigrations) {
    await writeFile(databasePath, '');
    execFileSync(process.execPath, [path.resolve('node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
      cwd: path.resolve('.'), env: { ...process.env, DATABASE_URL: `file:${databasePath}` }, stdio: 'pipe',
    });
  }
  const database = new Database(databasePath);
  database.pragma('foreign_keys = ON');
  if (!realMigrations) database.exec(`
    CREATE TABLE patients (id TEXT PRIMARY KEY, fullName TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE encounters (id TEXT PRIMARY KEY, patientId TEXT NOT NULL REFERENCES patients(id), reason TEXT);
    CREATE TABLE study_receipts (id TEXT PRIMARY KEY, patientId TEXT NOT NULL REFERENCES patients(id));
    CREATE TABLE study_receipt_files (id TEXT PRIMARY KEY, receiptId TEXT NOT NULL REFERENCES study_receipts(id), storageKey TEXT NOT NULL UNIQUE);
  `);
  const key = randomUUID();
  const bytes = Buffer.from('%PDF-1.4\nNexus Med — synthetic recovery fixture only\n%%EOF\n');
  database.prepare('INSERT INTO patients (id, fullName, updatedAt) VALUES (?, ?, ?)').run('synthetic-patient', 'Paciente Sintético Recuperación', '2026-11-13T12:00:00.000Z');
  if (realMigrations) {
    database.prepare('INSERT INTO encounters (id, patientId, occurredAt, reason, updatedAt) VALUES (?, ?, ?, ?, ?)').run('synthetic-encounter', 'synthetic-patient', '2026-11-13T12:00:00.000Z', 'Nota sintética para recuperación', '2026-11-13T12:00:00.000Z');
    database.prepare('INSERT INTO study_receipts (id, patientId, title, receivedAt) VALUES (?, ?, ?, ?)').run('synthetic-receipt', 'synthetic-patient', 'Estudio sintético', '2026-11-13T12:00:00.000Z');
    database.prepare('INSERT INTO study_receipt_files (id, receiptId, storageKey, name, mimeType, size) VALUES (?, ?, ?, ?, ?, ?)').run('synthetic-file', 'synthetic-receipt', key, 'synthetic.pdf', 'application/pdf', bytes.length);
  } else {
    database.prepare('INSERT INTO encounters (id, patientId, reason) VALUES (?, ?, ?)').run('synthetic-encounter', 'synthetic-patient', 'Nota sintética para recuperación');
    database.prepare('INSERT INTO study_receipts (id, patientId) VALUES (?, ?)').run('synthetic-receipt', 'synthetic-patient');
    database.prepare('INSERT INTO study_receipt_files (id, receiptId, storageKey) VALUES (?, ?, ?)').run('synthetic-file', 'synthetic-receipt', key);
  }
  database.close();
  await writeFile(path.join(filesDirectory, key), bytes);
  return { root, databasePath, filesDirectory, key, bytes, backupDirectory: path.join(root, 'backup'), outputDirectory: path.join(root, 'restored') };
}

function backupOptions(f) {
  return { databasePath: f.databasePath, filesDirectory: f.filesDirectory, outputDirectory: f.backupDirectory, servicesStopped: true };
}

test('restores a migrated synthetic clinic database, clinical associations, migration state and exact attachment bytes', async t => {
  const f = await fixture(t, { realMigrations: true });
  const result = await createLocalBackup(backupOptions(f));
  assert.equal(result.fileCount, 1);
  assert.ok(result.migrations > 0);
  await restoreLocalBackup(f);
  const restored = new Database(path.join(f.outputDirectory, 'database.sqlite'), { readonly: true });
  try {
    assert.deepEqual(restored.pragma('foreign_key_check'), []);
    assert.equal(restored.prepare('SELECT reason FROM encounters WHERE patientId=?').get('synthetic-patient').reason, 'Nota sintética para recuperación');
    assert.equal(restored.prepare('SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL').get().count, result.migrations);
    assert.equal(restored.prepare('SELECT receiptId FROM study_receipt_files WHERE storageKey=?').get(f.key).receiptId, 'synthetic-receipt');
  } finally { restored.close(); }
  assert.deepEqual(await readFile(path.join(f.outputDirectory, 'study-files', f.key)), f.bytes);
  assert.equal((await stat(path.join(f.outputDirectory, 'database.sqlite'))).mode & 0o777, 0o600);
});

test('requires stopped services and refuses existing backup or restore destinations', async t => {
  const f = await fixture(t);
  await assert.rejects(createLocalBackup({ ...backupOptions(f), servicesStopped: false }), /Stop application services/);
  await createLocalBackup(backupOptions(f));
  await assert.rejects(createLocalBackup(backupOptions(f)), /EEXIST/);
  await mkdir(f.outputDirectory);
  await writeFile(path.join(f.outputDirectory, 'owner-sentinel'), 'preserve');
  await assert.rejects(restoreLocalBackup(f), /EEXIST/);
  assert.equal(await readFile(path.join(f.outputDirectory, 'owner-sentinel'), 'utf8'), 'preserve');
});

test('rejects missing attachments and removes its incomplete backup', async t => {
  const f = await fixture(t);
  await rm(path.join(f.filesDirectory, f.key));
  await assert.rejects(createLocalBackup(backupOptions(f)), /attachment reference/);
  await assert.rejects(stat(f.backupDirectory), /ENOENT/);
});

test('rejects corrupted backup content before creating restored output', async t => {
  const f = await fixture(t);
  await createLocalBackup(backupOptions(f));
  await writeFile(path.join(f.backupDirectory, 'files', f.key), 'altered');
  await assert.rejects(restoreLocalBackup(f), /checksums/);
  await assert.rejects(stat(f.outputDirectory), /ENOENT/);
});

test('includes committed WAL changes instead of copying a stale SQLite main file', async t => {
  const f = await fixture(t);
  const writer = new Database(f.databasePath);
  try {
    writer.pragma('journal_mode = WAL');
    writer.pragma('wal_autocheckpoint = 0');
    writer.prepare('UPDATE encounters SET reason=? WHERE id=?').run('Cambio sintético confirmado en WAL', 'synthetic-encounter');
    await createLocalBackup(backupOptions(f));
    await restoreLocalBackup(f);
    const restored = new Database(path.join(f.outputDirectory, 'database.sqlite'), { readonly: true });
    try {
      assert.equal(restored.prepare('SELECT reason FROM encounters WHERE id=?').get('synthetic-encounter').reason, 'Cambio sintético confirmado en WAL');
    } finally { restored.close(); }
  } finally { writer.close(); }
});

test('rejects a database with broken clinical foreign keys', async t => {
  const f = await fixture(t);
  const database = new Database(f.databasePath);
  database.pragma('foreign_keys = OFF');
  database.prepare('UPDATE encounters SET patientId=?').run('missing-patient');
  database.close();
  await assert.rejects(createLocalBackup(backupOptions(f)), /foreign-key/);
  await assert.rejects(stat(f.backupDirectory), /ENOENT/);
});

test('rejects symlinks, remote targets and backup recursion', async t => {
  const f = await fixture(t);
  const linked = path.join(f.root, 'linked-files');
  await symlink(f.filesDirectory, linked);
  await assert.rejects(createLocalBackup({ ...backupOptions(f), filesDirectory: linked }), /Symbolic links/);
  await assert.rejects(createLocalBackup({ ...backupOptions(f), outputDirectory: 'https://example.test/backup' }), /absolute local/);
  await assert.rejects(createLocalBackup({ ...backupOptions(f), outputDirectory: path.join(f.filesDirectory, 'nested-backup') }), /outside the source/);
  assert.throws(() => parseRecoveryArguments(['--remote'], ['--backup', '--output']), /Unknown/);
});
