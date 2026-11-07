// Database transaction behavior on the local SQLite adapter: a failed
// multi-write transaction must roll back all writes (representative of the
// atomicity guarantees the product relies on).

import { describe, expect, it } from 'vitest';

import { prisma } from '../src/infrastructure/database/prisma';

describe('local transactions', () => {
  it('rolls back all writes when a later write in the transaction fails', async () => {
    const marker = `rollback probe ${Date.now()}`;

    await expect(
      prisma.$transaction([
        prisma.patient.create({ data: { fullName: marker } }),
        // Referential integrity failure: the patient does not exist.
        prisma.encounter.create({
          data: {
            patientId: 'no-such-patient',
            occurredAt: new Date('2026-01-01T09:00:00.000-06:00'),
          },
        }),
      ]),
    ).rejects.toThrow();

    const found = await prisma.patient.findFirst({ where: { fullName: marker } });
    expect(found).toBeNull();
  });
});
