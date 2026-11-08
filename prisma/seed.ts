// Deterministic, idempotent demo seed for the local prototype.
//
// Contract (docs/DEMO_DATA.md):
// - Creates the fixture records from docs/demo-dataset.json if missing.
// - Never overwrites existing records (edited demo records keep their edits).
// - Never deletes user-created records or resets the database.
// - Repeated runs produce no duplicates.
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

interface Fixture {
  patients: FixturePatient[];
  encounters: FixtureEncounter[];
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
}> {
  const fixture = await loadFixture(options.fixturePath);

  let patientsCreated = 0;
  let encountersCreated = 0;

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
  });

  return { patientsCreated, encountersCreated };
}

async function main(): Promise<void> {
  // Imported lazily so this module stays testable without the generated client.
  const { prisma } = await import('../apps/api/src/infrastructure/database/prisma.js');
  const result = await idempotentSeed(prisma);
  console.log(
    `[seed] done — patients created: ${result.patientsCreated}, encounters created: ${result.encountersCreated}`
  );
  await prisma.$disconnect();
}

main().catch((error: unknown) => {
  console.error('[seed] failed:', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
