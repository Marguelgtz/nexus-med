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

**Phase status:** Completed 2026-11-07. All acceptance criteria below met; verified evidence is in `ACTION_PLAN.md` (O-003) and `TESTING.md`. No scope changes were required.

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

**Phase status:** Completed 2026-11-07. All acceptance criteria below met; verified evidence is in `ACTION_PLAN.md` (O-004) and `TESTING.md`. No scope changes were required.

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

## 6. Phase 4 — Product expansion (appointments, classification, studies, printable documents)

**Objective O-005:** Extend the working local product with four ordered vertical slices — appointments + basic calendar (NX-001), encounter types (NX-002), study-request follow-up (NX-003), printable prescriptions/reports (NX-004) — each verified end-to-end before the next (D-023). Owner mission brief 2026-11-07/08.

**Phase status:** Completed and integrated-verified 2026-11-08 on `feat/nx-expansion-complete` (as documented in `ACTION_PLAN.md` / `TESTING.md`); the prior feature PR stack remains unmerged. This section retains its accepted phase-level requirements and acceptance criteria. Proposed post-O-005 UX work is not an approved new implementation phase.

### Work packages

**NX-001 — Appointments and basic calendar**
- `Appointment` model (D-026): patient, `startAt` instant, duration 5–480 min, planned type, status `scheduled`/`completed`/`cancelled` (one-directional; reschedule = cancelled → scheduled), optional `actualDurationMinutes`, optional 1:1 `linkedEncounterId` (same patient, server-validated).
- Hono: create, list (range filter), get, update (reschedule), complete (actual duration + optional encounter link), cancel; shared validation/DTOs in `packages/contracts`.
- Web: `/calendar` with `dia`/`semana`/`mes` views (CSS grid, no calendar library, Monday start, 06:00–22:00 day window, D-030), appointment detail page, new-appointment page; patient context preserved across views.
- Demo: fixed-timestamp past appointments (completed/cancelled, some linked to encounters) plus upcoming appointments anchored to the first seed run (stored once, never moved on re-seed, D-029); idempotent seeding; `DEMO_DATA.md` updated.

Acceptance: appointments create/list/get/reschedule/complete/cancel; render in all three views on correct America/Monterrey dates; overlap warnings; patient navigation; first-run demo includes representative past + upcoming appointments; repeat seed duplicates nothing, moves nothing, overwrites nothing; existing patient/encounter workflows intact.

**NX-002 — Encounter types and minimal clinical classification**
- `Encounter.type` and `Appointment.type` share the fixed list `consulta`/`procedimiento`/`visita_domicilio`/`urgencia`; pre-expansion encounters migrate to `consulta` (D-024).
- Web (U-12): type selector in the consultation form; type displayed in encounter detail and patient timeline without making the timeline noisy.
- Surgical follow-through: conservative default — the type field is sufficient; no surgery/procedure lifecycle or status machine. Recorded in `DECISIONS.md` as a proposal, not an owner-approved clinical workflow (Q-NX-01 stays open for doctor validation; D-025).

Acceptance: the doctor can classify an encounter as consultation, procedure, home visit, or emergency; the type persists and is visible in detail and timeline; legacy records remain valid; no surgery-specific fields are required for ordinary consultations.

**NX-003 — Study requests and follow-up**
- `StudyRequest` (D-027): `patientId` + immutable originating `encounterId` (both associations enforced server-side), closed category list + free-text description, status `ordered` → `completed` → `reviewed`, optional `resultNote` (≤ 1,000 chars); after creation only status + note change — no edit, no delete.
- Hono: create (one or more per consultation), list by encounter/patient, update status/note; shared validation/DTOs. No study catalog or integration abstraction.
- Web: repeatable study rows in the consultation form (short hardcoded common categories + free-text option); encounter detail moves a study through ordered → completed → reviewed with an optional doctor note; patient overview shows a small “Estudios pendientes” section (studies not yet reviewed, linked to the originating encounter). No dashboard.
- Follow-up scheduling reuses the existing `Appointment` model; the free-text `followUp` field keeps clinical instructions. No new scheduler, lab/imaging integration, file uploads, reminders, or result interpretation.

Acceptance: one or more study requests can be entered from an encounter; patient and encounter associations are verified; status and notes persist; ordered/completed studies appear in “Estudios pendientes” until reviewed, then leave the section but remain accessible in encounter detail; encounters without studies behave as before; repeat seed is idempotent.

**NX-004 — Prescriptions and medical reports**
- `MedicalDocument` (`kind` = `prescription`/`report`) + `PrescriptionLine` (medication, dose, route, frequency, duration, instructions — every value doctor-entered) (D-028); linked to a patient and optionally to an encounter; no stored files, PDFs, or uploads.
- Hono: create, retrieve, and update supported document content; shared validation/DTOs.
- Web: prescription form with repeatable lines; report form with a doctor-written narrative plus existing patient/encounter details only; patient overview “Recetas e informes” section so documents can be reopened; dedicated print view using ordinary HTML + `@media print` (standard page, sensible page breaks, navigation/buttons/app controls excluded, demo marker on the paper). Browser print dialog for print/save-as-PDF.
- Content rules: the doctor authors all clinical content — no medication catalog, dose calculation, interaction checks, or clinical conclusions; no signature, legal-validity, or official-prescription claims; no invented doctor identity or clinic details.

Acceptance: doctor-authored content persists and reopens from patient context; patient/encounter links are correct; prescription lines are repeatable; print output is legible and excludes app controls; print styling adds no dependency; seeded records are fictional and idempotent.

### Phase 4 acceptance criteria

- All four slices implemented and integrated-verified: clean local migration + startup with the documented commands; the synthetic seed contains the intended patient/encounter baseline plus appointments, studies, and medical documents; a repeated seed neither duplicates records nor overwrites local edits.
- Core workflows intact: patient registration/search/overview/background editing, consultation create/detail/edit, chronological timeline.
- Appointments create/list/detail/edit/reschedule/complete/cancel and render correctly in day/week/month views; encounter types save and render in form, detail, and timeline.
- Study requests save, change status, stay linked to their encounter/patient, and appear/disappear in “Estudios pendiente” correctly.
- Prescriptions and reports save, reopen from patient context, and print cleanly.
- Dates/times use America/Monterrey; first-seed anchoring behaves correctly.
- All existing available tests plus relevant new tests pass; typecheck, lint, and production build pass; no new runtime dependencies and no excluded capability introduced.
- Documentation reconciled (`TASKS.md`, `ACTION_PLAN.md`, `DATA_MODEL.md`, `API_CONTRACT.md`, `UI_SPEC.md`, `WORKFLOWS.md`, `DEMO_DATA.md`, `TESTING.md`, `DECISIONS.md`); no product-feature PR merged without explicit owner approval.

## 7. Deferred scope — not part of this prototype

- File storage, document uploads/downloads, document management, and R2.
- Google authentication/OAuth/OIDC and authorization.
- Docker and CI/CD.
- Cloudflare account connection, remote D1/R2, Worker deployment, and production setup.
- Billing, multi-user support, AI clinical features, FHIR/HL7, and external integrations. (Basic appointment scheduling is now in scope via Phase 4 / NX-001; surgical-procedure tracking and the study category list remain open questions Q-NX-01/Q-NX-02 pending doctor validation.)

## 8. Phase-boundary maintenance

At the start of each phase, review its objective and acceptance criteria against actual findings. Revise this file only when scope, dependencies, sequence, or acceptance criteria need to change. Expand the active objective in `ACTION_PLAN.md` into the live sequential sub-objective stack.

During a phase, track all progress in `ACTION_PLAN.md`, not here. At phase completion, use verified results to adjust the next phase. Record meaningful milestones and durable findings in `PROJECT_HISTORY.md`; keep current accepted decisions in `DECISIONS.md`.
