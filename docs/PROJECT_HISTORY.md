# Project History — Medical Platform MVP

**Document type:** Chronological project archive  
**Maintenance style:** Append-only, milestone-oriented  
**Last updated:** 2026-11-06

## 1. Purpose

This document preserves the significant history of the project: how its product scope and architecture evolved, what was learned, why important directions were chosen or rejected, and which implementation milestones were completed.

It is not a task tracker, decision register, or conversation transcript.

- `ACTION_PLAN.md` says what is happening now and what happens next.
- `TASKS.md` defines phase-level planned work and acceptance criteria.
- `ROADMAP.md` describes the broad development sequence.
- `DECISIONS.md` contains current accepted decisions and open questions.
- `PROJECT_HISTORY.md` explains how the project arrived at its current state and preserves significant findings over time.

## 2. Archive conventions

Add an entry when one of these occurs:

- A meaningful product or architecture milestone is completed.
- A consequential technical finding changes the recommended approach.
- An assumption is disproven or a previously considered direction is rejected for a specific reason.
- A major blocker is resolved and the lesson may matter later.
- A phase is completed or project scope materially changes.

Do not add an entry for every commit, small bug fix, routine task update, or agent session.

Each entry should be concise and include, where useful:

- **Date** — when the event or finding occurred.
- **Type** — milestone, decision context, technical finding, scope change, lesson, or rejected approach.
- **Context** — what prompted it.
- **Finding / outcome** — what was established.
- **Impact** — what changed in the product, architecture, or plan.
- **References** — related decision IDs, documents, commits, or local PR drafts.

Clearly distinguish verified facts from assumptions or proposals. Link to `DECISIONS.md` for current decisions rather than treating this archive as the authoritative source for current state.

Entries are append-only. If a historical entry contains an error, add a dated correction rather than silently rewriting the historical record. Small formatting and link corrections are allowed.

## 3. Timeline

### 2026-11-04 to 2026-11-05 — MVP product scope narrowed

**Type:** Product definition / scope clarification

**Context:** Initial design discussions for a medical records and practice-management prototype.

**Findings and outcomes:**

- The first validation target is one general surgeon, working independently without an assistant or other staff users in the prototype.
- The central product workflow is patient registration, a patient-centered clinical record, consultation documentation, and chronological clinical continuity.
- The product should be deliberately barebones while still completing the core patient-to-consultation workflow.
- Synthetic data must be used during development.
- Payments, billing, scheduling, prescription workflows, AI clinical capabilities, and broad hospital-management functionality are outside the current prototype scope.
- Regulatory adaptability matters as a future design consideration, but formal compliance implementation is not the prototype's objective.

**Impact:** `PRODUCT.md` and `WORKFLOWS.md` define a narrow single-doctor MVP rather than a general hospital information system.

**References:** `PRODUCT.md`, `WORKFLOWS.md`, `ROADMAP.md`.

### 2026-11-05 to 2026-11-06 — Architecture direction evolved to separate applications

**Type:** Architecture evolution / technical finding

**Context:** The initial architecture considered a full-stack Next.js application and Cloudflare-native local emulation. The project owner preferred a clearer frontend/API boundary and no Cloudflare dependency during prototyping.

**Findings and outcomes:**

- The prototype uses two separately runnable applications in one npm-workspaces monorepo: `apps/web` and `apps/api`.
- The frontend is Next.js App Router with request-time SSR / Server Components for initial patient and encounter reads.
- The API is Hono + TypeScript on a local Node.js server.
- Hono is the single authoritative API and owns validation, domain/application behavior, and database access.
- The frontend calls Hono over HTTP and never imports Prisma or opens SQLite directly.
- Prisma ORM 7 with local SQLite was selected.
- Cloudflare Workers and D1 remain future deployment candidates; no Cloudflare connection or Wrangler runtime belongs in the prototype.

**Impact:** `ARCHITECTURE.md` specifies the separate SSR frontend and Hono API topology. The Cloudflare deployment adapter and D1 compatibility remain future validation work.

**References:** `DECISIONS.md`, `ARCHITECTURE.md`.

### 2026-11-06 — Local prototype scope and future capabilities separated

**Type:** Scope clarification

**Findings and outcomes:**

- Google authentication is pending and excluded from implementation of the local prototype.
- File storage and document uploads are pending and excluded from the current prototype.
- Docker and CI/CD are not required for the current local prototype.
- The local app must not require Cloudflare credentials, remote services, or a network connection at runtime after dependencies are installed.

**Impact:** Authentication, storage, Docker, CI/CD, and production deployment are explicitly deferred rather than partially scaffolded.

**References:** `PRODUCT.md`, `ARCHITECTURE.md`, `SECURITY.md`, `TASKS.md`.

### 2026-11-06 — Synthetic first-run dataset specified

**Type:** Product/implementation milestone

**Findings and outcomes:**

- The checked-in fixture defines seven fictional patients: six active and one archived.
- It defines nine fictional encounters, including multiple encounters for some patients and one patient with no encounters.
- Fixture identifiers and dates are deterministic.
- Seeding must create missing records only; normal startup must not reset the database, duplicate records, or overwrite edits and user-created data.
- The first application view should be a populated patient registry with a persistent Spanish demo warning.

**Impact:** The JSON fixture and `DEMO_DATA.md` define the exact first-run data contract. Hermes must implement the Prisma seed and startup orchestration; fixture availability alone does not mean the application is runnable.

**References:** `DEMO_DATA.md`, `demo-dataset.json`, `ACTION_PLAN.md`, `TASKS.md`.

### 2026-11-06 — Transaction behavior clarified for local SQLite and future D1

**Type:** Technical finding

**Context:** The project compared Prisma and Drizzle and considered whether future D1 transaction behavior should influence the local ORM choice.

**Finding:** Local SQLite supports normal transaction semantics through the selected local Prisma adapter, subject to implementation verification. Cloudflare D1 provides atomic batch operations, but this is not equivalent to the general interactive transaction behavior available with local SQLite; Prisma's D1 adapter has documented transaction limitations.

**Impact:** Keep Prisma for the local prototype. Treat D1 as a future database candidate that requires explicit validation of every critical multi-write workflow. Do not change the local ORM solely to anticipate D1 constraints.

**References:** `DECISIONS.md` transaction note, `ARCHITECTURE.md`, official Prisma and Cloudflare D1 documentation.

### 2026-11-06 — Local-only Git and PR preparation rules established

**Type:** Engineering workflow decision context

**Findings and outcomes:**

- Work should be committed in professional, small, logical Conventional Commits.
- Larger objectives should be split into dependent local feature branches and stackable PR drafts when that improves reviewability.
- Preserve the base/head relationship, dependencies, suggested publication order, verification evidence, and PR descriptions locally.
- At the time, the workflow was local-only: no remote pushes, PR creation, or merges.

**Status:** Superseded by the 2026-11-06 entry "Development sequence and PR authority refined" below. The current policy is defined by `AGENTS.md` and `DECISIONS.md` D-012.

**References:** `AGENTS.md`.

### 2026-11-06 — Planning documents separated by purpose

**Type:** Project operating model

**Context:** The project owner clarified that the living action plan and phase task plan serve different purposes.

**Findings and outcomes:**

- `ACTION_PLAN.md` is the living execution state. It changes throughout work to show the active objective, sequential sub-objectives, actual progress, blockers, verification, branch/PR stack, and next action.
- `TASKS.md` is a more stable phase-level work definition. It defines work packages, deliverables, dependencies, and acceptance criteria and is normally updated only at phase boundaries or after an approved scope change.
- `ROADMAP.md` remains the high-level phase sequence.
- `PROJECT_HISTORY.md` preserves meaningful events and insights retrospectively.
- `DECISIONS.md` remains authoritative for current accepted decisions.

**Impact:** The agent operating instructions and document map distinguish live execution from phase planning and retrospective archival. The active implementation plan must not turn `TASKS.md` into a continuously updated progress log.

**References:** `AGENTS.md`, `ACTION_PLAN.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`.

---

## 4. Next archive entry

Add the next entry when O-001 reaches a meaningful verified milestone, such as the local workspace/API/database foundation running successfully. Include commit hashes and local PR-stack references when available. Do not pre-record planned work as completed history.


### 2026-11-06 — Development sequence and PR authority refined

**Type:** Engineering workflow and execution-plan decision

**Context:** The project owner clarified that the data model and API should be established and tested before UX/UI design, followed by product UI implementation. They also clarified that backend work must remain revisable during implementation and updated the Git/PR permissions.

**Findings and outcomes:**

- The required order is database/API foundation → UX/UI design → product implementation → integrated demo/reliability.
- The initial database and API foundation is intended to be strong and tested, but it is not a permanent freeze. Implementation may justify Prisma migrations, Hono contract/validation changes, and corresponding tests/documentation.
- Product UI design should be captured in `docs/UI_SPEC.md` and reviewed before feature UI implementation.
- Work should remain DRY, domain-organized, and aligned with current supported ecosystem practices without speculative abstractions.
- Remote pushes and PR creation are allowed when useful. PRs and stacks are optional and may remain open/merge-ready. Only an exceptionally solid foundational/base PR may be merged autonomously after all relevant checks and acceptance criteria pass with no blockers; feature/UI/workflow PRs require explicit owner authorization to merge.

**Impact:** `ACTION_PLAN.md`, `TASKS.md`, `ROADMAP.md`, `AGENTS.md`, `BOOTSTRAP_PROMPT.md`, `ARCHITECTURE.md`, `API_CONTRACT.md`, `TESTING.md`, `README.md`, and `DECISIONS.md` now reflect the revised execution and Git policies.

**References:** `DECISIONS.md` D-012, D-016, D-017; `AGENTS.md`; `ACTION_PLAN.md`.


### 2026-11-06 — Repository layout clarified for structured growth

**Type:** Architecture refinement / maintainability insight

**Context:** The project owner emphasized that the repository tree itself should communicate the product and technical boundaries, remain readable, and support structured growth without premature abstraction.

**Finding / outcome:** The target layout separates the Next.js application, Hono API, a proposed shared transport-contracts package, Prisma schema/migrations/seed, local scripts, tests, and project documentation. Within each app, the frontend is organized by user-facing feature while the API is organized by backend domain. A narrow shared contracts workspace is proposed because both applications consume the same HTTP DTOs/schemas.

**Impact:** `ARCHITECTURE.md` Section 8 becomes the canonical repository map and defines naming, ownership, dependency direction, and growth rules. `AGENTS.md`, `README.md`, `API_CONTRACT.md`, and `ACTION_PLAN.md` reference the same layout. The shared contracts workspace remains an implementation proposal to validate during O-001.

**References:** `ARCHITECTURE.md` Section 8, `AGENTS.md`, `API_CONTRACT.md`, `DECISIONS.md` P-010.

### 2026-11-07 — O-001 database/API foundation complete and verified

**Type:** Milestone

**Context:** O-001 (A-001 through A-008) executed the documented foundation: npm-workspaces monorepo, Prisma 7 + SQLite data layer, Hono API with shared contracts, integration tests, minimal Next.js shell, and one-command local runtime.

**Findings and outcomes:**

- Prisma 7 specifics that shaped the code: `url` is forbidden in the schema datasource (it lives only in `prisma.config.ts`), the config loader cannot import TS modules (config is self-contained), the better-sqlite3 adapter export is `PrismaBetterSqlite3`, and `uuid()` defaults for String ids are client-side (no SQL migration change).
- zod 4 reports strict-mode extra keys as a single empty-path issue with a `keys` array; the shared `parseOrThrow` fans these out into per-field `fieldErrors`.
- Hono route handlers must `await` async services before `c.json(...)`; passing the promise through silently returns 200 with an empty body and an unhandled rejection.
- API responses are serialized to contract DTOs in the domain services (Prisma `Date` → ISO 8601 string), keeping Prisma types out of the transport boundary.
- Verified: 36/36 integration tests (CRUD, search, archive, associations, timeline ordering, validation, seed idempotency/edit preservation, transaction rollback), clean typecheck across workspaces, Next.js production build, and an end-to-end `npm run dev` smoke (API `/health` ok; `/patients` page reports "API conectada" with 7 seeded records).

**Impact:** The repository is now a runnable local application (minimal shell only — no product UI). `docs/UI_SPEC.md` (O-002) is the next deliverable. Work was committed on `main` in small logical increments per the owner's standing rule; no remote is configured, so no push/PR yet.

**References:** `DECISIONS.md` D-018–D-021; `ACTION_PLAN.md` (O-001 exit evidence); `TESTING.md`.
