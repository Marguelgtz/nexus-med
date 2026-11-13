import type { PrismaClient } from '../../generated/prisma/client';

export const INVITATION_COOKIE = 'nexus-invitation';
export const INVITATION_LIFETIME_MS = 72 * 60 * 60 * 1000;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function sha256(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

export function newOpaqueToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return base64Url(bytes);
}

export function readCookie(headers: Headers | undefined, name: string): string | null {
  const cookie = headers?.get('cookie');
  if (!cookie) return null;
  for (const part of cookie.split(';')) {
    const [key, ...valueParts] = part.trim().split('=');
    if (key === name) return valueParts.join('=') || null;
  }
  return null;
}

export async function findValidInvitation(
  database: PrismaClient,
  email: string,
  headers: Headers | undefined,
) {
  const token = readCookie(headers, INVITATION_COOKIE);
  if (!token) return null;
  const tokenHash = await sha256(token);
  return database.invitation.findFirst({
    where: {
      tokenHash,
      email: normalizeEmail(email),
      role: { in: ['doctor', 'secretary'] },
      clinic: { isActive: true },
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
}

export async function findInvitationByToken(database: PrismaClient, token: string) {
  const tokenHash = await sha256(token);
  return database.invitation.findFirst({
    where: {
      tokenHash,
      role: { in: ['doctor', 'secretary'] },
      clinic: { isActive: true },
      acceptedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
    select: { id: true, email: true, role: true, clinicId: true, expiresAt: true, clinic: { select: { name: true } } },
  });
}

function base64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}
