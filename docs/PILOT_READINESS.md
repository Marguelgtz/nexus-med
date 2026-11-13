# NM-PILOT-001 — Pilot readiness evidence

**Assessment:** 2026-11-13. **Synthetic pilot release gate: NOT PASSED.** A separate synthetic deployment is available for evaluation, but the complete remote multi-user journey, browser receipt/print checks and recovery cutover remain unverified. **Real-patient readiness: BLOCKED** pending independent security, privacy, operational, clinical and legal review; no certification is asserted. This is a living evidence matrix, not a substitute for the exit criteria in the mission directive.

Status applies to the complete scenario at the pilot release gate. A local check is recorded as evidence, not generalized to every runtime or workflow. BLOCKED names a concrete dependency; NOT STARTED identifies a check that has not been run. Inventory is DEFERRED.

## Required scenarios

| Scenario | Status | Evidence and remaining condition |
|---|---|---|
| A — Clinic creation | BLOCKED | Local browser registered and verified a doctor, created a clinic and opened the doctor/administrator workspace; API tests cover bootstrap retry. Remote synthetic verification redirect was repaired and returned 302. A complete remote account-to-clinic journey is still required; the multi-session run was rejected by automatic approval review. |
| B — Staff onboarding | BLOCKED | Actual local API sessions cover two doctors, two secretaries, invitations, revocation and tampering; a local browser invitation/verification/login for secretary passed. Remote separate-session run awaits explicit owner approval after automatic rejection. Real SMTP is not configured. |
| C — Multi-doctor scheduling | BLOCKED | Local multi-session integration covers assignment, filtering, reassignment and doctor restrictions; browser created an assigned appointment from the secretary view. Remote separate-session run is pending. |
| D — Consultation | BLOCKED | Local browser saved a synthetic encounter and linked study, displayed author and completed the appointment explicitly; local multi-session API journey validates ownership and content. Remote separate-session journey remains pending. |
| E — Clinical continuity | BLOCKED | Local API journey verifies another doctor can read prior history, edit with attribution retained, author a separate document and encounter, and reload. Remote separate-session verification remains pending. |
| F — Secretary permissions | BLOCKED | Local API tests deny clinical reads and physician-only actions while allowing administrative work; browser verified the administrative view and arrival. Direct browser clinical denial and remote independent-session checks remain pending. |
| G — Studies | BLOCKED | Local actual-session API journey uploads/downloads a synthetic PNG, rejects a foreign clinic and requires explicit physician review. Browser upload is blocked by the Chrome extension file-URL permission; browser review and remote independent-session checks remain pending. |
| H — Documents | BLOCKED | Local API journey verifies prescription/report authors and preserves original author after another doctor edits; browser saved and reloaded a prescription with author. Browser report and print rendering, and remote independent-session checks, remain pending. |
| I — Access revocation | BLOCKED | Local actual-session auth tests cover revocation and denial. Remote independent-session verification and explicit historical-record check remain pending. |
| J — Clinic isolation | BLOCKED | Local API isolation and actual-session journey cover two clinics, nested references, documents, appointments and attachment denial. Remote independent-session verification remains pending. |
| K — Concurrency | BLOCKED | Local multi-session tests show one of two same-version clinical edits wins; local workerd D1 tests cover atomic batch rollback and competing document versions. Duplicate retry behavior and representative remote concurrency remain unverified. |
| L — Failure and recovery | BLOCKED | Local receipt failure injection covers confirmed rollback and uncertain commit without deleting associated attachments; local backup/restore tests pass. Remote synthetic D1/R2 restore matched 21 tables and one object, but restored-app cutover, measured RTO/RPO and a complete browser failure/draft-retention pass remain unverified. |
| M — Existing UX | BLOCKED | Reception was inspected at 320, 390, 768, 1024 and 1440px; physician and secretary browser paths were exercised. A complete action inventory, keyboard audit, receipt upload/review and print check remain outstanding. |

## Engineering and operational gates

| Gate | Status | Evidence and limit |
|---|---|---|
| Integrated baseline and Git ancestry | PASS | `PILOT_BASELINE.md` records the initial head and 39 open PR heads. Branch `codex/pilot-clinic-foundation` retains the stack; no feature PR was merged. |
| Database migrations | PASS | Representative old records, associations and timestamps survived SQLite and local workerd D1 migration tests; constraints and atomic rollback were checked. New empty pilot D1 databases received all five migrations. Original remote databases still have `0004_clinic_ownership.sql` pending and were not migrated. |
| Current regression suite | BLOCKED | Most recent full run: API 159/159, web 60/60, typecheck and lint; later focused receipt tests 3/3, isolation 7/7 and service redirect 1/1 passed. The full suite must be repeated after subsequent changes. Lint retains the existing missing-Pages notice. |
| Build and runtime | BLOCKED | OpenNext production build, API/web dry-runs, local connected workerd smoke and deployed synthetic demo smoke passed. OpenNext warns Node middleware support is experimental. Multi-user deployed journey is blocked by the automatic approval rejection. |
| Backup and recovery | BLOCKED | Local SQLite/attachment recovery passed 7/7. An isolated remote D1/R2 restore matched rows, foreign keys and a single synthetic object after reordering the export; restored-app cutover, broader object sets, independent storage, retention and measured RTO/RPO are outstanding. |
| Authentication and authorization | BLOCKED | Local verified signup, sessions, roles, invitations, CSRF/origin, revocation and cross-clinic tests passed; a deployed verification redirect defect was fixed and the original synthetic link returned 302. Independent security review and deployed multi-session verification remain open. |
| Google OAuth | BLOCKED | Conditional provider configuration and controlled tests exist; actual Google credentials, consent configuration and real provider callback verification are not available. See `PILOT_AUTH.md`. |
| Email delivery | BLOCKED | Local outbox/capture and dispatcher tests pass; actual SMTP is unconfigured and no real email delivery is claimed. |
| Browser accessibility and print | BLOCKED | Selected responsive and browser workflows were inspected; full keyboard/accessibility, browser upload and print rendering checks are incomplete. |
| Deployment isolation | PASS | Pilot configs bind separate D1 databases, an R2 bucket and Workers; the API has no workers.dev route. Wrangler reports r2.dev disabled and no custom domains for both pilot and restore buckets. Synthetic demo login, secure HttpOnly cookie, `no-store`, protected redirect and fixture PDF download passed remotely. This is a configuration and smoke check, not a full security assessment. |
| Security and privacy assessment | BLOCKED | Scope, risk controls and Mexican regulatory references are documented in `SECURITY.md`; independent review and real-patient approvals remain outstanding. |
| Git review and publication | BLOCKED | Changes are committed locally on `codex/pilot-clinic-foundation`; no new PR or push has been made. Existing feature PRs remain unmerged. The remote journey script is an uncommitted draft. |
| Inventory/consumables | DEFERRED | Optional P2; mandatory gates take priority. |

## Current environments and manual dependencies

The synthetic web Worker is `https://nexus-med-pilot-001-web.marguel-gtz.workers.dev`, backed by the private `nexus-med-pilot-001-api`, pilot practice/demo D1 databases and the pilot private R2 bucket described in `PILOT_OPERATIONS.md`. The isolated restore D1 and R2 resources remain in the account. The pilot secret is held locally under `.local/pilot-001/` with restricted permissions and must be transferred to an approved vault before operational reliance.

SMTP and Google provider setup require owner-controlled credentials and configuration. Browser upload requires the Chrome extension setting described in `TESTING.md`. Automatic approval review rejected a prepared synthetic remote multi-session run because it interpreted the goal as paused, although the goal tool reported active; owner approval has been requested and the rejection must not be bypassed. The uncommitted script must be reviewed and the approved run observed before its results can be claimed.

Sources of detailed evidence and commands: `ACTION_PLAN.md`, `TESTING.md`, `PILOT_AUTH.md`, `PILOT_OPERATIONS.md`, `SECURITY.md` and `PILOT_BASELINE.md`. The current committed history is available with `git log`; a final release report must replace this provisional assessment once all applicable gates are verified.
