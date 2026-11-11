# Architecture — Medical Platform MVP

**Status:** Confirmed local architecture; NX-001…NX-004 implemented and browser-verified on `feat/nx-expansion-complete` as of 2026-11-08. Cloudflare remains future-only.
**Version:** 0.4  
**Product:** Single-doctor medical practice platform  
**Immediate target:** Fully local, offline-capable prototype using synthetic data  
**Future deployment direction:** Separate Next.js frontend and Hono API deployment surfaces on Cloudflare, with D1 evaluated as the future relational database

---

## Current Phase 4 code map (2026-11-08)

This implementation inventory complements the original architectural target tree below. The topology is unchanged: local Next.js + Hono, one Prisma/SQLite database, no Cloudflare runtime.

- API domains: `apps/api/src/domains/appointments/`, `studies/`, and `documents/`; `encounters/` also performs atomic study creation.
- Web: `apps/web/src/app/calendar/`, patient appointment/document routes under `apps/web/src/app/patients/[id]/`, workflow components in `apps/web/src/components/appointments/` and `components/documents/`, and study controls under `components/patients/`. Patient navigation selects focused SSR list views (D-042), with shared identity/heading composition in `components/patients/patient-section-header.tsx`.
- Shared contracts: `packages/contracts/src/appointments.ts`, `studies.ts`, `documents.ts`, `encounters.ts`.
- Prisma schema models: `Patient`, `Encounter`, `Appointment`, `StudyRequest`, `MedicalDocument`, and `PrescriptionLine`; documents migration exists.

## 1. Architectural Decisions

The prototype uses two separately runnable applications in one npm-workspaces repository: `apps/web` (frontend, `@nexus-med/web`) and `apps/api` (API, `@nexus-med/api`). A narrow `packages/contracts` workspace (`@nexus-med/contracts`) provides transport DTOs and runtime-safe schemas shared by both applications (established during O-001 with Zod 4).

1. **Frontend — Next.js App Router + TypeScript.** Uses request-time server rendering for patient and encounter pages. Server Components retrieve data from the Hono API. Client Components provide browser interactivity.
2. **API — Hono + TypeScript.** Runs as a separate Node.js HTTP service locally. It owns the HTTP contract, validation, domain/application logic, and all database access.
3. **Database — local SQLite file.** Accessed only by the API through Prisma ORM 7.

The frontend must never import Prisma, open SQLite, or contain authoritative clinical business rules. The Hono API remains the single source of truth for application operations.

The frontend and API are separate applications, not separate product domains or microservices. Keep the number of processes and boundaries limited to these two applications.

### 1.1 Local topology

```text
Browser
  |
  | GET page / interaction
  v
Next.js app (Node.js, localhost:3000)
  | \
  |  \-- Server Components render HTML/RSC at request time
  |
  | server-to-server HTTP/JSON for SSR data reads
  v
Hono API (Node.js, localhost:4000)
  |
  | Prisma ORM 7
  v
SQLite file (.local/data/medical.db)
```

For browser interactions that need to mutate data, Client Components call the Hono API through the shared typed API client. The API is the only place where mutations and validation are authoritative. Configure narrow local CORS for the exact Next.js browser origin. CORS applies to browser-origin requests; the server-to-server HTTP call from a Next.js Server Component to Hono is not governed by browser CORS.

Do not introduce Next.js Server Actions as a second business-logic layer. They may be reconsidered later as thin transport adapters if authentication, same-origin routing, or deployment topology makes that useful; they must never duplicate domain logic or bypass Hono.

### 1.2 Future Cloudflare topology — not active in the prototype

```text
Browser
  |
  v
Next.js SSR frontend deployment / Worker
  |
  | server-to-server request (possibly Cloudflare Service Binding)
  v
Hono API Worker
  |
  | Prisma D1 adapter (future, subject to validation)
  v
Cloudflare D1
```

The frontend and API remain separate deployable applications. The exact Next.js-on-Workers adapter, Hono Worker entry point, worker-to-worker connectivity, domains, and deployment configuration are future decisions. Do not add placeholder Worker files or configure/connect to Cloudflare during prototype development.

---

## 2. Confirmed Decisions and Deferred Items

| Area | Decision | Status |
|---|---|---|
| Application organization | Two applications in one repository | Confirmed |
| Frontend | Next.js App Router + React + TypeScript | Confirmed |
| Rendering | Request-time SSR / Server Components for clinical page reads | Confirmed |
| Frontend data source | Hono API over HTTP; never direct database access | Confirmed |
| API | Hono + TypeScript | Confirmed |
| Local runtime | Node.js for both applications | Confirmed |
| Future API runtime | Cloudflare Workers | Future target |
| Local database | SQLite file | Confirmed |
| Shared API contracts | Narrow `packages/contracts` workspace (`@nexus-med/contracts`) for cross-app DTOs/schemas | In use since O-001 (Zod 4) |
| ORM | Prisma ORM 7 | Confirmed |
| Local SQLite adapter | `@prisma/adapter-better-sqlite3` | Implemented and previously verified with local transaction rollback (D-019) |
| Future database | Cloudflare D1 | Future candidate; transaction behavior must be validated |
| Future Prisma adapter | `@prisma/adapter-d1` | Future candidate; not used locally |
| File storage | No file storage in prototype | Pending / excluded |
| Future file storage | Cloudflare R2 | Pending |
| Authentication | No authentication in prototype | Pending / excluded |
| Future authentication | Google OAuth / OpenID Connect | Pending design |
| Docker | Not required for prototype | Deferred |
| CI/CD | Not required for prototype | Deferred |
| Cloudflare connectivity | No account, login, remote resource, or Wrangler runtime required | Confirmed constraint |
| Cloudflare preparation | Keep code boundaries and concise notes; no fake deployable setup | Confirmed direction |

`DECISIONS.md` is the authoritative decision log. Update it when a material decision changes.

---

## 3. What SSR Means in This Project

Use the Next.js App Router. In this architecture, SSR means patient and encounter pages are rendered on the server at request time using Next.js Server Components.

This does **not** mean the entire interface is server-only or that the API is removed.

- **Server Components:** load data from Hono, compose the initial page, and render HTML/RSC on the server.
- **Client Components:** handle interactive state, buttons, search-as-you-type, controlled forms, and browser APIs.
- **Hono API:** remains the only data/business backend and owns all database writes and validation.

Next.js App Router pages and layouts are Server Components by default. Add `'use client'` only where browser interactivity requires it. Do not turn entire routes into Client Components just to use one interactive control.

### 3.1 Server-side reads

For initial page data, a Server Component calls the standalone Hono API directly over HTTP using an internal server-only API base URL.

Example shape (illustrative only; use the current Next.js API and route conventions when implementing):

```ts
const response = await fetch(`${API_INTERNAL_URL}/api/patients/${patientId}`, {
  cache: 'no-store',
});
```

Do not call a Next.js Route Handler as an intermediate proxy when a Server Component can call Hono directly. Next.js documents that this adds an unnecessary HTTP round trip.

Clinical information is private and mutable. For patient records, encounter notes, and related clinical data:

- Fetch at request time.
- Use explicit no-store behavior.
- Do not statically generate patient-specific pages.
- Do not place clinical data in a shared CDN or cross-user cache.
- Treat API failures as real page errors or useful recoverable states; never render stale clinical data as though it were current.

### 3.2 Browser interactions and mutations

Client Components may call Hono endpoints through one shared, typed API client.

- Keep the Hono API as the only authoritative API contract.
- Use HTTP/JSON for reads and mutations initiated after hydration.
- Configure CORS narrowly for the exact local Next.js origin.
- Do not use wildcard origins as a shortcut.
- Validate every mutation in Hono, even if the frontend validates for user experience.
- After a successful mutation, refresh/revalidate the affected Next.js route so the server-rendered view reflects persisted data.

Server Actions are not required for SSR. Do not add them by default. If a future authentication or same-origin requirement motivates a Server Action, it may be a thin adapter that forwards to Hono; all business rules and persistence must remain in Hono.

### 3.3 When client state is appropriate

Use client-side state for local interaction, not as the source of truth for clinical records.

Examples:

- Search text and suggestions.
- Form input before submission.
- Tabs, disclosures, and temporary UI state.
- Local validation feedback.

Persisted patient and encounter data must be loaded from Hono and refreshed after successful writes.

---

## 4. Is a Separate API Easier With SSR?

A single Next.js full-stack application is technically simpler for a small app with one frontend: it can read the database from Server Components and use Server Actions or Route Handlers for mutations. That avoids a second server process, internal HTTP calls, CORS configuration, and an API deployment boundary.

The project nevertheless deliberately chooses separate applications because the intended product architecture has an independently deployable API Worker and a frontend deployment surface. This also keeps the API reusable by future clients without moving clinical logic out of it.

SSR works with that split:

- Next.js Server Components call Hono server-to-server for initial page data.
- Browser-side interactions call Hono over HTTP after hydration.
- Both services use the same local Node.js environment during the prototype.

Trade-offs of the separate approach:

- One additional local process.
- One internal HTTP request for each SSR data request.
- API base URL/configuration and HTTP error handling.
- Narrow CORS for direct browser-to-API calls.
- A shared, explicitly typed API contract is useful.

A root `npm run dev` must start both services so the developer does not need two terminals. The extra complexity is intentional and limited; do not add more services or microservices.

---

## 5. Frontend — Next.js App Router

### Responsibilities

- Route and layout composition.
- Request-time rendering of patient and encounter pages.
- Server-side reads from the Hono API.
- Client-side interaction and form input.
- Clear loading, empty, error, and save feedback states.
- Calling the Hono API through a shared API client.

### Constraints

- No direct SQLite, D1, or Prisma imports.
- No domain/database logic in page components.
- No duplicated business rules in Client Components.
- No static generation or shared caching for patient-specific clinical pages.
- Use Server Components by default and Client Components only for interaction.
- Do not make Next.js Route Handlers a second backend API.
- Do not add Server Actions by default; if added later, keep them as thin Hono API adapters.

### Next.js deployment is a future spike

Request-time SSR means the future frontend deployment needs a runtime capable of running Next.js server rendering; it cannot be treated as a static-only site without changing the rendering approach.

Cloudflare's current guidance recommends vinext for new Next.js-on-Workers applications and labels it beta. Cloudflare's OpenNext adapter documentation supports SSR and Server Components, but its current guidance positions it primarily for maintaining existing OpenNext applications. Do not add either adapter to the prototype. Before future deployment, test the actual routes and runtime features, inspect current compatibility, and record the chosen adapter.

References:

- https://nextjs.org/docs/app/getting-started/server-and-client-components
- https://nextjs.org/docs/app/guides/backend-for-frontend
- https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/
- https://developers.cloudflare.com/workers/framework-guides/web-apps/opennext/

---

## 6. API — Hono

Hono is confirmed as the standalone API framework.

### Why Hono

Hono is designed around Web-standard request/response APIs such as `Request`, `Response`, `Headers`, and Fetch. These APIs are available in Node.js and are native to Cloudflare Workers. Hono provides a Node.js adapter for the local process and a Worker `fetch` entry point for future deployment.

The goal is to reuse route handlers and application logic across the two runtimes while isolating startup and database-binding differences. This is portability, not a guarantee that every dependency or database adapter will work unchanged.

### Local Node.js setup

- Use `@hono/node-server` for the standalone local HTTP service.
- Bind to `127.0.0.1` by default.
- Proposed local API port: `4000`.
- Frontend local origin: `http://127.0.0.1:3000`.
- Configure CORS for the exact frontend origin and required methods/headers.
- Do not run Wrangler or require Cloudflare credentials.

### Future Worker entry point

When Cloudflare work is approved:

- Add a separate Worker entry point that exports the Hono app through the Workers Fetch contract.
- Add Cloudflare-specific bindings only at the infrastructure boundary.
- Keep domain/application functions independent of Worker-specific types.
- Verify Prisma D1 support and transaction needs before connecting D1.

### API responsibilities

- Own the public/internal HTTP contract.
- Parse and validate all untrusted input.
- Enforce patient/encounter relationship integrity.
- Execute application and domain operations.
- Access Prisma and the database.
- Return consistent JSON and HTTP status codes.

### Original O-001 API surface

The table below reflects the initial foundation, **not** all current routes. NX-001 appointments, NX-003 study endpoints, and NX-004 structured-document endpoints are present as documented in `API_CONTRACT.md` §11. File storage remains excluded.

| Method | Route | Purpose |
|---|---|---|
| GET | `/health` | Local API health check |
| GET | `/api/patients` | Search/list patients |
| POST | `/api/patients` | Create patient |
| GET | `/api/patients/:patientId` | Retrieve patient overview |
| PATCH | `/api/patients/:patientId` | Update patient |
| PATCH | `/api/patients/:patientId/archive` | Archive patient |
| GET | `/api/patients/:patientId/encounters` | Retrieve patient timeline |
| POST | `/api/patients/:patientId/encounters` | Create encounter |
| GET | `/api/encounters/:encounterId` | Retrieve encounter |
| PATCH | `/api/encounters/:encounterId` | Update encounter |

Use JSON requests and responses. Keep endpoint naming and response envelopes consistent. OpenAPI generation is optional and not required for this prototype.

### API contract and evolution rules

- Define explicit request and response DTOs. Do not expose Prisma-generated model types or raw database rows as the frontend contract.
- Use one coherent server-side validation approach for route inputs. Client-side validation may reuse safe contract schemas for UX, but Hono remains authoritative.
- Keep error response shape and HTTP status behavior consistent across domains.
- If P-010 is accepted, keep shared HTTP DTOs and runtime-safe request/response schemas in the small `@nexus-med/contracts` workspace described in Section 8.5. Do not duplicate transport shapes between Next.js and Hono or expose Prisma models.
- Keep the initial API contract documented and covered by tests. Generate OpenAPI only if it fits the chosen validation tooling without disproportionate complexity.
- The initial contract is a foundation, not a freeze. Change routes, DTOs, validation, and Prisma schema when real UX or implementation requirements justify it; ship a reviewed migration and update tests/docs with each material change.

---

## 7. Domain Organization

A **domain** is a product/business area. It is not a separate server, process, database, or deployment.

API domains live under `apps/api/src/domains/`:

- `patients`: patient registration, search, profile, demographic updates, medical background, archive status.
- `encounters`: clinical encounter creation, type, notes, timeline, and atomic creation of initial study requests.
- `appointments`: scheduling, range/patient lists, state changes and encounter links (NX-001).
- `studies`: patient/encounter lists and status/result-note changes (NX-003).
- `documents`: NX-004 structured prescription/report records and Hono operations; no file-storage domain.

The API owns authoritative domain rules under `apps/api/src/domains/`. The frontend groups workflow UI under `apps/web/src/components/`; it must not duplicate authoritative rules. Shared request/response contracts belong to `packages/contracts/`.

Do not introduce a repository, service, interface, controller, and factory for every entity. Use small modules and split files only when they improve clarity.

---

## 8. Repository Layout and Organization

The repository structure is part of the architecture. It should communicate the product's shape and technical boundaries before someone opens individual files. A developer or agent should be able to infer, from the top-level tree alone:

- which applications run and deploy independently;
- where frontend routes and feature-specific UI live;
- where API domains and business operations live;
- where the shared HTTP contract lives;
- where the database schema, migrations, and seed live;
- where product, architecture, and execution documentation live; and
- which files are source versus generated local state.

Optimize for **clear ownership, discoverability, and structured growth**. Do not optimize for the maximum number of folders or architectural layers.

### 8.1 Target repository tree

The following is the intended structure as the application is implemented. It is a target map, not an instruction to create empty directories or placeholder files. Add a directory when it has real contents.

```text
nexus-med/
├── apps/
│   ├── web/                              # Next.js SSR frontend application (@nexus-med/web)
│   │   ├── src/
│   │   │   ├── app/                      # App Router: routes, layouts, loading/error boundaries
│   │   │   │   ├── layout.tsx            # Root HTML/document layout
│   │   │   │   ├── page.tsx              # Redirect / to /patients
│   │   │   │   ├── not-found.tsx         # 404 boundary
│   │   │   │   ├── globals.css
│   │   │   │   ├── calendar/page.tsx     # /calendar
│   │   │   │   └── patients/
│   │   │   │       ├── page.tsx          # /patients (registry)
│   │   │   │       ├── new/page.tsx      # /patients/new
│   │   │   │       └── [id]/
│   │   │   │           ├── page.tsx      # /patients/:id (demographics + pending work)
│   │   │   │           ├── editar/page.tsx
│   │   │   │           ├── antecedentes/page.tsx  # Background edit
│   │   │   │           ├── contexto-clinico/page.tsx # Compatibility redirect to overview background
│   │   │   │           ├── estudios/page.tsx
│   │   │   │           ├── documentos/page.tsx
│   │   │   │           ├── citas/
│   │   │   │           │   ├── page.tsx
│   │   │   │           │   ├── nueva/page.tsx
│   │   │   │           │   └── [cid]/page.tsx
│   │   │   │           ├── consultas/
│   │   │   │           │   ├── page.tsx     # Clinical note history
│   │   │   │           │   ├── nueva/page.tsx
│   │   │   │           │   └── [eid]/page.tsx
│   │   │   │           ├── recetas/
│   │   │   │           │   ├── nueva/page.tsx
│   │   │   │           │   └── [did]/page.tsx
│   │   │   │           └── informes/
│   │   │   │               ├── nueva/page.tsx
│   │   │   │               └── [did]/page.tsx
│   │   │   ├── components/               # Workflow UI and app chrome
│   │   │   │   ├── patients/             # Registry, forms, timeline, encounter detail
│   │   │   │   ├── appointments/          # Appointment/calendar workflow UI
│   │   │   │   ├── documents/             # Prescription/report forms and print detail
│   │   │   │   ├── shell/                # Top bar and patient context strip
│   │   │   │   ├── modal.tsx             # Client native-dialog shell
│   │   │   │   └── primitives.tsx        # Genuinely shared visual primitives
│   │   │   └── lib/
│   │   │       ├── api/
│   │   │       │   ├── server.ts         # Server-only Hono API transport (SSR)
│   │   │       │   └── client.ts         # Browser Hono API client (typed)
│   │   │       ├── format.ts             # Central practice-timezone formatting
│   │   │       └── use-before-unload-guard.ts
│   │   ├── test/                         # Web unit tests (Vitest)
│   │   ├── public/                       # Locally bundled static assets only
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── api/                              # Standalone Hono API application (@nexus-med/api)
│       ├── src/
│       │   ├── app.ts                    # Compose Hono app; export Fetch-compatible app
│       │   ├── index.ts                  # Local Node.js process entry point
│       │   ├── domains/                  # Backend product/business domains
│       │   │   ├── patients/
│       │   │   │   ├── patients.routes.ts
│       │   │   │   └── patients.service.ts
│       │   │   ├── encounters/
│       │   │   │   ├── encounters.routes.ts
│       │   │   │   └── encounters.service.ts
│       │   │   ├── appointments/          # Appointment and calendar domain
│       │   │   ├── studies/               # Study-request domain
│       │   │   ├── documents/             # Prescription/report domain
│       │   │   └── receipts/              # Received studies and explicit physician review
│       │   ├── generated/prisma/         # Prisma 7 client (gitignored; `npm run db:generate`)
│       │   ├── infrastructure/
│       │   │   ├── storage/study-files.ts  # Bounded local study attachment I/O
│       │   │   └── database/
│       │   │       └── prisma.ts         # Prisma client/adapter initialization
│       │   ├── routes/
│       │   │   └── health.ts             # Process-level health route
│       │   └── shared/
│       │       └── http/                 # Cross-domain HTTP error/response utilities
│       ├── test/                         # API integration tests (Vitest + global setup)
│       ├── package.json
│       └── tsconfig.json
│
├── packages/
│   └── contracts/                        # Shared, runtime-safe API contracts (@nexus-med/contracts)
│       ├── src/
│       │   ├── common.ts                 # Shared primitives (dates, error envelope)
│       │   ├── patients.ts               # Patient request/response DTOs and schemas
│       │   ├── encounters.ts             # Encounter request/response DTOs and schemas
│       │   ├── appointments.ts            # Appointment DTOs and schemas
│       │   ├── studies.ts                 # Study-request DTOs and schemas
│       │   ├── documents.ts               # Medical-document DTOs and schemas
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── prisma/
│   ├── schema.prisma                     # Relational schema source of truth
│   ├── migrations/                       # Committed, reviewed SQL migrations
│   ├── seed.ts                           # Deterministic, idempotent synthetic seed
│   └── lib/
│       └── db-path.ts                    # Resolves the local SQLite path (dev, seed, tests)
│
├── scripts/
│   ├── dev.mjs                           # Start/coordinate API and web processes
│   └── db-reset.mjs                      # Explicitly destructive local reset helper
│
├── docs/                                 # Product, architecture, plans, history, contracts
│   ├── PRODUCT.md
│   ├── WORKFLOWS.md
│   ├── ARCHITECTURE.md
│   ├── DATA_MODEL.md
│   ├── API_CONTRACT.md
│   ├── UI_SPEC.md
│   ├── DEMO_DATA.md
│   ├── demo-dataset.json
│   ├── SECURITY.md
│   ├── TESTING.md
│   ├── BOOTSTRAP_PROMPT.md
│   ├── ACTION_PLAN.md
│   ├── TASKS.md
│   ├── ROADMAP.md
│   ├── DECISIONS.md
│   └── PROJECT_HISTORY.md
│
├── .local/                               # Generated local-only state; gitignored
│   └── data/medical.db
├── AGENTS.md
├── README.md
├── package.json                          # npm workspaces and root commands
├── package-lock.json
├── eslint.config.mjs
├── tsconfig.base.json                    # Shared TypeScript compiler defaults
├── prisma.config.ts                      # Prisma 7 CLI configuration
├── .env.example                          # Names/documentation only; no secrets
└── .gitignore
```

Some filenames and locations may be adjusted to match the exact tooling selected during bootstrap, but preserve the ownership boundaries and overall shape. In particular, Next.js source code consistently lives under `apps/web/src/`, with `src/app/` as the App Router root; do not split route files between a root `app/` folder and `src/`.

### 8.2 What each top-level directory communicates

| Location | Ownership and purpose | Growth rule |
|---|---|---|
| `apps/web/` | User-facing Next.js application and SSR | Contains routes, feature UI, and frontend-only utilities; never database access or authoritative domain rules. |
| `apps/api/` | Hono HTTP API and application/domain behavior | Owns validation, domain operations, and every Prisma/database call. |
| `packages/contracts/` (`@nexus-med/contracts`) | Shared API request/response contracts consumed by web and API | Keep transport DTOs and runtime-safe schemas here; never place Prisma models, database clients, UI components, or business workflows here. |
| `prisma/` | Relational schema, migrations, and demo seed | One authoritative schema/migration history for the local database. |
| `scripts/` | Local developer lifecycle commands | Keep orchestration scripts small; product behavior belongs in applications, not shell scripts. |
| `tests/` (future) | Tests spanning application boundaries | Deferred until frontend E2E (Playwright) is adopted; keep focused unit tests close to their modules today. |
| `docs/` | Product and engineering context | Keep documentation discoverable and update it when architecture or behavior materially changes. |
| `.local/` | Runtime state created on the developer's machine | Always gitignored; never commit databases, uploads, secrets, or generated runtime artifacts. |

### 8.3 Frontend organization: routes versus features

Use Next.js's `src/` convention to keep application source separate from framework and package configuration. Next.js supports `src/app/`; configuration files and `public/` remain at the application root.

Keep `src/app/` primarily focused on routing and page composition. It should include the root layout and root redirect; use framework-provided loading, error, and not-found boundaries where a real route needs them:

- `page.tsx` and `layout.tsx` define route/page structure.
- Server Components load initial data through the server-side Hono API client.
- Mark the server-only API transport/configuration module with the framework-supported server-only guard so it cannot be imported by Client Components.
- Route files should remain thin; move substantial workflow UI into `src/components/patients/`, `appointments/`, or `documents/` according to product ownership.
- Use route groups such as `(workspace)` only when they improve layout or route organization; they do not create URL segments.

Organize workflow frontend code under `src/components/`: `patients/` holds patient and consultation workflow components, `appointments/` holds appointment/calendar workflows, `documents/` holds prescription/report forms and print detail, `shell/` holds the app frame and navigation chrome, and `primitives.tsx` holds genuinely shared visual primitives. Keep a component, form, or hook inside its workflow feature unless it is genuinely shared; the shared files must not become a dumping ground for patient-specific UI.

The frontend may own presentation state and client-side convenience validation, but it must call Hono for persisted data and mutations. Do not create a second frontend domain model that can drift from the API contract.

### 8.4 API organization: route modules and domain operations

Organize Hono code by backend domain under `apps/api/src/domains/`.

For each domain:

- `*.routes.ts` defines HTTP paths, middleware, request/response translation, and calls domain/application operations.
- `*.service.ts` contains cohesive use cases and business rules that must be enforced by the API.
- `*.test.ts` contains focused tests where co-location is useful.
- Keep database initialization in `infrastructure/database/`; domain code must not initialize adapters or read environment variables itself.

`app.ts` composes the health route and domain route modules using Hono's route composition. `index.ts` starts the local Node.js server through the Node adapter. Keeping the Fetch-compatible Hono app separate from the Node process entry point preserves a clean future Worker entry point without adding Worker scaffolding now.

Do not create Rails-style controller classes or a separate controller directory by default. Hono recommends defining route handlers in route modules and composing larger applications with `app.route()`, which also preserves route parameter type inference. Keep route handlers focused; move reusable business operations into domain services.

Do not create a repository layer for every table automatically. A domain service may use Prisma directly for a small, straightforward workflow. Extract a focused repository/query module only when query complexity, reuse, isolation, or transaction coordination provides a concrete benefit. Avoid empty `entities/`, `interfaces/`, `factories/`, `use-cases/`, and generic `utils/` folders.

### 8.5 Shared contracts and dependency direction

The frontend and API consume the same HTTP contract from the `@nexus-med/contracts` workspace (established during O-001), which avoids duplicating request/response shapes.

It may contain:

- Request and response DTO types.
- Runtime-safe request/response schemas using one validation library selected during O-001.
- Shared API error and pagination shapes only when actually needed.

Dependency rules:

```text
apps/web  ───────┐
                 ├──> packages/contracts
apps/api  ───────┘
    │
    └──> Prisma client / database infrastructure

prisma schema ──> database structure (not imported by the frontend)
```

`packages/contracts` must not depend on Next.js, Hono, Prisma, SQLite, Node-only APIs, or Cloudflare bindings. The API remains authoritative: it validates all untrusted requests on the server, even if the frontend reuses schemas for immediate user feedback. Do not leak generated Prisma model types across the HTTP boundary.

Do not create a generic `packages/shared` or `packages/utils` package. Add another workspace package only when there is a clear, real cross-application consumer and an explicit responsibility.

### 8.6 Naming and file conventions

Use conventions consistently rather than inventing a naming scheme per folder:

- Domain/feature directories: lowercase plural nouns (`patients`, `encounters`).
- Hono route modules: `<domain>.routes.ts`.
- Domain operation modules: `<domain>.service.ts`.
- Tests: `<subject>.test.ts` / `<subject>.test.tsx` or the convention supported by the chosen test runner; do not mix conventions.
- React components: PascalCase filenames when they are standalone components; group feature-specific components inside their feature.
- Hooks: `use-<purpose>.ts` or the selected repository convention, used consistently.
- API schemas/contracts: grouped by domain in `packages/contracts/src/`.
- Configuration and infrastructure: descriptive names that identify the boundary (`database/prisma.ts`, `api/server.ts`), not vague names such as `stuff.ts` or `helpers.ts`.

Prefer explicit imports and stable package entry points. Avoid adding barrel `index.ts` files to every directory; use them only when they create a useful public module boundary. Use TypeScript path aliases for readability, but do not use aliases to obscure dependencies across application boundaries.

### 8.7 Growth and maintenance rules

1. **One owner per responsibility.** API owns business rules and persistence; web owns presentation; if adopted, contracts owns shared transport shapes; Prisma owns relational schema/migrations; docs own project context.
2. **Organize by product area inside applications.** Add a new domain/feature when a real workflow area appears; do not create folders for hypothetical future modules such as billing or document storage.
3. **Keep cross-cutting code genuinely cross-cutting.** Promote a component or utility to a shared folder only after it has multiple real consumers or is clearly infrastructure-wide.
4. **Do not mirror layers mechanically.** Frontend feature folders and backend domain folders serve different responsibilities; they do not need identical internal structures.
5. **Keep route files thin, but not ceremonial.** Extract a function or module when it has meaningful behavior or reuse; avoid one-file-per-function patterns.
6. **Keep the tree honest.** Delete empty folders and dead modules. Do not create future placeholders or retain unused abstraction layers.
7. **Preserve navigability.** Avoid deeply nested trees when a flat domain folder is readable. A developer should normally reach the relevant feature/domain code in three or four directory levels.
8. **Update this map when structure changes.** Any material move, new workspace, new application, or new architectural boundary must update this section and the relevant `AGENTS.md` / README references in the same change.
9. **Make the layout explain the product.** Names should communicate patient and encounter workflows, not only generic technical layers.

This structure is intended to support the current two-application prototype and sensible growth. It is not permission to add additional services, packages, or product domains before a real need exists.

---

## 9. Persistence — Prisma ORM 7 + Local SQLite

### Local database

- Use a standard local SQLite database file under `.local/data/`.
- Use Prisma ORM 7.
- Proposed driver: `@prisma/adapter-better-sqlite3`.
- Keep Prisma schema and migrations under the repository's `prisma/` directory.
- All database access belongs to the Hono API.
- Never commit the SQLite database file.

### Prisma schema and migrations

- `schema.prisma` is the source of truth for the relational schema.
- Use Prisma's documented local SQLite migration workflow.
- Use `prisma migrate dev --name <descriptive-name>` when authoring a new development migration; review the generated SQL before committing it.
- Use `prisma migrate deploy` to apply already-created migrations during normal startup; do not run migration-authoring behavior on every app start.
- Configure the seed command in `prisma.config.ts` and invoke it explicitly with `prisma db seed`.
- Prisma ORM 7 does not automatically invoke seeding as part of `migrate dev` or `migrate reset`.
- Do not use destructive schema synchronization as a normal workflow.
- Do not edit an already-applied migration; create a new migration.
- Seed synthetic data deterministically and idempotently.

### Transaction guarantees

A database transaction groups multiple SQL operations into one logical unit. If one operation fails, the transaction rolls back the earlier operations in that group. This prevents partially persisted multi-step changes. The usual ACID terms describe atomicity, consistency, isolation, and durability.

**Local SQLite:** use Prisma's normal transaction support (`$transaction`) for operations that genuinely require multiple related writes to succeed or fail together. Keep transactions short. Do not perform HTTP requests, file operations, or other slow external work inside a database transaction.

**Future Cloudflare D1:** do not assume the same behavior. D1 does not provide the conventional interactive `BEGIN` / `COMMIT` transaction model expected by Prisma's general transaction API. D1 does provide an atomic `batch()` mechanism: Cloudflare documents that a batch executes statements sequentially and rolls back the sequence if a statement fails. However, Prisma's D1 adapter does not currently expose the same general transaction guarantees as local SQLite, and Prisma's D1 documentation lists transaction support as unavailable.

Therefore:

- Use `$transaction` normally with local SQLite when required.
- Do not write prototype code that silently assumes `$transaction` will work with D1.
- Prefer single-statement writes, relational constraints, unique constraints, and conditional updates where suitable.
- Before D1 deployment, identify each workflow that requires more than one write and test whether it can be safely represented as a D1 atomic batch or a single SQL statement through a supported adapter path.
- If a critical workflow requires interactive read/modify/write transactions that D1 cannot provide, revisit the future database choice (for example, a managed PostgreSQL service) rather than weakening data integrity.

Do not switch to Drizzle just to solve D1 transactions. Drizzle supports transactions on conventional SQLite drivers, but its D1 transaction callback also attempts traditional transaction statements; D1-specific atomic work must use the D1 batch capability instead. The runtime/database capability, not the ORM brand, is the constraint.

### D1 compatibility

Keep the schema within SQLite/D1-compatible features where practical:

- Explicit foreign keys and indexes.
- Unique constraints where required.
- No PostgreSQL-only extensions, types, or syntax.
- Archive patients through a status field, not hard deletion.
- Avoid cascading deletion of clinical history.

D1 migration tooling and the Prisma D1 adapter remain a future integration to validate, not part of the prototype.

---

## 10. Local Development and Offline Operation

### Target experience

After dependencies are installed, the developer should run:

```bash
npm run dev
```

This root command must:

1. Validate local configuration.
2. Ensure the `.local/data/` directory exists.
3. Apply committed migrations with `prisma migrate deploy`.
4. Explicitly invoke Prisma 7 seeding (`prisma db seed`). Prisma 7 does not automatically run the seed command as part of `migrate dev` or `migrate reset`.
5. Start Hono and wait for `/health` to respond before considering the API ready.
6. Start Next.js and keep both processes attached to the same terminal session.
7. Print the local URLs without demo-mode labels, and shut both processes down cleanly on Ctrl+C.

The seed must be idempotent: create missing demo records but never duplicate records, overwrite existing edits, delete user-created data, or reset the database. Repeated normal startup must preserve all local changes. See `DEMO_DATA.md` for the dataset and seed contract.

### Local addresses

| Service | Address |
|---|---|
| Next.js frontend | `http://127.0.0.1:3000` |
| Hono API | `http://127.0.0.1:4000` |
| API health | `http://127.0.0.1:4000/health` |
| SQLite file | `.local/data/medical.db` |

The exact ports may change if needed, but keep them documented and consistent.

### Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Bootstrap local DB and start both apps |
| `npm run dev:web` | Start Next.js only, when API already runs |
| `npm run dev:api` | Start Hono only |
| `npm run db:migrate` | Apply committed migrations locally (`prisma migrate deploy`) |
| `npm run db:migrate:dev` | Author a new local development migration (`prisma migrate dev --name ...`) |
| `npm run db:seed` | Explicitly invoke Prisma 7 seed; create missing synthetic records without overwriting existing records |
| `npm run db:reset` | Destructive local-only reset; require interactive confirmation or `--confirm`; never called by startup |
| `npm run typecheck` | TypeScript checks for workspaces |
| `npm run lint` | Lint workspaces |
| `npm run test` | Run tests |
| `npm run build` | Build both applications |

Use Bash or small Node scripts. A lightweight process runner is acceptable if it materially simplifies coordinated startup. Do not introduce Docker or a large task runner.

### Offline behavior

After npm dependencies are installed, normal application startup and all in-scope product workflows must work without internet access. Initial `npm install` may require internet to download packages; runtime does not. Do not load fonts, images, scripts, analytics, or other assets from remote hosts at runtime; use system fonts or locally bundled assets. No Cloudflare account, remote database, OAuth provider, or paid service is required.

### First-run demo experience

The final prototype must not open to an empty shell. After a clean local setup:

- `npm run dev` applies migrations and explicitly invokes the idempotent seed.
- The root route `/` redirects to `/patients`.
- On a clean database, the checked-in fixture inserts exactly seven demo patients (six active and one archived) and nine demo encounters; user-created records may increase the total later.
- The fixture set includes at least two patients with multiple encounters, one patient with no encounters, and one archived patient.
- The application displays the seeded records without a demonstration label (D-046).
- Seed records have stable identifiers and visibly synthetic names/content.
- Running startup or `npm run db:seed` again must not duplicate records or overwrite edits made during testing.

See `DEMO_DATA.md`. This is a prototype-completion requirement, not evidence that the seed implementation already exists.

---

## 11. Cloudflare Preparation — Not Used During Prototype

The prototype must not connect to Cloudflare or require Wrangler for its normal workflow.

Allowed preparation:

- Keep Hono's domain/application code portable.
- Keep a separate future Worker entry point for Hono.
- Keep the Prisma schema SQLite/D1-compatible where practical.
- Document the future Next.js SSR Worker adapter question.
- Isolate runtime-specific database initialization behind a small infrastructure boundary.

Not allowed now:

- Cloudflare login or remote resource creation.
- Remote D1 or R2.
- `wrangler deploy` or remote dev connections.
- Active Worker configuration required by local startup.
- Fake IDs, credentials, or deployable-looking placeholders.

### Future frontend deployment

Since the frontend uses SSR, a future Cloudflare frontend deployment needs a Next.js-compatible runtime adapter; it is not simply a static asset export. Cloudflare's current guidance recommends vinext for new Next.js applications on Workers and marks it beta. OpenNext supports common Next.js SSR/RSC features but is now positioned in Cloudflare's docs primarily as the path for existing OpenNext applications. Do not choose an adapter until deployment work is approved and compatibility is tested.

### Future worker-to-worker communication

Evaluate Cloudflare Service Bindings for server-to-server requests from the frontend Worker to the Hono API Worker. Do not assume the future frontend should call the API's public hostname from its server runtime. Browser-origin calls, CORS, authentication, and routing should be designed together during deployment planning.

---

## 12. File Storage — Pending / Excluded

Do not implement uploads, downloads, file storage, or document association in the current prototype.

The likely future deployment target is Cloudflare R2, but there is no local storage adapter or upload UI in scope now. Do not add an in-memory fake implementation.

When this capability returns to scope, decide local file storage, R2, opaque object keys, file validation, patient/encounter association, private retrieval, deletion, and failure recovery.

---

## 13. Authentication — Pending / Excluded

Do not implement authentication in the current prototype. Use synthetic data and localhost-only access.

Google OAuth / OpenID Connect is a future direction, not a current task. Do not add a fake login screen or hardcoded credentials.

Keep authentication as an API-boundary concern so it can later be added without scattering identity assumptions through domain logic. Before any remotely reachable deployment or real patient data, authentication and authorization must be implemented and reviewed.

---

## 14. Testing

Prioritize behavior and data integrity.

### API tests

- Patient creation, search, update, archive.
- Encounter creation and retrieval.
- Encounter-to-patient relationship validation.
- Timeline ordering.
- Server-side validation and error responses.
- Local SQLite transaction behavior for multi-write operations.

### Frontend tests

- Server-rendered patient page obtains its data from Hono.
- Patient/encounter pages do not use shared caches.
- Loading, empty, not-found, and API-failure states are clear.
- Client interactions use the API client and refresh server-rendered data after successful mutations.

### End-to-end tests

1. Open the app.
2. Create or select a synthetic patient.
3. Open the patient page and verify SSR data appears.
4. Create an encounter through the Hono API.
5. Refresh/revisit the patient page and verify the encounter appears.
6. Restart the application and verify persistence.

All fixtures must be synthetic and deterministic.

---

## 15. Explicitly Deferred

Do not implement these as part of the current prototype:

- File storage, uploads, downloads, or R2.
- Google authentication, OAuth, or authorization roles.
- Docker.
- CI/CD or automated deployment.
- Cloudflare connectivity, remote D1/R2, or deployment.
- Multiple doctors, staff, clinics, or tenants.
- Scheduling, billing, prescriptions, or insurance.
- FHIR/HL7 and external clinical integrations.
- AI diagnosis or clinical decision support.
- Event sourcing, CQRS, message queues, or microservices.
- Advanced audit dashboards or analytics.

---

## 16. Architecture Acceptance Criteria

- [ ] Next.js and Hono run as separate local applications.
- [ ] `npm run dev` starts both without requiring two terminals.
- [ ] Next.js Server Components fetch patient/encounter data from Hono at request time.
- [ ] Clinical pages use explicit no-store behavior and are not statically generated/shared-cached.
- [ ] Client-side mutations go to Hono; Hono owns validation and persistence.
- [ ] The browser cannot access SQLite or Prisma directly.
- [ ] Hono uses Prisma ORM 7 with a local SQLite file.
- [ ] Local SQLite migrations and Prisma 7 explicit seeding are reproducible.
- [ ] The clean first run seeds the required synthetic dataset and opens `/patients` without a demonstration label (D-046).
- [ ] Repeated seed/startup creates no duplicates and does not overwrite existing edits or user-created records.
- [ ] Prisma transactions work for local SQLite operations that require atomic multi-write behavior.
- [ ] Restarting both applications does not delete local data.
- [ ] No Cloudflare credentials, Wrangler, or remote services are required.
- [ ] File storage and authentication remain unimplemented.

Do not mark criteria complete based only on config files. Run the actual application and verify behavior.

---

## 17. Technical References

Use current official documentation when implementing. Verify package versions and adapter compatibility at that time.

- Next.js Server and Client Components: https://nextjs.org/docs/app/getting-started/server-and-client-components
- Next.js data fetching and backend-for-frontend guidance: https://nextjs.org/docs/app/guides/backend-for-frontend
- Next.js project structure and `src/` folder: https://nextjs.org/docs/app/api-reference/file-conventions/src-folder
- Hono application organization best practices: https://hono.dev/docs/guides/best-practices
- npm workspaces: https://docs.npmjs.com/cli/using-npm/workspaces/
- Hono Web Standards: https://hono.dev/docs/concepts/web-standard
- Hono Node.js adapter: https://hono.dev/docs/getting-started/nodejs
- Hono Cloudflare Workers: https://hono.dev/docs/getting-started/cloudflare-workers
- Prisma SQLite: https://www.prisma.io/docs/orm/v7/core-concepts/supported-databases/sqlite
- Prisma transactions: https://www.prisma.io/docs/orm/v7/prisma-client/queries/transactions
- Prisma 7 seeding: https://www.prisma.io/docs/orm/v7/prisma-migrate/workflows/seeding
- Prisma Cloudflare D1: https://www.prisma.io/docs/guides/v7/deployment/cloudflare-d1
- Cloudflare D1 batch API: https://developers.cloudflare.com/d1/worker-api/d1-database/
- Cloudflare Next.js on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/

---

## 18. Development Sequence and Backend Evolution

Follow the project order defined in `ROADMAP.md` and `TASKS.md`:

1. Establish the database model, Prisma migrations, Hono API behavior/contracts, synthetic seed, and API/data tests.
2. Design UX/UI against the verified data model and API capabilities; record the implementation-ready result in `docs/UI_SPEC.md`.
3. Implement the approved UX as complete vertical slices through Next.js, Hono, Prisma, and SQLite.
4. Verify the integrated first-run demo and reliability requirements.

The database/API foundation should be coherent and well-tested before feature UI work, but it must not be treated as immutable. During design or implementation, update the schema through migrations and evolve Hono contracts when a justified workflow need appears. Keep the frontend aligned with the API and verify backward/forward changes across the affected code. Do not preserve a flawed initial abstraction for the sake of avoiding change, and do not refactor without a concrete benefit.

Keep implementation DRY and organized: one authoritative place for domain rules, one consistent API validation/error convention, explicit transport DTOs, and domain-oriented modules. Avoid duplicate logic and premature generic layers.

---

## 19. Operating Principle

Keep the frontend and API separate because independent deployment and a reusable backend are intentional product architecture choices. Use Next.js SSR for initial page rendering, but keep all business logic and persistence in Hono. Use Prisma with local SQLite during the prototype and treat D1 transaction compatibility as a future, explicit deployment validation.

Build the smallest complete patient-to-consultation workflow. Do not introduce additional infrastructure or deploy-time tooling until the local product works.


### UI v0 component conventions

The existing `apps/web/src/app/globals.css` owns light-theme tokens and component styles; `components/primitives.tsx` stays server-safe. Patient-specific repeated study entry is shared through `components/patients/study-fields.tsx` and uses the contracts' `StudyInput` without owning validation/persistence. Workflow components retain draft/save/error state and call the existing typed Hono client. No new app, package, persistence layer or dependency was added. See `UI_SPEC.md` §9 for responsive composition, control APIs and Figma handoff conventions.

Compact-entry ownership (D-043): `components/modal.tsx` owns only native dialog/focus/viewport behavior. Existing domain forms own drafts, validation, confirmation and API operations. `patients/consultation-sections.ts` shares clinical field labels/order across staged new-note entry and saved-note editing; `patients/staged-study-dialog.tsx` collects a local order for the existing atomic encounter save. `documents/medication-editor.tsx` validates a single local medication draft while the parent document form retains explicit document saving and historical line instructions. No package, API, schema or persistence boundary changes.

## D-044/D-045 local secretary and study-receipt extension

The canonical map in §8 expands with `apps/api/src/domains/receipts/` (receipt association/list/review), `apps/api/src/infrastructure/storage/study-files.ts` (local validated opaque file I/O), `apps/web/src/components/receipts/` (shared receive/review UI), and browser-safe `packages/contracts/src/receipts.ts`. Existing appointments own reception. Existing patient demographic forms are composed from one shared form; the administrative projection excludes clinical fields.

New SSR routes are `/secretaria`, `/recepcion`, and `/estudios`. `/estudios-recibidos` redirects to `/estudios` for compatibility. They call Hono with no-store; Next never accesses Prisma/files directly. A route-based view selector has no identity/security semantics. Visible reception and shared-study views refresh every 30 seconds and on focus; polling pauses while their forms are open. The live queue includes all unfinished arrivals, independent of selected agenda date.

D-045 supersedes the earlier file-storage exclusion solely for received studies. Storage is `study-files/` beside the resolved SQLite file (`.local/data/study-files/` by default, isolated beside test databases). No uploads go to public assets, Git or remote storage. Receipt metadata and attachment metadata are created together; newly written files are removed on a failed database insert. An interrupted process may leave an unreferenced opaque file, never a falsely successful receipt. Backups/restores must include both database and file directory. No file deletion, replacement, external integration, authentication or public runtime is introduced.
