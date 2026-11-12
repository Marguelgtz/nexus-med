import { randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, closeSync, existsSync, mkdirSync, openSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { hashPassword } from 'better-auth/crypto';
import { localPrisma } from '../infrastructure/database/prisma';
import { loadLocalAuthSecret } from '../infrastructure/auth/local-secret';
import { deriveDemoPassword } from '../domains/auth/demo-password';

const credentialPath = path.resolve(process.cwd(), '.local', 'auth', 'demo-credentials.json');
const doctorFixture = { email: 'doctor@example.test', name: 'Doctora de demostración', role: 'doctor' as const };
const secretaryFixture = { email: 'secretary@example.test', name: 'Secretaría de demostración', role: 'secretary' as const };

interface FixtureCredentials {
  doctor: { email: string; password: string };
  secretary: { email: string; password: string };
}

function loadOrCreateCredentials(): FixtureCredentials {
  mkdirSync(path.dirname(credentialPath), { recursive: true, mode: 0o700 });
  if (existsSync(credentialPath)) {
    const value = JSON.parse(readFileSync(credentialPath, 'utf8')) as FixtureCredentials;
    if (value.doctor?.email !== doctorFixture.email || value.secretary?.email !== secretaryFixture.email || !value.doctor.password || !value.secretary.password) {
      throw new Error('Local fixture credential file has an unexpected shape.');
    }
    chmodSync(credentialPath, 0o600);
    return value;
  }

  const value = {
    doctor: { email: doctorFixture.email, password: randomBytes(24).toString('base64url') },
    secretary: { email: secretaryFixture.email, password: randomBytes(24).toString('base64url') },
  };
  const descriptor = openSync(credentialPath, 'wx', 0o600);
  try {
    writeFileSync(descriptor, `${JSON.stringify(value, null, 2)}\n`, { encoding: 'utf8' });
  } finally {
    closeSync(descriptor);
  }
  return value;
}

async function createFixtureAccount(email: string, name: string, role: 'doctor' | 'secretary' | 'demo', password: string) {
  const existingUser = await localPrisma.user.findUnique({ where: { email } });
  let userId: string;
  if (existingUser) {
    if (existingUser.role !== role) throw new Error(`Fixture account ${email} exists with a different role.`);
    userId = existingUser.id;
  } else {
    userId = randomUUID();
    await localPrisma.user.create({
      data: { id: userId, name, email, role, emailVerified: true },
    });
  }

  const credential = await localPrisma.account.findFirst({
    where: { userId, providerId: 'credential', accountId: userId },
  });
  if (!credential) {
    await localPrisma.account.create({
      data: {
        id: randomUUID(),
        accountId: userId,
        providerId: 'credential',
        userId,
        password: await hashPassword(password),
      },
    });
  }
}

async function main() {
  const secret = loadLocalAuthSecret();
  const credentials = loadOrCreateCredentials();
  await createFixtureAccount(doctorFixture.email, doctorFixture.name, 'doctor', credentials.doctor.password);
  await createFixtureAccount(secretaryFixture.email, secretaryFixture.name, 'secretary', credentials.secretary.password);
  await createFixtureAccount('demo@example.test', 'Demostración compartida', 'demo', await deriveDemoPassword(secret));
  console.log(`[auth] Placeholders locales activos. Credenciales: ${path.relative(process.cwd(), credentialPath)}`);
}

main().catch(error => {
  console.error('[auth] No se pudieron inicializar las cuentas locales:', error instanceof Error ? error.message : 'error desconocido');
  process.exitCode = 1;
}).finally(async () => {
  await localPrisma.$disconnect();
});
