# Decision Log

Use `Confirmed`, `Proposed`, `Open`, or `Superseded`. Record the date and rationale when a material decision changes. The owner's explicit statements take precedence.

## Confirmed decisions

### D-052 — Role-aware patient access and focused Reception appointments — 2026-11-12

**Status:** Accepted from explicit owner feedback. The secretary sidebar exposes **Citas**, **Pacientes**, and **Estudios** and routes patient search to the existing administrative list under `/secretaria?seccion=pacientes`; secretary never enters the clinical `/patients/[id]` workspace. Physician patient-directory cards open the expediente when their main area is selected; `Nueva consulta` remains a separate, explicit action, and returning from the expediente restores the directory query/filter. Reception gains a date-driven **Citas** view at `/recepcion?seccion=citas`, distinct from its attention/queue overview; the existing `/calendar` day/week/month experience stays unchanged. No API, data, clinical, role-enforcement, or calendar behavior changes.

### D-051 — Adopt Proposal 2 across the application — 2026-11-12

**Status:** Accepted by explicit owner request. Apply `/exploracion-ui-2` visual direction throughout the application: midnight sidebar, cobalt primary actions, cool light workspace, sturdy readable text (D-050). Preserve clinical/administrative workflows, persistence, session/role restrictions and explicit physician review. Use global sidebar navigation plus separate patient section navigation; patient registration becomes a full page, with contextual consultation shortcuts retaining unsaved work. The preview is a visual reference, not production data logic. Implementation is planned in `UI_ROLLOUT_PLAN.md`; no rollout completion or deployment is claimed. Earlier sample-only restrictions are superseded for this adoption. Cloudflare hostname changes remain separate.


### D-050 — Readability for working older professionals — 2026-11-12

**Status:** Accepted from explicit owner feedback. Intended users include professionals aged 60–70 who continue working. Readable default type, sufficiently firm strokes, contrast, clear action labels and generous control targets take precedence over fine editorial type or compact presentation. Narrow layouts must reorganize instead of shrinking essential text. The immediate authorized change is the isolated UI sample, not a whole-application rollout. Its selected 18px main text / 16px functional metadata / 14px auxiliary copy and 52px controls are provisional design choices, not universal age-based thresholds or a claim of validated usability.

| ID | Decision | Notes |
|---|---|---|
| D-001 | Initial user is one general surgeon. | No assistant/staff workflow in the prototype. |
| D-002 | Prototype is local-only and uses synthetic data. | After initial dependency installation, application runtime and workflows must work without internet or remote services. |
| D-003 | Eventual deployment direction is private Cloudflare. | Future direction only; no account, login, remote resources, or Worker runtime in prototype. |
| D-004 | Frontend is Next.js App Router + TypeScript. | Conventional Next.js; no vinext/OpenNext adapter in prototype. |
| D-005 | Frontend and API are separate applications. | One npm-workspaces monorepo; two local processes started by one command. |
| D-006 | Use request-time SSR / Server Components for clinical page reads. | Server Components call Hono; no direct database access from Next.js. |
| D-007 | Use Hono for the standalone API. | Web-standard Fetch API design supports Node locally and a future Worker entry point. |
| D-008 | Use local SQLite persistence. | Local file; no database server. |
| D-009 | Use Prisma ORM 7. | Local `better-sqlite3` adapter is the implementation target and must be verified. |
| D-010 | File storage and authentication are excluded from the prototype. | Future file storage/R2 and Google OAuth/OIDC remain pending. |
| D-011 | Docker and CI/CD are excluded from the prototype. | Use local scripts and one-command startup. |
| D-012 | Professional commits, remote PRs, and selective merging are allowed under a restricted merge policy. | Pushes and remote PR creation are allowed when useful. PRs/stacks may remain open and ready to merge; keeping them open is optional. Only an exceptionally solid foundational/base PR may be merged autonomously after all acceptance criteria and checks pass with no blockers. Feature/UI PRs remain open unless the owner explicitly authorizes their merge. |
| D-013 | Future API runtime target is Cloudflare Workers; D1 is a future database candidate. | Validate adapter, transactions, limits, and critical workflows before deployment. |
| D-014 | First-run experience must include synthetic records. | Seven patients (six active, one archived) and nine encounters; no visible demo label per D-046; root redirects to `/patients`; seed is idempotent and does not overwrite local edits. |
| D-015 | Local `npm run dev` is the intended single startup command. | Implemented in O-001 (`scripts/dev.mjs`): migrates, explicitly seeds, and starts both services. |
| D-016 | Development order is database/API foundation, then UX/UI design, then product implementation. | Establish and test the data model and Hono API before feature UI design. Produce and review `docs/UI_SPEC.md` before implementing product screens. |
| D-017 | Database and API remain revisable during UX design and product implementation. | The initial foundation is not a freeze. Change Prisma schema through migrations and update Hono contracts, validation, tests, and docs when actual workflows justify it. |
| D-018 | `packages/contracts` is the single owner of transport contracts (confirmed from P-010). | zod 4 schemas + DTO types for patients, encounters, list query, and the error envelope; consumed by both `apps/api` and `apps/web`. No Prisma types in the package. |
| D-019 | Prisma 7 + `@prisma/adapter-better-sqlite3` verified for the local stack. | Adapter export is `PrismaBetterSqlite3`; migrations commit reproducibly; `prisma.$transaction` rollback verified by test. Prisma 7 forbids `url` in the schema datasource and the config loader cannot import modules, so `prisma.config.ts` is self-contained (assumes repo-root cwd). |
| D-020 | Domain services serialize Prisma rows to contract DTOs at the service boundary. | Prisma returns `Date`; the wire contract is ISO 8601. Mapping in the services keeps API responses typed against `@nexus-med/contracts` and never exposes Prisma models. |
| D-021 | Encounter ids are server-generated (client-side `@default(uuid())`). | Clients never supply encounter ids; no SQL-level default is needed, so no migration change. Patient ids likewise (uuid default). |
| D-022 | UI design decisions U-01–U-08 are authoritative for the O-002/O-005 baseline and recorded in `UI_SPEC.md` §6.2. U-08's unload-only guard is superseded by D-036. | Baseline: edit screens are pages (no modals for data entry); background has a separate edit page; archive is one-way; success feedback uses server re-render; duplicate notice is non-blocking; system font stack and light theme; note edits show an `Editada` badge. |
| D-023 | Expansion mission NX-001…NX-004 approved: appointments+calendar, encounter types, study requests, printable prescriptions/reports — in that order. | Owner mission brief (2026-11-07); smallest useful vertical slices; no new runtime dependencies (CSS-grid calendar, `Intl`, browser print flow — no calendar/date/PDF libraries). |
| D-024 | `type` is a separate field on both `Appointment` (planned) and `Encounter` (actual), same fixed list (`consulta`, `procedimiento`, `visita_domicilio`, `urgencia`); encounter default `consulta`. | The planned and actual visit types can legitimately differ; existing encounter records migrate to `consulta` without changing meaning. |
| D-025 | Dedicated surgical/procedure tracking is **deferred**; the basic flow is carried by encounter `plan` free text + appointment type `Procedimiento` + encounter type `procedimiento`. | The mission says to leave out what cannot be defined confidently rather than invent clinical behavior; exact open question recorded as Q-NX-01. No OR/team/anesthesia/supplies concepts. |
| D-026 | `Appointment` model: `patientId`, `startAt` (instant), `durationMinutes` (5–480), `type`, `status` (`scheduled`/`completed`/`cancelled`), optional `actualDurationMinutes`, optional `linkedEncounterId` (same patient, server-validated). | Covers the mission's behavior set; no recurrence, reminders, or resources; overlap is accepted server-side and made visible in the UI (U-11). |
| D-027 | **Superseded by D-034.** O-005 required every `StudyRequest` to have a patient and immutable originating encounter, with a closed category, free-text description, existing status, and optional result note. | This remains the historical O-005 behavior. O-006 adds patient-level requests while preserving all existing patient and encounter associations and status values. |
| D-028 | Printable documents: one `MedicalDocument` with `kind` (`prescription`/`report`); prescriptions carry structured `PrescriptionLine[]`; printing = WYSIWYG paper card + browser `@media print` CSS; no demo marker, PDF library, invented doctor identity, or legal claims. | Mission constraint (browser print where sufficient); D-046 removes visible fictional-data labels while the synthetic-data boundary remains. |
| D-029 | Demo appointment seeding: fixed-timestamp past appointments (completed/cancelled, linked encounters) plus ~4–6 upcoming appointments anchored to the **first seed run's date** (stored once, never moved on re-seed). | Deterministic history like the nine encounters; a live upcoming schedule is required for the calendar demo to demonstrate anything. Deliberate, documented exception to fixed-timestamp seeding (U-14). |
| D-030 | Calendar rendering: single `/calendar` route with `vista` (`dia`/`semana`/`mes`) + `fecha` query params; CSS grid (no calendar/date library); week starts Monday; day-view window 06:00–22:00 with out-of-window appointments listed separately. | URL-driven state (existing navigation rule); minimal dependency surface; the fixed window keeps the grid honest (U-09/U-10). |
| D-031 | **Conservative scope decision (proposal, not owner-approved):** for this mission the `Encounter.type`/`Appointment.type` fields are sufficient for surgical follow-through — no separate surgery/procedure record, no recommended/scheduled/performed/cancelled state machine, no OR/team/anesthesia concepts are built. | Owner mission brief (2026-11-08) sets this as the default to unblock NX-002 and later slices; the concrete question remains Q-NX-01 and is revisited only after the doctor validates a real need. Replaces no clinical workflow; it defines what is deliberately NOT built now (see D-025). |
| D-032 | Patient overview treats `ordered` and `completed` study requests as pending until they are `reviewed`; each row shows its current status. | Explicit NX-003 phase acceptance in `TASKS.md` resolves the narrower “ordered only” wording in the original UI spec. The study lifecycle and doctor review remain visible without interpreting results. |
| D-033 | **Owner-authorized O-006 implementation scope:** implement the clinical workflow and UX in `UX_REDESIGN.md`, including patient-level study requests with optional encounter association, consultation context, appointment handoff, contextual documents/follow-up, and a focused patient workspace. Keep Q-O006-01…08 open where clinical semantics remain unclear; choose conservative, reversible behavior and preserve existing data. | Owner mission brief 2026-11-09 explicitly authorizes implementation and supersedes the proposal-only boundary recorded in the O-006 design milestone. It does not authorize AI, uploads, staff accounts, external integrations, procedure lifecycle, or reinterpretation of historical study statuses. |
| D-034 | `StudyRequest` belongs to one patient and may have no encounter or one immutable encounter belonging to the same patient. Patient-level requests initially reused category/description; D-041 clarifies the name/detail fields. No source, clinical order-time, correction, reassociation, appointment, or procedure fields are added without validation. | Explicit O-006 mission requirement (2026-11-09). The patient-scoped API derives `patientId` from the route and validates any optional encounter; the existing encounter-scoped API remains compatible. `createdAt` means record-entry time, not necessarily when the doctor ordered the study. |
| D-035 | Keep the existing `ordered` / `completed` / `reviewed` values, forward transitions, and direct `ordered → reviewed` behavior until physician validation defines any replacement. Preserve historical values; the UI must not claim `completed` means performed or result received. | Conservative reversible choice under D-033 and Q-O006-02/03. A result note remains the doctor's text only; no inferred interpretation or event timestamp is added. |
| D-036 | Consultation entry remains explicit-save only, with no autosave or persisted drafts. Dirty note text and staged studies trigger confirmation before in-app navigation, browser history navigation, or unload that would discard them. | Owner O-006 mission requires preserving unsaved work; no draft semantics or persistence were approved. Implement using a clear Spanish confirmation and retain the current values when the doctor cancels navigation. |
| D-037 | Opening an appointment or saving an encounter does not complete or link the appointment. After an encounter is saved, the doctor may explicitly complete the appointment and link that encounter; existing appointment actions still allow completion without an encounter. | Owner O-006 mission requires an explicit appointment relationship and no silent completion. The operation reuses existing validated completion/link APIs. The open question is whether practice policy ever requires an attended appointment without a note. |
| D-038 | Prescription/report creation from an encounter uses the existing form and API with the current patient/encounter association selected; successful save returns to the encounter. Follow-up scheduling creates an ordinary patient appointment and returns to the encounter without implicit linking/completion. An unsaved encounter must be saved before creating a linked document. | Owner O-006 mission. Reuses existing document/appointment contracts and preserves unsaved encounter text by keeping the user in the workspace until save. |
| D-039 | The patient record anchors identity, consultation safety context and compact next-appointment/study-review work. D-042 refines its presentation into focused views rather than aggregating full histories in the overview. No cross-patient task dashboard is added. | Owner-authorized O-006 design and UX_REDESIGN.md; keeps the patient record as the anchor and avoids adding a new prioritization model. |
| D-041 | Study requests have a required doctor-authored `name` (2–200 chars) and nullable optional `description` (≤500 chars). `Otro` exposes both; the name is the study title. A data-preserving migration moves every existing `description` into `name` and clears the new detail field. | Explicit owner UI review (2026-11-09): requested a titled “Otro” study with optional further description. The existing field held the actual study name, so a SQLite migration preserves it without changing associations, statuses, notes or timestamps. No clinical status semantics change. |
| D-042 | Patient navigation switches focused URL-driven SSR views: overview, consultations, appointments, studies, documents and background. The overview holds demographics and compact next work; full lists live only in their owning section. D-043 subsequently moves background into overview; `/contexto-clinico` becomes a compatibility redirect and no longer aggregates recent notes/studies/scheduling. Scheduling and clinical notes remain distinct and explicitly linked. | Explicit owner feedback (2026-11-10): the prior menu mostly scrolled a combined page and duplicated history. Refines D-039 presentation without changing clinical entities, state semantics, saving or API/schema. Existing overview hash links route to the owning view. |
| D-043 | Compact entry uses three reversible new-consultation presentation stages, native medication/study/follow-up dialogs, explicit final saves and domain-owned dirty confirmation. Background is in Resumen with no separate navigation item. New prescription entry captures instructions only at document level; stored line instructions remain visible/read-only, are retained in updates and still print. | Explicit owner feedback 2026-11-10, including follow-up dialogs and English documentation. Refines D-042 presentation without changing clinical fields, API/schema, automatic study ownership, appointment linkage/status or the manual-save boundary. New-note orders persist atomically with the note; following stages must never submit automatically. |

## D-044 — Secretary workflow approved — 2026-11-10

The owner authorizes a secretary administrative view without authentication, covering patients, scheduling, reception/shared waiting queue and study receipt. This supersedes D-001's single-user workflow exclusion; one treating surgeon and local synthetic-only runtime remain. Physician/Secretary is a view switch, not access control. Secretary UI shows administrative information only. Both views may receive a study for a patient with optional consultation association; an existing request is not required. Brief tasks should primarily use native modals. D-045 subsequently approves local PDF/image attachments. Do not equate receipt with clinical review or reinterpret historical study statuses.

## O-007 UI v0 presentation decision — 2026-11-09

**D-040 — Confirmed implementation direction under the owner's UI v0 mission:** extend the existing CSS-token/primitives/domain-component system without new UI packages. Share study-entry rendering within the patient domain, consolidate control styles, fix calendar/history geometry and contrast, and use a collapsed narrow-screen context with ordinary page scrolling. Keep clinical contracts/status semantics, explicit saves, offline assets and browser-print isolation unchanged. The visual refinement is provisional for later Figma/owner review, not final branding approval. See `UI_SPEC.md` §9 and `TESTING.md` for actual behavior/evidence.

## Historical O-006 proposals (superseded by D-033 and UI_SPEC.md §8)

- P-UX-01, P-UX-02, and P-UX-04 were authorized by D-033 and are now implementation scope, subject to the accepted data/status rules in D-034…D-039.
- P-UX-03 remains a physician-validation question; D-035 retains current statuses until then.
- P-UX-05 remains open only as a future draft requirement. D-036 explicitly keeps O-006 manual-save-only with no persisted drafts.

The owner mission makes the approved O-006 design implementable. It does not resolve the clinical questions listed below or authorize any new behavior beyond D-033…D-039. See `UX_AUDIT.md` / `UX_REDESIGN.md`.

## Proposed implementation details

| ID | Proposal | Rationale |
|---|---|---|
| P-001 | Use `@hono/node-server` locally. | Run the same Hono app behind a local Node.js HTTP service. Implemented in O-001. |
| P-002 | Use `@prisma/adapter-better-sqlite3` for local SQLite. | Documented Prisma 7 local SQLite driver adapter. Implemented in O-001 (see D-019). |
| P-003 | Use npm workspaces with `apps/web` and `apps/api`. | Two deployable applications in one manageable repository. Implemented in O-001. |
| P-004 | Next.js Server Components call Hono over server-to-server HTTP for initial reads. | SSR while keeping Hono as the single data/business API. |
| P-005 | Client Components call Hono through a small typed API client. | Keep all authoritative mutations and validation in Hono. |
| P-006 | Use no-store behavior for patient/encounter data. | Clinical data is private and mutable; avoid static/shared caching. |
| P-007 | Root `npm run dev` migrates, seeds, and starts both applications. | Immediate usable developer experience. Implemented in O-001 (`scripts/dev.mjs`). |
| P-008 | Future API Worker entry point uses Hono's Fetch contract. | Preserve a path from Node.js to Cloudflare Workers. |
| P-009 | Use stable demo IDs and create-if-missing seed logic. | Repeated startup must not duplicate or overwrite demo/user data. Implemented and test-verified in O-001. |
| P-010 | Add a narrow `packages/contracts` workspace for shared API DTOs and runtime-safe schemas. | Confirmed as D-018; implemented in O-001. |

## Open future decisions

- ~~O-001: Validate Prisma 7 with `@prisma/adapter-better-sqlite3`, generated client, migrations, and local transactions during implementation.~~ — Resolved in O-001; see D-019 and `TESTING.md`.
- O-002: Validate critical multi-write workflows against D1 capabilities and Prisma's D1 adapter before a Cloudflare deployment decision.
- O-003: Choose and test the Next.js SSR Worker adapter when deployment enters scope.
- O-004: Decide how the frontend runtime communicates with the API Worker (for example, service bindings).
- O-005: Define Google OAuth/OIDC, session handling, and access policy when authentication enters scope.
- O-006: Decide file storage and private R2 integration if document management enters scope.
- O-007: Confirm exact required patient demographic and encounter fields with the doctor.
- Q-NX-01 (surgical follow-through, NX-002): Does the doctor want an explicit procedure record with its own status (recommended / scheduled / performed / cancelled) and links to the eventual appointment/encounter, beyond free-text plan + appointment type? If yes, design the minimal record before building — do not invent OR/team/anesthesia concepts (D-025).
- Q-NX-02 (study categories, NX-003): Confirm the fixed category list with the doctor (proposed: `Laboratorio`, `Imagenología`, `Rayos X`, `ECG`, `Ecografía`, `Otro` + free-text description).
- Q-O006-01: Patient-level study requests are authorized. Does the doctor require a minimum reason/source or a separate clinical order time in addition to the record-entry time? Current implementation adds no such fields.
- Q-O006-02: What does the existing study state `completed` mean in clinical practice: performed, result available, or both? Is direct `ordered → reviewed` valid?
- Q-O006-03: How are results received and documented in this local prototype without uploads/integrations? When may a doctor-authored result note be edited, and is a separate review timestamp required?
- Q-O006-04: How should an erroneous or cancelled study request be represented under the current no-delete rule?
- Q-O006-05: Should appointment completion and encounter linkage happen together, separately, or during encounter save? Can an attended appointment be completed without an encounter note?
- Q-O006-06: Are persisted encounter drafts needed? If so, what does a draft mean, who can see it, and how is it distinguished from an ordinary saved/edited encounter? Autosave is not assumed.
- Q-O006-07: No appointment/procedure association is included in O-006. Revisit only if a demonstrated workflow need requires it; encounter association remains immutable after create. This is a deferred scope question, not a blocker.
- Q-O006-08: Which preparation tasks are clinically useful before a procedure, and which tasks could a secretary prepare versus doctor-only? No staff role or procedure lifecycle is authorized by this question.

Q-O006 items remain open where clinical meaning or future scope needs physician input. D-033 authorizes the O-006 implementation, while D-034…D-039 and `UI_SPEC.md` §8 constrain the behavior that may proceed before those questions are resolved.

## Superseded decisions

| ID | Superseded direction | Replacement |
|---|---|---|
| S-001 | Client-only Next.js rendering for clinical data. | Request-time SSR / Server Components fetching from Hono. |
| S-002 | Next.js full-stack app with direct database access. | Separate Hono API owns all persistence and business rules. |
| S-003 | No SSR / no Server Components. | Request-time SSR for clinical page reads. |
| S-004 | Express as API framework. | Hono selected. |
| S-005 | Drizzle ORM. | Prisma ORM 7 selected. |
| S-006 | Local D1/Miniflare as prototype persistence. | Ordinary local SQLite; no Cloudflare tooling in prototype. |
| S-007 | Docker, CI/CD, or remote Cloudflare setup in prototype. | Deferred. |
| S-008 | Git work is local-only; never push, open remote PRs, or merge. | Remote pushes and PRs are allowed; only an exceptionally solid foundational/base PR may be merged autonomously. Feature PRs normally remain open unless explicitly authorized. |

## Transaction note

A transaction groups related database operations so that they commit together or roll back together. Local SQLite supports Prisma transactions; the selected driver and rollback behavior must be tested in the prototype. D1 has its own atomic `batch()` behavior, but the Prisma D1 adapter does not provide the same general transaction API as local SQLite. This is a future deployment constraint, not a reason to change the local ORM now.

## Decision rule

For consequential choices, present the smallest useful option set and one recommendation. Keep confirmed decisions, implementation proposals, and open questions distinct. Update this log and affected documents when decisions change.

## D-045 — Local study attachments approved — 2026-11-10

The owner explicitly selected local PDF/image storage. A received study has a patient, optional consultation and optional existing order, a title, optional study date and receipt note, received time, local attachments, and a separate explicit physician review. Both views share entry. External studies do not create fictional orders. Historical `StudyRequest.status` and result notes are not modified by receipt/review. Limit files to 5 per receipt, PDF/PNG/JPEG, 10 MiB each, 24 MiB combined, 25 MiB multipart transport. Validate signatures and associations in Hono. Store opaque file keys beside the SQLite database under `study-files/`, outside Git/public assets; retain files and records, no deletion or replacement UI in this slice. Authentication and network deployment remain deferred.


## D-046 — Presentation without demonstration labels — 2026-11-10

**Status:** Accepted, explicit owner instruction. Remove demonstration/fictional-data labels from application chrome, startup output, and printable documents. This supersedes earlier requirements for visible demonstration labels only. Preserve exact seed fixtures, existing records, local-only operation and the synthetic-data development boundary. The owner also approves an operational reception overview derived from existing appointments and queue data; no invented activity or new clinical states.

## D-047 — Secretary patient cards and shared-study synchronization — 2026-11-11

**Status:** Accepted from owner feedback. Show phone and email on secretary patient cards, using an administrative DTO that excludes medical history. Call the shared section and navigation item **Estudios**; secretary and physician continue to use the same study receipt workflow, and physician review remains explicit. Refresh the shared studies list and reception queue every 30 seconds while visible, also refresh on focus, and keep a compact manual refresh action. This uses periodic API requests, not push notifications.

## D-048 — Reception entry and unified patient activity — 2026-11-11

**Status:** Accepted from owner feedback. Apply a selected agenda date immediately; use “Citas de hoy” only when the selected date is today. Use “En consulta” for started attention. Secretary registers arrival; the physician can start an unarrived scheduled consultation in one atomic transition. Keep scheduling (`Nueva cita`) separate from direct clinical entry (`Nueva consulta`). Reception can start an unscheduled consultation by searching/selecting a patient or registering one and continuing to the note. Patient navigation combines appointments and consultations into one `Citas y consultas` view, but keeps appointment logistics and clinical encounters visibly distinct. Existing detail/edit routes remain valid.

Use a compact anchored patient search panel that shows no directory results until the user types, places `Registrar nuevo paciente` above a divider, and supports explicit result selection. Full patient forms remain accessible dialogs with a visible close control and internal scrolling.

## D-049 — Patient study detail and current-day example — 2026-11-11

**Status:** Accepted from owner feedback. Patient study requests open a detail page that shows their existing order metadata, authored notes and associated received-study attachments. Receiving files does not alter order status; physician review remains explicit. Seed one stable, idempotent received-study example dated to the practice's current local date so the inbox and detail workflow are visible. The sample PDF contains no clinical findings. Clear the exact unchanged fixture note values (including the old study result text) in the checked-in seed data and migrate only matching legacy values; preserve user edits and the synthetic-data development boundary.
