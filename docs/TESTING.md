# Testing and Verification

## Current verification setup

Latest verification on `feat/nx-expansion-complete` (2026-11-08): API 96/96, web 32/32, workspace typecheck, ESLint, and Next.js production build pass. ESLint emits the existing App Router warning that no `pages/` directory exists. A temporary SQLite database completed migration and explicit seed (7 patients, 9 encounters, 9 appointments, 2 studies); repeat startup created no duplicates.

| Command | Scope |
|---|---|
| `npm run test -w apps/api` | 96 integration tests, including patients, encounters, appointments, study creation/filtering/status transitions, seed idempotency and transaction behavior. Vitest applies the real committed migrations to isolated SQLite databases under `.local/test/`. |
| `npm run test -w apps/web` | 32 presentation-layer tests (vitest, node): es-MX date formatting, age, `wasEdited`, default encounter-type badge visibility, calendar date math, appointment overlap handling, and calendar layout helpers. No app boot or database needed. |
| `npm run typecheck` | `tsc --noEmit` across all workspaces (contracts, api, web). |
| `npm run lint` | ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next` 16 (flat-native): exit 0; emits a warning because the App Router repo has no `pages/` directory. Generated artifacts and `.local/` are ignored. |
| `npm run build -w apps/web` | Next.js 16 production build. |
| `npm run dev` | One-command runtime; verified end-to-end (migrate → seed → API `/health` → SSR smoke page showing "API conectada" with 7 seeded records). |

Verified API coverage (96 passing tests):

- Health response.
- Patient create/list/search (case-insensitive name and identifier)/read/update demographics/update medical background/archive (non-destructive, idempotent); default list excludes archived; `?q=` empty means no filter.
- Encounter create (for existing patient)/read/update; patient association cannot be reassigned via update; unknown patient/encounter IDs return `404`.
- Encounter type (D-024): omitted type defaults to `consulta`; explicit type persists and is exposed in the timeline; invalid type rejected with a field error; type can be changed via `PATCH`.
- Appointments (NX-001): create/list (range filter)/get/update-reschedule/complete (actual duration + optional same-patient encounter link)/cancel; one-directional status transitions enforced; overlap detection in list responses; unknown patient/appointment IDs return `404`; duration 5–480 min validation.
- Study requests (NX-003): nested atomic creation during encounter creation; atomic creation on an existing encounter with patient association derived by the API; list by patient/encounter and repeated `status` filters; invalid/empty inputs and unknown IDs; `ordered → completed/reviewed` and `completed → reviewed`, result-note limits, repeated/backward transition conflicts, and persistence.
- Timeline ordering by `occurredAt` descending with deterministic tie-break.
- Validation: missing required fields, unknown fields (per-field `fieldErrors`), bad date formats; `400` with the contract envelope.
- Seed: exact fixture IDs/counts (7 patients, 6 active, 1 archived; 9 encounters; 9 appointments — 4 fixed past, 5 first-seed-anchored upcoming), idempotency (second run creates 0), preserved edits and user-created records, `demo-patient-003` has no encounters, and atomicity — a mid-run foreign-key violation rolls back the entire seed (no partial records), proven against the pre-fix code.
- Upcoming-appointment anchor: seeded future appointments sit at their expected `America/Monterrey` wall times and do not move on re-seed.
- Transactions: representative multi-write operation rolls back atomically through the local adapter.
- `demo-patient-004` remains archived across seed runs.

Browser verification covered the O-003 patient workflows and all three O-005 slices implemented so far: calendar and appointment create/edit/cancel/reprogram/complete/link; encounter type creation/edit/detail/timeline; study creation in the consultation form, ordered/completed/reviewed transitions, failure recovery, and pending-card visibility until review. Automated frontend coverage is limited to presentation/helper unit tests; broad component automation and the destructive-reset confirmation path remain post-MVP gaps.

## NX-003 verified behavior

The 24 cases in `apps/api/test/studies.test.ts` cover nested and standalone study creation, patient association, input validation, patient/encounter listing, repeatable status filters, missing IDs, forward transitions, rejected repeated/backward transitions, result-note limits, and persistence. The browser verified a new study entered with a consultation, a failed overlong note save preserving the panel and existing state, `ordered → completed → reviewed`, display of completed studies in the overview, and removal after review. The exact two studies in `docs/demo-dataset.json` are unchanged.

The API and web suites, typecheck, lint, and production build pass after NX-003 changes. The clean-start migration/seed and repeat-start idempotency checks were also run. NX-004 remains unimplemented and is the next product slice.

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
4. `npm run dev` → client generated, migrations applied, idempotent seed (7 patients / 9 encounters / 9 appointments / 2 studies), API `/health` green, SSR patient page returns `200`.

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
