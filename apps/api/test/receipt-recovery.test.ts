import { describe, expect, it } from 'vitest';
import { createReceipt } from '../src/domains/receipts/receipts.service';
import { localPrisma } from '../src/infrastructure/database/prisma';
import { createSqliteAtomicWrite, withPrismaClient } from '../src/infrastructure/database/runtime-client';
import { withStudyFileStorage } from '../src/infrastructure/storage/runtime-study-files';
import { registerPatient, uniqueName } from './helpers';

function memoryStorage() {
  const files = new Map<string, Uint8Array>();
  return {
    files,
    put: async (key: string, bytes: Uint8Array) => { files.set(key, bytes); },
    get: async (key: string) => files.get(key) ?? null,
    delete: async (key: string) => { files.delete(key); },
  };
}

function receiptClient(failMethod: 'findUnique' | 'findUniqueOrThrow') {
  return new Proxy(localPrisma, {
    get(target, property, receiver) {
      if (property !== 'studyReceipt') return Reflect.get(target, property, receiver);
      return new Proxy(target.studyReceipt, {
        get(delegate, method, delegateReceiver) {
          if (method === failMethod) return async () => { throw new Error('synthetic lookup failure'); };
          return Reflect.get(delegate, method, delegateReceiver);
        },
      });
    },
  });
}

const pdf = () => new File(['%PDF-1.7 synthetic'], 'synthetic.pdf', { type: 'application/pdf' });

describe('receipt attachment recovery', () => {
  it('keeps committed attachments when the response lookup fails', async () => {
    const patient = await registerPatient(uniqueName());
    const storage = memoryStorage();
    await expect(withStudyFileStorage(storage, () => withPrismaClient(receiptClient('findUniqueOrThrow'),
      () => createReceipt(patient.id, { title: 'Synthetic' }, [pdf()]), createSqliteAtomicWrite(localPrisma))))
      .rejects.toThrow('synthetic lookup failure');
    const receipt = await localPrisma.studyReceipt.findFirstOrThrow({ where: { patientId: patient.id }, include: { files: true } });
    expect(storage.files.has(receipt.files[0]!.storageKey)).toBe(true);
  });

  it('keeps attachments if the write committed before an error was reported', async () => {
    const patient = await registerPatient(uniqueName());
    const storage = memoryStorage();
    const write = createSqliteAtomicWrite(localPrisma);
    await expect(withStudyFileStorage(storage, () => withPrismaClient(localPrisma,
      () => createReceipt(patient.id, { title: 'Synthetic' }, [pdf()]), async statements => { await write(statements); throw new Error('synthetic acknowledgement failure'); })))
      .rejects.toThrow('synthetic acknowledgement failure');
    const receipt = await localPrisma.studyReceipt.findFirstOrThrow({ where: { patientId: patient.id }, include: { files: true } });
    expect(storage.files.has(receipt.files[0]!.storageKey)).toBe(true);
  });

  it('cleans up after a confirmed rollback but retains files if lookup is unavailable', async () => {
    const patient = await registerPatient(uniqueName());
    const storage = memoryStorage();
    const failWrite = async () => { throw new Error('synthetic write failure'); };
    await expect(withStudyFileStorage(storage, () => withPrismaClient(localPrisma,
      () => createReceipt(patient.id, { title: 'Synthetic' }, [pdf()]), failWrite))).rejects.toThrow('synthetic write failure');
    expect(storage.files.size).toBe(0);
    await expect(withStudyFileStorage(storage, () => withPrismaClient(receiptClient('findUnique'),
      () => createReceipt(patient.id, { title: 'Synthetic' }, [pdf()]), failWrite))).rejects.toThrow('synthetic write failure');
    expect(storage.files.size).toBe(1);
  });
});
