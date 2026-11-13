# Project History — Medical Platform MVP

**Document type:** Chronological project archive  
**Maintenance style:** Append-only, milestone-oriented  
**Last updated:** 2026-11-13

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

### 2026-11-07 — O-002 UX/UI specification complete

**Type:** Milestone

**Context:** O-002 (T-007–T-011) produced the implementation-ready `docs/UI_SPEC.md` from the O-001 verified API and the documented workflows.

**Findings and outcomes:**

- Capability reconciliation found no API/data gaps: the 11 verified endpoints (patients CRUD/archive/background, encounters list/create/read/update, health) cover every P0 workflow. Two client-level decisions recorded: non-blocking duplicate notice (no API duplicate endpoint) and one-way archive (no unarchive endpoint exists — confirmation copy states this).
- Information architecture: 7 routes + 404 — `/patients`, `/patients/new`, `/patients/[id]`, `/patients/[id]/editar`, `/patients/[id]/antecedentes`, `/patients/[id]/consultas/nueva`, `/patients/[id]/consultas/[eid]`; URL-driven navigation (shareable, restart-safe); single `Pacientes` nav item; persistent patient context strip.
- Visual system: minimal clinical light theme, CSS custom-property tokens, system font stack (no web fonts — offline requirement), no icon library, flat cards, state matrix covering loading/empty/not-found/validation/API-error/success per screen.
- All 14 P0 stories (US-001…US-014) mapped to observable spec behavior; decisions U-01–U-08 recorded (spec §6.2), summarized as D-022.
- Interface language fixed at Spanish (Mexico) with canonical copy in the spec.

**Impact:** O-003 can start immediately on slice 1 (application shell + shared primitives) with no further design work. UI implementation must follow `UI_SPEC.md`; real API gaps discovered during implementation are revised per D-017 with tests/docs in the same change.

**References:** `docs/UI_SPEC.md`; `DECISIONS.md` D-022; `ACTION_PLAN.md` (O-002 exit evidence, next action).

### 2026-11-07 — O-003 product implementation complete in vertical slices

**Type:** Milestone

**Context:** O-003 implemented the full product UI on the verified O-001 API per `UI_SPEC.md`, built as complete vertical slices (UI + typed client calls + server components + behavior), committed in small logical increments per the owner's standing rule.

**Findings and outcomes:**

- Slices delivered: (1) application shell — top bar, demo banner, persistent patient context strip, CSS tokens, shared primitives (buttons, inputs, cards, badges, banners, skeletons, inline confirm, state matrix); (2) patient registry — SSR list, debounced search, active/archived tabs, shareable `?q=&status=` URLs, create and demographics edit; (3) patient overview — identity card, medical background page, chronological consultation timeline, archive with explicit confirmation (one-way, per UI_SPEC §6.2); (4) consultation creation — full 7-section form, local-timezone `occurredAt`, explicit save; (5) consultation detail — read view with in-place edit (explicit save, `Editada` badge), timeline entries link to detail.
- Implementation followed `UI_SPEC.md` with no API gaps: all 11 verified O-001 endpoints covered every workflow, so no Prisma/migration/contract changes were required (D-017 not triggered).
- Registry client behavior: fetches are triggered by user events (search keystroke, tab change, clear) with request-sequence guards against out-of-order responses; SSR provides the initial (possibly URL-parameterized) list, so there is no effect-driven fetch.
- Final quality pass (O-004 scope overlap): ESLint 9 flat config added (`eslint.config.mjs`, `eslint-config-next` 16 flat-native) with two documented relaxations (`no-explicit-any` off in API test files; `no-html-link-for-pages` off for the App Router); lint surfaced and fixed 29 real issues (unused props removed, an effect-driven fetch refactored to event-driven, anonymous config export); test helper typed against the contract.
- Verification: 36/36 integration tests, clean `tsc --noEmit` across workspaces, clean `eslint .`, clean Next.js 16 production build; all five slices exercised in a real browser (search/tabs/clear + URL sync, overview, create/edit flows, consultation detail edit + cancel).

**Impact:** The doctor can use every P0 workflow through the designed interface, backed by Hono and SQLite. O-004 (first-run demo and local reliability) became the only remaining objective.

**References:** `docs/UI_SPEC.md`; `ACTION_PLAN.md` (O-003 complete); `TESTING.md`.

### 2026-11-07 — O-004 first-run demo and local reliability verified

**Type:** Milestone

**Context:** O-004 required the app to open to a populated patient registry with a clear Spanish demo warning and to preserve changes across restarts.

**Findings and outcomes:**

- First run verified from a wiped state: deleting `.local/data/medical.db` and running `npm run dev` produced a fresh DB with committed migrations applied and the exact checked-in fixture seeded (7 patients: 6 active, 1 archived; 9 encounters; `demo-patient-003` encounter-free) with no manual steps.
- `/` redirects `307` to `/patients`; the SSR HTML renders `MODO DEMOSTRACIÓN — DATOS FICTICIOS` (canonical copy per `UI_SPEC.md` — the stale longer variant in `ACTION_PLAN.md` was corrected to point at the spec).
- Restart persistence verified: a user-created patient (`Paciente Persistencia Check`) survived a full dev-server restart; after restart the active list was exactly 6 seeded + 1 user record (no duplicates, seed idempotency intact).
- Offline runtime verified: no remote URLs in application source (only doc-comment links in generated Prisma code); the app runs entirely on 127.0.0.1 after dependency install.
- Final gate green after all changes: typecheck, `eslint .`, 36/36 tests, production build.

**Impact:** O-001–O-004 are complete; the local MVP is built, verified, and demo-ready from a clean checkout (`git clone` → `npm install` → `npm run dev`). No objective is active until the owner names the next post-MVP work (candidates recorded in `ACTION_PLAN.md` §6).

**References:** `ACTION_PLAN.md` (O-004 complete, next action); `TESTING.md`; `PROJECT_HISTORY.md` (O-003 entry above).

### 2026-11-08 — O-005 product expansion complete and verified

**Type:** Milestone

**Context:** The O-005 execution mission completed the four approved expansion slices on `feat/nx-expansion-complete`, starting from merged documentation baseline `f176de0` (PR #5). Work was committed in small, reviewable steps matching the repository's existing history.

**Findings and outcomes:**

- NX-001 appointments/calendar and NX-002 encounter types were reconciled against their acceptance criteria and browser-verified; NX-003 study requests were verified with `ordered` and `completed` remaining pending until review, per D-032.
- NX-004 added relational prescription/report records, shared validation contracts, Hono routes, idempotent synthetic fixtures, patient overview integration, create/edit/detail screens, and browser print with the fictional-data marker. No upload, PDF library, generated clinical content, provider identity, or legal-validity claim was added.
- Verification passed: API 107/107 and web 32/32 tests, workspace typecheck, lint (exit 0 with the existing missing-`pages` warning), and Next.js production build. Four migrations applied to clean temporary SQLite databases. A clean integrated startup seeded 7 patients, 9 encounters, 9 appointments, 2 studies, and 2 documents; a repeat startup created zero records and preserved edits. Browser checks covered all four slices, document validation/error recovery, association rules, persistence, and print output.
- O-005 commits on this branch: `16a0f1f`, `147efd6`, `7aca5ca`, `1bd6390`, `870ecff`, `66869cc`, `e2d6590`.
- PRs #1–#4 remain open in the existing stack; PR #5 remains merged. No new PR was opened, no remote push was made, and no feature work was merged.

**Follow-ups:** Q-NX-01 remains explicitly deferred under D-025. Q-NX-02 remains a doctor-validation follow-up for the provisional fixed study-category list; the current closed list satisfies the documented O-005 acceptance, and no additional categories were invented. Authentication, file storage, and deployment remain outside the local MVP scope.

**Impact:** O-005 is complete. The local MVP plus its four approved product expansions are implemented and integrated. No next implementation objective has been selected.

**References:** `ACTION_PLAN.md` (O-005 verification and branch state); `ROADMAP.md`; `TASKS.md` §6; `DECISIONS.md` D-023, D-025, D-027, D-032; `TESTING.md`.

### 2026-11-08 — O-006 clinical workflow and UX proposal ready for review

**Type:** Design milestone

**Context:** O-006 was authorized as a documentation-only design mission on `docs/o006-clinical-workflow-ux`, based on completed O-005 at `1309b51`. The redesign document remains a proposal; this work does not authorize application implementation.

**Findings and outcomes:**

- Source review verified the O-005 consultation form/context, appointment handoff, study creation/status, patient overview, and contextual document behavior. The audit separates observed code from usability hypotheses and notes that no fresh browser usability study or physician observation was performed.
- The redesign covers ten complete journeys and includes layout/navigation alternatives, patient and consultation workspace wireframes, appointment handoff, patient-level study ordering/review, contextual documents/follow-up, responsive/accessibility behavior, save/interruption states, conditional API/migration implications, and future implementation slices.
- Study association and status semantics remain unresolved. The proposal evaluates patient + optional encounter, does not assume appointment/procedure links, and does not map existing `completed` records to performed or result-received events. Q-O006-01…08 were added as open questions; P-UX-01…05 and all other recommendations remain unconfirmed.
- No application/API/contract/schema/migration/seed code changed. Documentation checks passed (`git diff --check`; fenced Markdown blocks balanced); application tests and fresh browser usability checks were not run for this documentation-only mission.
- Review PR #6 is open: [`docs(ux): propose O-006 clinical workflow redesign`](https://github.com/Marguelgtz/nexus-med/pull/6), base `feat/nx-expansion-complete`, head `docs/o006-clinical-workflow-ux`. It is not merged.

**Impact:** The owner and physician have a concrete proposal to approve, revise, or reject before any implementation. O-005 remains the authoritative implemented behavior until then.

**References:** `UX_AUDIT.md`, `UX_REDESIGN.md`, `DECISIONS.md` (P-UX-01…05 and Q-O006-01…08), `ACTION_PLAN.md` (PR #6 and next action), `ROADMAP.md`.

### 2026-11-09 — O-006 implementation authorized

**Type:** Scope transition

**Context:** The owner mission authorizes the full clinical workflow and UX implementation described in PR #6, superseding the proposal-only boundary in the original design review. Work starts from the latest documentation head `b63e806` on `feat/o006-clinical-workflows`; PR #6 remains open and unmerged.

**Execution boundary:** Implement optional encounter links for patient-owned study requests, consultation context, appointment handoff, contextual documents/follow-up, and the focused patient workspace. Keep the single-surgeon local prototype, synthetic records, explicit save, and O-005 regression behavior. Q-O006 clinical semantics remain open; preserve existing `completed` values and do not infer performed/result-received meaning or event times.

**References:** O-006 mission brief (2026-11-09); `DECISIONS.md` D-033 and Q-O006-01…08; `TASKS.md` §7; `ACTION_PLAN.md` §3; PR #6.

### 2026-11-09 — O-006 study API foundation and canonical workflow contract

**Type:** Implementation milestone

**Context:** The implementation branch starts from PR #6's latest documentation head. The owner mission explicitly requires patient-owned study requests with an optional same-patient encounter and migration preservation.

**Findings and outcomes:**

- Added nullable `StudyRequest.encounterId` and a SQLite table-rebuild migration; a temporary seeded database retained both existing study rows and every field, passed `foreign_key_check`, and retained both indexes.
- Added `POST /api/patients/:patientId/studies` with route-derived patient ownership, optional same-patient encounter validation, shared strict contract schema, and atomic multi-row creation. Existing encounter-scoped creation and study statuses remain unchanged.
- API integration suite passes 112/112; API and contracts typechecks pass. Commit `48304a4` (`feat(studies): support patient-level requests`) is pushed to `feat/o006-clinical-workflows`.
- Added O-006 acceptance and workflow requirements to the product, workflow, decision, and canonical UI documents. No O-006 web UI has been implemented at this milestone.

**Impact:** Independent study requests have a persisted, validated API foundation. Status semantics, clinical order time/source, and cancellation/correction behavior remain open and are not inferred.

**References:** `API_CONTRACT.md` §11, `DATA_MODEL.md` §1/§3, `UI_SPEC.md` §8, `WORKFLOWS.md` §15, `DECISIONS.md` D-034…D-039, `TESTING.md`, `ACTION_PLAN.md` §3.

### 2026-11-09 — O-006 clinical workflows integrated and verified

**Type:** Implementation milestone

**Context:** The complete owner-authorized O-006 mission was implemented on `feat/o006-clinical-workflows`, based on PR #6's latest docs head `b63e806`.

**Findings and outcomes:**

- Added responsive consultation create/edit/detail workspaces with patient safety context, on-demand historical notes, pending studies, explicit save, and in-app unsaved-change protection. The patient workspace now prioritizes safety context, next appointment and study review, recent encounters, and historical records.
- Added patient-level standalone study creation, optional immutable same-patient encounter links, review controls and doctor-authored notes; requests can also be staged atomically in a new encounter or added to a saved encounter. Existing study states and transitions were retained without interpreting `completed`.
- Added appointment-to-consultation entry and explicit completion/linking, contextual prescription/report prefill and return, and follow-up appointment return navigation.
- Final gate passed: API 112/112; web 32/32; workspace typecheck; ESLint (exit 0 with the existing App Router `pages/` warning); Next production build; isolated migration/seed/repeat startup; primary headless Chrome workflows and 390px responsive layout. Existing study rows/associations survived the migration. Default local `/health` and `/patients` returned 200 after migration; the seed created no records.
- Commits: API `48304a4`, canonical O-006 contract `e3a3cc1`, integrated UI `e27cbf8`. PR #7 is open against `docs/o006-clinical-workflow-ux` and stacked on PR #6. Both remain unmerged pending owner review.
- No new dependencies, AI, uploads, staff workflows, event timestamps, or speculative study-status semantics were added. Q-O006-01…08 remain current physician-validation questions.

**Impact:** O-006 implementation and integrated verification are complete; no further implementation work is required before owner review.

**References:** PR #6, PR #7, `TASKS.md` §7, `ACTION_PLAN.md` §3, `TESTING.md`, `WORKFLOWS.md` §15, `DECISIONS.md` D-033…D-039 and Q-O006-01…08.

## 2026-11-09 — O-007 visual investigation and code-first handoff

**Scope:** Research only against O-006 `30eafd1`, including follow-up fixes discovered on the remote after the local checkout proved two commits behind. The owner set the sequence: current investigation → separate code-first UI v0 → later Figma exploration → implementation of approved Figma designs.

**Verified findings:** Isolated exact-fixture Chromium inspection at desktop/tablet/mobile and 768px identified displaced/clipped month geometry, overflowing timeline reasons, malformed study-entry rows, unequal week sizing and deficient contrast pairs. `UI_AUDIT.md` separates verified defects, inconsistencies, usability hypotheses and aesthetic preferences; `UI_RESEARCH.md` compares primary public references without selecting a visual direction. Evidence includes 87 inventoried screenshots. The isolated database retains the original 7/9/9/2/2 fixture counts; busy/error examples were simulated without writes.

**Boundary:** O-006 clinical workflows, unknown-versus-negative data, explicit saves, study associations/status semantics, appointment handoff and embedded documents remain the baseline. No application source, dependencies, contracts, schema, accepted UI specification or decision register was changed. No Figma connection, design system, mockups, wireframes or UI v0 implementation was produced. [Research PR #8](https://github.com/Marguelgtz/nexus-med/pull/8) is open against `feat/o006-clinical-workflows`, separate from the O-006 implementation. Evidence commit `7c3d61a`; audit/research commit `e5fa1af`. No PR was merged.


## 2026-11-09 — O-007 UI v0 implementation and verified presentation baseline

The owner authorized implementation after PR #8, continuing `feat/o007-ui-foundation`. Commits `6c412c3` and `99468b3` extend the existing tokens/control styles and domain components: repaired calendar/history/study geometry, shared labelled study fields, readable semantic colors, equal wide week columns/stacked mobile days, collapsed narrow context, ordinary page scrolling, aligned registry metadata, navigation/focus/busy/error cues and embedded document focus return. No API/schema/dependency or clinical-status changes; the generated `next-env.d.ts` dev-path modification is excluded from commits.

Automated verification: API 112/112, web 36/36, workspace typecheck, lint and production build. Browser checks cleared the O-006 post-review gate and exercised patient/consultation/study/document/appointment persistence, draft protection, failure recovery and print isolation. A 64-combination reflow/geometry matrix passed; 89 final PNGs were inspected and inventoried from a separate exact-fixture database. Both print PDFs were rendered and visually inspected. Repeat seed preserved a SQL-dump digest after synthetic edits/new records. Initial sandbox subprocess failures and browser-harness selector/navigation races were resolved before recording successful checks.

`UI_SPEC.md` §9 defines the actual conventions and Figma boundary; `TESTING.md` and the evidence inventory preserve limits (Chromium only, no physician/screen-reader/physical-printer validation, CSS-width zoom equivalence). P2 branding/density preference remains provisional. Research and UI PRs remain unmerged; publication metadata is maintained in `ACTION_PLAN.md`.

**Publication:** [UI v0 PR #9](https://github.com/Marguelgtz/nexus-med/pull/9), base PR #8; branch pushed, no merge. Implementation `6c412c3` / `99468b3`, final evidence/docs `c657334`.

## 2026-11-10 — O-007 owner review refinements verified

The owner reviewed the running application and requested faster entry into consultations, simpler patient navigation, a full clinical-context page, less crowded consultation editing, study ordering beside consultation actions, a clearer custom study name, and a more modern restrained palette. These refinements were implemented on `feat/o007-ui-foundation` without changing approved clinical status semantics or patient/encounter ownership.

The study contract now uses a required name and optional description; the SQLite migration preserves the existing study rows and associations while carrying historical descriptions into the new name field. The local database was migrated in place, `foreign_key_check` returned no violations, and startup seeding created no records. Synthetic registry names/identifiers, persistent demo warnings, explicit saves and print isolation remain intact.

Verification passed: API 113/113, web 39/39, workspace typecheck, ESLint exit 0 with its existing App Router warning, and the final Next.js production build. Fourteen owner-review screenshots were inspected at desktop, tablet and mobile sizes and their SHA-256 inventory was checked. This is Chromium visual evidence, not screen-reader, physician usability, Safari/Firefox, or final brand approval. The pre-existing local `apps/web/next-env.d.ts` edit remains uncommitted.

**Publication:** code commit `28c00cc` and evidence/documentation commit `b371bbc` are pushed on the existing branch. PR #9 has the verification/evidence summary, remains open against PR #8, and is not merged. No Figma file was accessed; the refined palette is a working foundation for later Figma review.

**References:** PR #9; `UI_AUDIT.md`; `UI_SPEC.md`; `TESTING.md`; `docs/assets/ui-v0/owner-review-2026-11-10/README.md`; `ACTION_PLAN.md`.

## 2026-11-10 — Patient workspace split into focused views

The owner reported that the new patient navigation still mostly scrolled a combined overview and that clinical context repeated recent consultations. D-042 replaces that layout with focused SSR destinations for summary, consultations, appointments, studies, documents and background. The overview is now demographics plus compact pending work; the background view retains its existing URL but only displays the four background fields. Existing overview hashes redirect to the owning destination. A shared patient-section header reuses identity/title composition; existing domain components retain clinical saves, validation and status semantics. The unused context appointment component and obsolete context-list styles were removed.

Citas now explains scheduling, keeps past still-scheduled appointments visible, labels planned types and links to either consultation entry or the stored linked note. Consultation/documents/background returns stay within their workflow. There is no API, schema, dependency, clinical-status or automatic appointment-linking change.

Verification: web 39/39; final production build with TypeScript validation; ESLint exit 0 (existing warning); 24 Chromium route/viewport checks at 1440/1024/390/320px; history/bookmark, exclusive-content, dirty-navigation, linked-note, empty-record and missing-record checks. Eighteen production screenshots use a separate exact-fixture DB; no clinical write was submitted. Code/docs/evidence commit `03be1b8` is pushed on `feat/o007-ui-foundation`; PR #9 has its description/screenshots updated and remains open against PR #8, unmerged. Normal startup is restored at 3000/4000 with no pending migrations and zero seeded records. Publication state is maintained in `ACTION_PLAN.md`.

## 2026-11-10 — Progressive-entry save safety finding

While implementing owner-requested consultation stages, browser verification found that React reused the Continue button as the final submit button within the same click. The browser could then execute the new default submit action without a separate save click. Distinct keyed Continue/Save elements prevent this, and the regression check now intercepts all writes and asserts zero POST requests during stage changes. The failed check's two uniquely matched synthetic local notes and attached requests were backed up and cleaned with creation-time/content/association checks, an unchanged digest of all unrelated table rows and valid foreign keys. Persistence checks continue on an isolated exact fixture database. This finding does not change clinical fields, state semantics or explicit-saving requirements.

## 2026-11-10 — Compact clinical entry and dialogs delivered

Owner feedback authorized focused native medication/study/follow-up dialogs, three reversible new-note stages and background in Resumen (D-043). Incremental implementation commits are `786533b`, `fd2cf83`, and `e39a604`; final screenshot/focus corrections extend them without API/schema changes. All seven clinical fields and explicit saves remain; staged studies persist atomically with the note, while follow-up creates an independent appointment. New medication capture has one general-instructions field; historical per-line instructions are retained and printed. Documentation stays in English; UI stays in Spanish.

Verification includes web 39/39, typecheck/lint, final production build, 24 responsive capture states, isolated real persistence and simulated failure recovery, retained historical instructions, rendered print inspection, API restart and seed digest preservation. Twenty-five PNGs are inventoried. Screenshot review improved study controls, mobile action placement and modal close layout; browser checks fixed deferred study focus return. The earlier premature-submit regression and strictly scoped synthetic cleanup are documented above. PR publication state is in ACTION_PLAN.md; no UI PR was merged.

**Compact-entry publication:** `786533b`, `fd2cf83`, `e39a604`, `06a4fa8` and evidence `a4434dc` are pushed on the existing UI branch. PR #9 is updated against PR #8 and remains open/unmerged. Normal startup at 3000/4000 applies no migration and seeds zero records; the owner next-env.d.ts modification remains uncommitted.

## 2026-11-10 — Secretary and local study receipt (D-044/D-045)

Owner expanded the local MVP to an administrative secretary view without authentication: agenda/patients, reception/shared waiting queue and receiving PDF/images for physician review. This explicitly supersedes the original staff/file exclusions only for these workflows. The UI uses shared native dialogs instead of small standalone form journeys; clinical notes and printable documents remain dedicated views.

Additive nullable appointment markers keep reception distinct from completion. Separate received-study/file records preserve the meaning of existing orders; shared entry requires patient and permits optional consultation/order. The storage boundary writes opaque files beside SQLite, enforces signature/size limits, and cleans new files on metadata failure. Administrative DTOs omit clinical background/review notes. Programmatic view changes use the existing dirty-form guard. Source commits `a16857b`/`db417a8`; API121/web39 and production/browser/preservation checks pass (see TESTING.md). The normal database's original records and owner `next-env.d.ts` change were preserved; no feature merge is authorized.

## 2026-11-10 — Secretary work split into stacked review PRs

The owner flagged the secretary PR's 59-file diff as too large to review. The same feature was split without rewriting its original branch or dropping files into seven stacked PRs: #11 data/contracts (11 files), #12 reception API (8), #13 receipt API/storage (6), #14 patient action dialogs (9), #15 reception UI (10), #16 received-study UI (6), and #17 docs/evidence (9). Every diff is at or below 11 files, and each PR targets the prior stack branch. PR #10 was closed as superseded after all replacements were published; its branch and comments remain available. No PR was merged.

The unresolved Codex review finding on PR #10 identified that 15-second `router.refresh()` polling could unmount the consultation editor during an API error. PR #16 now fetches receipt data through the typed client, retains existing rows and displays a recoverable error on failure, and applies receipt uploads/reviews locally instead of refreshing the surrounding clinical route.

After that correction, workspace typecheck, lint, and `git diff --check` passed. The full API/web suites and production build were not rerun for the polling fix; they passed on the integrated secretary source before it. The owner’s `next-env.d.ts` edit remained uncommitted and outside all PRs.


## 2026-11-10 — Contemporary visual refresh

Owner requested a full visual renewal with the same layout. Shared tokens and component styles now use a cool mineral/slate palette, petroleum-blue actions, white surfaces, restrained elevation, rounded controls and clearer selected navigation. The shell has a compact brand mark; existing columns, screen composition and workflows remain. Typography stays offline. Workspace typecheck, lint and production build pass; Chromium desktop/mobile inspection confirms no horizontal overflow in the checked views. Local startup had no pending migrations and seeded zero new rows. No clinical data was changed.


The owner clarified that the first iteration changed mostly colors and requested a more substantial glass component redesign. PR #18 now includes floating translucent navigation with shared SVG icons, a directory identity component with initials and secondary metadata, lighter inline row actions, glass panels, inset controls, segmented tabs and frosted native dialogs. Layout columns and domain behavior remain. Chromium inspection covered desktop and mobile routes, calendar, consultation entry and modal opening; a 320px header overflow was fixed. Workspace typecheck, lint and production build pass after this iteration. No clinical writes were submitted.


## 2026-11-10 — Operational reception overview and quieter presentation

Owner approved removing visible demonstration labels from application chrome and printable documents (D-046). Stored text and exact fixtures remain unchanged. Reception and secretary agenda now show selected-date appointment/completion totals, all-date queue counts, next future unarrived appointment, planned minutes and completion progress. Scope labels distinguish selected-date counts from the shared queue. Web tests pass 42/42, workspace typecheck/lint and production build pass; Chromium desktop/390/320px checks show no horizontal overflow and no demo banner. No data writes were submitted.

## 2026-11-11 — Secretary contact cards and shared Studies sync (D-047)

Owner requested contact details on patient cards, a concise shared Estudios area, and periodic updates across secretary/physician windows. An administrative patient-list API now returns phone/email while excluding medical background; the secretary cards show those values inline with direct phone/email actions and an edit action. `/estudios` is the canonical shared route; the older `/estudios-recibidos` route redirects. Both reception and study views refresh every 30 seconds while visible, refresh on focus, and retain a compact manual refresh. Startup and reset output also avoid demo labels. The shared feed still distinguishes receipt from explicit physician review; no push service was added.

API tests pass 121/121, web tests 42/42, workspace typecheck and lint pass, and the production build recognizes `/estudios` as dynamic. Chromium checks confirm polling registration in two views, one successful manual read request, the compatibility redirect, no visible demonstration labels, and no horizontal overflow at desktop, 390px or 320px. Dev startup seeded zero new rows. No local records were changed. Work is published as [PR #20](https://github.com/Marguelgtz/nexus-med/pull/20), 12 files; [PR #21](https://github.com/Marguelgtz/nexus-med/pull/21), 15 files; and documentation follow-up [PR #22](https://github.com/Marguelgtz/nexus-med/pull/22), eight files. Each PR is based on the previous layer, beginning at PR #19. All remain open and unmerged.

## 2026-11-11 — Patient study detail and current-day received sample (D-049)

Owner feedback called for opening a patient's study, reviewing its notes and files in context, and showing a current-day example. Study-request names and linked medical-view receipt titles now open a request-specific detail page with the encounter association, result note, attachments, receipt date, and separate physician review state. The patient 005 fixture includes a chest X-ray request and one locally generated neutral PDF; neither receiving the file nor seeding the receipt changes the physician's request status. A conditional migration clears only exact legacy fixture note text and leaves any edited field untouched.

The seed tests pass 14/14, web tests 44/44, workspace typecheck and lint pass (the existing Pages-directory warning remains), and Chromium confirms the patient-list link, detail page, PDF response signature, and responsive layout at 390px. The new migration was applied to the existing local database; idempotent seeding added the new request and receipt without replacing user records. [PR #26](https://github.com/Marguelgtz/nexus-med/pull/26) contains 13 files and commits `82ac95d`/`de56add`, based on PR #25; it remains open and unmerged. The owner's `next-env.d.ts` edit remains uncommitted.

## 2026-11-12 — A separate visual direction before another broad UI revision

The owner rejected further refinements built on the previous UI foundation and authorized an isolated interactive example. The local-only `/exploracion-ui` sample explores warm paper, ink navigation, terracotta actions, serif headings, an aligned directory, patient quick view and full-work-surface registration. “Signup” was interpreted as patient registration; page-versus-panel remains a reversible assumption. This is a design proposal, not final branding approval or authorization to replace every application screen.

The sample uses only checked-in fictional demographics and transient component state. It does not write through the API or expose clinical notes. Existing product screens retain their current implementation. Web 44/44, typecheck, lint and build pass; Chrome checks cover search, filters, preview, validation and temporary registration, with overflow measurements at 320/390/768/1440px. Production returns HTTP 404. Dirty native-confirm control was limited by browser tooling; see `TESTING.md`. No push, PR, merge or remote deployment was performed. Next is owner review of this direction before integration.


## 2026-11-12 — Readability takes precedence over editorial styling (D-050)

The owner found the isolated direction better but rejected thin lettering, emphasizing working users aged 60–70. That audience constraint is now explicit in PRODUCT and DECISIONS. The sample keeps its separate route and color direction while replacing fine serif headings with sturdy sans-serif text, raising main text/names to 18px and functional data to 16px, strengthening contrast and controls, exposing row-action labels and removing decorative copy. Small layouts reorganize instead of shrinking text. The sample remains a reversible proposal, without broader rollout or data/API changes.

Frontend checks and focused browser measurements pass; exact evidence and limits are in TESTING. Actual comfort for the intended age group is still untested and must not be inferred from passing technical checks. Work stays local on `codex/ui-editorial-exploration`, with no push, merge or deployment.


## 2026-11-12 — Preserve three designs for comparison

The owner clarified that typography fixes did not resolve rejection of the sample's overall design. They requested a new iteration alongside the previous sample and current product, and explicitly liked the side navigation. Proposal 2 therefore has a separate development-only route, a solid midnight-blue sidebar, cool white workspace, cobalt actions, patient cards and a dedicated identity/contact pane. Both samples expose comparison links; the existing application and prior sample stylesheet remain intact.

The two previews share registration/validation instead of copying it, while retaining independent transient state and exact fictional demographics. Frontend checks, browser checks in both versions, narrow-layout measurements and production 404 checks pass; details and limitations are in TESTING. The design remains a proposal, not approval for application-wide replacement. Work stays local on `codex/ui-second-direction`, based on `be0339a`; no push, PR, merge or deployment.


### 2026-11-13 — Clinic-scoped pilot foundation

**Type:** Scope change / implementation milestone

The owner authorized the multi-user pilot mission (D-053). Clinic membership and ownership, scoped API access, attribution, conflict detection and safe additive SQLite/D1 migrations were implemented over the existing feature stack. Synthetic migration, isolation and multi-session API checks passed; local backup and restore were exercised. The pilot remains gated on integrated browser and deployed-runtime verification and independent reviews. Existing remote databases still await the new migration; no remote migration was applied.

**References:** `ACTION_PLAN.md`, `PILOT_BASELINE.md`, `PILOT_AUTH.md`, `PILOT_OPERATIONS.md`; commits `9d4f78e`, `49c5d72`, `b241186`.

## 2026-11-13 — Invitation concurrency and atomicity

A local multi-session workerd/D1 test reproduced eight pending invitations for the same clinic and synthetic address when eight creation requests ran concurrently. The application-level precheck was insufficient. Invitation creation now rechecks eligibility in a guarded SQLite transaction / D1 batch that also writes the encrypted outbox message and audit event. Local SQLite and D1 tests verify one successful creation, conflict responses for the others, rollback of an injected outbox failure, and safe retry. The change has not been deployed; the broader pilot and independent security gates remain open.

## 2026-11-13 — Atomic password reset on SQLite and D1

The initial local D1 failure injection showed Better Auth's reset flow could consume a token and revoke sessions before a credential-write failure. Since the Prisma D1 adapter cannot provide transactions, `/reset-password` now validates and consumes the token, revokes sessions and updates or creates the credential inside the runtime's SQLite transaction / D1 atomic batch. Local SQLite and workerd/D1 tests inject a credential-write failure, verify token/password/session rollback, retry the same link, and race two uses of one link with one winner. API tests passed 168/168 and workspace typecheck/lint passed. This local fix is not deployed; other auth paths and deployment verification remain open.

**References:** `ACTION_PLAN.md`, `SECURITY.md`, `TESTING.md`, `PILOT_READINESS.md`; commit `099088c` on `codex/pilot-clinic-foundation`.

## 2026-11-13 — Recoverable signup after D1 credential failure

A local workerd/D1 failure injection showed that a credential insert error could leave a newly created unverified `pending` identity without an account or verification message, blocking a same-address retry. Signup now records the user created in the current request and conditionally removes that orphan after a failed response only when it remains unverified/pending and has no account, clinic membership or session. SQLite and local D1 tests verify cleanup and a successful same-email retry. Focused clinic-auth passed 9/9, the full API suite passed 169/169, the local Worker journey passed, and workspace typecheck/lint passed. This does not prove general Better Auth signup atomicity and has not been deployed.

**References:** `ACTION_PLAN.md`, `SECURITY.md`, `TESTING.md`, `PILOT_READINESS.md`; local implementation and integration tests on `codex/pilot-clinic-foundation`.

## 2026-11-13 — OAuth callback orphan cleanup

Code review found that Google signup can leave a verified but unlinked pending identity if D1 account creation fails after Better Auth creates the user. Better Auth returns a redirect on failure, so cleanup based on `Response.ok` missed this route. The request-scoped cleanup now wraps `/callback/google` and removes only that request's pending identity when it has no account, membership or session; a verified identity is eligible because it has no established login path and is known to be new in that callback. A synthetic callback test verifies that an error 302 removes the orphan and a success 302 with an account preserves it. This is not a Google provider round trip. The local workerd/D1 journey passed, API 170/170, focused clinic-auth 10/10, workspace typecheck/lint; no migration or deployment was made.

**References:** `ACTION_PLAN.md`, `SECURITY.md`, `TESTING.md`, `PILOT_READINESS.md`; `apps/api/src/domains/auth/signup-cleanup.ts` and `auth.routes.ts`.

## 2026-11-13 — Atomic password change on D1

Inspection of Better Auth 1.7.21 showed `/change-password` wraps writes in an adapter transaction, but the Prisma D1 adapter ignores transactions. A local SQLite trigger reproduced the partial result: requesting revocation of other sessions deleted the user's sessions before a failed password update. The custom hook now checks the authoritative session and current password, then updates the credential and removes other sessions in one atomic write, leaving the current session active. Local SQLite and workerd/D1 tests inject failures at the password update and at the later session deletion; each preserves the prior password and sessions, and retries succeed. The workerd test also confirms the previous password stops working only after a successful change. Full API 171/171, focused auth 11/11, typecheck and lint pass. No migration, provider round trip or deployment was made.

**References:** `ACTION_PLAN.md`, `SECURITY.md`, `TESTING.md`, `PILOT_AUTH.md`, `PILOT_READINESS.md`; Better Auth source `change-password` flow and Cloudflare D1 batch semantics.

## 2026-11-13 — Rechecked received-study PDF rendering

An earlier extension-browser check reported a blank PDF viewer. The seeded one-page synthetic PDF was later served from a temporary loopback probe with the same inline, no-store, nosniff and CSP sandbox headers as the API route, then opened in an isolated headed Chrome 157.0.8103.78 profile under Xvfb. Chrome rendered the viewer toolbar and document content; removing only the CSP sandbox header yielded the same result. The failure was not reproduced, and no response-policy change is warranted. This does not verify authenticated app-link navigation, upload or print. No application or database data changed.

**References:** `ACTION_PLAN.md`, `TESTING.md`, `PILOT_READINESS.md`, `apps/api/src/domains/receipts/receipts.routes.ts`.
