# O-006 — Current UX and workflow audit

**Status:** Design discovery; observations and recommendations, **not approved product requirements**.  
**Baseline:** `feat/nx-expansion-complete` at `1309b513`, after O-005.  
**Method:** Read-only review of Next.js screens, Hono endpoints, contracts, Prisma schema and current repository docs on 2026-11-08. **No fresh rendered-browser usability study, physician observation or user testing was performed for this audit.** Existing O-005 browser verification establishes function, not usability.

## 1. Overall assessment

The system supports patient registration, consultation notes, appointments, study requests, prescriptions and reports. O-005 reports successful automated/integration verification. The central UX issue is **fragmented workflow**: the interface groups records by screen instead of carrying the clinician from an appointment, through consultation and clinical actions, to follow-up.

This audit separates **observed behavior** from **design hypotheses**. Existing O-005 acceptance and decisions remain authoritative until the owner approves a new phase.

## 2. Findings, priority and evidence

| ID | Priority | Evidence in current code | Impact / hypothesis | Candidate direction |
|---|---|---|---|---|
| UX-01 | P0 | `apps/web/src/app/patients/[id]/consultas/nueva/page.tsx` fetches only patient details; `components/patients/consultation-form.tsx` presents chronological clinical textareas + embedded study rows | Doctor must leave the writing surface to retrieve history, recent notes or study results | Consultation workspace with readable patient context, recent history and relevant pending work |
| UX-02 | P0 | `prisma/schema.prisma`: `StudyRequest.encounterId` required; `apps/api/src/domains/studies/studies.routes.ts` creates requests under `/encounters/:id/studies`; overview has no create action | A quick phone/preoperative request still requires a consultation record; the new endpoint adds to an **existing** encounter, not to a patient alone | Patient-owned request with optional documented clinical association; direct request entry |
| UX-03 | P0 | `packages/contracts/src/studies.ts` statuses `ordered`, `completed`, `reviewed`; `encounter-detail.tsx` labels buttons "Marcar completada"/"Marcar revisada" | "Completed" does not specify whether examination happened or result became available; risk of operational misunderstanding | Validate status meanings with doctor before renaming or adding states |
| UX-04 | P1 | `components/appointments/appointment-detail.tsx` supports edit, complete, cancel, link; consultation creation is independently reached from patient overview | No direct "Atender paciente" handoff from scheduled visit to consultation with ready context | Appointment → care encounter → completion/follow-up journey, without duplicate entries |
| UX-05 | P1 | `app/patients/[id]/page.tsx` renders distinct demographics, background, appointments, documents, pending studies and timeline cards | Most immediately relevant clinical context can be pushed below unrelated sections; no explicit triage of urgent/relevant information | Patient summary prioritizing safety context, recent activity and tasks; expandable history |
| UX-06 | P1 | `components/documents/document-form.tsx` supports optional encounter link; entry buttons are on patient overview | Documents are independent (a useful model), but creating one during consultation requires leaving the encounter | Contextual prescription/report actions prefilled with patient/encounter |
| UX-07 | P1 | `components/patients/consultation-form.tsx` saves explicitly; no autosave or persisted draft; guard only via `beforeunload` | Interruption or internal client-side navigation may lose an unfinished long clinical note | Decide if draft/partial-save states are warranted, with clear save semantics |
| UX-08 | P2 | `components/shell/top-bar.tsx` contains only Pacientes and Calendario; `app/page.tsx` directs to patient registry | No daily task queue linking upcoming visits and unresolved clinical tasks | Evaluate a lightweight daily workspace only if physician/secretary tasks justify one |

**Important nuance:** `POST /api/encounters/:encounterId/studies` now exists; earlier limitations suggesting studies could be created only with a *new* encounter are obsolete. It still does **not** enable a standalone patient-level study request.

## 3. Evidence and verification boundaries

- **Observed directly in code:** route entry points, editable fields, API association constraints, study state machine, save behavior, patient overview sections and available controls.
- **Previously verified, not re-executed here:** O-005 records API 107/107, web 32/32, local migrations/seed, browser checks and print output in `docs/TESTING.md`.
- **Not yet validated with users:** clinical task order, frequency of phone requests, distinction between performed and results received, handwriting vs computer entry, time pressure, interruption patterns, secretary handoffs, and whether a daily agenda should replace or complement the patient registry.

## 4. Prioritized review scenarios

1. Scheduled patient: open appointment → start care → review history → document → issue prescription/study → arrange follow-up.
2. Walk-in patient: locate chart → capture encounter → finish without scheduling fiction.
3. Phone/preoperative request: locate chart → order a study **without** creating a fake encounter → later receive results.
4. Study follow-up: distinguish pending performance, result arrival and physician review; see outstanding work where action happens.
5. Historical review: identify last encounter, allergies, ongoing medications, and outstanding requests while preserving note context.
6. Interruption: partially entered consultation, navigation away, recovery and safe continuation.

For each, measure clicks/route transitions, duplicated entry, missing information at decision points, risks, and recovery. Compare at least two plausible designs before selecting one.

## 5. Product constraints and unresolved decisions

The current implementation is a local synthetic-data prototype for one doctor. Administrative activity can be *modeled* for a secretary, but credentials, permissions, staff accounts, real patient data, file uploads and production deployment are not authorized by this discovery document.

Clinical questions requiring doctor/owner review:
- Is note-taking simultaneous with the visit or completed afterward?
- Does "completed" mean the study was **performed**, the **result received**, or both?
- Can studies be ordered without an encounter; if so, what minimum reason, author, date, and association should be captured?
- What should happen to an erroneous order, given the current immutable/no-delete policy?
- Which pre-procedure checks are clinically useful versus excessive workflow?
- Which actions may a secretary initiate or only prepare for doctor confirmation?

## 6. Recommended next action

Review `docs/UX_REDESIGN.md` as a **proposal**. Confirm the journeys and pending decisions before converting any design into normative `UI_SPEC.md`, `WORKFLOWS.md`, API contracts or implementation tickets. No code change is authorized by this audit.
