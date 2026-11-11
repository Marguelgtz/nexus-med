// Deterministic, idempotent demo seed for the local prototype.
//
// Contract (docs/DEMO_DATA.md):
// - Creates the fixture records from docs/demo-dataset.json if missing.
// - Never overwrites existing records (edited demo records keep their edits).
// - Never deletes user-created records or resets the database.
// - Repeated runs produce no duplicates.
// - Fixed past appointments preserve their exact fixture timestamps; upcoming
//   appointments anchor to the FIRST seed run's practice-timezone date
//   (D-029/U-14) and are stored once — re-seeds never move or duplicate them.
//
// In Prisma 7 seeding is explicit: `prisma db seed` invokes this script.

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fixed timestamp for seeded patient rows so repeated seeds are deterministic.
const SEEDED_AT = new Date('2026-01-01T12:00:00.000-06:00');

interface FixturePatient {
  id: string;
  fullName: string;
  dateOfBirth: string | null;
  phone: string | null;
  email: string | null;
  externalIdentifier: string | null;
  medicalConditions: string | null;
  previousSurgeries: string | null;
  allergies: string | null;
  currentMedications: string | null;
  isArchived: boolean;
}

interface FixtureEncounter {
  id: string;
  patientId: string;
  reason: string | null;
  historyOfPresentIllness: string | null;
  relevantHistory: string | null;
  physicalExamination: string | null;
  assessment: string | null;
  plan: string | null;
  followUp: string | null;
  occurredAt: string;
}

interface FixtureAppointment {
  id: string;
  patientId: string;
  startAt: string;
  durationMinutes: number;
  type: string;
  status: string;
  actualDurationMinutes?: number | null;
  completedAt?: string | null;
  linkedEncounterId?: string | null;
}

interface FixtureStudyRequest {
  id: string;
  patientId: string;
  encounterId: string;
  category: string;
  name: string;
  description?: string | null;
  status: string;
  resultNote?: string | null;
  seedOnCurrentDay?: boolean;
}

interface FixtureStudyReceipt {
  id: string;
  patientId: string;
  encounterId: string | null;
  requestId: string | null;
  title: string;
  fileName: string;
  fileId: string;
}

interface SeedReceiptFile {
  storageKey: string;
  name: string;
  mimeType: string;
  size: number;
}

interface FixturePrescriptionLine {
  id: string;
  medication: string;
  dose: string | null;
  route: string | null;
  frequency: string | null;
  duration: string | null;
  instructions: string | null;
}

interface FixtureMedicalDocument {
  id: string;
  patientId: string;
  encounterId: string | null;
  kind: 'prescription' | 'report';
  title: string | null;
  body: string | null;
  lines?: FixturePrescriptionLine[];
}

interface Fixture {
  patients: FixturePatient[];
  encounters: FixtureEncounter[];
  appointments?: FixtureAppointment[];
  studies?: FixtureStudyRequest[];
  receipts?: FixtureStudyReceipt[];
  documents?: FixtureMedicalDocument[];
}

type PrismaLike = {
  patient: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  encounter: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  appointment: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  studyRequest: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
    updateMany(args: { where: { id: string; createdAt: Date; updatedAt: Date }; data: { createdAt: Date; updatedAt: Date } }): Promise<{ count: number }>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  studyReceipt: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  medicalDocument: {
    findUnique(args: { where: { id: string } }): Promise<{ id: string } | null>;
    create(args: { data: Record<string, unknown> }): Promise<unknown>;
  };
  // Interactive transaction: the callback receives the tx client and every
  // query MUST go through it to participate in the transaction (atomicity).
  $transaction<T>(fn: (tx: PrismaLike) => Promise<T>): Promise<T>;
};

const here = path.dirname(fileURLToPath(import.meta.url));

const defaultFixturePath = path.join(here, '..', 'docs', 'demo-dataset.json');

async function loadFixture(fixturePath: string = defaultFixturePath): Promise<Fixture> {
  const raw = await readFile(fixturePath, 'utf8');
  return JSON.parse(raw) as Fixture;
}

// --- Upcoming demo appointments (first-seed anchor, D-029/U-14) ------------
//
// A calendar demo whose dates all predate "today" demonstrates nothing, so a
// few upcoming appointments are anchored to the first seed run's
// practice-timezone date. The computed instant is stored once under a stable
// id; later seed runs skip it, so the anchor is never recomputed or moved.
const PRACTICE_TZ = 'America/Monterrey';

const upcomingDemoAppointments = [
  { id: 'demo-appt-up-001', patientId: 'demo-patient-002', dayOffset: 1, hour: 9, minute: 0, durationMinutes: 30, type: 'consulta' },
  { id: 'demo-appt-up-002', patientId: 'demo-patient-005', dayOffset: 3, hour: 10, minute: 30, durationMinutes: 45, type: 'procedimiento' },
  { id: 'demo-appt-up-003', patientId: 'demo-patient-001', dayOffset: 6, hour: 12, minute: 0, durationMinutes: 30, type: 'consulta' },
  { id: 'demo-appt-up-004', patientId: 'demo-patient-006', dayOffset: 10, hour: 16, minute: 0, durationMinutes: 30, type: 'visita_domicilio' },
  { id: 'demo-appt-up-005', patientId: 'demo-patient-007', dayOffset: 14, hour: 11, minute: 0, durationMinutes: 60, type: 'urgencia' },
] as const;

// Practice-timezone calendar date of an instant, as numeric parts.
function practiceDateParts(instant: Date): { year: number; month: number; day: number } {
  const text = new Intl.DateTimeFormat('en-CA', {
    timeZone: PRACTICE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
  const [year, month, day] = text.split('-').map(Number) as [number, number, number];
  return { year, month, day };
}

// UTC offset (minutes, ahead of UTC) of the practice timezone at an instant.
function practiceOffsetMinutes(instant: Date): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: PRACTICE_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const value = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'));
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

// The instant whose practice-timezone wall clock is `date` at hour:minute.
function instantAtWallTime(
  date: { year: number; month: number; day: number },
  hour: number,
  minute: number,
): Date {
  const estimate = Date.UTC(date.year, date.month - 1, date.day, hour, minute);
  return new Date(estimate - practiceOffsetMinutes(new Date(estimate)) * 60_000);
}

// Wall-clock date `dayOffset` days after the anchor instant's practice date.
function addPracticeDays(anchor: Date, dayOffset: number): { year: number; month: number; day: number } {
  const base = practiceDateParts(anchor);
  const shifted = new Date(Date.UTC(base.year, base.month - 1, base.day) + dayOffset * 86_400_000);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1, day: shifted.getUTCDate() };
}

function practiceDateString(instant: Date): string {
  const { year, month, day } = practiceDateParts(instant);
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function createNeutralStudyPdf(studyTitle: string): string {
  const safeText = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '')
    .replace(/[\\()]/g, '\\$&');
  const stream = `BT /F1 20 Tf 50 760 Td (Nexus Med) Tj /F1 14 Tf 0 -32 Td (${safeText(studyTitle)}) Tj 0 -24 Td (Documento asociado al expediente.) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  return pdf;
}

async function storeDefaultReceiptFile(fileName: string, studyTitle: string): Promise<SeedReceiptFile> {
  const { storeStudyFiles } = await import('../apps/api/src/infrastructure/storage/study-files.js');
  const file = new File([createNeutralStudyPdf(studyTitle)], fileName, { type: 'application/pdf' });
  const [stored] = await storeStudyFiles([file]);
  if (!stored) throw new Error('No se pudo guardar el PDF del estudio de ejemplo.');
  return stored;
}

async function removeDefaultReceiptFiles(keys: string[]): Promise<void> {
  const { removeStudyFiles } = await import('../apps/api/src/infrastructure/storage/study-files.js');
  await removeStudyFiles(keys);
}

/**
 * Create any missing fixture records. Existing records — whether edited demo
 * records or user-created ones — are left untouched. All writes run through
 * the interactive-transaction client, so a failure anywhere rolls back the
 * whole seed instead of leaving partial data.
 */
export async function idempotentSeed(
  prisma: PrismaLike,
  options: {
    fixturePath?: string;
    now?: Date;
    storeReceiptFile?: (fileName: string, studyTitle: string) => Promise<SeedReceiptFile>;
    removeReceiptFiles?: (storageKeys: string[]) => Promise<void>;
  } = {},
): Promise<{
  patientsCreated: number;
  encountersCreated: number;
  appointmentsCreated: number;
  studiesCreated: number;
  studyReceiptsCreated: number;
  documentsCreated: number;
}> {
  const fixture = await loadFixture(options.fixturePath);
  const seedTime = options.now ?? new Date();
  const storeReceiptFile = options.storeReceiptFile ?? storeDefaultReceiptFile;
  const removeReceiptFiles = options.removeReceiptFiles ?? removeDefaultReceiptFiles;
  const stagedReceiptFiles = new Map<string, SeedReceiptFile>();

  let patientsCreated = 0;
  let encountersCreated = 0;
  let appointmentsCreated = 0;
  let studiesCreated = 0;
  let studyReceiptsCreated = 0;
  let documentsCreated = 0;
  const attachedReceiptIds = new Set<string>();

  try {
    // File storage is outside SQLite's transaction. Stage only files for rows
    // that appear to be missing, then remove any file that fails to attach.
    for (const receipt of fixture.receipts ?? []) {
      if (await prisma.studyReceipt.findUnique({ where: { id: receipt.id } })) continue;
      stagedReceiptFiles.set(receipt.id, await storeReceiptFile(receipt.fileName, receipt.title));
    }

  } catch (error) {
    await removeReceiptFiles([...stagedReceiptFiles.values()].map((file) => file.storageKey));
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    for (const p of fixture.patients) {
      const existing = await tx.patient.findUnique({ where: { id: p.id } });
      if (existing) continue;
      await tx.patient.create({
        data: {
          id: p.id,
          fullName: p.fullName,
          dateOfBirth: p.dateOfBirth,
          phone: p.phone,
          email: p.email,
          externalIdentifier: p.externalIdentifier,
          medicalConditions: p.medicalConditions,
          previousSurgeries: p.previousSurgeries,
          allergies: p.allergies,
          currentMedications: p.currentMedications,
          isArchived: p.isArchived,
          createdAt: SEEDED_AT,
          updatedAt: SEEDED_AT,
        },
      });
      patientsCreated += 1;
    }

    for (const e of fixture.encounters) {
      const existing = await tx.encounter.findUnique({ where: { id: e.id } });
      if (existing) continue;
      // occurredAt is preserved exactly from the fixture; creation timestamps
      // are deterministic (equal to the occurrence time) for seeded records.
      const occurredAt = new Date(e.occurredAt);
      await tx.encounter.create({
        data: {
          id: e.id,
          patientId: e.patientId,
          occurredAt,
          reason: e.reason,
          historyOfPresentIllness: e.historyOfPresentIllness,
          relevantHistory: e.relevantHistory,
          physicalExamination: e.physicalExamination,
          assessment: e.assessment,
          plan: e.plan,
          followUp: e.followUp,
          createdAt: occurredAt,
          updatedAt: occurredAt,
        },
      });
      encountersCreated += 1;
    }

    // Fixed past appointments: exact fixture timestamps, like the encounters.
    for (const a of fixture.appointments ?? []) {
      const existing = await tx.appointment.findUnique({ where: { id: a.id } });
      if (existing) continue;
      const startAt = new Date(a.startAt);
      await tx.appointment.create({
        data: {
          id: a.id,
          patientId: a.patientId,
          startAt,
          durationMinutes: a.durationMinutes,
          type: a.type,
          status: a.status,
          actualDurationMinutes: a.actualDurationMinutes ?? null,
          completedAt: a.completedAt ? new Date(a.completedAt) : null,
          linkedEncounterId: a.linkedEncounterId ?? null,
          createdAt: startAt,
          updatedAt: startAt,
        },
      });
      appointmentsCreated += 1;
    }

    // Study requests: fixture timestamps, like the encounters.
    for (const s of fixture.studies ?? []) {
      const existing = await tx.studyRequest.findUnique({ where: { id: s.id } });
      if (existing) {
        // Upgrade an earlier seed of this explicitly current-day example,
        // but only while both timestamps still match its untouched baseline.
        if (s.seedOnCurrentDay) {
          await tx.studyRequest.updateMany({
            where: { id: s.id, createdAt: SEEDED_AT, updatedAt: SEEDED_AT },
            data: { createdAt: seedTime, updatedAt: seedTime },
          });
        }
        continue;
      }
      await tx.studyRequest.create({
        data: {
          id: s.id,
          patientId: s.patientId,
          encounterId: s.encounterId,
          category: s.category,
          name: s.name,
          description: s.description ?? null,
          status: s.status,
          resultNote: s.resultNote ?? null,
          createdAt: s.seedOnCurrentDay ? seedTime : SEEDED_AT,
          updatedAt: s.seedOnCurrentDay ? seedTime : SEEDED_AT,
        },
      });
      studiesCreated += 1;
    }

    // Receipt evidence is independent of the physician's request status.
    for (const receipt of fixture.receipts ?? []) {
      const existing = await tx.studyReceipt.findUnique({ where: { id: receipt.id } });
      if (existing) continue;
      const file = stagedReceiptFiles.get(receipt.id);
      if (!file) throw new Error(`No se preparó el archivo del estudio recibido ${receipt.id}.`);
      await tx.studyReceipt.create({
        data: {
          id: receipt.id,
          patientId: receipt.patientId,
          encounterId: receipt.encounterId,
          requestId: receipt.requestId,
          title: receipt.title,
          studyDate: practiceDateString(seedTime),
          receiptNote: null,
          receivedAt: seedTime,
          files: { create: [{ id: receipt.fileId, ...file }] },
        },
      });
      attachedReceiptIds.add(receipt.id);
      studyReceiptsCreated += 1;
    }

    // Printable demo documents are created with their lines atomically. Once
    // present, neither document nor its lines are overwritten on re-seed.
    for (const d of fixture.documents ?? []) {
      const existing = await tx.medicalDocument.findUnique({ where: { id: d.id } });
      if (existing) continue;
      await tx.medicalDocument.create({
        data: {
          id: d.id,
          patientId: d.patientId,
          encounterId: d.encounterId,
          kind: d.kind,
          title: d.title,
          body: d.body,
          ...(d.lines
            ? {
                lines: {
                  create: d.lines.map((line, position) => ({ ...line, position })),
                },
              }
            : {}),
          createdAt: SEEDED_AT,
          updatedAt: SEEDED_AT,
        },
      });
      documentsCreated += 1;
    }

    // Upcoming appointments: anchored to THIS (first) seed run, stored once.
    const anchor = new Date();
    for (const spec of upcomingDemoAppointments) {
      const existing = await tx.appointment.findUnique({ where: { id: spec.id } });
      if (existing) continue;
      await tx.appointment.create({
        data: {
          id: spec.id,
          patientId: spec.patientId,
          startAt: instantAtWallTime(addPracticeDays(anchor, spec.dayOffset), spec.hour, spec.minute),
          durationMinutes: spec.durationMinutes,
          type: spec.type,
          status: 'scheduled',
          actualDurationMinutes: null,
          completedAt: null,
          linkedEncounterId: null,
        },
      });
      appointmentsCreated += 1;
    }
  }).catch(async (error: unknown) => {
    await removeReceiptFiles([...stagedReceiptFiles.values()].map((file) => file.storageKey));
    throw error;
  });

  const unattachedStorageKeys = [...stagedReceiptFiles.entries()]
    .filter(([receiptId]) => !attachedReceiptIds.has(receiptId))
    .map(([, file]) => file.storageKey);
  if (unattachedStorageKeys.length) await removeReceiptFiles(unattachedStorageKeys);

  return { patientsCreated, encountersCreated, appointmentsCreated, studiesCreated, studyReceiptsCreated, documentsCreated };
}

async function main(): Promise<void> {
  // Imported lazily so this module stays testable without the generated client.
  const { prisma } = await import('../apps/api/src/infrastructure/database/prisma.js');
  const result = await idempotentSeed(prisma);
  console.log(
    `[seed] done — patients created: ${result.patientsCreated}, encounters created: ${result.encountersCreated}, appointments created: ${result.appointmentsCreated}, studies created: ${result.studiesCreated}, study receipts created: ${result.studyReceiptsCreated}, documents created: ${result.documentsCreated}`
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
