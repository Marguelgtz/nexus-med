import { executeAtomicWrite, type AtomicSqlStatement } from '../infrastructure/database/runtime-client';
import { currentClinicId } from './clinic';
import { ConflictError } from './http/errors';

/** The checked guard and all writes share one SQLite transaction / D1 batch.
 * A stale request aborts before replacing child rows. The table stays empty. */
export async function executeVersionedWrite(
  table: 'medical_documents', id: string, version: number, statements: AtomicSqlStatement[],
): Promise<void> {
  const guardId = crypto.randomUUID();
  try {
    await executeAtomicWrite([
      { sql: `INSERT INTO atomic_write_guards(id,valid) VALUES (?, CASE WHEN EXISTS (SELECT 1 FROM ${table} WHERE id=? AND clinicId=? AND version=?) THEN 1 ELSE 0 END)`, values: [guardId, id, currentClinicId(), version] },
      ...statements,
      { sql: 'DELETE FROM atomic_write_guards WHERE id=?', values: [guardId] },
    ]);
  } catch (error) {
    if (error instanceof Error && /CHECK constraint failed.*valid/i.test(error.message)) {
      throw new ConflictError('Otra persona modificó este documento. Conserva tus cambios y actualiza antes de guardar.');
    }
    throw error;
  }
}
