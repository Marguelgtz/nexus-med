# Testing and Verification

## Current verification setup

Commands that exist and were executed during the foundation (O-001) and final quality pass (O-004):

| Command | Scope |
|---|---|
| `npm run test -w apps/api` | 37 integration tests (vitest) against an isolated SQLite database: `test/global-setup.ts` applies the real committed migrations to `.local/test/` before each run. |
| `npm run test -w apps/web` | 16 presentation-layer unit tests (vitest, node): es-MX date formatting in the central practice timezone (`America/Monterrey`), completed-year age (birthday edge, future DOB), and `wasEdited` semantics. No app boot or database needed. |
| `npm run typecheck` | `tsc --noEmit` across all workspaces (contracts, api, web). |
| `npm run lint` | ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next` 16 (flat-native): covers all workspaces; generated artifacts (`prisma/`, `.next/`, `dist/`) and local data (`.local/`) ignored. Two documented relaxations: `no-explicit-any` off in `apps/api/test/**` (tests read raw HTTP bodies; the wire contract is enforced by the API's zod schemas and the typed client) and `no-html-link-for-pages` off (App Router project, no `pages/`). |
| `npm run build -w apps/web` | Next.js 16 production build. |
| `npm run dev` | One-command runtime; verified end-to-end (migrate → seed → API `/health` → SSR smoke page showing "API conectada" with 7 seeded records). |

Test coverage at foundation close (all passing, 2026-11-07):

- Health response.
- Patient create/list/search (case-insensitive name and identifier)/read/update demographics/update medical background/archive (non-destructive, idempotent); default list excludes archived; `?q=` empty means no filter.
- Encounter create (for existing patient)/read/update; patient association cannot be reassigned via update; unknown patient/encounter IDs return `404`.
- Timeline ordering by `occurredAt` descending with deterministic tie-break.
- Validation: missing required fields, unknown fields (per-field `fieldErrors`), bad date formats; `400` with the contract envelope.
- Seed: exact fixture IDs/counts (7 patients, 6 active, 1 archived; 9 encounters), idempotency (second run creates 0), preserved edits and user-created records, `demo-patient-003` has no encounters, and atomicity — a mid-run foreign-key violation rolls back the entire seed (no partial records), proven against the pre-fix code.
- Transactions: representative multi-write operation rolls back atomically through the local adapter.
- `demo-patient-004` remains archived across seed runs.

Frontend verification at MVP close: the O-003 vertical slices were verified end-to-end in a real browser (registry SSR + search/tabs/clear + URL sync; patient overview; create/edit demographics and background; new consultation; consultation detail with in-place edit). Presentation-layer behavior now also has a unit-test floor (`npm run test -w apps/web`, 16 tests). Automated frontend tests and the destructive-reset confirmation path remain tracked gaps for post-MVP work.

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
- On a clean database, verify all 7 patient fixture IDs and all 9 encounter fixture IDs from `docs/demo-dataset.json` are present; exactly 6 seeded patients are active and 1 is archived.
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
4. `npm run dev` → client generated, migrations applied, idempotent seed (7 patients / 9 encounters), API `/health` green, SSR patient page returns `200`.

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
