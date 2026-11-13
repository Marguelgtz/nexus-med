// Full local Worker/D1 journey: no remote Cloudflare resources or real data.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { symmetricDecrypt, verifyPassword } from 'better-auth/crypto';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';
import { unstable_splitSqlQuery } from 'wrangler';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://nexus-local.example.test';
const secret = 'synthetic-worker-journey-secret-'.repeat(3);
const password = 'Synthetic-Worker-Journey-2026!';

test('real Worker sessions preserve clinic isolation and clinical authorship on local D1', { timeout: 90_000 }, async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'nexus-worker-journey-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const bundle = path.join(directory, 'bundle');
  execFileSync(process.execPath, [path.join(root, 'node_modules/wrangler/bin/wrangler.js'), 'deploy', '--dry-run', '--config', 'apps/api/wrangler.pilot.jsonc', '--outdir', bundle], {
    cwd: root, env: { ...process.env, WRANGLER_WRITE_LOGS: 'false', WRANGLER_SEND_METRICS: 'false', CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: 'false' }, stdio: 'pipe',
  });
  const wasm = (await readdir(bundle)).find(name => name.endsWith('-query_compiler_fast_bg.wasm'));
  assert.ok(wasm);
  const mf = new Miniflare(convertV4MiniflareOptions({
    modules: [{ type: 'ESModule', path: path.join(bundle, 'worker.js') }, { type: 'CompiledWasm', path: path.join(bundle, wasm) }],
    rootPath: bundle, modulesRoot: bundle, compatibilityDate: '2026-11-11', compatibilityFlags: ['nodejs_compat'],
    d1Databases: ['DB', 'DEMO_DB'], r2Buckets: ['STUDY_FILES'],
    bindings: { BETTER_AUTH_SECRET: secret, APP_BASE_URL: origin, EMAIL_DELIVERY_DISABLED: 'true' },
    host: '127.0.0.1', port: 0, cf: false, enableDevRegistry: false, telemetry: { enabled: false },
    resourcePersistencePath: path.join(directory, 'storage'), log: new Log(LogLevel.NONE),
  }));
  try {
    const db = await mf.getD1Database('DB');
    const migrations = path.join(root, 'prisma/cloudflare-migrations');
    for (const name of (await readdir(migrations)).filter(name => name.endsWith('.sql')).sort()) {
      await db.batch(unstable_splitSqlQuery(await readFile(path.join(migrations, name), 'utf8')).map(sql => db.prepare(sql)));
    }
    let sequence = 0;
    async function request(route, body, cookie = '', method = body === undefined ? 'GET' : 'POST') {
      const headers = new Headers({ origin, cookie, 'cf-connecting-ip': `192.0.2.${++sequence % 250 + 1}` });
      let payload;
      if (body instanceof FormData) {
        const encoded = new Response(body);
        headers.set('content-type', encoded.headers.get('content-type'));
        payload = await encoded.arrayBuffer();
      } else if (body !== undefined) {
        headers.set('content-type', 'application/json');
        payload = JSON.stringify(body);
      }
      return mf.dispatchFetch(`${origin}${route}`, { method, headers, redirect: 'manual', ...(payload === undefined ? {} : { body: payload }) });
    }
    async function json(response, status = 200) {
      if (response.status !== status) {
        const error = await response.json().catch(() => ({}));
        assert.fail(`expected HTTP ${status}, received ${response.status}: ${error.error?.message ?? 'no error detail'}`);
      }
      return response.json();
    }
    function cookie(response) {
      const value = response.headers.getSetCookie().map(item => item.split(';', 1)[0]).find(item => item.includes('session_token='));
      assert.ok(value, 'session cookie');
      return value;
    }
    async function messageUrl(email, kind) {
      const row = await db.prepare('SELECT encryptedBody FROM email_outbox WHERE recipient=? AND kind=? ORDER BY rowid DESC LIMIT 1').bind(email, kind).first();
      assert.ok(row, `synthetic ${kind} message`);
      const payload = JSON.parse(await symmetricDecrypt({ key: secret, data: row.encryptedBody }));
      const url = new URL(payload.text.match(/https?:\/\/[^\s]+/)[0]);
      assert.equal(url.origin, origin);
      return url;
    }
    async function signup(label) {
      const email = `worker-${randomUUID()}@example.test`;
      await json(await request('/api/auth/sign-up/email', { name: `Identidad sintética ${label}`, email, password }));
      const link = await messageUrl(email, 'verify_email');
      const verification = await request(`${link.pathname}${link.search}`);
      assert.ok([200, 302].includes(verification.status), `email verification returned ${verification.status}`);
      const login = await request('/api/auth/sign-in/email', { email, password });
      assert.equal(login.status, 200, 'verified sign-in');
      const authCookie = cookie(login);
      const session = await json(await request('/api/session', undefined, authCookie));
      assert.equal(session.onboardingRequired, true);
      return { email, cookie: authCookie, id: session.user.id };
    }
    async function owner(label) {
      const identity = await signup(label);
      const session = await json(await request('/api/onboarding/clinic', { name: `Clínica sintética ${label}` }, identity.cookie));
      assert.equal(session.canManageAccess, true);
      return { ...identity, clinicId: session.clinic.id };
    }
    async function invite(ownerIdentity, identity, role) {
      await json(await request('/api/access/invitations', { email: identity.email, role }, ownerIdentity.cookie), 201);
      const token = (await messageUrl(identity.email, 'invitation')).searchParams.get('token');
      assert.ok(token);
      const session = await json(await request('/api/invitations/accept', { token }, identity.cookie));
      assert.equal(session.user.role, role);
      assert.equal(session.clinic.id, ownerIdentity.clinicId);
    }

    const failedSignupEmail = `worker-signup-failure-${randomUUID()}@example.test`;
    await db.exec("CREATE TRIGGER synthetic_signup_account_failure BEFORE INSERT ON auth_accounts WHEN NEW.providerId='credential' BEGIN SELECT RAISE(ABORT, 'synthetic signup account failure'); END");
    const failedSignup = await request('/api/auth/sign-up/email', { name: 'Alta sintética recuperable', email: failedSignupEmail, password });
    await db.exec('DROP TRIGGER synthetic_signup_account_failure');
    assert.equal(failedSignup.status, 500, 'credential-write failure must not appear successful');
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM auth_users WHERE email=?').bind(failedSignupEmail).first()).count, 0,
      'failed signup must not leave an unusable identity behind');
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM email_outbox WHERE recipient=?').bind(failedSignupEmail).first()).count, 0);
    assert.equal((await request('/api/auth/sign-up/email', { name: 'Alta sintética recuperable', email: failedSignupEmail, password })).status, 200,
      'failed signup can be retried with the same address');

    const doctor = await owner('A');
    const secondDoctor = await signup('B');
    const secretary = await signup('C');
    const secondSecretary = await signup('E');
    await invite(doctor, secondDoctor, 'doctor');
    await invite(doctor, secretary, 'secretary');
    await invite(doctor, secondSecretary, 'secretary');
    const outsider = await owner('D');
    assert.notEqual(doctor.clinicId, outsider.clinicId);

    // The membership and invitation claim must roll back together on D1.
    const rollbackIdentity = await signup('reintento de invitación');
    const rollbackInvite = await json(await request('/api/access/invitations', { email: rollbackIdentity.email, role: 'secretary' }, doctor.cookie), 201);
    const rollbackToken = (await messageUrl(rollbackIdentity.email, 'invitation')).searchParams.get('token');
    assert.ok(rollbackToken);
    await db.exec("CREATE TRIGGER synthetic_invite_failure BEFORE UPDATE OF acceptedAt ON auth_invitations WHEN NEW.acceptedAt IS NOT NULL BEGIN SELECT RAISE(ABORT, 'synthetic invitation failure'); END");
    assert.equal((await request('/api/invitations/accept', { token: rollbackToken }, rollbackIdentity.cookie)).status, 500);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM clinic_memberships WHERE clinicId=? AND userId=?').bind(doctor.clinicId, rollbackIdentity.id).first()).count, 0);
    assert.equal((await db.prepare('SELECT acceptedAt FROM auth_invitations WHERE id=?').bind(rollbackInvite.id).first()).acceptedAt, null);
    await db.exec('DROP TRIGGER synthetic_invite_failure');
    const acceptedAfterRetry = await json(await request('/api/invitations/accept', { token: rollbackToken }, rollbackIdentity.cookie));
    assert.equal(acceptedAfterRetry.clinic.id, doctor.clinicId);

    // Revocation and its security event must either both persist or both roll back.
    const revokeFailureEmail = `worker-revoke-failure-${randomUUID()}@example.test`;
    const revokeFailureInvite = await json(await request('/api/access/invitations', { email: revokeFailureEmail, role: 'secretary' }, doctor.cookie), 201);
    await db.exec("CREATE TRIGGER synthetic_revoke_audit_failure BEFORE INSERT ON security_events WHEN NEW.event='invitation.revoked' BEGIN SELECT RAISE(ABORT, 'synthetic audit failure'); END");
    assert.equal((await request(`/api/access/invitations/${revokeFailureInvite.id}/revoke`, {}, doctor.cookie)).status, 500);
    assert.equal((await db.prepare('SELECT revokedAt FROM auth_invitations WHERE id=?').bind(revokeFailureInvite.id).first()).revokedAt, null);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM atomic_write_guards').first()).count, 0);
    await db.exec('DROP TRIGGER synthetic_revoke_audit_failure');
    assert.equal((await request(`/api/access/invitations/${revokeFailureInvite.id}/revoke`, {}, doctor.cookie)).status, 200);
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM security_events WHERE event='invitation.revoked' AND targetId=?").bind(revokeFailureInvite.id).first()).count, 1);

    // Revoking and accepting the same pending invitation concurrently must
    // leave either one accepted grant or a revoked invitation with no grant.
    const raceIdentity = await signup('carrera de invitación');
    const raceInvite = await json(await request('/api/access/invitations', { email: raceIdentity.email, role: 'secretary' }, doctor.cookie), 201);
    const raceInviteToken = (await messageUrl(raceIdentity.email, 'invitation')).searchParams.get('token');
    assert.ok(raceInviteToken);
    const [acceptResponse, revokeResponse] = await Promise.all([
      request('/api/invitations/accept', { token: raceInviteToken }, raceIdentity.cookie),
      request(`/api/access/invitations/${raceInvite.id}/revoke`, {}, doctor.cookie),
    ]);
    const invitationState = await db.prepare('SELECT acceptedAt,acceptedUserId,revokedAt FROM auth_invitations WHERE id=?').bind(raceInvite.id).first();
    const membershipState = await db.prepare('SELECT status FROM clinic_memberships WHERE clinicId=? AND userId=?').bind(doctor.clinicId, raceIdentity.id).first();
    if (acceptResponse.status === 200) {
      assert.equal(revokeResponse.status, 404);
      assert.ok(invitationState.acceptedAt);
      assert.equal(invitationState.acceptedUserId, raceIdentity.id);
      assert.equal(invitationState.revokedAt, null);
      assert.equal(membershipState.status, 'active');
    } else {
      assert.ok([400, 409].includes(acceptResponse.status), `unexpected accept status ${acceptResponse.status}`);
      assert.equal(revokeResponse.status, 200);
      assert.ok(invitationState.revokedAt);
      assert.equal(invitationState.acceptedAt, null);
      assert.equal(membershipState, null);
    }

    // Concurrent sends for one address should not create two live grants.
    const duplicateIdentity = await signup('invitación simultánea');
    const duplicateRequests = await Promise.all(Array.from({ length: 8 }, () => request('/api/access/invitations', {
      email: duplicateIdentity.email, role: 'secretary',
    }, doctor.cookie)));
    assert.deepEqual(duplicateRequests.map(response => response.status).sort(), [201, 409, 409, 409, 409, 409, 409, 409]);
    const duplicateCount = await db.prepare('SELECT COUNT(*) AS count FROM auth_invitations WHERE clinicId=? AND email=? AND acceptedAt IS NULL AND revokedAt IS NULL').bind(doctor.clinicId, duplicateIdentity.email).first();
    assert.equal(duplicateCount.count, 1);
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM email_outbox WHERE recipient=? AND kind='invitation'").bind(duplicateIdentity.email).first()).count, 1);

    // A delivery-queue failure must roll back the grant and audit event too.
    const failureEmail = `worker-failure-${randomUUID()}@example.test`;
    const eventsBefore = (await db.prepare("SELECT COUNT(*) AS count FROM security_events WHERE event='invitation.created'").first()).count;
    await db.exec("CREATE TRIGGER synthetic_outbox_failure BEFORE INSERT ON email_outbox WHEN NEW.kind='invitation' BEGIN SELECT RAISE(ABORT, 'synthetic outbox failure'); END");
    assert.equal((await request('/api/access/invitations', { email: failureEmail, role: 'secretary' }, doctor.cookie)).status, 500);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM auth_invitations WHERE clinicId=? AND email=?').bind(doctor.clinicId, failureEmail).first()).count, 0);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM email_outbox WHERE recipient=?').bind(failureEmail).first()).count, 0);
    assert.equal((await db.prepare("SELECT COUNT(*) AS count FROM security_events WHERE event='invitation.created'").first()).count, eventsBefore);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM atomic_write_guards').first()).count, 0);
    await db.exec('DROP TRIGGER synthetic_outbox_failure');
    await json(await request('/api/access/invitations', { email: failureEmail, role: 'secretary' }, doctor.cookie), 201);

    const auditFailureEmail = `worker-audit-failure-${randomUUID()}@example.test`;
    await db.exec("CREATE TRIGGER synthetic_audit_failure BEFORE INSERT ON security_events WHEN NEW.event='invitation.created' BEGIN SELECT RAISE(ABORT, 'synthetic audit failure'); END");
    assert.equal((await request('/api/access/invitations', { email: auditFailureEmail, role: 'secretary' }, doctor.cookie)).status, 500);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM auth_invitations WHERE clinicId=? AND email=?').bind(doctor.clinicId, auditFailureEmail).first()).count, 0);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM email_outbox WHERE recipient=?').bind(auditFailureEmail).first()).count, 0);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM atomic_write_guards').first()).count, 0);
    await db.exec('DROP TRIGGER synthetic_audit_failure');
    await json(await request('/api/access/invitations', { email: auditFailureEmail, role: 'secretary' }, doctor.cookie), 201);
    const patient = await json(await request('/api/administrative/patients', { fullName: 'Paciente sintético local' }, secretary.cookie), 201);
    assert.equal((await request(`/api/patients/${patient.id}`, undefined, secretary.cookie)).status, 403);
    assert.equal((await request(`/api/patients/${patient.id}`, undefined, outsider.cookie)).status, 404);
    const appointment = await json(await request(`/api/patients/${patient.id}/appointments`, {
      startAt: '2026-11-16T16:00:00Z', durationMinutes: 30, type: 'consulta', doctorId: doctor.id,
    }, secretary.cookie), 201);
    assert.equal(appointment.doctor.id, doctor.id);
    assert.equal((await request(`/api/appointments/${appointment.id}/reception`, { action: 'start' }, secondDoctor.cookie)).status, 403);
    await json(await request(`/api/appointments/${appointment.id}/reception`, { action: 'arrive' }, secondSecretary.cookie));
    await json(await request(`/api/appointments/${appointment.id}/reception`, { action: 'start' }, doctor.cookie));
    const encounter = await json(await request(`/api/patients/${patient.id}/encounters`, {
      occurredAt: '2026-11-16T16:00:00Z', reason: 'Nota sintética local',
      studies: [{ category: 'laboratorio', name: 'Estudio sintético local' }],
    }, doctor.cookie), 201);
    assert.equal(encounter.author.id, doctor.id);
    const concurrent = await Promise.all([doctor, secondDoctor].map((actor, index) => request(`/api/encounters/${encounter.id}`, { expectedVersion: encounter.version, assessment: `Edición sintética ${index}` }, actor.cookie, 'PATCH')));
    assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409]);
    const readback = await json(await request(`/api/encounters/${encounter.id}`, undefined, secondDoctor.cookie));
    assert.equal(readback.author.id, doctor.id);
    assert.equal(readback.version, encounter.version + 1);
    assert.equal((await request(`/api/encounters/${encounter.id}`, undefined, outsider.cookie)).status, 404);
    assert.equal((await request(`/api/encounters/${encounter.id}`, undefined, secretary.cookie)).status, 403);
    const studies = await json(await request(`/api/encounters/${encounter.id}/studies`, undefined, secondDoctor.cookie));
    assert.equal(studies.length, 1);
    const bytes = Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aNfoAAAAASUVORK5CYII=', 'base64'));
    const upload = new FormData();
    upload.set('metadata', JSON.stringify({ title: 'Estudio sintético', encounterId: encounter.id, requestId: studies[0].id }));
    upload.append('files', new File([bytes], 'synthetic.png', { type: 'image/png' }));
    const receipt = await json(await request(`/api/patients/${patient.id}/study-receipts`, upload, secretary.cookie), 201);
    assert.equal(receipt.reviewedAt, null);
    const file = await request(`/api/study-receipt-files/${receipt.files[0].id}`, undefined, secondSecretary.cookie);
    assert.equal(file.status, 200);
    assert.deepEqual(new Uint8Array(await file.arrayBuffer()), bytes);
    assert.equal((await request(`/api/study-receipt-files/${receipt.files[0].id}`, undefined, outsider.cookie)).status, 404);
    assert.equal((await request(`/api/study-receipts/${receipt.id}/review`, {}, secretary.cookie)).status, 403);
    const reviewed = await json(await request(`/api/study-receipts/${receipt.id}/review`, { reviewNote: 'Revisión sintética' }, secondDoctor.cookie));
    assert.ok(reviewed.reviewedAt);
    const document = await json(await request(`/api/patients/${patient.id}/documents`, {
      kind: 'prescription', encounterId: encounter.id, lines: [{ medication: 'Medicamento ficticio' }],
    }, doctor.cookie), 201);
    assert.equal(document.author.id, doctor.id);
    assert.equal((await request(`/api/documents/${document.id}`, undefined, secretary.cookie)).status, 403);
    assert.equal((await request(`/api/documents/${document.id}`, undefined, outsider.cookie)).status, 404);
    const completed = await json(await request(`/api/appointments/${appointment.id}/complete`, { encounterId: encounter.id }, doctor.cookie));
    assert.equal(completed.linkedEncounterId, encounter.id);
    const duplicateLinkAppointment = await json(await request(`/api/patients/${patient.id}/appointments`, {
      startAt: '2026-11-16T17:00:00Z', durationMinutes: 30, type: 'consulta', doctorId: doctor.id,
    }, secretary.cookie), 201);
    assert.equal((await request(`/api/appointments/${duplicateLinkAppointment.id}/complete`, { encounterId: encounter.id }, doctor.cookie)).status, 409, 'D1 unique conflict remains a domain conflict');
    await json(await request('/api/auth/sign-out', {}, doctor.cookie));
    assert.equal((await request(`/api/encounters/${encounter.id}`, undefined, doctor.cookie)).status, 401);
    const login = await request('/api/auth/sign-in/email', { email: doctor.email, password });
    assert.equal(login.status, 200);
    const persisted = await json(await request(`/api/documents/${document.id}`, undefined, cookie(login)));
    assert.equal(persisted.author.id, doctor.id);
    assert.equal(persisted.encounter.id, encounter.id);

    // Inject a password-write failure only into the isolated synthetic D1.
    // The auth route must use D1's atomic batch so a retry remains possible.
    await json(await request('/api/auth/request-password-reset', { email: doctor.email, redirectTo: `${origin}/restablecer-contrasena` }));
    const failedToken = (await messageUrl(doctor.email, 'reset_password')).pathname.split('/').at(-1);
    assert.ok(failedToken);
    await db.exec("CREATE TRIGGER synthetic_password_failure BEFORE UPDATE OF password ON auth_accounts BEGIN SELECT RAISE(ABORT, 'synthetic password failure'); END");
    const nextPassword = 'Synthetic-Recovered-Password-2026!';
    const failedReset = await request('/api/auth/reset-password', { token: failedToken, newPassword: nextPassword });
    assert.equal(failedReset.status, 500, 'injected password write failure must not appear successful');
    assert.equal((await failedReset.json()).error.code, 'INTERNAL_ERROR');
    assert.equal((await request('/api/session', undefined, cookie(login))).status, 200, 'failed reset preserves old sessions');
    assert.equal((await request('/api/auth/sign-in/email', { email: doctor.email, password })).status, 200, 'old password remains valid');
    await db.exec('DROP TRIGGER synthetic_password_failure');
    await json(await request('/api/auth/reset-password', { token: failedToken, newPassword: nextPassword }));
    assert.equal((await request('/api/session', undefined, cookie(login))).status, 401, 'successful reset revokes old sessions');
    assert.equal((await request('/api/auth/sign-in/email', { email: doctor.email, password })).status, 401);
    assert.equal((await request('/api/auth/sign-in/email', { email: doctor.email, password: nextPassword })).status, 200);

    // Two simultaneous uses of one fresh reset token must have one winner.
    await json(await request('/api/auth/request-password-reset', { email: doctor.email, redirectTo: `${origin}/restablecer-contrasena` }));
    const raceToken = (await messageUrl(doctor.email, 'reset_password')).pathname.split('/').at(-1);
    assert.ok(raceToken && raceToken !== failedToken);
    const candidates = ['Synthetic-Race-Password-A-2026!', 'Synthetic-Race-Password-B-2026!'];
    const attempts = await Promise.all(candidates.map(newPassword => request('/api/auth/reset-password', { token: raceToken, newPassword })));
    assert.deepEqual(attempts.map(response => response.status).sort(), [200, 400]);
    const winner = attempts.findIndex(response => response.status === 200);
    // Inspect the synthetic hash directly: repeated sign-ins here would hit the
    // intentional per-account rate limit and obscure the token race result.
    const credential = await db.prepare("SELECT password FROM auth_accounts WHERE userId=? AND providerId='credential'").bind(doctor.id).first();
    assert.ok(credential?.password);
    assert.equal(await verifyPassword({ hash: credential.password, password: candidates[winner] }), true);
    assert.equal(await verifyPassword({ hash: credential.password, password: candidates[1 - winner] }), false);
  } finally {
    await mf.dispose();
  }
});
