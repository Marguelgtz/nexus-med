import { randomUUID } from 'node:crypto';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { RECEIPT_MAX_FILES, RECEIPT_MAX_FILE_BYTES, RECEIPT_MAX_TOTAL_FILE_BYTES } from '@nexus-med/contracts';
import { resolveDbPath } from '../../../../../prisma/lib/db-path';
import { NotFoundError, ValidationError } from '../../shared/http/errors';
const directory = () => path.join(path.dirname(resolveDbPath()), 'study-files');
const validKey = (key: string) => /^[a-f0-9-]{36}$/.test(key);
export async function removeStudyFiles(keys: string[]) {
  await Promise.all(keys.map(key => validKey(key) ? unlink(path.join(directory(), key)).catch(() => undefined) : undefined));
}
export async function storeStudyFiles(files: File[]) {
  if (!files.length || files.length > RECEIPT_MAX_FILES) throw new ValidationError('Adjunta entre 1 y 5 archivos.');
  if (files.reduce((sum, file) => sum + file.size, 0) > RECEIPT_MAX_TOTAL_FILE_BYTES) throw new ValidationError('Los archivos superan 24 MB en total.');
  const validated = [];
  for (const file of files) {
    if (!file.size || file.size > RECEIPT_MAX_FILE_BYTES) throw new ValidationError('Cada archivo debe pesar entre 1 byte y 10 MB.');
    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = new TextDecoder().decode(data.slice(0, 5)) === '%PDF-';
    const png = [137,80,78,71,13,10,26,10].every((v,i) => data[i] === v);
    const jpeg = data[0] === 255 && data[1] === 216 && data[2] === 255;
    if (!(file.type === 'application/pdf' && pdf || file.type === 'image/png' && png || file.type === 'image/jpeg' && jpeg)) throw new ValidationError('Solo se aceptan PDF, PNG y JPEG válidos.');
    validated.push({ storageKey: randomUUID(), name: path.basename(file.name).replace(/[\x00-\x1f\x7f]/g, '').slice(0,180) || 'Estudio', mimeType: file.type, size: file.size, data });
  }
  await mkdir(directory(), { recursive: true });
  const written: string[] = [];
  try {
    for (const file of validated) { await writeFile(path.join(directory(), file.storageKey), file.data, { flag: 'wx' }); written.push(file.storageKey); }
    return validated.map(file => ({ storageKey: file.storageKey, name: file.name, mimeType: file.mimeType, size: file.size }));
  } catch (error) { await removeStudyFiles(written); throw error; }
}
export async function readStudyFile(key: string) {
  if (!validKey(key)) throw new NotFoundError('Archivo no disponible');
  try { return new Uint8Array(await readFile(path.join(directory(), key))); }
  catch { throw new NotFoundError('Archivo no disponible'); }
}
