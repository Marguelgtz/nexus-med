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

interface Fixture {
  patients: FixturePatient[];
  encounters: FixtureEncounter[];
  appointments?: FixtureAppointment[];
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
  const [year, month, day] = text.split('-').map(Number);
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

/**
 * Create any missing fixture records. Existing records — whether edited demo
 * records or user-created ones — are left untouched. All writes run through
 * the interactive-transaction client, so a failure anywhere rolls back the
 * whole seed instead of leaving partial data.
 */
export async function idempotentSeed(
  prisma: PrismaLike,
  options: { fixturePath?: string } = {},
): Promise<{
  patientsCreated: number;
  encountersCreated: number;
  appointmentsCreated: number;
}> {
  const fixture = await loadFixture(options.fixturePath);

  let patientsCreated = 0;
  let encountersCreated = 0;
  let appointmentsCreated = 0;

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
  });

  return { patientsCreated, encountersCreated, appointmentsCreated };
}

async function main(): Promise<void> {
  // Imported lazily so this module stays testable without the generated client.
  const { prisma } = await import('../apps/api/src/infrastructure/database/prisma.js');
  const result = await idempotentSeed(prisma);
  console.log(
    `[seed] done — patients created: ${result.patientsCreated}, encounters created: ${result.encountersCreated}, appointments created: ${result.appointmentsCreated}`
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
