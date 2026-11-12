import { hashPassword } from 'better-auth/crypto';
import type { PrismaClient } from '../../generated/prisma/client';
import type { AtomicWrite } from '../../infrastructure/database/runtime-client';

export const DEMO_ACCOUNT_EMAIL = 'demo@example.test';

export async function deriveDemoPassword(secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('nexus-med/demo-entry/v1')));
  let binary = '';
  for (const byte of digest) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function ensureDemoAccount(database: PrismaClient, atomicWrite: AtomicWrite, secret: string): Promise<void> {
  const email = DEMO_ACCOUNT_EMAIL;
  const existing = await database.user.findUnique({
    where: { email },
    select: { id: true, role: true, emailVerified: true, disabledAt: true },
  });
  if (existing && (existing.role !== 'demo' || !existing.emailVerified || existing.disabledAt)) {
    throw new Error('The reserved demo identity is already assigned or unavailable.');
  }

  const userId = existing?.id ?? crypto.randomUUID();
  const credential = await database.account.findFirst({
    where: { userId, providerId: 'credential', accountId: userId },
    select: { password: true },
  });
  if (credential?.password) return;
  if (credential) throw new Error('The reserved demo identity has an incomplete credential.');

  const passwordHash = await hashPassword(await deriveDemoPassword(secret));
  const now = new Date().toISOString();
  const statements = [];
  if (!existing) {
    statements.push({
      sql: `INSERT OR IGNORE INTO auth_users (id, name, email, emailVerified, image, role, disabledAt, createdAt, updatedAt)
            VALUES (?, ?, ?, 1, NULL, 'demo', NULL, ?, ?)`,
      values: [userId, 'Demostración compartida', email, now, now],
    });
  }
  statements.push({
    sql: `INSERT OR IGNORE INTO auth_accounts (id, accountId, providerId, userId, accessToken, refreshToken, idToken, accessTokenExpiresAt, refreshTokenExpiresAt, scope, password, createdAt, updatedAt)
          SELECT ?, ?, 'credential', ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?, ?
          WHERE EXISTS (SELECT 1 FROM auth_users WHERE id = ? AND email = ? AND role = 'demo' AND emailVerified = 1 AND disabledAt IS NULL)
            AND NOT EXISTS (SELECT 1 FROM auth_accounts WHERE providerId = 'credential' AND accountId = ?)`,
    values: [crypto.randomUUID(), userId, userId, passwordHash, now, now, userId, email, userId],
  });
  await atomicWrite(statements);

  const provisionedUser = await database.user.findUnique({
    where: { email },
    select: { id: true, role: true, emailVerified: true, disabledAt: true },
  });
  const provisionedCredential = provisionedUser ? await database.account.findFirst({
    where: { userId: provisionedUser.id, providerId: 'credential', accountId: provisionedUser.id },
    select: { password: true },
  }) : null;
  if (
    !provisionedUser || provisionedUser.role !== 'demo' || !provisionedUser.emailVerified ||
    provisionedUser.disabledAt || !provisionedCredential?.password
  ) {
    throw new Error('Could not provision the reserved demo identity.');
  }
}
