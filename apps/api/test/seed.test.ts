// Seed behavior tests on a dedicated, isolated database:
// - exact fixture counts on first run
// - idempotency (no duplicates on re-runs)
// - preservation of user edits and user-created records
// - exact preservation of fixture timestamps

import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

import { PrismaClient } from '../src/generated/prisma/client';
import { idempotentSeed } from '../../../prisma/seed';

const repoRoot = path.resolve(import.meta.dirname, '..', '..', '..');
const seedDbFile = path.join(repoRoot, '.local', 'test', 'seed.test.db');

let prisma: PrismaClient;

beforeAll(() => {
  rmSync(seedDbFile, { force: true });
  mkdirSync(path.dirname(seedDbFile), { recursive: true });
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: `file:${seedDbFile}` },
  });
  const adapter = new PrismaBetterSqlite3({ url: `file:${seedDbFile}` });
  prisma = new PrismaClient({ adapter });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe('idempotent demo seed', () => {
  it('creates exactly the fixture records on the first run', async () => {
    const result = await idempotentSeed(prisma);
    expect(result).toEqual({ patientsCreated: 7, encountersCreated: 9 });

    const patients = await prisma.patient.count();
    const encounters = await prisma.encounter.count();
    expect(patients).toBe(7);
    expect(encounters).toBe(9);
  });

  it('creates nothing on a second run', async () => {
    const result = await idempotentSeed(prisma);
    expect(result).toEqual({ patientsCreated: 0, encountersCreated: 0 });
    expect(await prisma.patient.count()).toBe(7);
    expect(await prisma.encounter.count()).toBe(9);
  });

  it('preserves fixture timestamps exactly', async () => {
    const encounter = await prisma.encounter.findUnique({ where: { id: 'demo-encounter-001a' } });
    expect(encounter?.occurredAt.toISOString()).toBe('2026-09-04T18:00:00.000Z');
    expect(encounter?.createdAt.toISOString()).toBe('2026-09-04T18:00:00.000Z');
  });

  it('seeds the expected demo composition', async () => {
    const all = await prisma.patient.findMany({ orderBy: { id: 'asc' } });
    expect(all).toHaveLength(7);
    expect(all.filter((p) => p.isArchived)).toHaveLength(1);
    expect(all.filter((p) => p.isArchived)[0]?.id).toBe('demo-patient-004');

    // demo-patient-003 has no consultations in the fixture.
    const orphan = await prisma.encounter.count({ where: { patientId: 'demo-patient-003' } });
    expect(orphan).toBe(0);
  });

  it('keeps user edits to seeded records', async () => {
    await prisma.patient.update({
      where: { id: 'demo-patient-001' },
      data: { fullName: 'DEMO — Paciente 001 (editado por el usuario)' },
    });

    const result = await idempotentSeed(prisma);
    expect(result.patientsCreated).toBe(0);

    const patient = await prisma.patient.findUnique({ where: { id: 'demo-patient-001' } });
    expect(patient?.fullName).toBe('DEMO — Paciente 001 (editado por el usuario)');
  });

  it('keeps user-created records and does not touch them', async () => {
    const userPatient = await prisma.patient.create({
      data: { fullName: 'Paciente Real de Prueba', phone: '5551234567' },
    });
    await prisma.encounter.create({
      data: {
        patientId: userPatient.id,
        occurredAt: new Date('2026-11-05T09:00:00.000-06:00'),
        reason: 'consulta del usuario de prueba',
      },
    });

    const result = await idempotentSeed(prisma);
    expect(result).toEqual({ patientsCreated: 0, encountersCreated: 0 });

    expect(await prisma.patient.count()).toBe(8);
    expect(await prisma.encounter.count()).toBe(10);
    const stillThere = await prisma.patient.findUnique({ where: { id: userPatient.id } });
    expect(stillThere?.phone).toBe('5551234567');
  });
});

// Atomicity: a seed that fails midway must leave the database exactly as it
// was — no partial patients or encounters from the failed transaction.
describe('seed atomicity (rollback on failure)', () => {
  const rollbackDbFile = path.join(repoRoot, '.local', 'test', 'seed.rollback.test.db');
  const brokenFixturePath = path.join(repoRoot, '.local', 'test', 'rollback-fixture.json');

  let rollbackPrisma: PrismaClient;

  beforeAll(async () => {
    rmSync(rollbackDbFile, { force: true });
    // Two valid patients + one valid encounter (created first), then an
    // encounter referencing a nonexistent patient → FK violation mid-run.
    const brokenFixture = {
      patients: [
        { id: 'rb-patient-a', fullName: 'Paciente A', dateOfBirth: '1990-01-01', phone: null, email: null, externalIdentifier: null, medicalConditions: null, previousSurgeries: null, allergies: null, currentMedications: null, isArchived: false },
        { id: 'rb-patient-b', fullName: 'Paciente B', dateOfBirth: null, phone: null, email: null, externalIdentifier: null, medicalConditions: null, previousSurgeries: null, allergies: null, currentMedications: null, isArchived: false },
      ],
      encounters: [
        { id: 'rb-encounter-ok', patientId: 'rb-patient-a', reason: 'válido', historyOfPresentIllness: null, relevantHistory: null, physicalExamination: null, assessment: null, plan: null, followUp: null, occurredAt: '2026-01-02T18:00:00.000Z' },
        { id: 'rb-encounter-ghost', patientId: 'rb-patient-ghost', reason: 'viola FK', historyOfPresentIllness: null, relevantHistory: null, physicalExamination: null, assessment: null, plan: null, followUp: null, occurredAt: '2026-01-03T18:00:00.000Z' },
      ],
    };
    await writeFile(brokenFixturePath, JSON.stringify(brokenFixture));

    execFileSync('npx', ['prisma', 'migrate', 'deploy'], {
      cwd: repoRoot,
      stdio: 'pipe',
      env: { ...process.env, DATABASE_URL: `file:${rollbackDbFile}` },
    });
    const adapter = new PrismaBetterSqlite3({ url: `file:${rollbackDbFile}` });
    rollbackPrisma = new PrismaClient({ adapter });
  });

  afterAll(async () => {
    await rollbackPrisma.$disconnect();
    rmSync(brokenFixturePath, { force: true });
    rmSync(rollbackDbFile, { force: true });
  });

  it('rolls back the whole seed when one write fails', async () => {
    await expect(
      idempotentSeed(rollbackPrisma, { fixturePath: brokenFixturePath }),
    ).rejects.toThrow();

    // The two patients and the valid encounter were created BEFORE the
    // failing one — none of them may survive the rollback.
    expect(await rollbackPrisma.patient.count()).toBe(0);
    expect(await rollbackPrisma.encounter.count()).toBe(0);
  });
});
