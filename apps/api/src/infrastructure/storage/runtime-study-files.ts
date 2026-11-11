import { AsyncLocalStorage } from 'node:async_hooks';

export interface StudyFileStorage {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
  delete(key: string): Promise<void>;
}

const requestStorage = new AsyncLocalStorage<StudyFileStorage>();
let defaultStorage: StudyFileStorage | undefined;

export function setDefaultStudyFileStorage(storage: StudyFileStorage): void {
  defaultStorage = storage;
}

export function withStudyFileStorage<TResult>(
  storage: StudyFileStorage,
  run: () => TResult | Promise<TResult>,
): Promise<TResult> {
  return requestStorage.run(storage, async () => await run());
}

function currentStorage(): StudyFileStorage {
  const storage = requestStorage.getStore() ?? defaultStorage;
  if (!storage) throw new Error('No study-file storage is configured for this request.');
  return storage;
}

export const studyFileStorage: StudyFileStorage = {
  put: (key, bytes) => currentStorage().put(key, bytes),
  get: (key) => currentStorage().get(key),
  delete: (key) => currentStorage().delete(key),
};
