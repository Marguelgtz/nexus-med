# Nexus Med — Local Medical Practice Prototype

A local-first prototype specification for one general surgeon. The product objective is to validate patient management and clinical continuity using clearly synthetic demo records.

> **Current implementation baseline (2026-11-09):** O-001–O-005 are implemented and integrated-verified on `feat/nx-expansion-complete` (`1309b513`). O-006 implementation is authorized and underway on `feat/o006-clinical-workflows`, stacked on the O-006 design branch; O-006 capabilities are not yet included in this baseline. See `docs/ACTION_PLAN.md` and `docs/TESTING.md` for current execution and verification state.

## Implemented capabilities and phase status

- Patient registry/search, patient data and background, archive, clinical encounters and timeline.
- Appointment create/list/detail/update, completion/cancellation, optional encounter linking and day/week/month calendar.
- Encounter type (`consulta`, `procedimiento`, `visita_domicilio`, `urgencia`).
- NX-003 study requests: new-encounter rows **and** appending to an existing encounter; patient/encounter lists, `ordered`/`completed` pending filtering, forward status changes and result notes. Standalone patient-level ordering without any encounter is **not implemented**.
- NX-004 structured doctor-authored prescriptions and reports: models, API, patient-level forms, detail/edit, synthetic fixtures and browser printing are implemented. File uploads/storage, authentication and deployment remain excluded.

See `docs/ACTION_PLAN.md` for verified vs unverified status and `docs/API_CONTRACT.md` for implemented routes.

## Confirmed architecture

- `apps/web`: Next.js App Router + TypeScript, using request-time SSR / Server Components for patient and encounter pages.
- `apps/api`: independent Hono + TypeScript HTTP API, running on Node.js locally.
- `packages/contracts` (confirmed): shared, runtime-safe request/response contracts consumed by the frontend and API; contains no Prisma models or business implementation.
- `prisma/`: Prisma ORM 7 schema, migrations, and synthetic seed script.
- Local persistence: SQLite file at `.local/data/medical.db`.
- Frontend reads initial page data from Hono over server-to-server HTTP. Browser interactions also use Hono through a small typed API client.
- The frontend never imports Prisma or accesses SQLite directly.
- Both local services are started by one root command: `npm run dev`.

## Repository organization

The top-level layout communicates ownership: `apps/web` is the Next.js presentation layer, `apps/api` owns domain behavior and persistence, `packages/contracts` is the owner of shared HTTP contracts, `prisma/` owns relational schema/migrations/seed, `scripts/` owns local startup, and `docs/` preserves product and engineering context. Within the web app, `src/app/` contains routes, `src/components/` contains workflow-specific UI (`patients/`, `appointments/`, `shell/`) and shared primitives, and `src/lib/` holds the API transports and formatting utilities. Within the API, `src/domains/` contains patients, encounters, appointments, and studies. The canonical file tree, naming conventions, dependency directions, and growth rules are in `docs/ARCHITECTURE.md` Section 8.

## Included synthetic demo fixture

`docs/demo-dataset.json` contains **7 fictional patients (6 active and 1 archived), 9 encounters, 4 fixed past appointments, and 2 study requests**. The seed also creates **5 upcoming first-seed-anchored appointments**. The newest study fixtures are present in source but were not re-verified during this documentation PR. It also includes a patient with no encounters and multiple patients with consultation history. All note sections carry an unmistakable fictional/demo warning.

This JSON fixture is checked-in demo input; the Prisma seed script (`prisma/seed.ts`) creates the corresponding records idempotently (create-if-missing, never overwrites edits). `npm run dev` applies it on every startup, so a first run opens on a populated registry.

## First-run experience — required final behavior

After dependencies are installed, the intended experience is:

1. Run `npm run dev`.
2. The bootstrap script creates the local data directory, applies pending Prisma migrations, and invokes the idempotent demo seed.
3. Next.js and Hono start together.
4. Open `http://127.0.0.1:3000`; the root route takes the doctor to `/patients`.
5. The patient registry already contains synthetic demo patients and consultation history.
6. A persistent, unmistakable **DEMO / DATOS FICTICIOS** indicator makes clear that all records are fictional.

The first startup must be populated and useful, not an empty shell. The initial active registry shows six demo patients; the seventh fixture patient is archived and retrievable through the archived view. The dataset also includes nine encounters, three patients with multiple encounters, one patient with no encounters, nine appointments in total, and two encounter-linked study requests. Repeated starts must not duplicate records, reset the database, or overwrite edits. See `docs/DEMO_DATA.md`.

## Local-only boundaries

- Node.js runs both apps. No Cloudflare account, remote resource, Worker runtime, Wrangler, or network connection is used at application runtime.
- SQLite is a local file; no separate database server is started.
- File storage/uploads and Google authentication remain pending and excluded; browser-printable prescription/report records are separately planned for NX-004.
- Docker and CI/CD are deferred.
- Use synthetic data only. Never enter real patient information.
- Cloudflare Workers and D1 are future deployment candidates, not active dependencies.

## Developer commands

| Command | Behavior |
|---|---|
| `npm install` | Install dependencies (internet required for initial install). |
| `npm run dev` | Migrate, idempotently seed demo records, and start Next.js (3000) + Hono (4000). Ctrl+C stops both. |
| `npm run db:migrate` | Apply committed local migrations. |
| `npm run db:migrate:dev` | Create a new development migration. |
| `npm run db:seed` | Create missing demo records without overwriting existing records. |
| `npm run db:reset` | Destructive reset; requires an explicit `--confirm` flag. Never runs during startup. |
| `npm run typecheck` | Type-check all workspaces. |
| `npm run lint` | Lint the repository. |
| `npm run test` | Run tests (API integration suite + web unit suite). |
| `npm run build` | Build all workspaces (currently the Next.js production build). |

All commands are implemented and verified; see `docs/TESTING.md` for the verification evidence.

## Documentation map

- `AGENTS.md` — instructions for Hermes Agent, action planning, commits, and local PR stacks.
- `docs/PRODUCT.md` — product scope, user stories, and acceptance criteria.
- `docs/WORKFLOWS.md` — detailed doctor journeys and edge cases.
- `docs/ARCHITECTURE.md` — application topology, SSR/API flow, persistence, startup, and future Cloudflare boundary.
- `docs/API_CONTRACT.md` — Hono request/response contract, finalized during the database/API foundation (O-001).
- `docs/UI_SPEC.md` — UX/UI specification (O-002, 2026-11-07): screens, interactions, states, visual system; implementation-ready for O-003.
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
- `docs/UX_AUDIT.md` — current UX/workflow issues grounded in source code (O-006 discovery).
- `docs/UX_REDESIGN.md` — owner-authorized O-006 clinical workflow and UX direction; implementation status is tracked in `docs/ACTION_PLAN.md`.
- `docs/BOOTSTRAP_PROMPT.md` — implementation prompt for Hermes.

## Development order

The agreed order is database/API foundation first, UX/UI design second, and product implementation third. The database and API are not frozen after the foundation: revise Prisma models/migrations, Hono routes/contracts, validation, and tests when real implementation requirements justify it. See `ACTION_PLAN.md`, `TASKS.md`, and `ROADMAP.md`.

## Planning and project memory

The planning documents have separate responsibilities: `ROADMAP.md` is strategic, `TASKS.md` defines phase-level work and is normally revised only between phases, `ACTION_PLAN.md` is the living execution plan updated throughout work, and `PROJECT_HISTORY.md` is the retrospective archive. `DECISIONS.md` remains authoritative for current accepted decisions.

## Git workflow

Use professional branches and atomic Conventional Commits. Remote pushes and PR creation are allowed when useful; stackable PRs are optional and may remain open/merge-ready. Only an exceptionally solid foundational/base PR may be merged autonomously after all relevant checks and acceptance criteria pass with no blockers. Feature/UI/workflow PRs remain open unless the owner explicitly authorizes their merge. See `AGENTS.md`.
