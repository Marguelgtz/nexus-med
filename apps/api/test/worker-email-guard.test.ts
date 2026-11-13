import { describe, expect, it } from 'vitest';
import worker from '../src/worker';

describe('synthetic Worker email guard', () => {
  it('does not access the outbox even with SMTP configured when delivery is disabled', async () => {
    const env = {
      BETTER_AUTH_SECRET: 'synthetic-secret-'.repeat(3),
      EMAIL_DELIVERY_DISABLED: 'true',
      SMTP_SENDER_EMAIL: 'sender@example.test',
      SMTP_HOST: 'smtp.example.test',
      SMTP_USERNAME: 'synthetic',
      SMTP_PASSWORD: 'synthetic',
      // Deliberately invalid: any attempt to touch D1 must fail the test.
      DB: null,
    };
    await expect(worker.scheduled({}, env as never)).resolves.toBeUndefined();
    await expect(worker.scheduled({}, { ...env, EMAIL_DELIVERY_DISABLED: 'false' } as never)).rejects.toThrow();
  });
});
