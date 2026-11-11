import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { resolveDbPath } from '../../../../../prisma/lib/db-path';
import { setDefaultStudyFileStorage } from './runtime-study-files';

const directory = () => path.join(path.dirname(resolveDbPath()), 'study-files');

setDefaultStudyFileStorage({
  async put(key, bytes) {
    await mkdir(directory(), { recursive: true });
    await writeFile(path.join(directory(), key), bytes, { flag: 'wx' });
  },
  async get(key) {
    try {
      return new Uint8Array(await readFile(path.join(directory(), key)));
    } catch {
      return null;
    }
  },
  async delete(key) {
    await unlink(path.join(directory(), key)).catch(() => undefined);
  },
});
