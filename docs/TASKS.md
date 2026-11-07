# Phase Task Plan — Medical Platform MVP

**Document type:** Phase-level work definition  
**Update cadence:** At phase boundaries or after an approved material scope change  
**Not a live progress tracker:** See `docs/ACTION_PLAN.md` for the current execution state.

---

## 1. Purpose

This document defines stable work packages, deliverables, dependencies, and acceptance criteria for each phase. It is deliberately not updated after every task, commit, or agent session.

- `ROADMAP.md` defines strategic outcomes and order.
- `TASKS.md` defines the work and acceptance criteria for each phase.
- `ACTION_PLAN.md` tracks active execution continuously.
- `PROJECT_HISTORY.md` preserves significant events and findings retrospectively.

At a phase boundary, reconcile the work packages for the next phase using actual findings. Do not convert this file into a live checklist.

## 2. Phase 0 — Database and API foundation

**Phase status:** Completed 2026-11-07. All acceptance criteria below met; verified evidence is in `ACTION_PLAN.md` (O-001 exit evidence) and `TESTING.md`. No scope changes were required.

**Objective O-001:** Establish a reliable local data model and Hono API for the core patient and encounter workflows before product UX/UI design begins.

### Work packages

**T-001 — Establish the repository and workspaces**
- Inspect the local environment and preserve existing files/Git changes.
- Establish npm workspaces with `apps/api` and `apps/web`; add the proposed `packages/contracts` workspace if O-001 confirms shared DTOs/runtime-safe schemas are useful to both applications.
- Configure TypeScript, linting, formatting, and shared developer commands using a proportionate current toolchain. Confirm whether the proposed `packages/contracts` workspace is warranted and include it only if it is the single shared owner of cross-app DTOs/schemas.
- Scaffold only a minimal Next.js shell; do not implement product screens.
- **Deliverable:** Reproducible workspace and two independently runnable local applications.

**T-002 — Implement the initial relational model**
- Review `DATA_MODEL.md` and resolve only fields/relationships needed for patient, medical background, and encounter workflows.
- Implement Prisma ORM 7 schema and local SQLite adapter.
- Add explicit foreign keys, suitable indexes, nullability, timestamp semantics, and archive behavior.
- Generate and inspect committed migrations.
- **Deliverable:** Reviewed schema and reproducible SQLite migrations.

**T-003 — Establish database lifecycle and synthetic seed**
- Add local database initialization and migration commands.
- Implement deterministic, idempotent seeding from `demo-dataset.json`.
- Preserve user edits and user-created records on repeat seed.
- Verify local transactions and rollback behavior with the selected adapter.
- **Deliverable:** Persistent local database populated with synthetic data and a safe repeatable seed.

**T-004 — Establish Hono API conventions and domain operations**
- Finalize `API_CONTRACT.md` against the implemented Prisma model before any UI work.
- Configure Hono on the local Node.js adapter.
- Establish consistent route structure, request validation, response DTOs, error shape, and status-code conventions.
- Implement core patient operations: list/search, create, retrieve, update, and archive.
- Implement medical-background read/update behavior.
- Implement encounter create/read/update and patient timeline queries.
- Verify encounter-to-patient association on the server.
- Keep database access inside the API; do not return raw Prisma models as the public API contract.
- **Deliverable:** Functional Hono API whose implementation, tests, and `API_CONTRACT.md` agree for the core data workflows.

**T-005 — Verify database/API foundation**
- Add unit/integration/API contract tests for validation, relationships, query behavior, migrations, seeding, and persistence.
- Test representative multi-write transaction rollback locally.
- Confirm the API can return the synthetic dataset without a frontend.
- **Deliverable:** Repeatable verification evidence for the database and API.

**T-006 — Establish one-command local runtime**
- Implement root `npm run dev` orchestration.
- Apply migrations and seed before starting the product UI.
- Start Hono and Next.js with clean shutdown behavior.
- Verify minimal request-time SSR-to-Hono connectivity with a non-product smoke page or readiness route.
- **Deliverable:** Reliable local startup without manual database operations or remote dependencies.

### Phase 0 acceptance criteria

- Local SQLite persists across restarts.
- Prisma schema and migrations are reproducible from a clean database.
- The initial patient, medical-background, and encounter relationships are enforced.
- Hono owns all persistence and authoritative validation.
- API contracts and error behavior are explicit and tested.
- The API returns the deterministic synthetic fixture.
- Repeat seeding does not duplicate data or overwrite edits/user-created records.
- Representative local transaction rollback passes.
- Root `npm run dev` starts both apps and shuts them down cleanly.
- No product UI implementation has begun; only the minimal technical shell exists.

## 3. Phase 1 — UX and UI design

**Phase status:** Completed 2026-11-07. Deliverable `docs/UI_SPEC.md` produced and reviewed against the verified O-001 API and all 14 P0 stories; decisions recorded as D-022. No scope changes required.

**Objective O-002:** Produce an implementation-ready UX/UI specification after the data model and API foundation are understood, but before feature UI implementation.

### Work packages

**T-007 — Reconcile workflows with actual capabilities**
- Review `PRODUCT.md`, `WORKFLOWS.md`, data model, and implemented API contracts.
- Identify UX constraints and any API/data gaps that need to be resolved before design is signed off.

**T-008 — Information architecture and screen map**
- Define navigation, screen hierarchy, patient context, and primary actions.
- Keep the interface focused on the doctor's core workflow.

**T-009 — Key screen and interaction design**
- Design patient registry/search, patient overview, medical background, consultation entry, encounter detail, and clinical timeline.
- Specify form behavior, navigation, confirmation, and save interactions.

**T-010 — States and visual system**
- Define loading, empty, not-found, validation, error, success, archive, and demo states.
- Define a small reusable visual system: typography, spacing, color, controls, and responsive behavior.

**T-011 — Produce and review UI specification**
- Create `docs/UI_SPEC.md` and any useful design artifacts.
- Review the design against all P0 user stories and workflows before implementation.
- Record changes to API/data assumptions; update `DATA_MODEL.md` or `ARCHITECTURE.md` when required.

### Phase 1 acceptance criteria

- The screen map covers all in-scope P0 workflows.
- Patient identity and clinical context hierarchy are clear.
- Primary actions and navigation are specified.
- Form structure and important interaction states are documented.
- Visual direction is consistent and deliberately minimal.
- The owner can review the design before product UI implementation begins.

## 4. Phase 2 — Product implementation

**Objective O-003:** Implement the designed patient and encounter workflows as complete vertical slices.

### Work packages

**T-012 — Application shell and navigation**
- Implement the approved app shell, navigation, typography, spacing, and shared UI primitives.
- Keep reusable components cohesive and avoid premature component abstraction.

**T-013 — Patient registry and registration**
- Implement patient list/search, registration, validation, empty states, and error feedback.
- Integrate with Hono and SQLite.

**T-014 — Patient overview and medical background**
- Implement patient SSR overview, medical-background display/edit, and patient update/archive flows.
- Preserve historical encounters when patient demographics/background are updated.

**T-015 — Consultation and encounter details**
- Implement consultation form, explicit save behavior, encounter detail, and edit behavior within MVP scope.
- Keep patient context visible.

**T-016 — Clinical timeline and full workflow integration**
- Implement chronological encounter history and navigation between patient overview and encounter detail.
- Verify complete patient-to-consultation continuity.

**Ongoing database/API evolution rule:** These work packages do not freeze the database or API established in Phase 0. When implementation uncovers a real requirement or a better domain model, update Prisma schema through a new migration, revise Hono endpoints/validation/DTOs, update tests and relevant docs, and keep frontend/API behavior aligned. Do not preserve a bad initial contract merely to avoid a change. Equally, do not change the contract without a concrete reason.

### Phase 2 acceptance criteria

- The complete patient registration, search, update, archive, and overview workflows work.
- Medical background can be reviewed and maintained.
- Consultations can be created, saved, reopened, and edited within scope.
- Patient timelines are chronological and correctly associated.
- UI, API, and persistence behavior are verified together.
- Empty, loading, validation, error, and save states are handled deliberately.

## 5. Phase 3 — First-run demo and reliability

**Objective O-004:** Make the local prototype immediately usable and reliably demonstrable.

### Work packages

**T-017 — First-run demo presentation**
- Redirect `/` to `/patients`.
- Display a persistent Spanish demo warning.
- Confirm the exact fixture appears in active/archive views and patient timelines.

**T-018 — Startup and persistence verification**
- Ensure `npm run dev` prepares local SQLite, applies migrations, explicitly runs the idempotent seed, and starts both applications.
- Verify repeat start does not duplicate records or overwrite user edits.
- Verify user-created data survives restarts.

**T-019 — End-to-end, accessibility, and quality pass**
- Run primary patient and encounter end-to-end workflows.
- Verify error recovery, basic accessibility, local/offline runtime, and no sensitive data in logs.
- Resolve release-blocking issues and document known non-blocking limitations.

### Phase 3 acceptance criteria

- A clean local setup is populated without manual SQL or database configuration.
- The registry opens with six active synthetic patients; the archived patient remains retrievable.
- Nine demo encounters appear under the correct patients.
- A patient with no encounters is available for empty-state validation.
- Repeated startup preserves edits and user-created data.
- The application works offline after dependency installation.
- The final core workflows pass end-to-end verification.

## 6. Deferred scope — not part of this prototype

- File storage, document uploads/downloads, document management, and R2.
- Google authentication/OAuth/OIDC and authorization.
- Docker and CI/CD.
- Cloudflare account connection, remote D1/R2, Worker deployment, and production setup.
- Scheduling, billing, multi-user support, AI clinical features, FHIR/HL7, and external integrations.

## 7. Phase-boundary maintenance

At the start of each phase, review its objective and acceptance criteria against actual findings. Revise this file only when scope, dependencies, sequence, or acceptance criteria need to change. Expand the active objective in `ACTION_PLAN.md` into the live sequential sub-objective stack.

During a phase, track all progress in `ACTION_PLAN.md`, not here. At phase completion, use verified results to adjust the next phase. Record meaningful milestones and durable findings in `PROJECT_HISTORY.md`; keep current accepted decisions in `DECISIONS.md`.
