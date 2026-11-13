import { betterAuth } from 'better-auth';
import { prismaAdapter } from '@better-auth/prisma-adapter';
import type { PrismaClient } from '../../generated/prisma/client';
import { authEmailTemplate } from '../email/templates';
import { enqueueEmail } from '../email/outbox';
import { normalizeEmail, sha256 } from './invitations';

const DAY_SECONDS = 24 * 60 * 60;
const MAX_SESSION_AGE_MS = 7 * DAY_SECONDS * 1000;

export interface AuthConfiguration {
  secret: string;
  appBaseUrl: string;
  googleClientId?: string;
  googleClientSecret?: string;
  production: boolean;
}

export async function consumeAccountRateLimit(
  database: PrismaClient,
  secret: string,
  key: string,
  rule: { window: number; max: number },
) {
  const keyHash = await sha256(`${secret}\u0000${key}`);
  const now = new Date();
  const cutoff = new Date(now.getTime() - rule.window * 1000);
  const nowIso = now.toISOString();
  const cutoffIso = cutoff.toISOString();
  const rows = await database.$queryRawUnsafe<Array<{ count: number; windowFrom: string | Date }>>(
    `INSERT INTO auth_rate_limits (key, count, windowFrom, updatedAt)
     VALUES (?, 1, ?, ?)
     ON CONFLICT(key) DO UPDATE SET
       count = CASE WHEN windowFrom <= ? THEN 1 ELSE count + 1 END,
       windowFrom = CASE WHEN windowFrom <= ? THEN ? ELSE windowFrom END,
       updatedAt = ?
     RETURNING count, windowFrom`,
    keyHash, nowIso, nowIso, cutoffIso, cutoffIso, nowIso, nowIso,
  );
  const row = rows[0];
  if (!row) throw new Error('Authentication rate-limit storage is unavailable.');
  const windowFrom = row.windowFrom instanceof Date ? row.windowFrom : new Date(row.windowFrom);
  const retryAfter = Math.max(1, Math.ceil((windowFrom.getTime() + rule.window * 1000 - now.getTime()) / 1000));
  return { allowed: row.count <= rule.max, retryAfter: row.count <= rule.max ? null : retryAfter };
}

export function createAuth(database: PrismaClient, config: AuthConfiguration) {
  const appBaseUrl = config.appBaseUrl.replace(/\/$/, '');
  const allowedOrigins = new Set([appBaseUrl]);
  if (!config.production) {
    allowedOrigins.add('http://127.0.0.1:3000');
    allowedOrigins.add('http://localhost:3000');
  }

  return betterAuth({
    appName: 'Nexus Med',
    baseURL: appBaseUrl,
    basePath: '/api/auth',
    secret: config.secret,
    trustedOrigins: [...allowedOrigins],
    database: prismaAdapter(database, { provider: 'sqlite', transaction: false }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      autoSignIn: false,
      resetPasswordTokenExpiresIn: 30 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url, token }) => {
        const message = authEmailTemplate('reset_password', user.name, url);
        await enqueueEmail(database, config.secret, {
          kind: 'reset_password',
          recipient: normalizeEmail(user.email),
          subject: message.subject,
          payload: message.payload,
          idempotencyKey: `reset:${await sha256(token)}`,
        });
      },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url, token }) => {
        const message = authEmailTemplate('verify_email', user.name, url);
        await enqueueEmail(database, config.secret, {
          kind: 'verify_email',
          recipient: normalizeEmail(user.email),
          subject: message.subject,
          payload: message.payload,
          idempotencyKey: `verify:${await sha256(token)}`,
        });
      },
    },
    ...(config.googleClientId && config.googleClientSecret ? {
      socialProviders: {
        google: {
          clientId: config.googleClientId,
          clientSecret: config.googleClientSecret,
          scope: ['openid', 'email', 'profile'],
          includeGrantedScopes: false,
          requireEmailVerification: true,
          prompt: 'select_account',
        },
      },
    } : {}),
    account: {
      accountLinking: {
        enabled: true,
        disableImplicitLinking: true,
      },
    },
    user: {
      additionalFields: {
        role: { type: 'string', input: false, returned: true, required: true, defaultValue: 'pending' },
        disabledAt: { type: 'date', input: false, returned: true, required: false },
      },
      validateUserInfo: async ({ user, source }) => {
        if (source.action !== 'create-user') return;
        if (normalizeEmail(typeof user.email === 'string' ? user.email : '') === 'demo@example.test') {
          return { error: 'reserved_identity', errorDescription: 'Usa el acceso de demostración para esta cuenta.' };
        }
      },
    },
    session: {
      expiresIn: DAY_SECONDS,
      updateAge: 60 * 60,
      cookieCache: { enabled: false },
      additionalFields: {
        demoView: { type: 'string', input: false, returned: true, required: true, defaultValue: 'doctor' },
        activeClinicId: { type: 'string', input: false, returned: true, required: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const email = typeof user.email === 'string' ? normalizeEmail(user.email) : '';
            if (!email || email === 'demo@example.test') return false;
            // Identity creation grants no clinic access. Only verified,
            // authenticated onboarding or invitation acceptance may do so.
            return { data: { ...user, email, role: 'pending' } };
          },
        },
        update: {
          before: async (user) => {
            if ('role' in user || 'disabledAt' in user) return false;
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const user = await database.user.findUnique({
              where: { id: session.userId },
              select: { role: true, disabledAt: true, emailVerified: true },
            });
            if (!user || user.disabledAt || !user.emailVerified) return false;
            const maximumExpiry = new Date(session.createdAt.getTime() + MAX_SESSION_AGE_MS);
            return { data: { ...session, expiresAt: session.expiresAt > maximumExpiry ? maximumExpiry : session.expiresAt } };
          },
        },
        update: {
          before: async (session, context) => {
            // Better Auth refresh passes only expiresAt/updatedAt. The loaded
            // session identifier is supplied by its endpoint context.
            const sessionId = session.id ?? context?.context.session?.session.id;
            if (!sessionId) return false;
            const existing = await database.session.findUnique({
              where: { id: sessionId },
              select: { createdAt: true, userId: true },
            });
            if (!existing) return false;
            const user = await database.user.findUnique({
              where: { id: existing.userId },
              select: { role: true, disabledAt: true },
            });
            if (!user || user.disabledAt) return false;
            const maximumExpiry = new Date(existing.createdAt.getTime() + MAX_SESSION_AGE_MS);
            if (maximumExpiry.getTime() <= Date.now()) return false;
            if (session.expiresAt && session.expiresAt > maximumExpiry) {
              return { data: { ...session, expiresAt: maximumExpiry } };
            }
          },
        },
      },
    },
    rateLimit: {
      enabled: true,
      window: 10 * 60,
      max: 100,
      customStorage: {
        consume: (key, rule) => consumeAccountRateLimit(database, config.secret, key, rule),
      },
      customRules: {
        '/sign-in/email': { window: 10 * 60, max: 10 },
        '/sign-up/email': { window: 10 * 60, max: 5 },
        '/request-password-reset': { window: 60 * 60, max: 3 },
        '/send-verification-email': { window: 60 * 60, max: 3 },
      },
    },
    advanced: {
      // Keep origin/CSRF protection enabled in controlled tests as well as
      // deployed runtimes; Better Auth otherwise skips origin checks in test.
      disableOriginCheck: false,
      disableCSRFCheck: false,
      cookiePrefix: 'nexus-med',
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'] },
      useSecureCookies: config.production,
      defaultCookieAttributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: config.production,
        path: '/',
      },
    },
    // Unexpected errors must reach Hono's category-only error handler.
    // Otherwise better-call logs the entire error object after this logger is
    // disabled, potentially including database or authentication details.
    onAPIError: { throw: true },
    logger: { disabled: true },
  });
}
