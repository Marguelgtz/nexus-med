import { randomUUID } from 'node:crypto';

import { RECEIPT_MAX_FILES, RECEIPT_MAX_FILE_BYTES, RECEIPT_MAX_TOTAL_FILE_BYTES } from '@nexus-med/contracts';

import { NotFoundError, ValidationError } from '../../shared/http/errors';
import { studyFileStorage } from './runtime-study-files';

const validKey = (key: string) => /^[a-f0-9-]{36}$/.test(key);

export async function removeStudyFiles(keys: string[]) {
  await Promise.all(
    keys.map((key) => (validKey(key) ? studyFileStorage.delete(key).catch(() => undefined) : undefined)),
  );
}

export async function storeStudyFiles(files: File[]) {
  if (!files.length || files.length > RECEIPT_MAX_FILES) {
    throw new ValidationError('Adjunta entre 1 y 5 archivos.');
  }
  if (files.reduce((sum, file) => sum + file.size, 0) > RECEIPT_MAX_TOTAL_FILE_BYTES) {
    throw new ValidationError('Los archivos superan 24 MB en total.');
  }

  const validated: Array<{
    storageKey: string;
    name: string;
    mimeType: string;
    size: number;
    data: Uint8Array;
  }> = [];

  for (const file of files) {
    if (!file.size || file.size > RECEIPT_MAX_FILE_BYTES) {
      throw new ValidationError('Cada archivo debe pesar entre 1 byte y 10 MB.');
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const pdf = new TextDecoder().decode(data.slice(0, 5)) === '%PDF-';
    const png = [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => data[index] === value);
    const jpeg = data[0] === 255 && data[1] === 216 && data[2] === 255;
    const validMimeAndSignature =
      (file.type === 'application/pdf' && pdf) ||
      (file.type === 'image/png' && png) ||
      (file.type === 'image/jpeg' && jpeg);

    if (!validMimeAndSignature) {
      throw new ValidationError('Solo se aceptan PDF, PNG y JPEG válidos.');
    }

    const name =
      file.name
        .split(/[\\/]/)
        .at(-1)
        ?.replace(/[\x00-\x1f\x7f]/g, '')
        .slice(0, 180) || 'Estudio';

    validated.push({
      storageKey: randomUUID(),
      name,
      mimeType: file.type,
      size: file.size,
      data,
    });
  }

  const written: string[] = [];
  try {
    for (const file of validated) {
      written.push(file.storageKey);
      await studyFileStorage.put(file.storageKey, file.data);
    }
    return validated.map(({ storageKey, name, mimeType, size }) => ({ storageKey, name, mimeType, size }));
  } catch (error) {
    await removeStudyFiles(written);
    throw error;
  }
}

export async function readStudyFile(key: string) {
  if (!validKey(key)) throw new NotFoundError('Archivo no disponible');
  const bytes = await studyFileStorage.get(key);
  if (!bytes) throw new NotFoundError('Archivo no disponible');
  return Uint8Array.from(bytes);
}
