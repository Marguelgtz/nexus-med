import { AsyncLocalStorage } from 'node:async_hooks';
import type { AtomicWrite } from '../../infrastructure/database/runtime-client';

interface IdentityCreationAttempt {
  createdUserId: string | null;
}

const identityCreationAttempt = new AsyncLocalStorage<IdentityCreationAttempt>();

export function recordCreatedSignupUser(userId: string): void {
  const attempt = identityCreationAttempt.getStore();
  if (attempt) attempt.createdUserId = userId;
}

export async function cleanUpOrphanedSignupIdentity(
  atomicWrite: AtomicWrite,
  run: () => Promise<Response>,
): Promise<Response> {
  const attempt: IdentityCreationAttempt = { createdUserId: null };
  return identityCreationAttempt.run(attempt, async () => {
    const removeOrphan = async () => {
      if (!attempt.createdUserId) return;
      // With transaction:false, Better Auth may leave a newly created user if
      // linking its credential or social account fails. Remove only this
      // attempt's unassociated pending identity in one conditional write.
      await atomicWrite([{
        sql: `DELETE FROM auth_users WHERE id=? AND role='pending'
          AND NOT EXISTS (SELECT 1 FROM auth_accounts WHERE userId=?)
          AND NOT EXISTS (SELECT 1 FROM clinic_memberships WHERE userId=?)
          AND NOT EXISTS (SELECT 1 FROM auth_sessions WHERE userId=?)`,
        values: [attempt.createdUserId, attempt.createdUserId, attempt.createdUserId, attempt.createdUserId],
      }]);
    };
    try {
      const response = await run();
      // A failed OAuth callback is commonly an HTTP 302 to an error page, so
      // response.ok cannot distinguish it from a successful callback.
      await removeOrphan();
      return response;
    } catch (error) {
      await removeOrphan();
      throw error;
    }
  });
}
