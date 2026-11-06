# Medical Practice Platform — Local MVP Starter

A local-first prototype specification for one general surgeon. The product objective is to validate patient management and clinical continuity using clearly synthetic demo records.

> **Current artifact status:** This starter currently contains project documentation and agent instructions only. It is not yet a runnable application: the Next.js app, Hono API, Prisma schema/migrations, seed script, package manifests, and UI have not been implemented. Hermes must build and verify those deliverables before the application can be started.

## Confirmed architecture

- `apps/web`: Next.js App Router + TypeScript, using request-time SSR / Server Components for patient and encounter pages.
- `apps/api`: independent Hono + TypeScript HTTP API, running on Node.js locally.
- `packages/contracts` (proposed): shared, runtime-safe request/response contracts consumed by the frontend and API; contains no Prisma models or business implementation. Confirm during the database/API foundation.
- `prisma/`: Prisma ORM 7 schema, migrations, and synthetic seed script.
- Local persistence: SQLite file at `.local/data/medical.db`.
- Frontend reads initial page data from Hono over server-to-server HTTP. Browser interactions also use Hono through a small typed API client.
- The frontend never imports Prisma or accesses SQLite directly.
- Both local services are started by one root command: `npm run dev`.

## Repository organization

The top-level layout communicates ownership: `apps/web` is the Next.js presentation layer, `apps/api` owns domain behavior and persistence, `packages/contracts` is the proposed owner for shared HTTP contracts, `prisma/` owns relational schema/migrations/seed, `scripts/` owns local startup, and `docs/` preserves product and engineering context. Within the web app, `src/app/` contains routes and `src/features/` contains workflow-specific UI. Within the API, `src/domains/` contains patients and encounters. The canonical file tree, naming conventions, dependency directions, and growth rules are in `docs/ARCHITECTURE.md` Section 8.

## Included synthetic demo fixture

`docs/demo-dataset.json` is included now; it contains **7 fictional patients (6 active and 1 archived) and 9 fictional encounters**. It also includes a patient with no encounters and multiple patients with consultation history. All note sections carry an unmistakable fictional/demo warning.

This JSON fixture is checked-in demo input, not a populated SQLite database. The Prisma seed script and application code have not been implemented yet. Hermes must implement the schema, migrations, seed, API, frontend, and first-run bootstrap before the application becomes runnable. The expected result after that work is a working local app with these records already visible.

## First-run experience — required final behavior

After dependencies are installed, the intended experience is:

1. Run `npm run dev`.
2. The bootstrap script creates the local data directory, applies pending Prisma migrations, and invokes the idempotent demo seed.
3. Next.js and Hono start together.
4. Open `http://127.0.0.1:3000`; the root route takes the doctor to `/patients`.
5. The patient registry already contains synthetic demo patients and consultation history.
6. A persistent, unmistakable **DEMO / DATOS FICTICIOS** indicator makes clear that all records are fictional.

The first startup must be populated and useful, not an empty shell. The initial active registry shows six demo patients; the seventh fixture patient is archived and retrievable through the archived view. The dataset also includes nine encounters, three patients with multiple encounters, and one patient with no encounters. Repeated starts must not duplicate records, reset the database, or overwrite edits. See `docs/DEMO_DATA.md`.

## Local-only boundaries

- Node.js runs both apps. No Cloudflare account, remote resource, Worker runtime, Wrangler, or network connection is used at application runtime.
- SQLite is a local file; no separate database server is started.
- File storage/uploads and Google authentication are pending and excluded from this prototype.
- Docker and CI/CD are deferred.
- Use synthetic data only. Never enter real patient information.
- Cloudflare Workers and D1 are future deployment candidates, not active dependencies.

## Developer commands — target, not yet implemented

| Command | Intended behavior |
|---|---|
| `npm install` | Install dependencies (internet required for initial install). |
| `npm run dev` | Migrate, idempotently seed demo records, and start Next.js + Hono. |
| `npm run db:migrate` | Apply committed local migrations. |
| `npm run db:migrate:dev` | Create a new development migration. |
| `npm run db:seed` | Create missing demo records without overwriting existing records. |
| `npm run db:reset` | Destructive reset; require interactive confirmation or an explicit `--confirm` flag. Never runs during startup. |
| `npm run typecheck` | Type-check all workspaces. |
| `npm run lint` | Lint all workspaces. |
| `npm run test` | Run tests. |

These are target commands, not claims that scripts currently exist. Hermes must implement them and verify exact behavior before marking them complete.

## Documentation map

- `AGENTS.md` — instructions for Hermes Agent, action planning, commits, and local PR stacks.
- `docs/PRODUCT.md` — product scope, user stories, and acceptance criteria.
- `docs/WORKFLOWS.md` — detailed doctor journeys and edge cases.
- `docs/ARCHITECTURE.md` — application topology, SSR/API flow, persistence, startup, and future Cloudflare boundary.
- `docs/API_CONTRACT.md` — initial Hono request/response contract; validate and finalize during the database/API foundation phase.
- `docs/UI_SPEC.md` — planned UX/UI design deliverable created and reviewed after the database/API foundation, before feature UI implementation.
- `docs/DATA_MODEL.md` — current prototype entities and relationships.
- `docs/DEMO_DATA.md` — synthetic dataset and seeding rules.
- `docs/demo-dataset.json` — exact fictional patient/encounter fixture payload.
- `docs/SECURITY.md` — prototype safety and future deployment boundary.
- `docs/DECISIONS.md` — confirmed decisions, proposals, open questions, and superseded choices.
- `docs/ROADMAP.md` — high-level phase sequence and intended outcomes.
- `docs/TASKS.md` — stable phase-level work packages, deliverables, dependencies, and acceptance criteria; normally updated at phase boundaries.
- `docs/ACTION_PLAN.md` — living execution state, continuously updated with active objective, progress, blockers, verification, local branch/PR stack, and next action.
- `docs/PROJECT_HISTORY.md` — chronological archive of significant milestones, findings, lessons, and material scope changes.
- `docs/TESTING.md` — verification requirements.
- `docs/BOOTSTRAP_PROMPT.md` — implementation prompt for Hermes.

## Development order

The agreed order is database/API foundation first, UX/UI design second, and product implementation third. The database and API are not frozen after the foundation: revise Prisma models/migrations, Hono routes/contracts, validation, and tests when real implementation requirements justify it. See `ACTION_PLAN.md`, `TASKS.md`, and `ROADMAP.md`.

## Planning and project memory

The planning documents have separate responsibilities: `ROADMAP.md` is strategic, `TASKS.md` defines phase-level work and is normally revised only between phases, `ACTION_PLAN.md` is the living execution plan updated throughout work, and `PROJECT_HISTORY.md` is the retrospective archive. `DECISIONS.md` remains authoritative for current accepted decisions.

## Git workflow

Use professional branches and atomic Conventional Commits. Remote pushes and PR creation are allowed when useful; stackable PRs are optional and may remain open/merge-ready. Only an exceptionally solid foundational/base PR may be merged autonomously after all relevant checks and acceptance criteria pass with no blockers. Feature/UI/workflow PRs remain open unless the owner explicitly authorizes their merge. See `AGENTS.md`.
