import { randomBytes } from 'node:crypto';
import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const secretPath = path.resolve(process.cwd(), '.local', 'auth', 'auth.secret');

/** Keep a stable local Better Auth secret outside Git without printing it. */
export function loadLocalAuthSecret(): string {
  mkdirSync(path.dirname(secretPath), { recursive: true, mode: 0o700 });
  if (!existsSync(secretPath)) {
    const secret = randomBytes(48).toString('base64url');
    try {
      const descriptor = openSync(secretPath, 'wx', 0o600);
      writeFileSync(descriptor, `${secret}\n`, { encoding: 'utf8' });
      closeSync(descriptor);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    }
  }
  chmodSync(secretPath, 0o600);
  const secret = readFileSync(secretPath, 'utf8').trim();
  if (secret.length < 32) throw new Error('Local auth secret is invalid.');
  return secret;
}
