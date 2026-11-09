# O-006 — Proposed clinical workflow and UX redesign

**Status: PROPOSED FOR OWNER/DOCTOR REVIEW — NOT APPROVED OR IMPLEMENTED.**  
**Based on:** \`docs/UX_AUDIT.md\` and \`feat/nx-expansion-complete\` at \`1309b513\`.  
**Scope:** One doctor; optional administrative handoffs conceptually; local/offline synthetic-data prototype. This is a UX/workflow proposal, not a request to build authentication, roles, AI, external integrations, or deployment.

## 1. Design goals

1. Make the patient and the current clinical task unmistakable at every step.
2. Keep relevant history, allergies, ongoing medication, recent encounters and pending studies accessible while writing clinical notes.
3. Treat **encounters as clinical documentation**, not a mandatory container for every study, document, or future activity.
4. Offer one clinically consistent action from multiple entry points (patient, appointment, encounter) without duplicating records.
5. Minimize navigation and required input, while making status, persistence and any unsaved work explicit.
6. Preserve physician-authored clinical content; no inferred findings, doses or automated diagnoses.

## 2. Proposed information architecture

- **Pacientes:** registry, search and patient record.
- **Calendario / Agenda:** schedule and (if validated) tasks for the day; do not add a generic dashboard by default.
- **Patient workspace:** identity/safety context and recent work in an immediately scannable region; consultations, studies, documents and appointments remain available as related collections.
- **Consultation workspace:** note editor plus context and related actions, without losing the in-progress note.
- **Quick patient actions:** new appointment, study request, prescription and report, all using a consistent entry pattern.

Keep the top-level navigation minimal. Evaluate a separate daily workspace only after user-task validation.

## 3. Proposed user journeys

### J-01 Scheduled appointment → medical attention
1. From calendar or a patient's upcoming appointment, choose **Atender paciente**.
2. Open the clinical workspace with patient identity, appointment context and relevant history already available; do not silently mark the appointment completed.
3. Doctor writes note and optionally orders studies, creates prescription/report or schedules follow-up, while retaining the active task.
4. Explicitly save/finish the encounter; maintain a transparent optional appointment link and completion action.
5. Return to appointment/patient context with newly created items visible.

**Open decision:** Is the appointment completed automatically, explicitly, or separately? Avoid implicit clinical status changes.

### J-02 Walk-in / unscheduled encounter
Find patient → **Nueva consulta** → same workspace without appointment context → save and continue from patient summary. Do not require a scheduled appointment.

### J-03 Quick study request without encounter
Find patient → **Solicitar estudio** → category, description, requested date, author/clinical reason if approved → optional related appointment or procedure → save and see request in patient study list. Do **not** create a fake encounter.

### J-04 Study requested within an encounter
From active consultation, select **Solicitar estudio**. The same study entry surface opens with patient and encounter preselected. Save the request without losing note text. Existing created orders remain traceable.

### J-05 Study follow-up
Open pending study → record when performed and/or when result is available as clinically validated → optionally record result notes → doctor marks reviewed with an explicit action. Pending work should be understandable without clicking through a consultation every time.

### J-06 Prescription, report and follow-up
From consultation actions, open doctor-authored prescription/report or follow-up scheduling with patient and current encounter pre-associated. Save independently and return to the active task. Browser-print the existing document record without claim of certified electronic prescribing.

## 4. Proposed consultation workspace

\`\`\`text
[Paciente / nombre / edad / contexto]     [Estado de la nota]
[Consulta · motivo · fecha]               [Guardar / Continuar]

┌────────────────────────────┬───────────────────────────┐
│ NOTA CLÍNICA               │ CONTEXTO RELEVANTE        │
│ Motivo e historia          │ Alergias / medicamentos   │
│ Exploración                │ Antecedentes relevantes   │
│ Valoración y plan          │ Última(s) consulta(s)     │
│ Seguimiento                │ Estudios pendientes       │
├────────────────────────────┴───────────────────────────┤
│ Acciones: Estudio · Receta · Informe · Cita futura     │
└────────────────────────────────────────────────────────┘
\`\`\`

This is a **low-fidelity conceptual layout**, not a pixel specification. On narrow screens, collapse context into an accessible section rather than burying it behind unrelated routes. Prefer modest progressive disclosure, good keyboard flow and meaningful focus order.

**Explicitly undecided:** autosave vs manual save/draft; drafts require clear definition of persistence, recovery and "not signed" semantics. Until approved, the current explicit-save behavior remains authoritative.

## 5. Proposed study-domain direction

**Current:** \`StudyRequest.patientId\` plus required immutable \`encounterId\`; \`ordered → completed → reviewed\`. The API supports appending studies to an existing encounter; the patient overview shows \`ordered\`/\`completed\` as pending.

**Candidate:** Patient is always required; originating encounter becomes optional, with optional linkage to an appointment (and procedure only if such an object is separately approved). Study requests should keep traceable creation and physician review information.

**Potential migration:** preserve all existing \`patientId\` and \`encounterId\` values; only relax constraints after a confirmed association model and API contract. Explicitly test historical queries, pending lists and the patient summary.

**Status vocabulary to validate:**
- \`Solicitado\` — clinician has ordered an examination.
- \`Realizado\` (optional) — examination happened but results may not yet be accessible.
- \`Resultado disponible\` — report is available to the doctor.
- \`Revisado\` — physician has examined the available result.

These are candidate **clinical events, not approved schema enums**. In particular, the existing \`completed\` state must not be remapped without deciding what it previously meant. The doctor may receive a result directly; avoid forced multi-click transitions. Define how missing/cancelled/incorrect orders are handled before introducing any new terminal state.

## 6. Design acceptance scenarios (proposals)

- **UX-A1:** Consultation can be documented while allergies, medications and relevant history are immediately accessible.
- **UX-A2:** Scheduled visit enters the clinical workflow without re-entering patient or appointment data.
- **UX-A3:** A phone/preoperative study is requested for a patient **without a fictitious encounter**.
- **UX-A4:** A request from a consultation links correctly, while saving does not discard an unsaved note.
- **UX-A5:** The user understands whether a study was ordered, performed, resulted and reviewed; no ambiguous status label is silently introduced.
- **UX-A6:** Prescription/report creation during an encounter returns to the consultation with correct patient/context linkage.
- **UX-A7:** Navigation, validation, interrupted editing and completion are predictable and do not report unsaved information as persisted.
- **UX-A8:** Prior O-005 functionality, migrations and synthetic seed stay intact after any approved implementation.

These are **review scenarios only**, not engineering acceptance gates until scope approval.

## 7. Proposed sequencing after approval

1. **Workflow decisions and interaction prototype:** observe/confirm physician tasks and approve study semantics, draft behavior and visit completion rule.
2. **Consultation workspace and context:** design and implement the smallest navigation/context changes without changing clinical data semantics.
3. **Independent study requests:** migrate associations and update API/contracts/forms/patient pending overview as a complete vertical slice.
4. **Appointment handoff and contextual document/follow-up actions:** remove unnecessary transitions and auto-fill known context.
5. **Integrated usability and regression verification:** task-based walkthrough with doctor; existing O-005 automated, migration, seed and print checks.

Each implementation slice should carry explicit acceptance criteria and preserve clinical integrity.

## 8. Document governance

- \`docs/UX_AUDIT.md\`: observations and evidence.
- This file: **non-authoritative design proposal** until approved.
- \`docs/DECISIONS.md\`: proposals remain proposed; approval must be explicit.
- \`docs/PRODUCT.md\`, \`WORKFLOWS.md\`, \`UI_SPEC.md\`, \`DATA_MODEL.md\`, \`API_CONTRACT.md\`, \`TASKS.md\`: keep O-005 behavior authoritative; revise normative specs only after O-006 scope decisions.
- \`docs/ACTION_PLAN.md\`: can track review work, but should never mark proposed features as implemented.

**No application code should be changed solely on the authority of this document.**
