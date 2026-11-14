# Initial Implementation Prompt — Medical Platform MVP

Run Hermes Agent from the repository root. This prompt initializes and implements the local MVP in the project's required order; it is not permission to skip the database/API foundation or UX design.

---

You are the implementation agent for this repository. Read `AGENTS.md` and all relevant documents in `docs/` before changing anything, especially `ACTION_PLAN.md`, `TASKS.md`, `ROADMAP.md`, `DECISIONS.md`, `PROJECT_HISTORY.md`, `DATA_MODEL.md`, `PRODUCT.md`, and `WORKFLOWS.md`.

The owner prefers concise hierarchical action plans, small professional Conventional Commits, coherent PRs, and dependency-aware PR stacks when they improve reviewability. Remote pushes and PR creation are allowed when useful. PRs may remain open and merge-ready; keeping them open is optional. You may merge only an exceptionally solid foundational/base PR after all relevant checks and acceptance criteria pass with no blockers. Do not merge feature/UI/workflow PRs without explicit owner authorization. Follow `AGENTS.md` for the exact policy.

## Planning-document responsibilities

- `ACTION_PLAN.md` is the living execution state. Update it throughout work and at each substantial session handoff.
- `TASKS.md` is the stable phase-level work definition. Do not update progress after each task or commit; revise it at phase boundaries or after an approved material scope change.
- `ROADMAP.md` is strategic.
- `PROJECT_HISTORY.md` is a retrospective archive. Add significant milestones and durable findings, not a transcript.
- `DECISIONS.md` is authoritative for current decisions.

## Product objective

Deliver a usable local prototype for one general surgeon. After initial dependency installation, it must run without internet access or remote services. On first launch, it should open a patient registry populated with clearly fictional demo patients and consultation history.

## Required order of work

### O-001 — Database and API foundation (first)

Do not begin product UX/UI implementation in this objective. A minimal frontend shell or smoke route is permitted only to verify runtime connectivity.

1. Inspect repository, Node.js/npm environment, Git status, remotes, and existing changes. Preserve owner work.
2. Establish the npm-workspaces monorepo with `apps/api` and `apps/web`; validate and add the proposed `packages/contracts` workspace only if it will be the single shared owner of request/response DTOs and runtime-safe schemas; do not create a generic shared utilities package.
3. Implement the initial Patient, medical-background, and Encounter relational model from `DATA_MODEL.md` using Prisma ORM 7 and local SQLite.
4. Generate and inspect committed migrations; test clean database migration and representative local transaction rollback.
5. Implement deterministic, idempotent synthetic seeding from `docs/demo-dataset.json` and `docs/DEMO_DATA.md`.
6. Implement Hono API conventions: request validation, explicit response DTOs, consistent errors/statuses, health route, patient queries/commands, medical-background operations, encounter operations, and patient timeline retrieval.
7. Add API/integration tests for validation, relationships, search, migrations, seed idempotency, and persistence.
8. Configure the minimal Next.js SSR-to-Hono smoke path and root `npm run dev` orchestration; no product screens yet.
9. Verify the database/API foundation and prepare a coherent base PR if useful.

### O-002 — UX/UI design (second)

1. Review actual data model and API contracts alongside `PRODUCT.md` and `WORKFLOWS.md`.
2. Define information architecture, navigation, screen inventory, and clinical information hierarchy.
3. Design patient registry/search, patient overview, medical background, consultation entry, encounter detail, and timeline.
4. Define form interactions and loading, empty, error, validation, save, archive, and demo states.
5. Define a small visual system and responsive behavior.
6. Produce `docs/UI_SPEC.md` and design artifacts where useful.
7. Review the specification against P0 user stories before feature UI implementation begins.

### O-003 — Product implementation (third)

Implement the approved design in complete vertical slices:

1. Application shell and navigation.
2. Patient registry, search, create, and edit.
3. Patient overview and medical background.
4. Consultation form and encounter detail.
5. Clinical timeline and full workflow integration.
6. Recovery states, accessibility basics, and end-to-end verification.

**Database/API are not frozen.** If a user workflow or implementation reveals a real gap, update Prisma models with a new migration, revise Hono routes/DTOs/validation, update tests, and synchronize docs. Do not avoid a justified backend change merely because the initial API foundation was completed. Do not change contracts gratuitously.

### O-004 — First-run demo and reliability (fourth)

1. Ensure first startup creates exactly the fixture records: 7 fictional patients (6 active, 1 archived) and 9 fictional encounters.
2. Root `/` redirects to `/patients`; the interface shows `MODO DEMOSTRACIÓN — TODOS LOS DATOS SON FICTICIOS`.
3. Verify all seeded records appear in the correct patient and archive contexts.
4. Verify repeated startup/seeding does not duplicate records or overwrite edits/user-created data.
5. Verify full end-to-end workflows, restart persistence, and offline runtime.

## Confirmed local stack and constraints

- `apps/web`: Next.js App Router + TypeScript, request-time SSR / Server Components.
- `apps/api`: separate Hono + TypeScript API on Node.js locally.
- Hono owns validation, domain/application behavior, and all database access.
- Prisma ORM 7 + local SQLite.
- One root command: `npm run dev`.
- No Cloudflare connection, remote resource, Wrangler runtime, or production credentials in the prototype.
- File storage and Google authentication are pending and excluded.
- Docker and CI/CD are excluded.
- Synthetic data only. Never use real patient information.

## Demo data requirements

Use `docs/demo-dataset.json` as the authoritative fixture. Do not silently substitute a different dataset.

- 7 fictional patients: 6 active and 1 archived.
- 9 fictional encounters.
- Multiple encounters for some patients.
- At least one patient with no encounters.
- Stable fixture identifiers and fixed dates.
- Use synthetic note content only. D-054 requires a persistent warning in authenticated controlled-pilot views; D-046 keeps startup output and printable documents unlabelled.
- Idempotent create-if-missing behavior; never overwrite local edits or user-created records.
- Normal startup must never reset the database.

Prisma 7 seeding must be invoked explicitly; do not assume migration commands automatically run the seed.

## Local developer experience

After `npm install`, `npm run dev` must:

1. Ensure `.local/data/` exists.
2. Apply committed migrations to local SQLite.
3. Explicitly invoke the seed.
4. Start Hono and wait for `/health`.
5. Start Next.js.
6. Print local URLs and shut down both processes cleanly on Ctrl+C.

Provide explicit `db:migrate`, `db:seed`, and destructive `db:reset` commands. Reset requires confirmation and is never part of normal startup.

## Engineering expectations

- Follow current official documentation and supported versions.
- Use strict TypeScript, clear domain boundaries, reviewed migrations, explicit API DTOs, consistent validation/errors, and automated tests.
- Keep code DRY: avoid duplicated business rules, validation, transport types, or database access. Do not return raw Prisma models as API responses.
- DRY does not justify speculative generic layers or premature abstractions.
- Hono is the only authoritative data/API boundary; Next.js does not access Prisma/SQLite directly.
- The initial API contract is not immutable; make justified, tested changes as design and implementation reveal needs.
- No real patient data, authentication, file storage, scheduling, billing, AI clinical features, Docker, CI/CD, or Cloudflare connectivity.

## Git, PRs, and merges

Use professional branches and atomic Conventional Commits. Pushes and remote PR creation are allowed when useful. Prepare stackable PRs when they improve reviewability; they are optional. PRs may remain open and merge-ready while further work continues on top. You may merge only an exceptionally solid foundational/base PR after all relevant checks, tests, migrations, acceptance criteria, and documentation pass with no blockers. Leave feature/UI/workflow PRs open unless the owner explicitly authorizes their merge. Do not force-push or bypass checks.

## Final handoff

Keep `ACTION_PLAN.md` current with actual progress, verification, blockers, branch/commit/PR state, and next action. Revise `TASKS.md` only at phase boundaries or approved material scope changes. Add significant milestones/findings to `PROJECT_HISTORY.md` and update `DECISIONS.md` when decisions change.

Report actual functionality delivered, tests executed, PRs opened, any merge performed and why, known gaps, and the next action. Never claim success for unexecuted checks.
