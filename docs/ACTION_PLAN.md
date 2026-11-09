# Living Action Plan — Medical Platform MVP

**Document type:** Active execution state (living document)  
**Last updated:** 2026-11-08  
**Owner:** Project owner  
**Primary agent:** Hermes Agent  
**Current implementation state (updated 2026-11-08):** The merged documentation baseline is `f176de0` on `feat/studies-web` (PR #5). O-001–O-004 remain implemented; NX-001, NX-002, and NX-003 are implemented and verified on `feat/nx-expansion-complete`; NX-004 is active. Commits on this branch: `16a0f1f`, `147efd6`, `7aca5ca`, `1bd6390`, `870ecff`, `66869cc` (NX-004 UI/docs commit pending). PRs #1–#4 remain open in the stack `main` → `feat/api-foundation` → `feat/phase4-foundation` → `feat/studies-api` → `feat/studies-web`; PR #5 is merged.

---

## 1. Purpose and operating model

This is the active execution plan. Update it continuously as work progresses: current objective, ordered sub-objectives, actual progress, dependencies, blockers, verification evidence, branch/PR state, and the next action.

It is deliberately different from the other planning documents:

- `ACTION_PLAN.md` is the living execution state, updated throughout work.
- `TASKS.md` defines phase-level work packages, deliverables, dependencies, and acceptance criteria. Revise it at phase boundaries or after an approved material scope change, not after each task or commit.
- `ROADMAP.md` describes the strategic order and intended outcomes.
- `PROJECT_HISTORY.md` is a retrospective archive of significant milestones, findings, and lessons.
- `DECISIONS.md` is authoritative for current accepted decisions.

Do not duplicate the entire phase task catalog here. Reference task IDs where useful and keep the active sequence concise and actionable.

## 2. Current project state

### Overall status

**O-001–O-004 complete: the local MVP is built and verified.** The monorepo contains a verified data layer (Prisma 7 + SQLite, committed migrations, idempotent seed), a Hono API with validation, DTOs, and consistent errors (36/36 tests recorded at the original O-001 exit, before later expansion tests), the full product UI per `UI_SPEC.md` (registry, patient overview + medical background, consultation creation, consultation detail + timeline, demographics edit), a one-command local runtime (`npm run dev`, first-run verified: fresh DB → migrate → seed → populated registry with demo banner), and persistence verified across restarts (edits and user-created records survive; seed stays idempotent). All checks green: typecheck, ESLint (flat config), tests (API + web), production build.

### Confirmed direction

- One npm-workspaces monorepo with `apps/web` and `apps/api`; the narrow `packages/contracts` workspace is confirmed and in use for shared DTOs/schemas.
- `apps/api`: Hono + TypeScript on local Node.js; authoritative API, validation, domain behavior, and database access.
- Persistence: local SQLite through Prisma ORM 7.
- `apps/web`: Next.js App Router + TypeScript using request-time SSR / Server Components for clinical reads from Hono.
- No Cloudflare connection, Wrangler runtime, Docker, or CI/CD in the prototype.
- File storage and Google authentication remain pending and excluded.
- Synthetic data only; normal startup must preserve local edits and user-created records.
- Remote pushes and PRs are allowed when useful. Only an exceptionally solid foundational/base PR may be merged autonomously; feature PRs normally remain open unless the owner explicitly authorizes their merge.

See `DECISIONS.md` and `ARCHITECTURE.md` for details.

### Current progress snapshot

| Area | Current state | Evidence / note |
|---|---|---|
| Product definition | Prepared | `PRODUCT.md`, `WORKFLOWS.md` |
| Architecture | Implemented per `ARCHITECTURE.md` | Monorepo, Hono API, Prisma 7 + SQLite, SSR shell |
| Data model | Implemented and migrated | `prisma/schema.prisma`, committed migration |
| API surface | Patient/encounter/appointment/study/document routes present | Full API suite passes 107/107; document create/list/get/update and association validation are covered |
| Synthetic fixture | Patient, encounter, appointment, study, prescription and report fixtures present | 7 patients, 9 encounters, 9 appointments, 2 studies, 2 documents (one linked prescription with 2 lines, one unlinked report) |
| Database and API code | Core and NX-001…NX-004 implemented | Prisma domain modules, migrations, validation, shared DTOs, integration coverage, and seed idempotency pass |
| UX/UI specification | Complete (O-002) | `docs/UI_SPEC.md` — screens, interactions, states, visual system, story coverage, decisions U-01–U-08 |
| Frontend product workflows | Complete (O-003/O-004) | Full product UI per `UI_SPEC.md` (registry, forms, timeline, detail, edit); first-run demo verified with persistence across restarts |
| Expansion (NX-001…NX-004) | Complete on `feat/nx-expansion-complete`; final UI/docs commit pending | All four vertical slices browser-verified; complete automated quality gate is green |

## 3. Active objective

### NX-Expansion — product expansion (NX-001…NX-004) — ACTIVE

**Desired outcome:** All four approved vertical slices work together: (1) patient appointments + basic calendar, (2) encounter types, (3) study requests + follow-up, and (4) printable prescriptions and medical reports. No new runtime dependencies, no speculative foundations, no full-EHR scope (D-023). A dedicated surgical/procedure lifecycle is excluded unless separately approved; this mission does not add one.

**Status:** Active on `feat/nx-expansion-complete`, based on merged documentation commit `f176de0`. NX-001 commits: `16a0f1f`, `147efd6`. NX-002 commit: `7aca5ca`. NX-003 commit: `1bd6390`. NX-004 API foundation is committed as `870ecff`; fixtures/seed are committed as `66869cc`; UI/browser work is verified and awaiting its focused commit.

**Reconstructed task board (2026-11-08):**

| Requirement group | Classification | Current evidence / remaining work |
|---|---|---|
| O-001–O-004 patient and encounter workflows | Implemented; prior verification recorded | Preserve these flows and rerun regression checks with the expansion integrated. |
| NX-001 appointment schema/API/forms/seed | Implemented and browser-verified | Created, edited, cancelled, reprogrammed, completed with 35-minute actual duration, linked to a same-patient consultation, and visible in patient history. API regression now maps duplicate consultation links to a 409 conflict and preserves the appointment on failed completion. |
| NX-001 calendar layout and date handling | Implemented and browser-verified | Day grid is 48 px/hour with 16 rows; out-of-window starts appear below; week view shows three chips plus overflow; invalid `fecha` returns route-level 404; month grid links to the appointment. |
| NX-002 encounter type persistence/edit/detail | Implemented and browser-verified | Created a `procedimiento` encounter, edited it through `urgencia` to `visita_domicilio`, and confirmed the saved type in detail and the patient timeline. The edit now exits edit mode after saving. |
| NX-002 timeline default badge | Implemented and browser-verified | Timeline shows non-default types and omits `Consulta`; detail retains its type badge. The new-form `beforeunload` guard now treats a changed type as dirty. |
| NX-002 surgical/procedure lifecycle | Explicitly deferred | Do not add a dedicated lifecycle without separate approval (D-025/Q-NX-01 and this mission). |
| NX-003 schema/migration/contracts/encounter-form/detail/fixtures | Implemented; focused API and browser flows verified | Exact fixtures and migrations remain unchanged. Existing nested encounter creation, detail transitions, and seed behavior are preserved; full regression suite remains. |
| NX-003 pending overview status | Reconciled and browser-verified | D-032 follows the explicit `TASKS.md` acceptance: ordered and completed remain pending until reviewed. The server filters both statuses and the card shows each status badge; reviewed studies leave the card. |
| NX-003 endpoint coverage | Implemented; focused API tests pass | Added shared contracts, `POST /api/encounters/:id/studies` (atomic, derives patient association), and repeatable `?status=` filtering; tests cover validation, association, status filters, and missing records. |
| NX-004 documents | Implemented and browser-verified | Models, routes, forms, overview, edit/detail, print, synthetic fixtures, and seed preservation are complete. Browser checks exercised create/edit/reload, line add/remove, validation recovery, 404 copy, and print output. |
| Integrated first run and existing MVP regression | Verified | Clean temporary database migrated and seeded 7 patients, 9 encounters, 9 appointments, 2 studies, and 2 documents; repeat startup created zero records, preserved edits, health passed, and `/` redirected to `/patients`. Full automated checks and all O-005 browser flows pass. |

**Decision reconciliation:** D-032 records the explicit `TASKS.md` acceptance over the narrower UI-spec wording: `ordered` and `completed` remain in “Estudios pendientes” until reviewed, and the card shows the current status. The separate study-create route and patient status filter are listed in UI_SPEC §7.0; the API derives the patient from the immutable encounter association and keeps nested encounter creation atomic. The open study-category confirmation remains recorded as Q-NX-02 and does not block the approved fixed list. D-025/Q-NX-01 remains deferred.

**Ordered execution stack:** (1) NX-003 acceptance and docs; (2) NX-004 database/API, fixtures and seed; (3) document overview, forms, edit/detail and print; (4) integrated clean-start, restart, regression and quality gate. All implementation and verification steps are complete; the final focused UI/docs commit and history entry remain.

**NX-004 execution status:** (1) schema/migration/contracts/API/tests complete in `870ecff`; (2) synthetic prescription/report fixtures and idempotent edit-preserving seed complete in `66869cc`; (3) overview, prescription/report forms, detail/edit, print styling, and typed client complete; (4) browser create/edit/reload/validation/404/print checks and clean-start/restart/regression gates complete. No new runtime dependencies, uploads, PDF library, clinical generation, or legal/signature claims were introduced.

**Implementation queue (original plan; see slice status above for actual progress)** — each slice delivers UI + API + schema/migration + tests + docs in the same change, per D-017:

1. **NX-001** — `Appointment` model + endpoints; `/calendar` (day/week/month, CSS grid); patient appointment list/detail (edit, complete with actual duration + optional encounter link, cancel, reschedule); overview `Citas` card; demo appointments (fixed past + first-seed-anchored upcoming, D-029); `DEMO_DATA.md` update.
2. **NX-002** — `Encounter.type` field + migration (existing records → `consulta`); form/detail/timeline integration (U-12); surgical follow-through per conservative default D-031 (type field only; no surgery lifecycle — Q-NX-01 remains open for doctor validation).
3. **NX-003** — `StudyRequest` model + endpoints; studies section in the consultation form (repeatable rows); encounter-detail studies section with the ordered→completed→reviewed status flow; overview `Estudios pendientes` card; demo studies.
4. **NX-004** — `MedicalDocument` + `PrescriptionLine`; new prescription/report forms; detail + print (WYSIWYG paper card, `@media print`, printed demo marker); overview `Recetas e informes` card; demo documents.

**Dependency:** O-001–O-004 foundation (complete). **Exit condition per slice:** mission acceptance criteria met; docs reconciled in the same change; demo flow verified end-to-end. Expansion phase is defined in `TASKS.md` §6 (2026-11-08).

**Verification completed (2026-11-08):** Full API suite 107/107 and web suite 32/32 pass; workspace typecheck passes; lint exits 0 with the existing missing-`pages` warning; Next.js production build passes and lists all four dynamic document routes. Four migrations apply cleanly to empty SQLite test databases. Clean `npm run dev` on a temporary DB seeded 7 patients, 9 encounters, 9 appointments, 2 studies, and 2 documents; repeat startup created 0 and preserved an edited report. Browser verified prescription/report create, edit, reload, patient/optional same-patient encounter association, repeatable line add/remove, validation recovery, overview links, kind-specific 404, and print PDFs. Extracted PDFs contain the demo marker and authored content while omitting navigation, banner, controls, and screen-only copy. NX-001…NX-003 browser evidence remains recorded above and was preserved by the full regression suite. Commits: `16a0f1f`, `147efd6`, `7aca5ca`, `1bd6390`, `870ecff`, `66869cc`; focused UI/docs commit pending.

### O-001 — Establish a solid database and API foundation

**Desired outcome:** A reliable, tested local data model and Hono API for the core patient and encounter workflows, backed by Prisma 7 and SQLite, with deterministic synthetic data and a reproducible local startup. The frontend may be scaffolded as a minimal shell for runtime verification, but no product UX/UI work should begin yet.

**Status:** Complete (2026-11-07). All sub-objectives A-001 through A-008 are done and verified.  
**Exit evidence:**

- 36/36 API integration tests pass (`npm run test -w apps/api`) against an isolated migrated SQLite database: CRUD, search, archive, associations, timeline ordering, validation field errors, seed idempotency/edit preservation/fixture counts, and transaction rollback.
- `npm run typecheck` is clean across all workspaces; `npm run build -w apps/web` (Next.js production build) succeeds.
- `npm run dev` verified end-to-end: prepares `.local/data`, applies migrations, seeds idempotently (7 patients / 9 encounters), starts API (`/health` ok) and Next.js; the `/patients` smoke page reports "API conectada" and the 7 seeded records.
- Local data persists across restarts in `.local/data/medical.db`; seed re-runs create nothing.
- Only the minimal shell exists; no product UI has been implemented.

**Branch / PR state:** Work committed on `main` in small logical increments; no remote push or PR created (no remote configured yet — see O-002 handoff for when to push).

#### Sequential sub-objective stack

| Order | ID | Sub-objective | Deliverable | Depends on | Acceptance / verification | Status |
|---:|---|---|---|---|---|---|
| 1 | A-001 | Inspect environment and repository | Environment report and safe Git baseline | None | Node/npm and repository/Git state inspected; existing owner changes preserved; no destructive commands | Complete — Git baseline on `main` |
| 2 | A-002 | Establish workspace and runtime skeleton | npm workspaces with `apps/api` and `apps/web`, plus `packages/contracts` if confirmed; organized source layout and minimal Next.js/Hono startup | A-001 | Both apps install and start independently; no product screens or UX assumptions added | Complete — workspaces + contracts confirmed |
| 3 | A-003 | Finalize and implement the initial relational model | Prisma 7 schema for Patient, medical background, and Encounter; reviewed SQLite migrations | A-002 | Relationships, nullability, indexes, date semantics, and archive behavior are verified against `DATA_MODEL.md` | Complete — initial migration committed |
| 4 | A-004 | Establish database operations and seed | Prisma client boundary, migration scripts, deterministic idempotent seed | A-003 | Clean DB migrates and seeds; repeat seed neither duplicates nor overwrites edits; local transaction rollback is tested | Complete — seed idempotency + rollback tested |
| 5 | A-005 | Build the Hono API foundation | Health route, patient/encounter query and command endpoints, server validation, consistent errors, explicit DTOs | A-003, A-004 | API supports core data workflows; no Prisma access outside API; invalid relationships are rejected | Complete — `GET /health` + patient/encounter domains |
| 6 | A-006 | Verify API and data contracts | API integration/contract tests and documented request/response behavior | A-005 | CRUD/search/archive and encounter association behaviors pass; contract and tests agree; no UI dependency | Complete — 36/36 tests |
| 7 | A-007 | Establish one-command local runtime | Root `npm run dev` migrates/seeds, starts API and minimal web shell, shuts down cleanly | A-002–A-006 | Local services run on loopback; API health and minimal SSR-to-Hono connectivity work; no remote service needed | Complete — smoke-tested end-to-end |
| 8 | A-008 | Review and close data/API foundation | Verified evidence and optional PR/PR stack | A-001–A-007 | Foundation exit criteria pass; docs, migrations, tests, commit history, and PR state match reality | Complete — docs reconciled (this update) |

**O-001 exit criteria:**

- Prisma 7 and SQLite work locally with committed, reproducible migrations.
- Patient, medical-background, and encounter relationships are represented correctly.
- Hono is the sole authoritative API and the only database access boundary.
- API request validation, response DTOs, error behavior, and relationship checks are explicit and tested.
- Synthetic fixture data can be loaded idempotently and is available through the API.
- Local SQLite transaction behavior is tested for representative multi-write operations.
- `npm run dev` starts the local services without manual database setup or remote dependencies.
- Only a minimal frontend shell/connectivity check exists; product UI implementation has not begun.

## 4. Queued objectives

### O-002 — UX and UI design

**Status:** Complete (2026-11-07). Deliverable: `docs/UI_SPEC.md`.  
**Exit evidence:** Spec covers all T-007–T-011 work: API capability reconciliation (no API/data gaps required; two client-level decisions recorded), information architecture and screen map (7 routes + 404), full screen specs for registry, create/edit patient, background edit, overview, consultation form, encounter detail/edit, archive flow, and not-found; state matrix and visual system (tokens, components, responsive, accessibility); all 14 P0 stories mapped to observable behavior (US-001…US-014); decisions U-01–U-08 recorded (§6.2). Owner can review screen structure, interactions, and visual direction before UI implementation.

**Outcome:** A validated, implementation-ready UX/UI specification based on the working data model and API contracts, before building product screens.

Planned sub-objectives:
1. Revisit the documented user workflows and map them to the actual API/data capabilities.
2. Define information architecture, navigation, screen inventory, and patient-context hierarchy.
3. Design key screens and interactions: patient registry/search, patient overview, medical background, consultation form, encounter detail, and timeline.
4. Specify loading, empty, error, validation, save, archive, and demo states.
5. Define a small visual system and reusable interaction patterns.
6. Produce `docs/UI_SPEC.md` (and design artifacts if useful) with enough detail to implement consistently.

**Dependency:** O-001 data/API foundation.  
**Exit condition:** The owner can review the screen structure, core interactions, and visual direction before feature UI implementation begins.

### O-003 — Product implementation in complete vertical slices — **COMPLETE (2026-11-07)**

**Outcome:** The doctor can use the patient and encounter workflows through the designed Next.js interface, backed by Hono and SQLite.

Planned implementation slices:
1. Application shell and navigation.
2. Patient registry, search, create, and edit.
3. Patient overview and medical background.
4. Encounter creation and consultation documentation.
5. Encounter detail and chronological patient timeline.
6. Integration, recovery states, and end-to-end workflow verification.

**Dependency:** O-002 UX/UI specification.  
**Important:** O-001 does not freeze the database schema or API. During O-003, change Prisma models, migrations, Hono endpoints, validation, and contracts whenever real implementation or UX requirements justify it. Every such change must be deliberate, tested, migrated safely, and reflected in the relevant docs. Prefer vertical slices that include the UI, API, persistence, and tests needed for a complete user outcome.

### O-004 — First-run demo and local reliability — **COMPLETE (2026-11-07)**

**Outcome:** The app opens to a populated patient registry with a clear Spanish demo warning and preserves changes across restarts.

Planned sub-objectives:
1. Ensure the exact checked-in fixture is seeded on first startup.
2. Redirect `/` to `/patients` and display `MODO DEMOSTRACIÓN — DATOS FICTICIOS` (canonical copy: `UI_SPEC.md`).
3. Verify all 7 synthetic patients (6 active, 1 archived) and 9 encounters appear in the correct contexts.
4. Verify idempotent startup, persistence, and preservation of edits/user-created records.
5. Run the final end-to-end and offline-runtime checks.

**Dependencies:** O-001 seed/API foundation and O-003 product UI.

## 5. Current blockers and technical questions

No owner input is currently blocking. Pending-study semantics are reconciled to `TASKS.md` acceptance (`ordered` and `completed` until `reviewed`), and the study create/filter routes are accepted from UI_SPEC §7.0. A fresh empty SQLite path initially caused Prisma 7 to emit an empty “Schema engine error”; append-opening the database file before migration fixes startup while preserving an existing database. This is covered by the clean-start/API test setup and was verified on the fresh local run. Remaining work is the ordered implementation and end-to-end acceptance in the active objective.

Resolved during O-001 (implementation findings now recorded in `DECISIONS.md`):

- Prisma 7 works locally with `@prisma/adapter-better-sqlite3` (export is `PrismaBetterSqlite3`), committed migrations, and transaction rollback (D-019).
- Prisma 7 forbids `url` in the schema datasource and its config loader cannot import modules; `prisma.config.ts` is self-contained and assumes the repo root as cwd.
- Validation uses the shared `packages/contracts` zod schemas in one place (no duplicated schemas); zod 4 reports strict-mode extras as one empty-path issue with a `keys` array, fanned out per field in `parseOrThrow`.
- The dev orchestrator (`scripts/dev.mjs`) starts API then frontend, waits on `/health`, and tears both down on either failure; Ctrl+C stops both cleanly.

Do not allow future Cloudflare/D1 transaction constraints, Google authentication, or file storage to block local work. No current blocker remains; NX-001…NX-004 implementation and verification are complete, with the focused NX-004 UI/docs commit pending.

## 6. Next action

1. Commit the verified NX-004 UI, print, and documentation slice on `feat/nx-expansion-complete`.
2. Record the commit hash, append the O-005 completion milestone to `PROJECT_HISTORY.md`, and close the execution objective in this plan.
3. Leave feature work unmerged; no new remote PR is needed for this focused branch unless it improves review.

## 7. Living update rules

Update this file as work progresses, not only at phase boundaries. Record meaningful status changes, actual evidence, blockers, branch/commit/PR state, and the next action. Do not record every command or trivial edit.

At the end of a substantial session, leave a handoff with current objective, active sub-objective, work completed, verification performed, blockers, PR stack state, and next action. Keep `TASKS.md` phase-level and update it only at a phase boundary or material scope change. Append to `PROJECT_HISTORY.md` only for significant milestones or durable findings.
