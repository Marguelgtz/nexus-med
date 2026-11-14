// Local-only recovery primitives. Neither entrypoint has network capabilities.
// Backups require stopped services so SQLite and attachment snapshots describe
// the same application state; SQLite's backup API also includes WAL contents.
import Database from 'better-sqlite3';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { chmod, copyFile, lstat, mkdir, readFile, readdir, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

const FORMAT = 'nexus-med-local-backup-v1';

function localPath(value) {
  if (typeof value !== 'string' || !path.isAbsolute(value) || /^[a-z][a-z0-9+.-]*:/i.test(value)) {
    throw new Error('Use an absolute local filesystem path; URLs and remote targets are forbidden.');
  }
  return path.resolve(value);
}

async function noSymlinks(value) {
  const resolved = localPath(value);
  const segments = resolved.split(path.sep).filter(Boolean);
  let cursor = path.parse(resolved).root;
  for (const segment of segments) {
    cursor = path.join(cursor, segment);
    if ((await lstat(cursor)).isSymbolicLink()) throw new Error('Symbolic links are forbidden in recovery paths.');
  }
  return realpath(resolved);
}

function isWithin(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === '' || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative));
}

async function createFreshDirectory(value, excludedRoots = []) {
  const destination = localPath(value);
  // Existing parents must be ordinary directories; never follow a symlink
  // into a live runtime or allow restoration to an already existing path.
  const parent = await noSymlinks(path.dirname(destination));
  const canonical = path.join(parent, path.basename(destination));
  if (excludedRoots.some(root => isWithin(root, canonical))) throw new Error('Destination must be outside the source data.');
  await mkdir(canonical, { mode: 0o700 });
  return canonical;
}

async function filesIn(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const name = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolute = path.join(directory, entry.name);
    const info = await lstat(absolute);
    if (info.isSymbolicLink()) throw new Error('Symbolic links are forbidden in recovery data.');
    if (info.isDirectory()) result.push(...await filesIn(absolute, name));
    else if (info.isFile()) result.push({ name, absolute });
    else throw new Error('Only regular files and directories can be backed up.');
  }
  return result;
}

async function sha256(filename) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(filename)) hash.update(bytes);
  return hash.digest('hex');
}

async function fileEvidence(root) {
  const result = [];
  for (const file of await filesIn(root)) {
    if (file.name === 'manifest.json') continue;
    result.push({ path: file.name, bytes: (await lstat(file.absolute)).size, sha256: await sha256(file.absolute) });
  }
  return result;
}

function checkDatabase(databasePath, fileNames) {
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const integrity = database.pragma('integrity_check');
    if (integrity.length !== 1 || integrity[0].integrity_check !== 'ok') throw new Error('SQLite integrity verification failed.');
    if (database.pragma('foreign_key_check').length !== 0) throw new Error('SQLite foreign-key verification failed.');
    const table = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='study_receipt_files'").get();
    if (table) {
      for (const row of database.prepare('SELECT storageKey FROM study_receipt_files').all()) {
        if (typeof row.storageKey !== 'string' || !/^[a-f0-9-]{36}$/.test(row.storageKey) || !fileNames.has(row.storageKey)) {
          throw new Error('A database attachment reference has no valid backed-up file.');
        }
      }
    }
    const hasMigrations = database.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='_prisma_migrations'").get();
    return hasMigrations
      ? database.prepare('SELECT migration_name AS name, checksum, finished_at AS finishedAt, rolled_back_at AS rolledBackAt FROM _prisma_migrations ORDER BY started_at, migration_name').all()
      : [];
  } finally {
    database.close();
  }
}

async function copyPrivate(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true, mode: 0o700 });
  // COPYFILE_EXCL protects against accidental overwrite even inside our new dir.
  await copyFile(source, destination, 1);
  await chmod(destination, 0o600);
}

export async function createLocalBackup({ databasePath, filesDirectory, outputDirectory, servicesStopped = false }) {
  if (!servicesStopped) throw new Error('Stop application services and explicitly pass --services-stopped before backup.');
  const databaseSource = await noSymlinks(databasePath);
  const filesSource = await noSymlinks(filesDirectory);
  if (!(await lstat(databaseSource)).isFile() || !(await lstat(filesSource)).isDirectory()) throw new Error('Database and attachment directory are required.');
  const output = await createFreshDirectory(outputDirectory, [filesSource]);
  try {
    const database = new Database(databaseSource, { readonly: true, fileMustExist: true });
    try { await database.backup(path.join(output, 'database.sqlite')); }
    finally { database.close(); }
    await chmod(path.join(output, 'database.sqlite'), 0o600);
    await mkdir(path.join(output, 'files'), { mode: 0o700 });
    const files = await filesIn(filesSource);
    for (const file of files) await copyPrivate(file.absolute, path.join(output, 'files', file.name));
    const migrations = checkDatabase(path.join(output, 'database.sqlite'), new Set(files.map(file => file.name)));
    const manifest = { format: FORMAT, createdAt: new Date().toISOString(), migrations, files: await fileEvidence(output) };
    await writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    return { fileCount: files.length, migrations: migrations.length };
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  }
}

export async function restoreLocalBackup({ backupDirectory, outputDirectory }) {
  const backup = await noSymlinks(backupDirectory);
  // Validate every path and digest before creating any restored output.
  const manifestPath = path.join(backup, 'manifest.json');
  if ((await lstat(manifestPath)).isSymbolicLink()) throw new Error('Symbolic links are forbidden in recovery data.');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.format !== FORMAT || !Array.isArray(manifest.files)) throw new Error('Unsupported or incomplete local backup.');
  const evidence = await fileEvidence(backup);
  if (!evidence.some(file => file.path === 'database.sqlite') || JSON.stringify(evidence) !== JSON.stringify(manifest.files)) {
    throw new Error('Backup contents or checksums do not match the manifest.');
  }
  const files = evidence.filter(file => file.path.startsWith('files/'));
  const migrations = checkDatabase(path.join(backup, 'database.sqlite'), new Set(files.map(file => file.path.slice('files/'.length))));
  const output = await createFreshDirectory(outputDirectory, [backup]);
  try {
    await copyPrivate(path.join(backup, 'database.sqlite'), path.join(output, 'database.sqlite'));
    await mkdir(path.join(output, 'study-files'), { mode: 0o700 });
    for (const file of files) await copyPrivate(path.join(backup, file.path), path.join(output, 'study-files', file.path.slice('files/'.length)));
    checkDatabase(path.join(output, 'database.sqlite'), new Set(files.map(file => file.path.slice('files/'.length))));
    return { fileCount: files.length, migrations: migrations.length };
  } catch (error) {
    await rm(output, { recursive: true, force: true });
    throw error;
  }
}

export function parseRecoveryArguments(args, names, flags = []) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (flags.includes(argument)) {
      if (values[argument]) throw new Error('Duplicate option.');
      values[argument] = true;
    } else if (names.includes(argument) && typeof args[index + 1] === 'string' && !args[index + 1].startsWith('--')) {
      if (values[argument]) throw new Error('Duplicate option.');
      values[argument] = args[++index];
    } else throw new Error('Unknown or incomplete local recovery option.');
  }
  if (names.some(name => !values[name])) throw new Error('All local recovery paths must be explicitly supplied.');
  return values;
}
