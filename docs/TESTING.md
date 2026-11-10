# Testing and Verification

## Compact entry — incremental verification (2026-11-10)

Dialog/follow-up milestone: web 39/39, web typecheck and ESLint pass (existing warning only). Local Chromium at 390px checks new/saved consultation follow-up dialogs, initial field focus, Tab containment, trigger focus return, dirty Escape cancel/accept and note retention. No clinical write was submitted. A repeated native Escape close-request behavior was found and fixed by handling/preventing Escape at keydown before the guarded close.

Consultation-stage milestone: web typecheck/lint and Chromium checks pass for three stages, retained text/review, custom contextual study, zero requests during stage changes, captured atomic-save payload, simulated 500 retention, simulated cross-stage 400 focus, 320px reflow and saved-note study modal. All final test writes were intercepted. An earlier failed check exposed a Continue/Save DOM-button reuse default-submit bug; separate keyed buttons fixed it. That failed check created exactly two uniquely identified synthetic notes/requests in the local DB. They were backed up and removed with strict fixture/time/association checks; all unrelated table rows matched the pre-cleanup digest and foreign-key checks passed. Final persistence verification uses an isolated fixture DB.

Medication/background milestone: web typecheck/lint and Chromium checks pass for modal create/edit/dirty Escape/focus return, compact two-medication payload, simulated save failure retention, preserved existing per-line instructions, overview-only background, edit/cancel return and former-context redirect. All writes were intercepted. Validation alert selectors were scoped away from Next's route announcer in the harness.

## Focused patient views — 2026-11-10

The second owner review replaces overview anchor navigation with separate SSR views (D-042). Web tests pass **39/39**; the final Next.js production build, including TypeScript validation, passes; ESLint exits 0 with its existing App Router `pages/` warning. No API/schema/domain code changed, so the historical 113-test API result is not presented as a fresh run.

Chromium checks use the production build and a separately migrated/seeded exact fixture DB (7/9/9/2/2) on loopback 3105/4105. No clinical write was submitted. Checks cover:

- Six view destinations and exclusive content/current-page navigation at 1440, 1024, 390 and 320px: **24 route/viewport checks**, all without horizontal page overflow.
- Legacy overview bookmarks (including the owner's patient-005 history bookmark), back/forward navigation, direct linked-note entry and active consultation navigation.
- Summary-to-study request entry, dirty study text preserved when navigation is cancelled, and successful navigation when discarding is confirmed.
- Keyboard Enter activates section navigation; the skip link focuses main content. Prescription, standalone consultation and appointment-origin consultation cancellation return to their owning destinations. Background edit/cancel return, six routes on an empty patient record and a genuine 404 for a missing synthetic patient also pass.

Eighteen production screenshots are inventoried and inspected in [focused patient views](assets/ui-v0/focused-patient-views-2026-11-10/README.md). Summary carries only demographics and compact pending work; the background view no longer repeats consultations/studies/scheduling. Scheduled past dates remain visible without inferred completion. The short appointment date plus time range no longer repeats the start time, and `Tipo de cita` distinguishes the planned classification from a clinical note.

Limits: Chromium only, no screen-reader or physician task study; no renewed claim of final visual/brand approval. Previous full workflow/print/API checks remain historical baseline evidence.

## O-007 owner-review follow-up — 2026-11-10

- Automated checks on the owner-review code: API **113/113** (7 files; 1 intentionally skipped), web **39/39**, workspace typecheck, and ESLint exit 0. The first API attempt hit sandbox `EPERM` when the rollback test spawned `npx`; the permitted rerun passed all 113 tests. ESLint prints the existing non-failing warning that this App Router repository has no `pages/` directory.
- The Next.js 16 production build passed after all owner-review code changes, including the patient layout and registry action sizing.
- Existing local SQLite was migrated in place, never reset. The two study rows and their patient/encounter associations, status, result notes, IDs and timestamps were retained; the field digest matched after accounting for the intentional `description` → `name` mapping. SQLite `foreign_key_check` returned zero violations. Re-seeding created zero records.
- Chromium owner-review captures show registry/patient entry points, full clinical context, the consultation actions and study-status panel, month calendar, focused field editing, and `Otro` study entry. Patient/context/calendar/encounter document widths matched the 390px mobile viewport; patient and registry layouts were also captured at 1024px and 1440px. The study form now opens from `Acciones de esta consulta`, states its patient/encounter association, and uses full-width stacked fields in the narrow consultation sidebar. `Completada` caveat and existing study status badges remain present. No clinical write was submitted during capture.
- Focused token-pair WCAG relative-luminance checks after the palette change: main text/surface **14.81:1**, muted text/surface **6.58:1**, faint text/page background **5.48:1**, primary action/surface **6.32:1**, warning/banner **6.57:1**, success/badge **6.35:1**, and control border/surface **3.16:1**. This checks core token pairs, not every composed screen state.
- The prior UI v0 suite's 64-route/viewport geometry checks, print checks and core workflow checks remain documented above as baseline evidence; this follow-up did not repeat the full 64-combination matrix. Its additional owner-review screenshots were inspected individually at desktop, tablet and mobile sizes.
- Keyboard follow-up: canceling the study form and the embedded prescription form both return focus to the `Acciones de esta consulta` heading. No save was submitted in this check.

Evidence: [owner-review screenshots and dimensions](assets/ui-v0/owner-review-2026-11-10/README.md). Limits: Chromium only for this follow-up, no physician task study, screen-reader validation, Safari/Firefox, or final branding approval. The persistent fictional-data warning and clinical fictional markers remain visible by project safety requirements.

## O-006 follow-up acceptance checks — cleared by UI v0 verification (2026-11-09)

The following are required before merging PR #7. They were added after the original 112/112 API and 32/32 web test report; do not treat those earlier results as verification of this follow-up.

1. Run `npm run test -w apps/web` and verify `study-draft.test.ts` passes (blank, typed, whitespace, category, encounter association, added row).
2. Run `npm run test -w apps/api`, `npm run typecheck`, `npm run lint`, and `npm run build -w apps/web`. Check for regressions.
3. Patient-level and saved-encounter study forms: start typing, choose Cancel and reject the confirmation; verify all input persists. Confirm closing intentionally discards. Verify the form cannot be silently closed from its header while dirty.
4. In a saved encounter, mark a study `Completada`, then `Revisada` **without leaving the page**. Verify neither saving flag sticks; requests persist and reviewed work disappears from pending lists.
5. From a saved encounter, create a prescription and a report in the **embedded** form. Verify patient and encounter association, saved-success message, cancellation with unsaved text, repeated prescription lines, and that the encounter remains visible. Check mobile viewport at 390px.
6. Regression-check the existing standalone prescription/report routes, browser print output, in-place encounter editing, follow-up return navigation, and study creation/review flows. Do not use real patient data.

**Status:** The post-change automated gate and all six follow-up groups above were executed during UI v0. See the current evidence below; the earlier inability to execute through the GitHub connector is historical. PR #7 remains unmerged.

## O-007 UI v0 verification — 2026-11-09

- Automated: API **112/112**, web **36/36**, workspace typecheck, ESLint and Next.js production build pass. Initial sandbox runs blocked Prisma/TypeScript subprocesses; permitted reruns passed. Existing lint missing-`pages/` and Vitest config-loader warnings remain non-failing.
- Runtime: separate copied frontend (same source) on loopback 3102 and API on 4102. A new SQLite DB applied all five committed migrations and seeded exactly 7 patients / 9 encounters / 9 appointments / 2 studies / 2 documents. Browser writes used a different isolated verification DB. Re-seeding that DB created zero records; a full SQL-dump digest was unchanged, preserving edited fixtures and new synthetic records. The existing owner DB was untouched.
- Browser mutations across reruns: patient required-name validation/create, demographics update, medical-background update, archive with retained history; consultation with staged study save/reload, dirty navigation cancellation, in-place note edit/reload; patient/encounter study creation and cancel/navigation protection; consecutive completed→reviewed saves without leaving the page; both embedded document kinds with same-patient encounter association, repeated medication rows, cancellation protection, explicit save/status; standalone prescription/report create/edit/reload; appointment create/edit/cancel, follow-up return, appointment entry and explicit completion/link with duration. Harness selectors and navigation/hydration waits were corrected before recording passes; failed harness runs are not counted as successful whole-suite runs.
- Responsive: 64 route/viewport combinations at 1440, 1024, 900, 768, 640, 639, 390 and 320 CSS px. No document-level overflow. Month first/seventh cells align and the eighth starts the next row; week tracks equal above 639px and form seven separate full-width rows below it. 640px at half-height models a 1280px viewport at 200% zoom; 320px covers narrow reflow. Body-text scaling is exploratory only, not native zoom certification.
- Keyboard/accessibility: skip link focuses main; mobile context opens with Space and closes with Enter; repeated study controls have visible accessible labels; removal is named by row; focus outlines visible; navigation/filter state conveyed programmatically. Busy states, inline validation, loading skeleton, empty results, failure alerts and preserved values inspected. No screen-reader or full WCAG conformance claim.
- Contrast (WCAG relative luminance): faint `#626f7c` is **5.14:1** on white, **4.79:1** on page background and **4.54:1** on hover surface; demo text `#805800` on `#fdf3d7` is **5.73:1**; control border `#8493a2` on white is **3.15:1**. Success `#186d3b` on `#e4f3ea` is **5.57:1**, corrected from the earlier 4.44:1 pair. This is a focused semantic-pair check, not an exhaustive rendered color audit.
- Print: Chromium generated both fixture document PDFs; text and rendered pages were inspected. Paper contains authored content and the fictional-data marker, with no shell/actions/screen-only copy. No physical printer test.
- Evidence: [final screenshot inventory](assets/ui-v0/README.md), compared with PR #8's [original audit](UI_AUDIT.md). All captures are synthetic. Saving/error screenshots use controlled delayed HTTP 500 without writes. Alternative-port browser API forwarding compensates for the unchanged port-3000 CORS allowlist; this does not validate an alternate-port deployment.

Limits: Chromium only, no Safari/Firefox or physical tablet, no physician task study, no final branding approval. Figma work has not started. Browser harnesses and DBs remain in ignored `.local/ui-v0/`; the committed screenshots/inventory are review evidence, not a newly installed browser-test framework.

## Current verification setup

Original integrated O-006 verification (2026-11-09, before the post-review gate above): API 112/112; web 32/32; workspace TypeScript typecheck; ESLint; production build; fresh and repeated local startup; and headless Chrome checks of the primary O-006 journeys. A seeded temporary SQLite database preserved both existing study rows, including patient/encounter associations, statuses, result notes, IDs, and timestamps through the table rebuild; foreign-key and index checks passed. The regular local database then applied the new migration and seed created no records; `/health` and `/patients` returned 200. PR #7 is open on `feat/o006-clinical-workflows`, stacked on PR #6.

| Command | Scope |
|---|---|
| `npm run test -w apps/api` | 112 integration tests, including standalone and linked study requests, same-patient validation, study creation/filtering/status transitions, patients, encounters, appointments, documents, seed preservation and transaction behavior. Vitest applies the real committed migrations to isolated SQLite databases under `.local/test/`. |
| `npm run test -w apps/web` | 36 presentation/helper tests (vitest, node): es-MX date formatting, age, `wasEdited`, default encounter-type badge visibility, calendar date math, appointment overlap handling, and calendar layout helpers, and study-draft detection. No app boot or database needed. |
| `npm run typecheck` | `tsc --noEmit` across all workspaces (contracts, api, web). |
| `npm run lint` | ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next` 16 (flat-native): exit 0; emits a warning because the App Router repo has no `pages/` directory. Generated artifacts and `.local/` are ignored. |
| `npm run build -w apps/web` | Next.js 16 production build. |
| `npm run dev` | One-command runtime; O-006 verified on an isolated database through migration, exact synthetic seed, repeat startup with zero changes, API `/health`, SSR `/patients`, and browser journeys. |

Verified API coverage (112 passing tests):

- Health response.
- Patient create/list/search (case-insensitive name and identifier)/read/update demographics/update medical background/archive (non-destructive, idempotent); default list excludes archived; `?q=` empty means no filter.
- Encounter create (for existing patient)/read/update; patient association cannot be reassigned via update; unknown patient/encounter IDs return `404`.
- Encounter type (D-024): omitted type defaults to `consulta`; explicit type persists and is exposed in the timeline; invalid type rejected with a field error; type can be changed via `PATCH`.
- Appointments (NX-001): create/list (range filter)/get/update-reschedule/complete (actual duration + optional same-patient encounter link)/cancel; one-directional status transitions enforced; overlap detection in list responses; unknown patient/appointment IDs return `404`; duration 5–480 min validation.
- Study requests (NX-003/O-006): nested atomic creation during encounter creation; atomic addition through the existing encounter endpoint; patient-level creation with no encounter or an optional same-patient encounter; cross-patient association rejection; patient and encounter listing with nullable encounter DTOs; repeated `status` filters; invalid/empty inputs and unknown IDs; unchanged `ordered → completed/reviewed` and `completed → reviewed` transitions, result-note limits, repeated/backward transition conflicts, and persistence.
- Printable documents (NX-004): prescription/report creation, patient and same-patient encounter association, detail/list retrieval, input limits, immutable patient/kind, atomic prescription-line replacement, persistence, and kind-specific UI not-found behavior.
- Timeline ordering by `occurredAt` descending with deterministic tie-break.
- Validation: missing required fields, unknown fields (per-field `fieldErrors`), bad date formats; `400` with the contract envelope.
- Seed: exact fixture IDs/counts (7 patients, 6 active, 1 archived; 9 encounters; 9 appointments — 4 fixed past, 5 first-seed-anchored upcoming; 2 studies; 2 documents and 2 prescription lines), idempotency (second run creates 0), preserved edits to demo documents/lines and user-created records, `demo-patient-003` has no encounters, and atomicity — a mid-run foreign-key violation rolls back the entire seed (no partial records).
- Upcoming-appointment anchor: seeded future appointments sit at their expected `America/Monterrey` wall times and do not move on re-seed.
- Transactions: representative multi-write operation rolls back atomically through the local adapter.
- `demo-patient-004` remains archived across seed runs.

Browser verification covered O-003 and all O-005 slices: calendar and appointment create/edit/cancel/reprogram/complete/link; encounter type creation/edit/detail/timeline; study creation/status transitions/failure recovery/pending-card visibility; and prescription/report create/edit/reopen, repeatable prescription lines, same-patient encounter selection, validation recovery, overview links, 404 copy, and browser printing. Printed prescription/report PDFs were inspected for page content, fictional-data marker, and absence of app controls/screen-only copy. O-006 headless Chrome checks covered standalone patient study creation/review with a doctor-authored note, consultation save with staged study, adding a study to a saved encounter, contextual prescription/report save and return with the encounter preselected, follow-up return, scheduled appointment entry and explicit completion/link, cancellation of unsaved navigation, and a 390px mobile consultation layout. The mobile context disclosure toggled closed with Space and reopened with Enter. Automated frontend coverage remains limited to presentation/helper unit tests; broad component automation and the destructive-reset confirmation path remain post-MVP gaps.

## NX-003 verified behavior

The 29 cases in `apps/api/test/studies.test.ts` cover nested, encounter-linked, and standalone study creation; optional same-patient association; cross-patient rejection; input validation; patient/encounter listing; repeatable status filters; missing IDs; forward transitions; rejected repeated/backward transitions; result-note limits; and persistence. O-005 browser evidence covers study entry with a consultation, failed-save preservation, `ordered → completed → reviewed`, pending-card visibility, and removal after review. O-006 browser checks also passed for patient-level creation/review, staged and saved-encounter study entry, and patient context. The exact two studies in `docs/demo-dataset.json` remain unchanged.

## NX-004 verified behavior

The document API tests cover both kinds, patient/encounter association, validation, detail/list, edit persistence, prescription-line replacement, and unsupported delete behavior. Seed tests cover the exact fictional fixtures, line order, idempotency, edit preservation, and user-created records. Browser checks exercised both creation/edit flows, overview integration, field-level validation recovery, line add/remove capability, report line breaks after reload, kind-specific 404 copy, and CSS printing. A clean temporary startup seeded 2 documents; a repeat startup applied no migrations, created 0 records, and retained an edited user report. The browser print PDFs showed the demo footer and omitted navigation, banner, controls, and the screen-only print note.

The NX-001 and NX-002 source-review discrepancies identified at expansion start have been resolved and browser-verified; see `ACTION_PLAN.md` for the evidence summary.

## Principles

Testing follows the development sequence: verify the database and API foundation first, validate UX/UI against the agreed workflows, then verify the complete implementation in vertical slices. The API/data foundation must be independently testable before the frontend feature screens exist.

- Test observable behavior, not merely the existence of UI components.
- Use synthetic deterministic data only.
- Verify Next.js Server Components retrieve initial page data from Hono rather than accessing Prisma/SQLite directly.
- Verify clinical page data is request-time and not shared-cached/static.
- Verify browser-initiated mutations go through Hono and server-side validation.
- Verify local Prisma/SQLite transaction rollback for representative multi-write operations.
- Verify patient/encounter association integrity and chronological timeline ordering.
- Test empty, invalid, loading, success, network-error, and persistence-error states.

## Database and seed tests

- Apply migrations to a clean local database.
- Run the explicit Prisma 7 seed command.
- On a clean database, verify all 7 patient fixture IDs, all 9 encounter fixture IDs, and all 4 fixed past appointment IDs from `docs/demo-dataset.json` are present; exactly 6 seeded patients are active and 1 is archived; 5 additional first-seed-anchored upcoming appointments exist.
- Run the seed twice and confirm no duplicate records.
- Edit a seeded record, rerun the seed, and confirm the edit is preserved.
- Create a user-added record, rerun the seed, and confirm it is untouched.
- Verify `demo-patient-003` has no encounters and `demo-patient-004` remains archived after repeated seed runs.
- Verify reset is destructive and requires interactive confirmation or `--confirm`; normal startup never resets the database.

## Database/API foundation tests

Before product UI implementation, verify:

- Prisma schema and migrations apply to a clean SQLite database.
- Patient and encounter foreign-key/relationship rules are enforced.
- Hono request validation rejects invalid inputs and cross-patient encounter associations.
- API DTOs and error responses match the documented contract.
- The synthetic dataset is retrievable through the API.
- Local transaction rollback works for representative multi-write operations.
- API tests do not require a browser or Next.js UI.

## End-to-end workflows

1. Start from a clean local database.
2. Run `npm run dev`.
3. Confirm Next.js and Hono start and print their local URLs.
4. Open `http://127.0.0.1:3000`; confirm redirect to a populated `/patients` registry.
5. Confirm the demo-mode banner is visible.
6. Search for a synthetic patient and open the overview.
7. Create a patient and verify it persists.
8. Create an encounter for that patient and verify it appears in the correct timeline.
9. Verify the local Prisma transaction rollback test.
10. Stop and restart both apps.
11. Confirm all locally created and seeded records remain.
12. Run seed again and confirm no duplicates or overwrites.
13. Confirm no remote Cloudflare service or network connection is required after dependencies are installed.

## Clean-clone acceptance

The Prisma client (`apps/api/src/generated`) is gitignored, so a fresh clone has no generated code. `npm run dev` runs `prisma generate` before `migrate deploy` and `db seed`, making the first run self-contained. Acceptance check (performed 2026-11-07):

1. `git clone` the repository into an empty directory.
2. Confirm `apps/api/src/generated` is absent.
3. `npm ci`.
4. `npm run dev` → client generated, migrations applied, idempotent seed (7 patients / 9 encounters / 9 appointments / 2 studies / 2 documents), API `/health` green, SSR patient page returns `200`.

Do not treat a warm working directory (with a pre-generated client) as proof; the check must start from a fresh clone.

## Before declaring a task complete

Run the relevant commands that exist in the repository, normally:

1. formatter or formatting check;
2. linter;
3. TypeScript type check;
4. focused unit/integration tests;
5. production build;
6. end-to-end checks for completed vertical slices.

Do not claim a command passed unless it was executed successfully. Report skipped checks and why.
