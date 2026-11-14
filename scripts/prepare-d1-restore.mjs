// Prepare a trusted Wrangler D1 SQL export for import into a new empty D1.
// Some exports interleave inserts with table creation, which fails when a
// referenced table has not yet been created even with deferred foreign keys.
import Database from 'better-sqlite3';
import { readFile, lstat, open } from 'node:fs/promises';
import path from 'node:path';
import { unstable_splitSqlQuery } from 'wrangler';

function rank(statement) {
  const sql = statement.trim();
  if (/^PRAGMA\s+defer_foreign_keys\s*=\s*(?:TRUE|ON|1)\s*;?$/i.test(sql)) return 0;
  if (/^CREATE\s+TABLE\b/i.test(sql)) return 1;
  if (/^INSERT\s+INTO\b/i.test(sql) || /^DELETE\s+FROM\s+["`\[]?sqlite_sequence["`\]]?\s*;?$/i.test(sql)) return 2;
  if (/^CREATE\s+(?:UNIQUE\s+)?INDEX\b/i.test(sql)) return 3;
  if (/^CREATE\s+TRIGGER\b/i.test(sql)) return 4;
  throw new Error('Unsupported SQL statement in export; inspect it manually.');
}

async function main() {
  const [input, output, ...extra] = process.argv.slice(2);
  if (!input || !output || extra.length || !path.isAbsolute(input) || !path.isAbsolute(output) || input === output) {
    throw new Error('Usage: node scripts/prepare-d1-restore.mjs /absolute/export.sql /absolute/new-output.sql');
  }
  const info = await lstat(input);
  if (!info.isFile() || info.isSymbolicLink()) throw new Error('Input must be a regular file.');
  const statements = unstable_splitSqlQuery(await readFile(input, 'utf8'));
  if (!statements.length) throw new Error('Export is empty.');
  const ordered = statements.map((statement, index) => ({ statement, index, rank: rank(statement) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index);
  const sql = `${ordered.map(item => item.statement.replace(/;?\s*$/, ';')).join('\n')}\n`;
  const db = new Database(':memory:');
  try {
    db.pragma('foreign_keys=ON');
    db.transaction(() => db.exec(sql))();
    if (db.pragma('foreign_key_check').length || db.pragma('integrity_check', { simple: true }) !== 'ok') {
      throw new Error('Local integrity or foreign-key verification failed.');
    }
  } finally { db.close(); }
  const file = await open(output, 'wx', 0o600);
  try { await file.writeFile(sql, 'utf8'); } finally { await file.close(); }
  console.log(`Prepared ${statements.length} statements; local integrity and foreign-key checks passed.`);
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Restore preparation failed.'); process.exitCode = 1; });
