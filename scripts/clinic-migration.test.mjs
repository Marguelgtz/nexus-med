// Standalone SQLite + local workerd/D1 migration tests. All persistence is /tmp.
// No Prisma/Vitest global setup, remote bindings, accounts or credentials.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import Database from 'better-sqlite3';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

const project = path.resolve(import.meta.dirname, '..');
const sqliteClinicFile = path.join(project, 'prisma/migrations/20261113000000_clinic_ownership/migration.sql');
const d1ClinicFile = path.join(project, 'prisma/cloudflare-migrations/0004_clinic_ownership.sql');
const historicalTime = '2026-10-01T09:14:23.456Z';
const updatedTime = '2026-11-01T15:27:31.789Z';

async function temporaryDirectory(t) {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nexus-clinic-migration-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  return directory;
}

function sqliteAdapter(database) {
  return {
    run: async (sql, values = []) => database.prepare(sql).run(...values),
    all: async (sql, values = []) => database.prepare(sql).all(...values),
    migrate: async sql => database.transaction(() => database.exec(sql))(),
  };
}

function d1Adapter(database) {
  return {
    run: async (sql, values = []) => database.prepare(sql).bind(...values).run(),
    all: async (sql, values = []) => (await database.prepare(sql).bind(...values).all()).results,
    // Use the project's installed Wrangler parser to preserve complete trigger
    // bodies and quoted strings. D1.exec's newline splitting is insufficient.
    migrate: async sql => database.batch(unstable_splitSqlQuery(sql).map(statement => database.prepare(statement))),
  };
}

async function insert(database, table, row) {
  const columns = Object.keys(row);
  await database.run(`INSERT INTO "${table}" (${columns.map(column => `"${column}"`).join(',')}) VALUES (${columns.map(() => '?').join(',')})`, Object.values(row));
}

async function seedPreMission(database) {
  for (const [id, role, disabledAt] of [
    ['legacy-doctor', 'doctor', null], ['legacy-secretary', 'secretary', null],
    ['disabled-secretary', 'secretary', updatedTime], ['demo-identity', 'demo', null], ['pending-identity', 'pending', null],
  ]) await insert(database, 'auth_users', { id, name: `Identidad sintética ${role}`, email: `${id}@example.test`, emailVerified: 1, role, disabledAt, createdAt: historicalTime, updatedAt: updatedTime });
  await insert(database, 'auth_sessions', { id: 'retained-session', userId: 'legacy-doctor', token: 'synthetic-session-fixture-not-a-live-credential', expiresAt: '2027-01-01T00:00:00.000Z', createdAt: historicalTime, updatedAt: updatedTime, demoView: 'doctor' });
  await insert(database, 'auth_accounts', { id: 'retained-account', accountId: 'legacy-doctor', providerId: 'credential', userId: 'legacy-doctor', password: 'synthetic-hash-fixture', createdAt: historicalTime, updatedAt: updatedTime });
  await insert(database, 'auth_verifications', { id: 'retained-verification', identifier: 'synthetic@example.test', value: 'synthetic-verification-fixture', expiresAt: '2027-01-01T00:00:00.000Z', createdAt: historicalTime, updatedAt: updatedTime });
  await insert(database, 'auth_invitations', { id: 'retained-invitation', email: 'invited@example.test', role: 'secretary', tokenHash: 'synthetic-invitation-hash-fixture', expiresAt: '2027-01-01T00:00:00.000Z', createdById: 'legacy-doctor', createdAt: historicalTime });
  await insert(database, 'security_events', { id: 'retained-security-event', actorId: 'legacy-doctor', event: 'synthetic.fixture', targetId: 'retained-invitation', outcome: 'success', createdAt: historicalTime });
  await insert(database, 'auth_rate_limits', { key: 'synthetic-account-key', count: 2, windowFrom: historicalTime, updatedAt: updatedTime });
  await insert(database, 'patients', {
    id: 'retained-patient', fullName: 'Paciente Sintético Migración', dateOfBirth: '1970-01-01', phone: '0000000000', email: 'patient@example.test',
    externalIdentifier: 'SYNTHETIC-LEGACY-1', medicalConditions: 'Antecedente sintético conservado', previousSurgeries: 'Texto sintético previo',
    allergies: null, currentMedications: 'Texto sintético de registro', isArchived: 0,
    appointmentEmailConsent: 1, appointmentEmailConsentUpdatedAt: historicalTime, createdAt: historicalTime, updatedAt: updatedTime,
  });
  await insert(database, 'encounters', {
    id: 'retained-encounter', patientId: 'retained-patient', occurredAt: historicalTime, type: 'consulta', reason: 'Motivo sintético',
    historyOfPresentIllness: 'Historia sintética', relevantHistory: 'Antecedente de nota sintético', physicalExamination: 'Texto de prueba',
    assessment: 'Valoración de prueba sin diagnóstico real', plan: 'Plan sintético registrado', followUp: 'Seguimiento de prueba', createdAt: historicalTime, updatedAt: updatedTime,
  });
  await insert(database, 'appointments', {
    id: 'retained-appointment', patientId: 'retained-patient', startAt: historicalTime, durationMinutes: 30, type: 'consulta', status: 'completed',
    arrivedAt: historicalTime, attentionStartedAt: historicalTime, actualDurationMinutes: 35, completedAt: updatedTime,
    linkedEncounterId: 'retained-encounter', createdAt: historicalTime, updatedAt: updatedTime,
  });
  await insert(database, 'study_requests', {
    id: 'retained-study', patientId: 'retained-patient', encounterId: 'retained-encounter', category: 'otro', name: 'Estudio sintético',
    description: 'Detalle conservado', status: 'reviewed', resultNote: 'Revisión sintética explícita', createdAt: historicalTime, updatedAt: updatedTime,
  });
  await insert(database, 'medical_documents', { id: 'retained-prescription', patientId: 'retained-patient', encounterId: 'retained-encounter', kind: 'prescription', title: 'Receta sintética', body: 'Indicaciones de prueba', createdAt: historicalTime, updatedAt: updatedTime });
  await insert(database, 'medical_documents', { id: 'retained-report', patientId: 'retained-patient', encounterId: 'retained-encounter', kind: 'report', title: 'Informe sintético', body: 'Texto conservado\nSegunda línea de prueba', createdAt: historicalTime, updatedAt: updatedTime });
  await insert(database, 'prescription_lines', { id: 'retained-line', documentId: 'retained-prescription', position: 0, medication: 'Medicamento sintético de prueba', dose: 'Registro de prueba', route: 'Texto de prueba', frequency: 'Frecuencia de prueba', duration: 'Duración de prueba', instructions: 'Instrucción histórica conservada' });
  await insert(database, 'study_receipts', {
    id: 'retained-receipt', patientId: 'retained-patient', encounterId: 'retained-encounter', requestId: 'retained-study', title: 'Recibo sintético',
    studyDate: '2026-09-30', receiptNote: 'Recepción de prueba', receivedAt: historicalTime, reviewedAt: updatedTime, reviewNote: 'Revisión registrada de prueba',
  });
  await insert(database, 'study_receipt_files', { id: 'retained-file', receiptId: 'retained-receipt', storageKey: '00000000-0000-4000-8000-000000000001', name: 'synthetic.pdf', mimeType: 'application/pdf', size: 128 });
  await insert(database, 'email_outbox', {
    id: 'retained-outbox', kind: 'appointment', recipient: 'patient@example.test', subject: 'Mensaje sintético', encryptedBody: 'synthetic-encrypted-payload-fixture',
    idempotencyKey: 'synthetic-idempotency-fixture', status: 'queued', attempts: 2, availableAt: updatedTime, appointmentId: 'retained-appointment',
    appointmentVersion: updatedTime, appointmentEvent: 'confirmation', createdAt: historicalTime, updatedAt: updatedTime,
  });
}

async function snapshot(database) {
  const tables = await database.all("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name");
  const result = [];
  for (const { name } of tables) {
    const columns = (await database.all(`PRAGMA table_info("${name}")`)).map(column => column.name);
    const ordering = columns.includes('id') ? 'id' : columns.includes('key') ? 'key' : columns[0];
    const sql = `SELECT ${columns.map(column => `"${column}"`).join(',')} FROM "${name}" ORDER BY "${ordering}"`;
    result.push({ name, sql, rows: await database.all(sql) });
  }
  return result;
}

async function assertPreservedAndOwned(database, before) {
  for (const table of before) assert.deepEqual(await database.all(table.sql), table.rows, `Original columns and rows changed in ${table.name}`);
  assert.deepEqual(await database.all('PRAGMA foreign_key_check'), []);
  const memberships = await database.all('SELECT userId, clinicId, role, isAdmin, status, createdAt, updatedAt FROM clinic_memberships ORDER BY userId');
  assert.deepEqual(memberships, [
    { userId: 'disabled-secretary', clinicId: 'legacy-clinic', role: 'secretary', isAdmin: 0, status: 'revoked', createdAt: historicalTime, updatedAt: updatedTime },
    { userId: 'legacy-doctor', clinicId: 'legacy-clinic', role: 'doctor', isAdmin: 1, status: 'active', createdAt: historicalTime, updatedAt: updatedTime },
    { userId: 'legacy-secretary', clinicId: 'legacy-clinic', role: 'secretary', isAdmin: 0, status: 'active', createdAt: historicalTime, updatedAt: updatedTime },
  ]);
  for (const table of ['patients', 'encounters', 'appointments', 'study_requests', 'medical_documents', 'study_receipts', 'auth_invitations']) {
    const rows = await database.all(`SELECT DISTINCT clinicId FROM ${table}`);
    assert.deepEqual(rows, [{ clinicId: 'legacy-clinic' }], `Wrong ownership after migration: ${table}`);
  }
  assert.deepEqual(await database.all('SELECT authorId,lastEditedById,version FROM encounters'), [{ authorId: null, lastEditedById: null, version: 1 }]);
  assert.deepEqual(await database.all('SELECT DISTINCT authorId,lastEditedById,version FROM medical_documents'), [{ authorId: null, lastEditedById: null, version: 1 }]);
  assert.deepEqual(await database.all('SELECT doctorId,version FROM appointments'), [{ doctorId: null, version: 1 }]);
  assert.deepEqual(await database.all('SELECT orderedById,reviewedById FROM study_requests'), [{ orderedById: null, reviewedById: null }]);
  assert.deepEqual(await database.all('SELECT receivedById,reviewedById FROM study_receipts'), [{ receivedById: null, reviewedById: null }]);
}

async function assertCrossClinicAndImmutableAuthors(database) {
  await insert(database, 'clinics', { id: 'foreign-clinic', name: 'Clínica sintética separada', createdAt: historicalTime, updatedAt: updatedTime });
  await insert(database, 'patients', { id: 'foreign-patient', clinicId: 'foreign-clinic', fullName: 'Paciente sintético separado', updatedAt: updatedTime });
  await assert.rejects(database.run('UPDATE patients SET clinicId=? WHERE id=?', ['foreign-clinic', 'retained-patient']), /clinic ownership immutable/);
  const cases = [
    ['encounters', { id: 'cross-encounter', clinicId: 'foreign-clinic', patientId: 'retained-patient', occurredAt: historicalTime, updatedAt: updatedTime }],
    ['appointments', { id: 'cross-appointment', clinicId: 'foreign-clinic', patientId: 'foreign-patient', linkedEncounterId: 'retained-encounter', startAt: historicalTime, durationMinutes: 30, type: 'consulta', updatedAt: updatedTime }],
    ['study_requests', { id: 'cross-study', clinicId: 'foreign-clinic', patientId: 'foreign-patient', encounterId: 'retained-encounter', category: 'otro', name: 'Estudio de prueba', updatedAt: updatedTime }],
    ['medical_documents', { id: 'cross-document', clinicId: 'foreign-clinic', patientId: 'foreign-patient', encounterId: 'retained-encounter', kind: 'report', updatedAt: updatedTime }],
    ['study_receipts', { id: 'cross-receipt', clinicId: 'foreign-clinic', patientId: 'foreign-patient', requestId: 'retained-study', title: 'Recibo de prueba' }],
  ];
  for (const [table, row] of cases) await assert.rejects(insert(database, table, row), /invalid clinic patient association/);
  for (const [table, id] of [
    ['encounters', 'retained-encounter'], ['appointments', 'retained-appointment'], ['study_requests', 'retained-study'],
    ['medical_documents', 'retained-report'], ['study_receipts', 'retained-receipt'],
  ]) await assert.rejects(database.run(`UPDATE ${table} SET patientId=? WHERE id=?`, ['foreign-patient', id]), /invalid clinic patient association|patient ownership immutable/);
  await assert.rejects(database.run('UPDATE medical_documents SET authorId=? WHERE id=?', ['legacy-doctor', 'retained-report']), /clinical author immutable/);
  await assert.rejects(database.run('UPDATE encounters SET authorId=? WHERE id=?', ['legacy-doctor', 'retained-encounter']), /clinical author immutable/);
  await assert.rejects(database.run('DELETE FROM clinics WHERE id=?', ['legacy-clinic']), /clinic has records|FOREIGN KEY/);
  assert.deepEqual(await database.all('PRAGMA foreign_key_check'), []);
}

test('SQLite clinic migration preserves every pre-mission field, timestamp and clinical association', async t => {
  const directory = await temporaryDirectory(t);
  const sqlite = new Database(path.join(directory, 'legacy.sqlite'));
  try {
    const migrationRoot = path.join(project, 'prisma/migrations');
    for (const name of (await readdir(migrationRoot)).filter(name => name !== 'migration_lock.toml' && name < '20261113000000_clinic_ownership').sort()) {
      sqlite.exec(await readFile(path.join(migrationRoot, name, 'migration.sql'), 'utf8'));
    }
    sqlite.pragma('foreign_keys = ON');
    const database = sqliteAdapter(sqlite);
    await seedPreMission(database);
    const before = await snapshot(database);
    const sql = await readFile(sqliteClinicFile, 'utf8');
    await database.migrate(sql);
    t.diagnostic(`SQLite clinic migration SHA-256: ${createHash('sha256').update(sql).digest('hex')}`);
    await assertPreservedAndOwned(database, before);
    await assertCrossClinicAndImmutableAuthors(database);
    assert.deepEqual(sqlite.pragma('integrity_check'), [{ integrity_check: 'ok' }]);
  } finally { sqlite.close(); }
});

test('workerd D1 replays migrations, preserves legacy records and rolls back failed/stale batches', { timeout: 60_000 }, async t => {
  const directory = await temporaryDirectory(t);
  // Miniflare 5 has a new native configuration shape; its installed public
  // compatibility converter accepts the documented v4 D1 options safely.
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: true, script: 'export default { fetch() { return new Response("local migration verification only"); } };',
    d1Databases: ['DB'], host: '127.0.0.1', port: 0, cf: false, enableDevRegistry: false,
    telemetry: { enabled: false }, resourcePersistencePath: path.join(directory, 'd1'), log: new Log(LogLevel.NONE),
  }));
  try {
    const binding = await mf.getD1Database('DB');
    const database = d1Adapter(binding);
    for (const name of (await readdir(path.join(project, 'prisma/cloudflare-migrations'))).filter(name => name.endsWith('.sql') && name < '0004_clinic_ownership.sql').sort()) {
      await database.migrate(await readFile(path.join(project, 'prisma/cloudflare-migrations', name), 'utf8'));
    }
    await seedPreMission(database);
    const before = await snapshot(database);
    const sql = await readFile(d1ClinicFile, 'utf8');
    assert.equal(sql, await readFile(sqliteClinicFile, 'utf8'), 'SQLite and D1 clinic migration SQL drifted');
    await database.migrate(sql);
    t.diagnostic(`D1 clinic migration SHA-256: ${createHash('sha256').update(sql).digest('hex')}`);
    await assertPreservedAndOwned(database, before);
    await assertCrossClinicAndImmutableAuthors(database);

    await assert.rejects(binding.batch([
      binding.prepare('UPDATE medical_documents SET body=?,version=version+1 WHERE id=?').bind('Cambio que debe revertirse', 'retained-prescription'),
      binding.prepare('INSERT INTO prescription_lines(id,documentId,position,medication) VALUES(?,?,?,?)').bind('invalid-line', 'missing-document', 1, 'Texto sintético'),
    ]), /FOREIGN KEY/);
    assert.deepEqual(await database.all('SELECT body,version FROM medical_documents WHERE id=?', ['retained-prescription']), [{ body: 'Indicaciones de prueba', version: 1 }]);

    const guard = binding.prepare('INSERT INTO atomic_write_guards(id,valid) VALUES (?,CASE WHEN EXISTS(SELECT 1 FROM medical_documents WHERE id=? AND clinicId=? AND version=?) THEN 1 ELSE 0 END)');
    const writes = (version, body, medication) => [
      guard.bind(`guard-${version}`, 'retained-prescription', 'legacy-clinic', version),
      binding.prepare('UPDATE medical_documents SET body=?,version=version+1 WHERE id=?').bind(body, 'retained-prescription'),
      binding.prepare('DELETE FROM prescription_lines WHERE documentId=?').bind('retained-prescription'),
      binding.prepare('INSERT INTO prescription_lines(id,documentId,position,medication) VALUES(?,?,?,?)').bind(`new-line-${version}`, 'retained-prescription', 0, medication),
      binding.prepare('DELETE FROM atomic_write_guards WHERE id=?').bind(`guard-${version}`),
    ];
    await binding.batch(writes(1, 'Cambio sintético guardado', 'Línea sintética guardada'));
    const acceptedDocument = await database.all('SELECT * FROM medical_documents WHERE id=?', ['retained-prescription']);
    const acceptedLines = await database.all('SELECT * FROM prescription_lines WHERE documentId=?', ['retained-prescription']);
    await assert.rejects(binding.batch(writes(1, 'Cambio obsoleto rechazado', 'Línea obsoleta rechazada')), /CHECK constraint failed.*valid/);
    assert.deepEqual(await database.all('SELECT * FROM medical_documents WHERE id=?', ['retained-prescription']), acceptedDocument);
    assert.deepEqual(await database.all('SELECT * FROM prescription_lines WHERE documentId=?', ['retained-prescription']), acceptedLines);
    const simultaneous = await Promise.allSettled([
      binding.batch(writes(2, 'Edición sintética concurrente A', 'Línea concurrente A')),
      binding.batch(writes(2, 'Edición sintética concurrente B', 'Línea concurrente B')),
    ]);
    assert.equal(simultaneous.filter(result => result.status === 'fulfilled').length, 1, 'Exactly one concurrent writer may consume the current version');
    assert.equal(simultaneous.filter(result => result.status === 'rejected').length, 1, 'The competing writer must fail rather than overwrite the accepted edit');
    assert.deepEqual(await database.all('SELECT version FROM medical_documents WHERE id=?', ['retained-prescription']), [{ version: 3 }]);
    assert.equal((await database.all('SELECT * FROM prescription_lines WHERE documentId=?', ['retained-prescription'])).length, 1);
    assert.deepEqual(await database.all('SELECT * FROM atomic_write_guards'), []);
    assert.deepEqual(await database.all('PRAGMA foreign_key_check'), []);
  } finally { await mf.dispose(); }
});
