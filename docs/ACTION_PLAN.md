# Living Action Plan — Medical Platform MVP

**Document type:** Active execution state (living document)  
**Last updated:** 2026-11-07  
**Owner:** Project owner  
**Primary agent:** Hermes Agent  
**Current implementation state:** O-001 through O-004 are complete. The MVP is implemented end-to-end per `docs/UI_SPEC.md` and verified: 40/40 API integration tests + 16/16 web unit tests, clean typecheck/lint/build, browser-verified vertical slices, and a verified first-run demo with persistence across restarts. See `PROJECT_HISTORY.md` (2026-11-07 entries) for the closing evidence.

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

**O-001–O-004 complete: the local MVP is built and verified.** The monorepo contains a verified data layer (Prisma 7 + SQLite, committed migrations, idempotent seed), a Hono API with validation, DTOs, and consistent errors (40/40 integration tests), the full product UI per `UI_SPEC.md` (registry, patient overview + medical background, consultation creation, consultation detail + timeline, demographics edit), a one-command local runtime (`npm run dev`, first-run verified: fresh DB → migrate → seed → populated registry with demo banner), and persistence verified across restarts (edits and user-created records survive; seed stays idempotent). All checks green: typecheck, ESLint (flat config), tests (API + web), production build.

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
| API surface | Implemented and tested | 40/40 integration tests; contract in `API_CONTRACT.md` |
| Synthetic fixture | Seeded idempotently | 7 patients (6 active), 9 encounters via `prisma/seed.ts` |
| Database and API code | Complete | Prisma boundary, domains, validation, errors, DTOs |
| UX/UI specification | Complete (O-002) | `docs/UI_SPEC.md` — screens, interactions, states, visual system, story coverage, decisions U-01–U-08 |
| Frontend product workflows | Complete (O-003/O-004) | Full product UI per `UI_SPEC.md` (registry, forms, timeline, detail, edit); first-run demo verified with persistence across restarts |

## 3. Active objective

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

No blockers. O-002 closed with no API/data gaps; design-level decisions U-01–U-08 are recorded in `UI_SPEC.md` §6.2 (edit screens as pages, separate background page, one-way archive with explicit confirmation, success = navigation + re-render, non-blocking duplicate notice, system fonts/no icon library, `Editada` badge, `beforeunload`-only dirty protection). If O-003 implementation reveals a real API gap, revise the API per D-017 with tests and docs in the same change.

Resolved during O-001 (implementation findings now recorded in `DECISIONS.md`):

- Prisma 7 works locally with `@prisma/adapter-better-sqlite3` (export is `PrismaBetterSqlite3`), committed migrations, and transaction rollback (D-019).
- Prisma 7 forbids `url` in the schema datasource and its config loader cannot import modules; `prisma.config.ts` is self-contained and assumes the repo root as cwd.
- Validation uses the shared `packages/contracts` zod schemas in one place (no duplicated schemas); zod 4 reports strict-mode extras as one empty-path issue with a `keys` array, fanned out per field in `parseOrThrow`.
- The dev orchestrator (`scripts/dev.mjs`) starts API then frontend, waits on `/health`, and tears both down on either failure; Ctrl+C stops both cleanly.

Do not allow future Cloudflare/D1 transaction constraints, Google authentication, or file storage to block local work.

## 6. Next action

Post-MVP (owner decides priority): candidate work in order of value — automated frontend tests (the O-003/O-004 verification was manual browser + API-level), destructive-reset UX hardening (interactive confirmation path exists in `scripts/db-reset.mjs` but the UI never triggers it), duplicate-name detection endpoint (currently a client-level notice only, per UI_SPEC §6.2), and any owner-requested refinements to the clinical screens. No objective is active until the owner names one.

## 7. Living update rules

Update this file as work progresses, not only at phase boundaries. Record meaningful status changes, actual evidence, blockers, branch/commit/PR state, and the next action. Do not record every command or trivial edit.

At the end of a substantial session, leave a handoff with current objective, active sub-objective, work completed, verification performed, blockers, PR stack state, and next action. Keep `TASKS.md` phase-level and update it only at a phase boundary or material scope change. Append to `PROJECT_HISTORY.md` only for significant milestones or durable findings.
