import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createDemoReceiptPdf, getCloudflareDemoSeedData } from '../prisma/seed.ts';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wranglerEntrypoint = path.join(projectRoot, 'node_modules/wrangler/bin/wrangler.js');
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--pilot')) {
  throw new Error('Usage: cloudflare-seed-demo.mjs [--pilot]');
}
const pilot = args[0] === '--pilot';
const wranglerConfig = pilot ? 'apps/api/wrangler.pilot.jsonc' : 'apps/api/wrangler.jsonc';
const receiptBucket = pilot ? 'nexus-med-pilot-001-study-files' : 'nexus-med-study-files';

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
    const detail = `${result.stdout}\n${result.stderr}`.trim();
    throw new Error(`${command} failed.${detail ? ` ${detail}` : ''}`);
  }
}

function sqlValue(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('The fixture contains a non-finite number.');
    return String(value);
  }
  return `'${String(value).replaceAll("'", "''")}'`;
}

function insert(table, columns, values) {
  if (columns.length !== values.length) throw new Error(`Invalid fixture mapping for ${table}.`);
  return `INSERT OR IGNORE INTO "${table}" (${columns.map(column => `"${column}"`).join(', ')}) VALUES (${values.map(sqlValue).join(', ')});`;
}

function parseBooleanColumn(output, column) {
  let parsed;
  try {
    parsed = JSON.parse(output);
  } catch {
    throw new Error('Could not read the remote demo database response. No demo rows were changed.');
  }
  const visit = (value) => {
    if (Array.isArray(value)) return value.map(visit).find(result => result !== undefined);
    if (typeof value !== 'object' || value === null) return undefined;
    if (Object.hasOwn(value, column)) return Number(value[column]) > 0;
    for (const child of Object.values(value)) {
      const result = visit(child);
      if (result !== undefined) return result;
    }
    return undefined;
  };
  const exists = visit(parsed);
  if (typeof exists !== 'boolean') throw new Error('The remote demo database response had an unexpected shape.');
  return exists;
}

function buildStatements({ fixture, seedTime, baselineSeededAt, practiceDate, upcomingAppointments }, receiptFile) {
  const statements = [];
  for (const patient of fixture.patients) {
    statements.push(insert('patients', [
      'id', 'fullName', 'dateOfBirth', 'phone', 'email', 'appointmentEmailConsent', 'appointmentEmailConsentUpdatedAt',
      'externalIdentifier', 'medicalConditions', 'previousSurgeries', 'allergies', 'currentMedications', 'isArchived', 'createdAt', 'updatedAt',
    ], [
      patient.id, patient.fullName, patient.dateOfBirth, patient.phone, patient.email, false, null,
      patient.externalIdentifier, patient.medicalConditions, patient.previousSurgeries, patient.allergies,
      patient.currentMedications, patient.isArchived, baselineSeededAt, baselineSeededAt,
    ]));
  }

  for (const encounter of fixture.encounters) {
    const occurredAt = new Date(encounter.occurredAt).toISOString();
    statements.push(insert('encounters', [
      'id', 'patientId', 'occurredAt', 'type', 'reason', 'historyOfPresentIllness', 'relevantHistory',
      'physicalExamination', 'assessment', 'plan', 'followUp', 'createdAt', 'updatedAt',
    ], [
      encounter.id, encounter.patientId, occurredAt, 'consulta', encounter.reason, encounter.historyOfPresentIllness,
      encounter.relevantHistory, encounter.physicalExamination, encounter.assessment, encounter.plan,
      encounter.followUp, occurredAt, occurredAt,
    ]));
  }

  for (const appointment of [...(fixture.appointments ?? []), ...upcomingAppointments]) {
    const startAt = new Date(appointment.startAt).toISOString();
    statements.push(insert('appointments', [
      'id', 'patientId', 'startAt', 'durationMinutes', 'type', 'status', 'arrivedAt', 'attentionStartedAt',
      'actualDurationMinutes', 'completedAt', 'linkedEncounterId', 'createdAt', 'updatedAt',
    ], [
      appointment.id, appointment.patientId, startAt, appointment.durationMinutes, appointment.type, appointment.status,
      null, null, appointment.actualDurationMinutes ?? null,
      appointment.completedAt ? new Date(appointment.completedAt).toISOString() : null,
      appointment.linkedEncounterId ?? null, startAt, startAt,
    ]));
  }

  for (const study of fixture.studies ?? []) {
    const createdAt = study.seedOnCurrentDay ? seedTime : baselineSeededAt;
    statements.push(insert('study_requests', [
      'id', 'patientId', 'encounterId', 'category', 'name', 'description', 'status', 'resultNote', 'createdAt', 'updatedAt',
    ], [
      study.id, study.patientId, study.encounterId, study.category, study.name, study.description,
      study.status, study.resultNote ?? null, createdAt, createdAt,
    ]));
  }

  for (const receipt of fixture.receipts ?? []) {
    if (!receiptFile || receiptFile.receiptId !== receipt.id) continue;
    if (receiptFile.addReceipt) {
      statements.push(insert('study_receipts', [
        'id', 'patientId', 'encounterId', 'requestId', 'title', 'studyDate', 'receiptNote', 'receivedAt', 'reviewedAt', 'reviewNote',
      ], [receipt.id, receipt.patientId, receipt.encounterId, receipt.requestId, receipt.title, practiceDate, null, seedTime, null, null]));
    }
    if (receiptFile.addFile) {
      statements.push(insert('study_receipt_files', [
        'id', 'receiptId', 'storageKey', 'name', 'mimeType', 'size',
      ], [receipt.fileId, receipt.id, receiptFile.storageKey, receipt.fileName, 'application/pdf', receiptFile.size]));
    }
  }

  for (const document of fixture.documents ?? []) {
    statements.push(insert('medical_documents', [
      'id', 'patientId', 'encounterId', 'kind', 'title', 'body', 'createdAt', 'updatedAt',
    ], [document.id, document.patientId, document.encounterId, document.kind, document.title, document.body, baselineSeededAt, baselineSeededAt]));
    for (const [position, line] of (document.lines ?? []).entries()) {
      statements.push(insert('prescription_lines', [
        'id', 'documentId', 'position', 'medication', 'dose', 'route', 'frequency', 'duration', 'instructions',
      ], [line.id, document.id, position, line.medication, line.dose, line.route, line.frequency, line.duration, line.instructions]));
    }
  }
  return statements;
}

async function main() {
  const seed = await getCloudflareDemoSeedData();
  const receipt = seed.fixture.receipts?.[0];
  let receiptFile = null;

  if (receipt) {
    const check = wrangler([
      'd1', 'execute', 'DEMO_DB', '--remote', '--json', '--command',
      `SELECT CASE WHEN EXISTS (SELECT 1 FROM study_receipts WHERE id = ${sqlValue(receipt.id)}) THEN 1 ELSE 0 END AS fixture_exists, CASE WHEN EXISTS (SELECT 1 FROM study_receipt_files WHERE id = ${sqlValue(receipt.fileId)}) THEN 1 ELSE 0 END AS file_exists`,
      '--config', wranglerConfig,
    ]);
    requireSuccess(check, 'Check the existing demo receipt');
    const receiptExists = parseBooleanColumn(check.stdout, 'fixture_exists');
    const fileExists = parseBooleanColumn(check.stdout, 'file_exists');
    // The file API accepts opaque UUID keys only. Existing metadata is never
    // rewritten; generate a new key only when the fixture file is missing.
    const storageKey = randomUUID();
    let receiptSize = null;
    if (!fileExists) {
      const bytes = createDemoReceiptPdf(receipt.title);
      const workDirectory = path.join(projectRoot, '.local', 'cloudflare');
      const filePath = path.join(workDirectory, 'demo-receipt.pdf');
      await mkdir(workDirectory, { recursive: true, mode: 0o700 });
      await writeFile(filePath, bytes, { mode: 0o600 });
      try {
        const upload = wrangler([
          'r2', 'object', 'put', `${receiptBucket}/demo/${storageKey}`,
          '--remote', '--file', filePath, '--content-type', 'application/pdf', '--config', wranglerConfig,
        ]);
        requireSuccess(upload, 'Upload the synthetic demo receipt PDF');
        receiptSize = bytes.byteLength;
      } finally {
        await rm(filePath, { force: true });
      }
    }
    receiptFile = {
      receiptId: receipt.id,
      storageKey,
      fileName: receipt.fileName,
      size: receiptSize,
      addReceipt: !receiptExists,
      addFile: !fileExists,
    };
  }

  const statements = buildStatements(seed, receiptFile);
  const sqlPath = path.join(projectRoot, '.local', 'cloudflare', 'demo-seed.sql');
  await mkdir(path.dirname(sqlPath), { recursive: true, mode: 0o700 });
  await writeFile(sqlPath, `${statements.join('\n')}\n`, { encoding: 'utf8', mode: 0o600 });
  const execution = wrangler(['d1', 'execute', 'DEMO_DB', '--remote', '--file', sqlPath, '--config', wranglerConfig]);
  requireSuccess(execution, 'Apply the additive synthetic demo fixture');
  await rm(sqlPath, { force: true });
  console.log(`Applied ${statements.length} create-if-missing statements to DEMO_DB. Existing rows are preserved; no rows or R2 objects are deleted.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Cloudflare demo seeding failed.');
  process.exitCode = 1;
});
