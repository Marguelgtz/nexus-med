import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';

const script = path.resolve('scripts/prepare-d1-restore.mjs');
const run = (source, target) => spawnSync(process.execPath, [script, source, target], { encoding: 'utf8' });

test('reorders a D1-style export and refuses to overwrite the result', t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'nexus-restore-prep-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source.sql'), target = path.join(dir, 'prepared.sql');
  writeFileSync(source, `PRAGMA defer_foreign_keys=TRUE;
CREATE TABLE child(id TEXT PRIMARY KEY, parentId TEXT REFERENCES parent(id));
INSERT INTO child VALUES ('child', 'parent');
CREATE TABLE parent(id TEXT PRIMARY KEY);
INSERT INTO parent VALUES ('parent');
CREATE TRIGGER child_guard BEFORE UPDATE ON child BEGIN SELECT RAISE(ABORT,'guard'); END;`);
  assert.equal(run(source, target).status, 0);
  const sql = readFileSync(target, 'utf8');
  const db = new Database(':memory:');
  db.pragma('foreign_keys=ON'); db.transaction(() => db.exec(sql))();
  assert.deepEqual(db.pragma('foreign_key_check'), []);
  assert.equal(db.prepare('SELECT count(*) n FROM child').get().n, 1);
  assert.throws(() => db.prepare("UPDATE child SET parentId='parent'").run(), /guard/);
  db.close();
  assert.notEqual(run(source, target).status, 0);
  assert.equal(readFileSync(target, 'utf8'), sql);
});

test('rejects unsupported statements and invalid foreign keys before creating output', t => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'nexus-restore-prep-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const source = path.join(dir, 'source.sql'), target = path.join(dir, 'prepared.sql');
  writeFileSync(source, "CREATE TABLE item(id TEXT); DROP TABLE item;");
  assert.notEqual(run(source, target).status, 0); assert.equal(existsSync(target), false);
  writeFileSync(source, "PRAGMA defer_foreign_keys=TRUE; CREATE TABLE parent(id TEXT PRIMARY KEY); CREATE TABLE child(parentId TEXT REFERENCES parent(id)); INSERT INTO child VALUES ('missing');");
  assert.notEqual(run(source, target).status, 0); assert.equal(existsSync(target), false);
});
