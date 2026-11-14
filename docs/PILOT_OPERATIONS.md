# Pilot operations and recovery

**Mission:** NM-PILOT-001. **Boundary:** synthetic pilot only. This runbook preserves the existing Next.js/OpenNext frontend, private Hono Worker, Prisma/D1 and private R2 topology. Local recovery verification does not establish remote recovery, uptime, real-patient suitability or regulatory approval.

## Environments and release checks

The checked-in API configuration names the existing `nexus-med-practice`, `nexus-med-demo` D1 databases and `nexus-med-study-files` bucket. These names are not isolated staging resources. Do not use normal remote migration/deploy scripts to conduct destructive tests against them. The isolated pilot configs `apps/api/wrangler.pilot.jsonc` and `apps/web/wrangler.pilot.jsonc` use distinct Worker names, newly created D1 databases `nexus-med-pilot-001-practice` and `nexus-med-pilot-001-demo`, and private bucket `nexus-med-pilot-001-study-files`. These resources were created for synthetic data only on 2026-11-13. Verify the bindings in a dry-run and explicitly select these configs for every pilot operation; never point the pilot commands at the existing resources. All five migrations were applied to both new empty pilot databases on 2026-11-13. Use `node --import tsx scripts/cloudflare-seed-demo.mjs --pilot` to target the pilot demo and bucket. The seed now uses UUID attachment keys compatible with the file API; it preserves pre-existing file metadata and does not repair old non-UUID keys automatically. Frontend/API service bindings, `APP_BASE_URL`, callbacks and marketing links must all refer to that same environment. Check the authenticated account and scope before any remote action. Keep credentials in secret management, never arguments, screenshots or repository files.

Run normal API/web tests, typecheck, lint, production build, the recovery tests below, then API packaging:

```bash
WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false node node_modules/wrangler/bin/wrangler.js deploy --dry-run --config apps/api/wrangler.jsonc --outdir /tmp/nexus-med-api-dry-run
```

This compiles locally and does not upload. It does not verify live D1/R2/secrets or the deployed Worker. `next start` is not the Cloudflare acceptance environment: production SSR and API forwarding require the `API` service binding. Run the existing OpenNext build/preview workflow with isolated local bindings, or use an authorized isolated remote pilot deployment, to verify the actual frontend runtime. A successful Next build alone does not establish deployment readiness.

Authentication mail is encrypted in the persistent database outbox. `BETTER_AUTH_SECRET` is required to read it; preserve the correct environment's secret separately in an access-controlled vault. SMTP secrets and Google provider secrets are not included by these local backup scripts. Worker cron dispatch is separate from local captured mail. Verify actual SMTP/provider delivery separately; queued mail is not delivery evidence.

**Synthetic email containment:** Authentication emails bypass the appointment-recipient allowlist and can remain queued while SMTP is absent. Enabling SMTP later could dispatch those synthetic messages. Pilot API version `1d882971-9009-4632-85d7-6e620aee3894` has `EMAIL_DELIVERY_DISABLED=true` and no scheduled triggers according to read-only Cloudflare checks; leave SMTP unconfigured. The Worker checks the flag before accessing the outbox, verified in Node and local workerd scheduled-event tests; a deployed scheduled invocation with SMTP configured was not tested. Before any real-delivery experiment, inventory and reconcile queued synthetic messages under an approved retention procedure, verify the deployed flag and trigger state, and only then deliberately configure a separate controlled mail test. Re-enabling delivery or its schedule without reconciling the queue is unsafe.

**Pilot request logging:** The deployed API and frontend report query-string redaction and disabled invocation logs. The frontend script settings were updated independently of its code; the active code version stayed `8342cf77-3c85-4261-a962-709f58b09ab4`, and read-only login/protected-route/API-option checks passed. The committed Wrangler configs reflect the settings for later deployments. This is configuration evidence, not an inspection of actual emitted logs.

## Verified local backup and restore

Stop both application processes before backup. `--services-stopped` is an operator assertion, not automatic process detection: the tool cannot coordinate file/database snapshots while services are changing data. Back up each practice/demo database and its matching attachment directory separately. Create an empty attachment directory first if that environment has never received a file. Use absolute paths and existing parent directories.

Example for a synthetic local database; replace paths with the selected environment's explicit paths:

```bash
node scripts/local-backup.mjs --database /absolute/local/source.sqlite --files /absolute/local/study-files --output /absolute/local/new-backup --services-stopped
node scripts/local-restore.mjs --backup /absolute/local/new-backup --output /absolute/local/new-isolated-restore
```

The backup uses SQLite's backup API, including committed WAL data; it copies private attachments, checks SQLite integrity and foreign keys, confirms every stored attachment key is present, and records SHA-256 hashes, byte counts and Prisma migration history in a manifest. Files use mode `0600` and new directories `0700`. Local filesystem permissions are not encryption: copy completed backups to encrypted access-controlled storage with a retention policy agreed by the owner. Backup contents may contain sensitive records even though terminal output only includes counts.

Restore validates the complete manifest before creating output. It refuses an existing destination, symbolic links, URLs, remote flags, missing references or modified files. It creates `database.sqlite` and `study-files/` in a **new** directory. It never replaces a live database, deploys resources, changes runtime paths or silently migrates the restored copy. Run integrity checks and a read-only application smoke check against this isolated result before considering cutover. Keep the original data and old application version until recovery is accepted. Routing a running application to a restored database is a separate operator-controlled step.

```bash
node --test scripts/local-recovery.test.mjs
WRANGLER_WRITE_LOGS=false WRANGLER_SEND_METRICS=false node --test scripts/clinic-migration.test.mjs
```

The recovery suite creates only new temporary synthetic data. It applies the committed Prisma migrations, saves patient/encounter/receipt/file associations, restores them, checks migration history and exact attachment bytes, and rejects overwrite, corruption, broken foreign keys, missing files, symlinks and remote targets. It also verifies a committed change still present in the SQLite WAL. It does not open the developer's normal `.local/data` databases. The email dispatcher regression uses a separate temporary SQLite outbox.

The standalone clinic-migration suite replays the complete pre-mission SQLite and Cloudflare migration histories into separate temporary databases. It inserts representative synthetic records in every existing domain, applies the clinic migration, and compares every original column/row, timestamp, session and association. It verifies deterministic legacy memberships, disabled membership state, explicit unknown historical authors, clinic constraints and immutable clinical authorship. The Cloudflare half runs a real local workerd D1 binding through the installed Miniflare, then checks failed-batch rollback, stale-version rollback (including prescription child rows), competing versioned writes, cross-clinic insert/update denial and foreign keys. It needs local subprocess/loopback permission; it does not use remote Cloudflare resources, tokens, live persistence or the API suite's shared test database. Each run prints the migration SHA-256 so later edits invalidate earlier evidence visibly.

## D1 and R2 backup strategy

The remote recovery gate requires an actual test in a fresh isolated environment. The local script accepts filesystem SQLite snapshots only; it does not import D1 SQL exports or download R2 automatically.

1. Record the reviewed application commit, Worker versions, Wrangler version, compatibility settings, binding IDs and selected environment. Record required secret *names* and vault references separately; do not export secrets into the report. Record D1 migration rows (`d1_migrations` for Wrangler-managed D1 and `_prisma_migrations` where present).
2. Pause writes to the selected environment for a coordinated D1/R2 snapshot. Obtain a D1 export and Time Travel bookmark. D1 export is a remote read; use the explicitly reviewed isolated config. For example, with an operator-created config containing a `PILOT_DB` binding:

   ```bash
   npx wrangler d1 export PILOT_DB --remote --config /absolute/local/pilot.wrangler.jsonc --output /absolute/local/private-backup/practice.sql
   npx wrangler d1 time-travel info PILOT_DB --config /absolute/local/pilot.wrangler.jsonc --json
   ```

3. Export every referenced R2 object from the matching namespace using the supported R2/S3 interface. The current Worker separates `practice/` and `demo/` prefixes; preserve the full keys and distinguish the two environments. Keep the bucket private. Record a manifest containing object key, byte count and SHA-256 for each object; verify every `study_receipt_files.storageKey` reference against the correct prefix. One-object retrieval syntax, checked against the installed Wrangler CLI:

   ```bash
   npx wrangler r2 object get isolated-pilot-bucket/practice/OPAQUE-STORAGE-KEY --remote --file /absolute/local/private-backup/object --config /absolute/local/pilot.wrangler.jsonc
   ```

4. Store the SQL export, R2 bytes/manifests, configuration/commit metadata and bookmark in encrypted access-controlled backup storage outside the deployment account. Set a measured backup schedule and retention; no automatic schedule is supplied by this change. A database-only backup cannot recover attachments. R2 durability is not independent protection against authorized accidental deletion. If a receipt write fails and its commit state cannot be checked, uploaded objects are retained to protect a possibly committed receipt; this may leave orphan objects. Reconcile unreferenced keys only after confirming database state and retention requirements.
5. Resume writes only after the snapshot is complete and its association manifest verifies. Preserve failures visibly; do not record a backup as successful from a created filename alone.

D1 Time Travel recovers database state within the plan's retention window, not R2 objects or Worker code. Check the actual plan/window rather than assuming a fixed retention period. See [Cloudflare Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/), [D1 export/import](https://developers.cloudflare.com/d1/best-practices/import-export-data/), [Wrangler D1 commands](https://developers.cloudflare.com/workers/wrangler/commands/d1/) and [R2 downloads](https://developers.cloudflare.com/r2/objects/download-objects/).

## Safe remote restore rehearsal and migration rollback

Provision a new empty D1 database and private R2 bucket, distinct from all live resources. Put only these identifiers in a disposable reviewed recovery configuration. Prepare a trusted SQL export with `node scripts/prepare-d1-restore.mjs /absolute/export.sql /absolute/new-prepared.sql`, then import the prepared file into that empty database (`wrangler d1 execute ... --remote --file ...`) and upload the saved objects with their original keys to the new bucket. The preparer refuses unknown statement types and an existing output, orders table creation before data and triggers, and executes an in-memory SQLite integrity and foreign-key check. It is a local preflight, not a guarantee of D1 compatibility or a substitute for backup validation. A direct D1 export import failed in the synthetic rehearsal because `auth_users` had not been created before referenced rows were inserted. These are external writes; perform them only after the intended target and authorization are explicit. Do not execute a Time Travel restore, import, reset, overwrite or migration against a live environment as a test.

Verify row counts, FK integrity, migration state, clinic boundaries, author associations and each attachment checksum. Run the API against the restored bindings and test two synthetic clinic sessions, explicit document authorship, attachment denial across clinics, login/revocation, representative writes and readback after restart. Measure the restore time and record the recoverable snapshot age; these establish the observed RTO/RPO. Preserve the original environment during verification.

For schema rollback, restore a **pre-migration** coordinated snapshot into new isolated resources and pair it with the matching pre-migration application commit. Forward fixes are preferred when they preserve data. Rolling back Worker code alone does not undo D1 migrations or R2 changes. Never apply destructive down migrations to clinical records or repoint live resources automatically. Any eventual live cutover requires the independently validated backup, recorded restore rehearsal, explicit operator authorization and a write-freeze/data-reconciliation plan.

## Evidence and remaining operational gates

Evidence from this slice (2026-11-13): local synthetic recovery tests pass; the dispatcher regression demonstrates that five ineligible appointment messages cannot block account-security mail; the API Worker dry-run packages successfully with expected DB/demo/R2 bindings. The isolated pilot API and web Workers were deployed on 2026-11-13; the web endpoint is `https://nexus-med-pilot-001-web.marguel-gtz.workers.dev`. A synthetic-only smoke verified demo login, protected-route redirect, six active patients and exact fixture PDF bytes, with secure HttpOnly cookie and no-store API response. The API Worker is private. The pilot-only auth secret is also held locally at `.local/pilot-001/better-auth-secret` (mode 0600); move it to an approved vault before relying on this environment. The pilot web Worker was updated to preserve authentication redirects; one synthetic verification link then returned 302. SMTP and Google are not configured. Existing live resources were not migrated or deployed.

Migration verification: standalone SQLite/workerd suite **2/2 PASS**, including two simultaneous D1 writes competing for the same document version (exactly one accepted). SQLite and D1 clinic migration bytes match; verified SHA-256 `165c524052e742cd0c3bea565757416a73edc73a0fcfd7d66e04e07c9d69afe2`. This is local D1 runtime evidence, not remote migration or backup-restore evidence. Re-run after changing either migration.

Still required before marking remote pilot operations PASS: application verification against the restored D1/R2 resources, broader attachment reconciliation, SMTP delivery, credential-dependent Google OAuth, environment binding review, independent backup storage, and measured backup schedule/RTO/RPO. Missing external provider credentials may block those checks without blocking local implementation. Real-patient use additionally requires independent security/privacy/clinical/legal review; this runbook makes no NOM certification or legal-compliance claim.

**Remote synthetic recovery evidence (2026-11-13):** A D1 export from the pilot demo was restored into newly created `nexus-med-pilot-001-restore` after the raw import failed and rolled back. A local preflight reordering was imported successfully. All rows in 21 tables matched the source, both foreign-key checks were empty, and the single synthetic R2 object was copied to `nexus-med-pilot-001-restore-files` with matching SHA-256 and database key. This did not exercise a live write freeze, multiple R2 objects, an application against the restored bindings, measured RTO/RPO or a real-data recovery. The isolated recovery resources remain in the account.

**Local restored-application smoke (2026-11-13):** Separate synthetic practice and demo databases and their matching attachment directories were backed up and restored to fresh temporary directories. The loopback API started against those restored copies: an unauthenticated registry read returned 401, demo sign-in and the registry returned 200 with six synthetic patients, and one restored attachment downloaded with identical bytes and `no-store`. The existing session and registry read also survived an API restart. Demo sign-in wrote only to the restored practice copy. A synthetic physician also signed in to the restored practice, retained clinic membership, and read a previously authored encounter with its author intact. That session received 404 for another restored clinic’s patient, encounter and document lists, and attachment. This does not exercise secretary permissions, the remotely restored D1/R2 bindings, coordinated live recovery, or measured RTO/RPO.
