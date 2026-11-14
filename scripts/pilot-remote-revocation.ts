// Synthetic-only access-revocation journey against the explicitly isolated pilot.
// Mail stays in the encrypted outbox; this script never sends SMTP messages.
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { decryptEmailPayload } from '../apps/api/src/domains/email/outbox';
import type { AuthSession, EncounterDetail, PatientDetail } from '@nexus-med/contracts';

const origin = 'https://nexus-med-pilot-001-web.marguel-gtz.workers.dev';
const configPath = 'apps/api/wrangler.pilot.jsonc';
const config = JSON.parse(readFileSync(configPath, 'utf8'));
const practice = config.d1_databases.find((database: { binding: string }) => database.binding === 'DB');
if (config.name !== 'nexus-med-pilot-001-api' || config.vars.APP_BASE_URL !== origin ||
    (config.vars.EMAIL_DELIVERY_DISABLED !== true && config.vars.EMAIL_DELIVERY_DISABLED !== 'true') ||
    practice?.database_id !== '00346f91-cfac-468e-adee-dc09a0e28328' ||
    config.r2_buckets[0]?.bucket_name !== 'nexus-med-pilot-001-study-files' ||
    (config.triggers?.crons?.length ?? 0) !== 0) {
  throw new Error('Pilot bindings or synthetic email guard do not match the approved isolated environment.');
}

const secret = readFileSync('.local/pilot-001/better-auth-secret', 'utf8').trim();
const statePath = '.local/pilot-001/remote-revocation-state.json';
if (existsSync(statePath)) throw new Error('A prior revocation run left recovery state; inspect it before starting another run.');
type RunState = { runId: string; password: string; stage: string; ownerId?: string; targetId?: string; clinicId?: string; patientId?: string; encounterId?: string };
const state: RunState = { runId: randomUUID(), password: `Synthetic-${randomBytes(24).toString('hex')}!`, stage: 'created' };

function persistState() {
  mkdirSync('.local/pilot-001', { recursive: true, mode: 0o700 });
  const temporaryPath = `${statePath}.tmp`;
  writeFileSync(temporaryPath, JSON.stringify(state), { mode: 0o600 });
  chmodSync(temporaryPath, 0o600);
  renameSync(temporaryPath, statePath);
  chmodSync(statePath, 0o600);
}

function sqlString(value: string) { return `'${value.replaceAll("'", "''")}'`; }
function queryPilot(sql: string): Record<string, unknown>[] {
  const result = spawnSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js', 'd1', 'execute', 'DB', '--remote', '--config', configPath, '--command', sql, '--json'], {
    encoding: 'utf8', env: { ...process.env, WRANGLER_WRITE_LOGS: 'false', WRANGLER_SEND_METRICS: 'false' },
  });
  if (result.status !== 0) throw new Error('Unable to read the isolated synthetic pilot database.');
  return JSON.parse(result.stdout)[0]?.results ?? [];
}

async function request(path: string, body?: unknown, cookie = '') {
  const headers = new Headers({ Origin: origin });
  if (cookie) headers.set('Cookie', cookie);
  if (body !== undefined) headers.set('Content-Type', 'application/json');
  return fetch(new URL(path, origin), { method: body === undefined ? 'GET' : 'POST', headers, redirect: 'manual', ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
async function json<T = unknown>(response: Response, expectedStatus = 200): Promise<T> {
  assert.equal(response.status, expectedStatus, `Unexpected response status: ${response.status}; expected ${expectedStatus}`);
  return response.json() as Promise<T>;
}
function sessionCookie(response: Response) {
  const cookies = response.headers.getSetCookie().map(value => value.split(';', 1)[0] ?? '').filter(value => value.includes('session_token='));
  assert.equal(cookies.length, 1, 'Expected one secure synthetic session cookie.');
  return cookies[0]!;
}
async function capturedLink(email: string, kind: 'verify_email' | 'invitation') {
  assert.match(email, new RegExp(`^pilot-${state.runId}-[a-z]+@example\\.test$`));
  const rows = queryPilot(`SELECT encryptedBody FROM email_outbox WHERE recipient=${sqlString(email)} AND kind=${sqlString(kind)} ORDER BY createdAt DESC LIMIT 1`);
  assert.equal(rows.length, 1, `Expected one queued synthetic ${kind} message.`);
  const encryptedBody = rows[0]?.encryptedBody;
  if (typeof encryptedBody !== 'string') throw new Error('Synthetic message is unavailable.');
  const payload = await decryptEmailPayload(secret, encryptedBody);
  const text = payload.text.match(/https?:\/\/[^\s]+/)?.[0];
  assert.ok(text, 'Synthetic message did not contain a link.');
  const link = new URL(text);
  assert.equal(link.origin, origin, 'Synthetic email link has an unexpected origin.');
  return link;
}
async function signup(label: 'owner' | 'doctor') {
  const email = `pilot-${state.runId}-${label}@example.test`;
  await json(await request('/api/auth/sign-up/email', { name: `Identidad sintética ${label}`, email, password: state.password }));
  const verify = await capturedLink(email, 'verify_email');
  assert.ok([200, 302].includes((await request(`${verify.pathname}${verify.search}`)).status), 'Synthetic email verification failed.');
  const signIn = await request('/api/auth/sign-in/email', { email, password: state.password });
  assert.equal(signIn.status, 200, 'Synthetic sign-in failed.');
  const cookie = sessionCookie(signIn);
  const session = await json<AuthSession>(await request('/api/session', undefined, cookie));
  assert.equal(session.onboardingRequired, true);
  return { id: session.user.id, email, cookie };
}

async function main() {
  persistState();
  try {
    const owner = await signup('owner');
    state.ownerId = owner.id;
    state.stage = 'owner_verified';
    persistState();
    const clinicSession = await json<AuthSession>(await request('/api/onboarding/clinic', { name: 'Consultorio sintético revocación' }, owner.cookie));
    assert.ok(clinicSession.clinic);
    assert.equal(clinicSession.canManageAccess, true);
    state.clinicId = clinicSession.clinic.id;
    state.stage = 'clinic_created';
    persistState();

    const doctor = await signup('doctor');
    state.targetId = doctor.id;
    state.stage = 'doctor_verified';
    persistState();
    await json(await request('/api/access/invitations', { email: doctor.email, role: 'doctor' }, owner.cookie), 201);
    const invitation = await capturedLink(doctor.email, 'invitation');
    const token = invitation.searchParams.get('token');
    assert.ok(token);
    const joined = await json<AuthSession>(await request('/api/invitations/accept', { token }, doctor.cookie));
    assert.equal(joined.clinic?.id, state.clinicId);
    assert.equal(joined.user.role, 'doctor');
    state.stage = 'doctor_joined';
    persistState();

    const externalIdentifier = `PILOT-REV-${state.runId.slice(0, 8)}`;
    const patient = await json<PatientDetail>(await request('/api/patients', { fullName: 'Paciente sintético para revocación', externalIdentifier }, doctor.cookie), 201);
    state.patientId = patient.id;
    state.stage = 'patient_created';
    persistState();
    const encounter = await json<EncounterDetail>(await request(`/api/patients/${patient.id}/encounters`, {
      occurredAt: new Date().toISOString(), reason: 'Nota clínica sintética previa a la revocación.',
    }, doctor.cookie), 201);
    assert.equal(encounter.author?.id, doctor.id);
    state.encounterId = encounter.id;
    state.stage = 'encounter_authored';
    persistState();

    const before = await json<EncounterDetail>(await request(`/api/encounters/${encounter.id}`, undefined, doctor.cookie));
    assert.equal(before.author?.id, doctor.id);
    assert.equal((await request(`/api/encounters/${encounter.id}`, undefined, owner.cookie)).status, 200);
    await json(await request(`/api/access/members/${doctor.id}/revoke`, {}, owner.cookie));
    state.stage = 'membership_revoked';
    persistState();

    assert.equal((await request('/api/patients', undefined, doctor.cookie)).status, 401, 'Existing target session retained access after revocation.');
    const relogin = await request('/api/auth/sign-in/email', { email: doctor.email, password: state.password });
    assert.equal(relogin.status, 200, 'Revocation should not disable the synthetic global identity.');
    const freshCookie = sessionCookie(relogin);
    const freshSession = await json<AuthSession>(await request('/api/session', undefined, freshCookie));
    assert.equal(freshSession.onboardingRequired, true, 'Revoked user retained clinic onboarding/access state.');
    assert.equal((await request(`/api/encounters/${encounter.id}`, undefined, freshCookie)).status, 403, 'Revoked user regained clinical access after logging in again.');

    const persistedPatient = await json<PatientDetail>(await request(`/api/patients/${patient.id}`, undefined, owner.cookie));
    const persistedEncounter = await json<EncounterDetail>(await request(`/api/encounters/${encounter.id}`, undefined, owner.cookie));
    assert.equal(persistedPatient.externalIdentifier, externalIdentifier);
    assert.equal(persistedEncounter.author?.id, doctor.id, 'Revocation changed historical authorship.');
    const membership = queryPilot(`SELECT m.status AS membershipStatus,
      (SELECT COUNT(*) FROM security_events e WHERE e.event='member.revoked' AND e.targetId=m.id) AS revokeEvents,
      (SELECT COUNT(*) FROM encounters e WHERE e.id=${sqlString(encounter.id)} AND e.authorId=${sqlString(doctor.id)}) AS retainedAuthorship
      FROM clinic_memberships m WHERE m.clinicId=${sqlString(state.clinicId)} AND m.userId=${sqlString(doctor.id)}`)[0];
    assert.ok(membership);
    assert.equal(membership.membershipStatus, 'revoked');
    assert.equal(Number(membership.revokeEvents), 1);
    assert.equal(Number(membership.retainedAuthorship), 1);
    const mail = queryPilot(`SELECT COUNT(*) AS total,
      SUM(CASE WHEN status='queued' THEN 1 ELSE 0 END) AS queued,
      SUM(CASE WHEN status='sent' THEN 1 ELSE 0 END) AS sent
      FROM email_outbox WHERE recipient IN (${sqlString(`pilot-${state.runId}-owner@example.test`)},${sqlString(`pilot-${state.runId}-doctor@example.test`)})`)[0];
    assert.ok(mail);
    assert.equal(Number(mail.total), 3);
    assert.equal(Number(mail.queued), 3);
    assert.equal(Number(mail.sent), 0);

    state.stage = 'complete';
    console.log('Synthetic access revocation passed: existing and fresh sessions lost clinic access; encounter authorship and patient history persisted.');
    console.log('Read-only D1 reconciliation confirmed revoked membership, one audit event, retained authorship, and three queued messages with zero sent.');
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'Unexpected failure.';
    console.error(`Synthetic revocation journey failed at ${state.stage}; restricted recovery state was retained. ${reason}`);
    throw error;
  } finally {
    if (state.stage === 'complete' && existsSync(statePath)) unlinkSync(statePath);
  }
}

main().catch(() => { process.exitCode = 1; });
