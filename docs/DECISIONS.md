# Decision Log

Use `Confirmed`, `Proposed`, `Open`, or `Superseded`. Record the date and rationale when a material decision changes. The owner's explicit statements take precedence.

## Confirmed decisions

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
| D-014 | First-run experience must include synthetic demo records. | Seven patients (six active, one archived) and nine encounters; demo banner and root redirect to `/patients`; seed is idempotent and does not overwrite local edits. |
| D-015 | Local `npm run dev` is the intended single startup command. | It must migrate, explicitly seed, and start both services; this is a requirement, not yet an implemented feature. |
| D-016 | Development order is database/API foundation, then UX/UI design, then product implementation. | Establish and test the data model and Hono API before feature UI design. Produce and review `docs/UI_SPEC.md` before implementing product screens. |
| D-017 | Database and API remain revisable during UX design and product implementation. | The initial foundation is not a freeze. Change Prisma schema through migrations and update Hono contracts, validation, tests, and docs when actual workflows justify it. |

## Proposed implementation details

| ID | Proposal | Rationale |
|---|---|---|
| P-001 | Use `@hono/node-server` locally. | Run the same Hono app behind a local Node.js HTTP service. |
| P-002 | Use `@prisma/adapter-better-sqlite3` for local SQLite. | Documented Prisma 7 local SQLite driver adapter. |
| P-003 | Use npm workspaces with `apps/web` and `apps/api`. | Two deployable applications in one manageable repository. |
| P-004 | Next.js Server Components call Hono over server-to-server HTTP for initial reads. | SSR while keeping Hono as the single data/business API. |
| P-005 | Client Components call Hono through a small typed API client. | Keep all authoritative mutations and validation in Hono. |
| P-006 | Use no-store behavior for patient/encounter data. | Clinical data is private and mutable; avoid static/shared caching. |
| P-007 | Root `npm run dev` migrates, seeds, and starts both applications. | Immediate usable developer experience. |
| P-008 | Future API Worker entry point uses Hono's Fetch contract. | Preserve a path from Node.js to Cloudflare Workers. |
| P-009 | Use stable demo IDs and create-if-missing seed logic. | Repeated startup must not duplicate or overwrite demo/user data. |
| P-010 | Add a narrow `packages/contracts` workspace for shared API DTOs and runtime-safe schemas. | Both the Next.js client and Hono API consume the same transport contract; keep Prisma/domain implementation out of the package. Confirm during O-001 that this avoids duplication without adding unnecessary workspace overhead. |

## Open future decisions

- O-001: Validate Prisma 7 with `@prisma/adapter-better-sqlite3`, generated client, migrations, and local transactions during implementation.
- O-002: Validate critical multi-write workflows against D1 capabilities and Prisma's D1 adapter before a Cloudflare deployment decision.
- O-003: Choose and test the Next.js SSR Worker adapter when deployment enters scope.
- O-004: Decide how the frontend runtime communicates with the API Worker (for example, service bindings).
- O-005: Define Google OAuth/OIDC, session handling, and access policy when authentication enters scope.
- O-006: Decide file storage and private R2 integration if document management enters scope.
- O-007: Confirm exact required patient demographic and encounter fields with the doctor.

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
