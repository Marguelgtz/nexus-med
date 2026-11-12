import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveDbPath } from '../../../../../prisma/lib/db-path';
import { setDefaultStudyFileStorage } from './runtime-study-files';
import type { StudyFileStorage } from './runtime-study-files';

export function createLocalStudyFileStorage(directoryPath = path.join(path.dirname(resolveDbPath()), 'study-files')): StudyFileStorage {
  return {
    async put(key, bytes) {
      await mkdir(directoryPath, { recursive: true });
      await writeFile(path.join(directoryPath, key), bytes, { flag: 'wx' });
    },
    async get(key) {
      try {
        return new Uint8Array(await readFile(path.join(directoryPath, key)));
      } catch {
        return null;
      }
    },
    async delete(key) {
      await unlink(path.join(directoryPath, key)).catch(() => undefined);
    },
  };
}

setDefaultStudyFileStorage(createLocalStudyFileStorage());
