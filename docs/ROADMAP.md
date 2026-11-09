# Nexus Med Roadmap — Local MVP and O-005 Expansion

The roadmap defines strategic outcomes and their order. It is not a live progress tracker or a detailed task board.

- `ROADMAP.md` describes the high-level sequence.
- `TASKS.md` defines stable phase-level work packages and acceptance criteria; it changes mainly at phase boundaries.
- `ACTION_PLAN.md` is the living execution state, updated throughout work.
- `PROJECT_HISTORY.md` archives significant milestones and findings.
- `DECISIONS.md` is authoritative for current accepted decisions.

The agreed development order is **database/API foundation → UX/UI design → product implementation → integrated demo and reliability**. This order establishes a trustworthy data/API foundation before design, but does not freeze the backend: database and API changes remain allowed when implementation justifies them.

## O-001 — Database and API foundation

**Outcome:** A tested local data model and Hono API for patients, medical background, and encounters, backed by Prisma 7 and SQLite. Synthetic data is seeded and retrievable through the API. The two-app local runtime can be started with one command. No product UI work is performed beyond a minimal technical shell/smoke route.

**Exit condition:** Migrations, constraints, API contracts, validation, error behavior, synthetic seed, local transactions, persistence, and API integration tests are verified.

## O-002 — UX and UI design

**Outcome:** A reviewed, implementation-ready `docs/UI_SPEC.md` covering information architecture, screen hierarchy, key screens, interactions, form behavior, visual language, and loading/empty/error/success states.

**Exit condition:** The owner can review the design against the product workflows before feature UI implementation begins.

## O-003 — Product implementation

**Outcome:** Implement the approved UX as complete vertical slices: application shell, patient registry and profile, medical background, consultation entry, encounter detail, and chronological timeline.

**Important:** The database and API from O-001 are a strong foundation, not immutable boundaries. Update Prisma models/migrations, Hono routes/contracts, and tests when justified by actual UX or implementation requirements. Keep changes deliberate, DRY, documented, and verified.

**Exit condition:** Core patient-to-consultation workflows function end to end through Next.js SSR/client interactions, Hono, Prisma, and SQLite.

## O-004 — First-run demo and reliability

**Outcome:** A clean local start opens a populated patient registry with the exact synthetic fixture, persistent Spanish demo warning, and user data preserved across restarts.

**Exit condition:** `npm install` followed by `npm run dev` (with dependencies installed) starts both apps, migrates/seeds safely, and passes end-to-end workflows without Cloudflare, remote services, or manual database setup.

## O-005 — Product expansion (complete)

**Approved outcome (D-023):** Four staged vertical slices extending the local patient/encounter MVP:

1. **NX-001:** patient appointments, status transitions, and basic day/week/month calendar.
2. **NX-002:** encounter types consistent with appointment types (planned versus actual); no dedicated surgical-procedure lifecycle approved.
3. **NX-003:** study requests and follow-up linked to encounters, with status and optional doctor-authored result note.
4. **NX-004:** doctor-authored printable prescriptions and reports, rendered using browser print rather than stored files.

**Starting snapshot on `feat/studies-web` (2026-11-08):** At O-005 execution start, NX-001 and NX-002 had prior recorded verification; NX-003 implementation existed across schema/API/contracts/web/fixtures/tests but integrated acceptance was outstanding; NX-004 remained unimplemented. This dated baseline is historical. Final completion evidence is in `ACTION_PLAN.md` and `PROJECT_HISTORY.md`.

**Exit condition:** All four slices implemented and integrated-tested with documented seed/persistence behavior; accepted contract, workflow, and UX docs reconciled to their verified final state; no deferred cloud/auth/upload work added.

## Deferred — not part of the prototype

- File storage, uploads, document file management, and R2 (distinct from approved NX-004 printable records).
- Google authentication/OAuth/OIDC and authorization.
- Docker, CI/CD, Cloudflare connectivity, remote D1/R2, and deployment.
- Appointment recurrence/reminders, billing, multi-user support, AI clinical features, FHIR/HL7, and external integrations. Basic scheduling is already implemented in NX-001.

## Future Cloudflare evaluation

Only after the local MVP works:

1. Validate Hono as a Cloudflare Worker.
2. Validate Prisma D1 adapter behavior against the actual multi-write workflows and transaction requirements.
3. Select and test a Next.js SSR Worker adapter.
4. Evaluate frontend-to-API Worker communication.
5. Define private access, secrets, backup/restore, and operational controls.
6. Revisit file storage only if approved product scope requires it.

No remote Cloudflare resources are part of O-001 through O-005.
