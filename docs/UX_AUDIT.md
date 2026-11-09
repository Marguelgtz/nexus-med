# O-006 — Current UX and clinical workflow audit

**Status:** Design discovery. Findings below are source-verified; impact statements are hypotheses; recommendations are not approved requirements.

**Application baseline:** `feat/nx-expansion-complete` at `1309b51` (O-005 complete).

**Audit branch:** `docs/o006-clinical-workflow-ux`; this audit does not authorize application changes.
**Method:** Read-only inspection of the current Next.js routes/components, Hono routes/services, shared contracts, Prisma schema, and the normative product/workflow/UI documents on 2026-11-08. The branch differs from the O-005 baseline only in O-006 documentation. No fresh browser walkthrough, physician observation, or usability study was performed. O-005 automated/browser evidence establishes functional behavior, not usability.

## 1. Scope and interpretation

The local prototype has one doctor and synthetic records. Registration and scheduling tasks that a secretary might prepare are considered as workflow scenarios, not as authorization to add staff users, credentials, roles, access controls, or real patient data. Any future assistant workflow needs separate product and security approval.

This audit distinguishes:

- **Observed:** behavior and relationships present in code or a current contract.
- **Impact hypothesis:** a likely source of delay, duplicate entry, or ambiguity that requires task-based review.
- **Proposal:** a candidate direction in `UX_REDESIGN.md`; it is not an accepted decision.

The O-005 behavior in `UI_SPEC.md`, `WORKFLOWS.md`, `API_CONTRACT.md`, `DATA_MODEL.md`, and `DECISIONS.md` remains the authoritative as-built baseline.

## 2. Verified current-state inventory

| Area | Verified behavior | Evidence |
|---|---|---|
| Patient lookup and registration | The patient registry supports search and patient creation. Patient-specific screens keep a name/identifier context strip. The app has no secretary identity or work queue. | `apps/web/src/app/patients/page.tsx`, `new/page.tsx`; `apps/web/src/components/patients/patient-registry.tsx`, `patient-form.tsx`, `apps/web/src/components/shell/patient-context.tsx` |
| Patient overview | The page renders identity and demographics, medical background, upcoming appointments, prescriptions/reports, pending studies (only when non-empty), then encounter timeline. Actions include new consultation, edit, background, archive, and new appointment; document actions are in their own card. | `apps/web/src/app/patients/[id]/page.tsx` |
| Medical background | Conditions, previous surgeries, allergies, and current medications are patient-level free text. Empty means “No registrado”; the overview presents the fields, but this context is not rendered in the new-consultation form. | `prisma/schema.prisma` (`Patient`); `apps/web/src/app/patients/[id]/page.tsx`; `apps/web/src/app/patients/[id]/consultas/nueva/page.tsx` |
| New consultation | The route fetches the patient and renders the identity context plus one vertically stacked form: occurrence time, type, seven note sections, then repeatable study rows. Save is explicit and creates the encounter with its initial studies in one API operation/transaction. There is no persisted draft. A native `beforeunload` guard exists; the in-app Cancelar link navigates to the patient. | `apps/web/src/app/patients/[id]/consultas/nueva/page.tsx`; `apps/web/src/components/patients/consultation-form.tsx`; `apps/api/src/domains/encounters/encounters.service.ts` |
| Encounter detail | The note renders read-only until explicit edit. Studies, when present, appear on this screen with actions to mark `completed` or `reviewed` and optionally enter a text note. | `apps/web/src/app/patients/[id]/consultas/[eid]/page.tsx`; `apps/web/src/components/patients/encounter-detail.tsx` |
| Study creation and association | Every `StudyRequest` requires both `patientId` and `encounterId`. It can be created inside new-encounter creation or appended to an existing encounter. There is no patient-level create action or patient-scoped POST endpoint. The patient list filters by repeatable status query values. | `prisma/schema.prisma` (`StudyRequest`); `packages/contracts/src/studies.ts`; `apps/api/src/domains/studies/studies.routes.ts`, `studies.service.ts` |
| Study lifecycle | Stored states are `ordered`, `completed`, and `reviewed`; transitions are forward-only, including direct `ordered → reviewed`. `ordered` and `completed` both remain on the pending card until review. A status change may also store a doctor-authored `resultNote`. There is no distinct performed timestamp, result-received event, review timestamp, or status-event history. | `packages/contracts/src/studies.ts`; `apps/api/src/domains/studies/studies.service.ts`; `apps/web/src/components/patients/encounter-detail.tsx`; `docs/DECISIONS.md` D-032 |
| Appointments and encounters | Appointments are created from a patient or calendar path. Appointment detail offers edit, complete, cancel, or (after completion) link an existing encounter. Completion accepts an optional encounter ID. There is no `Atender paciente` handoff from a scheduled appointment into a consultation form. | `apps/web/src/components/appointments/appointment-detail.tsx`; `apps/api/src/domains/appointments/appointments.routes.ts`, `appointments.service.ts`; `prisma/schema.prisma` (`Appointment`, `Encounter`) |
| Prescriptions and reports | Creation starts from the patient overview. A form may link an already-existing same-patient encounter. Detail/edit and browser print are implemented, but the encounter screen has no contextual document action. | `apps/web/src/components/documents/new-document-page.tsx`, `document-form.tsx`, `medical-document-detail.tsx` |
| Follow-up and procedures | An encounter has a free-text `followUp` field. A future appointment is separately created from the patient flow. Appointment and encounter types describe planned and actual visit types; no procedure lifecycle or linked preparation checklist exists. | `prisma/schema.prisma`; `docs/DECISIONS.md` D-025; `docs/UI_SPEC.md` §§7.1–7.2 |
| Primary navigation and outstanding work | The top bar has `Pacientes` and `Calendario`. Pending studies appear only inside the patient overview; upcoming appointments and documents are shown there too. There is no cross-patient task queue or persistent unfinished-note list. | `apps/web/src/components/shell/top-bar.tsx`; `apps/web/src/app/patients/[id]/page.tsx` |

## 3. End-to-end workflow audit

| Workflow | Current path | Friction or ambiguity to validate |
|---|---|---|
| 1. Find or register a patient | Registry search → open patient, or `Nuevo paciente` → save → patient overview. | A receptionist could prepare the chart, but there is no role boundary or secretary handoff. Duplicate-name recognition and the minimum data needed before a visit should be tested with the doctor. |
| 2. Schedule and prepare a consultation | Open patient → `Nueva cita`, or use the calendar; the appointment appears in calendar/patient appointment views. | There is no “prepare chart” state, pre-visit checklist, or direct review of outstanding studies from the appointment. The need for preparation work is unvalidated. |
| 3. Attend a scheduled patient | Calendar → appointment detail → `Completar`; optionally choose a previously saved encounter. | Starting care and recording completion/linkage are separate. No consultation is launched with the appointment context, and encounter entry can require returning to patient navigation. Completion can occur without an encounter. |
| 4. Attend a walk-in or unscheduled patient | Registry → patient overview → `Nueva consulta`; appointment is not required. | This route is viable, but the workspace starts without prior history or safety context and has no explicit “sin cita” context because the route does not know whether the visit is scheduled. |
| 5. Review history during the consultation | Read the patient overview/background/timeline, then navigate to the new-consultation form. | History is available elsewhere but not alongside the note. Returning to it may lose an unsaved note; the new form only displays patient identity. |
| 6. Document the consultation | Fill the long form and explicitly save. The seven note fields and any study rows are sent together. | No persisted partial save; long scroll and interruption recovery are weak. Contextual actions cannot be started from the writing surface without leaving it. The UI does not imply signature/finalization, which must be preserved. |
| 7. Order studies during or outside a consultation | During a new consultation, add rows and save atomically; for a saved encounter, append studies from encounter detail. | A phone/preoperative order without a real encounter cannot be represented. During a new encounter, a study is staged until the note is saved; outside it, no entry point exists. |
| 8. Receive and review results | From encounter detail, change status and optionally enter a result note; pending overview shows `ordered` and `completed` until review. | “Completada” could mean performed, result received, or both. The app has no separate result-arrival event or artifact; a note and `updatedAt` are not a reliable event history. The direct-to-reviewed path is permitted but its intended use is not explained. |
| 9. Create prescriptions/reports, schedule follow-up, prepare procedures | Create documents from patient overview and optionally link a saved encounter; record follow-up instructions in free text and create an appointment separately. | The consultation context is not carried into those forms. Free-text follow-up does not establish whether an appointment was actually scheduled. Procedure preparation is intentionally not modeled; Q-NX-01/D-025 remains open. |
| 10. Return to a patient and understand outstanding work | Open patient overview; see next appointments, documents, pending studies, and encounter timeline. | Useful work is spread across cards, with documents before studies and timeline. There is no cross-patient “needs review” list and no persisted draft indicator. Whether a global agenda is valuable is unvalidated. |

## 4. Prioritized findings

| ID | Priority | Verified observation | Impact hypothesis | Candidate direction (proposal only) |
|---|---|---|---|---|
| UX-01 | P0 | The new consultation route fetches the patient but the form only receives `patientId`; no background, prior encounters, or pending studies are available beside the note. | The doctor may switch screens or rely on memory while documenting. | A consultation workspace with a compact, readable context pane and the note kept in view. |
| UX-02 | P0 | `StudyRequest.encounterId` is required and creation is encounter-scoped. | Real requests made by telephone, before a consultation, or between visits may be omitted or recorded against a fictitious note. | Patient-owned request with an optional clinical-event association, subject to doctor approval and a safe migration plan. |
| UX-03 | P0 | `completed` is an unqualified state and no separate performed/result-received/reviewed events are stored. | Staff may interpret a status differently and miss a result needing review. | Obtain physician definitions first; do not remap or rename stored states in design implementation. |
| UX-04 | P1 | Appointment detail has no start-care action; encounter save and appointment completion/link are separate. | A scheduled visit may require repeated navigation or be marked complete without a note. | Explicit appointment-to-consultation handoff; keep visit completion explicit and separately visible. |
| UX-05 | P1 | Patient overview is a sequence of cards; medical background is separated from the encounter editor; pending studies are below documents. | High-value safety/work context may be hard to scan at the moment of care. | Prioritize identity, safety context, and active work; retain detailed history as a clear secondary section. |
| UX-06 | P1 | Prescription/report entry is on separate patient routes; a related encounter must already exist. | Context switch can interrupt note entry and cause missing associations. | Contextual side panel/action from a saved encounter; explicitly checkpoint an unsaved new note before creating a linked document. |
| UX-07 | P1 | Encounter save is explicit; only native unload protection guards a new note; there is no persisted draft. | An interruption or in-app navigation can lose a long note. | Prefer a clear unsaved guard and contextual panels first; evaluate explicit persisted drafts separately. Do not silently autosave. |
| UX-08 | P1 | Encounter follow-up is free text; appointment creation/linking is separate; no status indicates whether a return was scheduled. | “Seguimiento” may be mistaken for a completed scheduling task. | Offer an in-context `Programar seguimiento` action with the patient carried forward and a clear unscheduled state. |
| UX-09 | P2 | No global queue lists pending study review or other patient work; calendar and patient overview are the only main work surfaces. | A doctor who works from a daily list may overlook items; a dashboard could also add noise. | Test whether a small agenda/needs-review view is useful before adding a new top-level work queue. |
| UX-10 | P2 | Current product scope is one doctor; no assistant accounts or permissions. | Administrative work could be modeled as if roles existed, expanding scope and access risk. | Map secretary-preparable tasks only; defer multi-user workflow and authorization design. |

## 5. Questions requiring physician/owner validation

1. Does the doctor write the note during the visit, immediately after, or both? How often is work interrupted, and is a **persisted draft** needed?
2. What does the current `completed` study status mean in practice: examination performed, result received, or both? Is direct `ordered → reviewed` a real workflow?
3. Are standalone patient-level study orders required? If yes, what minimum facts must be recorded: order/request time, entry time, reason, source (visit/telephone/preoperative), and ordering clinician? With one doctor and no staff accounts, what does “author” mean?
4. Can a study be associated with an appointment as well as a patient and optional encounter? Can that relationship be added later, or must the original association remain immutable?
5. How are results received in the prototype (doctor-entered text only, paper review, or some other approved manual process)? Uploads and external integrations remain excluded.
6. What should happen to a mistaken or cancelled request, given the current immutable/no-delete rule?
7. For a scheduled appointment, should encounter creation link the appointment, should the doctor explicitly complete the appointment later, or should those remain independent actions? What about a patient who attends but no encounter is written?
8. Which preparation steps are useful before a procedure? Q-NX-01 remains open; no procedure lifecycle is assumed here.
9. Which routine tasks could a secretary prepare, and which must remain doctor-only? Answering this does not authorize adding accounts or roles to the single-user prototype.
10. Does the current fixed study-category list satisfy Q-NX-02? Keep the list as implemented unless the doctor confirms a change.

## 6. Verification boundary and next step

Verified in this audit: static implementation paths and relationships at the stated O-005 baseline. Previously recorded O-005 tests and browser checks are summarized in `docs/TESTING.md`; they were not rerun as part of this design-only review. Not verified: user comprehension, clinical task order, time pressure, interruption frequency, physician preferences, secretary handoffs, or the value of a daily queue.

Review `docs/UX_REDESIGN.md` as a non-authoritative design proposal. Resolve the clinical questions with the owner/doctor before promoting any interaction into `UI_SPEC.md`, `WORKFLOWS.md`, `API_CONTRACT.md`, `DATA_MODEL.md`, `TASKS.md`, or application code.
