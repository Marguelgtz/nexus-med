# NM-PILOT-001 — Minimized essential synthetic pilot (2026-11-14)

## Objective and boundary

Deliver and verify the integrated clinic-scoped application for a controlled **synthetic-data** pilot. This minimized objective covers current-source deployment, core multi-user/role/isolation workflows, membership revocation, a bounded restored-data app smoke, and email containment. It does not authorize real-patient use.

**Status: COMPLETE.** No additional product-code change is required for this scope. Do not treat this as real-patient readiness.

## Acceptance evidence

1. **Build and isolated deployment:** Commit `fde060d` passed the Next.js/OpenNext builds and API/web Wrangler dry-runs, then deployed through Wrangler CLI to isolated API version `de6da841-d0e8-4d89-a3db-ade52f9e66cc` and web version `3af5e606-c8aa-4594-9540-81163dd7bd54` (both 100%). `/login` returned 200. No migration was needed or run; original practice/demo resources were not targeted. OpenNext reports its existing experimental Node middleware warning.
2. **Current-source clinic workflows:** Remote multi-user and revocation journeys passed. Evidence covers two-clinic/five-session separation, doctor/secretary permissions, assigned appointment/reception/encounter, authorship, 200/409 stale-write handling, private attachment upload/read/review and outsider denial, prescription authorization, sign-out/relogin persistence, revoked-session denial, and retained clinical authorship.
3. **Restored data smoke:** A loopback API bound only to the separately restored D1/R2 copy signed in/out, read six active synthetic patients and one receipt, and fetched its 705-byte private attachment with `no-store`. Its SHA-256 was recorded as `2ebfde37755321a34d2e82acfb993a22a24edcecee494a9b91be72ba0ce60009`; no comparison to a fixture hash is claimed. Test sessions were removed and clinical rows were unchanged. This was a bounded application smoke, not an RTO/RPO measurement or full recovery cutover.
4. **Email containment:** Post-run D1 reconciliation found 11 queued authentication messages, all addressed to `example.test`, zero sent. `EMAIL_DELIVERY_DISABLED=true`; no cron trigger is configured.
5. **Existing checks:** The recorded API suite is 171/171, web suite 64/64, workspace typecheck/lint pass, and migration/recovery preparation checks 11/11. This final deployment/evidence session added no product code or test suite. See `TESTING.md` for commands and checkpoint detail.

## Work remaining

**Coding work inside the minimized objective: none.** The following are separate scope gates, not unfinished product-code tasks:

- Independent security, privacy, legal and clinical review before any real-patient use.
- Backup retention, independent storage, full restore/cutover rehearsal, and owner-agreed RTO/RPO.
- Broader deployed browser, accessibility, intended-user and print review.
- Owner-controlled Google/SMTP configuration if live providers are later required; delivery remains disabled.
- Owner disposition of `.local/data/medical.db` before using that local database for further checks. It remains untouched; use synthetic fixtures only.
- Inventory remains optional and deferred.

## Branch and review

Branch `codex/pilot-clinic-foundation` is PR #42, based directly on PR #47; the stack begins at #41. The deployed application source is commit `fde060d`; this scope/readiness reconciliation is documentation-only and does not change the deployed runtime. GitHub status checked 2026-11-14: PR #41 is open; PRs #42–#47 are open drafts; all are unmerged and reported mergeable. Stack: #41 → #43 → #44 → #45 → #46 → #47 → #42. No feature PR was merged.

The owner's existing edit to `apps/web/next-env.d.ts` is separate and remains untouched.

## Evidence references

- `PILOT_READINESS.md` — expanded readiness matrix and real-patient boundary.
- `PILOT_OPERATIONS.md` — isolated resources and recovery procedures.
- `TESTING.md` — current-source build, remote journeys and smoke evidence.
- `PROJECT_HISTORY.md` — milestone record.
