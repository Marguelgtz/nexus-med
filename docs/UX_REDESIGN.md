# O-006 — Clinical workflow and UX design

**Status: OWNER-AUTHORIZED AND IMPLEMENTED (2026-11-09).** The owner mission authorized the workflows in this document, with conservative handling for unresolved clinical questions Q-O006-01…08. The implementation is integrated and verified on `feat/o006-clinical-workflows`; PR #7 is open for owner review. This document retains design rationale and options; as-built behavior is recorded in `UI_SPEC.md` §8 and `WORKFLOWS.md` §15.

**Baseline:** O-005 at `feat/nx-expansion-complete` commit `1309b51`; current findings are in `UX_AUDIT.md`.

**Mission boundary:** Owner mission O-006 (2026-11-09) authorizes the workflow changes described here and the necessary Next.js, Hono, shared-contract, Prisma, migration, seed, test, and documentation updates. Existing O-005 records and behavior remain authoritative wherever an O-006 clinical question is still open.

## 1. Intended outcome and constraints

Design a continuous workflow for one general surgeon to find a patient, prepare for a visit, review context, document care, order and review studies, create doctor-authored documents, schedule follow-up, and return to unfinished work.

The prototype still has one doctor, synthetic data, local-only operation, and no staff accounts. Registration or scheduling tasks that a secretary might prepare are included as discovery scenarios only. Do not add roles, authorization, AI, external integrations, uploads, a procedure lifecycle, or a generic dashboard by implication.

**Secretary-task hypothesis for review:** patient lookup/registration, contact updates, appointment scheduling/rescheduling, and preparing a list of upcoming visits are clerical candidates. Reviewing history, ordering/interpreting studies, documenting an encounter, and authoring a prescription/report remain doctor tasks in this proposal. This is not a permission matrix; the current application has one user and cannot enforce role separation. Validate which clerical tasks actually occur before designing a staff workflow.

The redesign should:

1. Keep patient identity, allergies, current medications, and encounter context visible while documenting.
2. Keep the note and active task in view when opening related actions.
3. Treat a consultation as clinical documentation, not a required parent record for every clinical task.
4. Separate appointment status from whether a consultation was documented; no implicit completion or encounter creation.
5. Make persistence, unsaved text, validation failures, and outstanding clinical work legible.
6. Preserve physician-authored content. The UI must not infer findings, diagnoses, doses, result interpretations, or treatment recommendations.

## 2. Proposed information architecture

Keep the current top-level navigation small: **Pacientes** and **Calendario**. Do not add a dashboard until the doctor demonstrates a need for a cross-patient queue.

- **Patient registry:** search, register, and open the patient workspace.
- **Patient workspace:** identity and safety context first; a compact view of active work; then related appointments, studies, documents, and encounter history.
- **Calendar:** retain the current day/week/month schedule. An appointment becomes an entry into the clinical workspace, not a separate destination that must be completed before care can be documented.
- **Consultation workspace:** a note editor with a persistent patient header, a relevant-context pane, and same-page actions for study, prescription, report, and follow-up.
- **Patient studies:** a patient-scoped list that can contain requests with or without an originating encounter (owner-authorized by O-006; minimum source/order-time fields remain open).
- **Contextual actions:** use an in-page panel for short related tasks. Keep existing deep-linkable document and appointment routes available for direct access and browser navigation.

In the patient workspace, keep one compact **Pendiente de atención** region for actionable items only (for example, studies awaiting doctor review and the next scheduled visit). Do not duplicate every historical record there. Whether a practice-wide review queue or secretary-prepared agenda is useful remains a validation question.

### 2.1 Layout alternatives reviewed

| Option | Strength | Weakness | Direction for review |
|---|---|---|---|
| Keep the current one-column form and add links to history | Lowest implementation cost; retains the familiar O-005 page. | Context still requires route changes or a long scroll; note can be lost in an interruption. | Reject as the final design if the goal is simultaneous context. It remains a fallback if the physician prefers the current mental model. |
| One-column form with collapsible context sections | Works at narrow widths and has a simple tab order. | Opening history pushes the note away; repeated expand/collapse adds friction. | Use only as the narrow-screen layout. |
| Two-column note plus persistent context pane | Keeps note and safety/history visible together; contextual actions can remain in the same workspace. | Needs desktop width; context can compete with the note if overfilled. | Preferred desktop hypothesis. Keep context read-only, compact, and individually expandable; validate on the doctor's actual monitor. |
| Multi-step wizard / tabs for note sections | Reduces initial visual length. | Hides the whole note, breaks cross-section review, and creates more transitions. | Do not recommend for the primary encounter workflow. |

### 2.2 Navigation and outstanding-work alternatives

- **New global dashboard/task board:** could surface work across patients, but duplicates calendar and patient records and creates a new prioritization model. Defer until the doctor confirms a daily cross-patient review task.
- **Patient-specific actionable summary:** shows only the next appointment and currently actionable/unreviewed study work above history. This uses the existing patient anchor, limits new navigation, and is the preferred first design hypothesis.
- **Calendar-only follow-up:** smallest change, but study review is not time-based and could remain hidden. Keep the calendar for visits; do not treat it as the only outstanding-work surface.

## 3. Current and proposed user journeys

The journeys below are the owner-authorized interaction direction for O-006, subject to the conservative clinical boundaries recorded in `DECISIONS.md`. Each starts from the current O-005 behavior described in `UX_AUDIT.md`.

### J-01 — Find or register a patient

**Current:** Search in `Pacientes`; open a result or create a record and then open its overview.

**Proposed:** Keep search as the fastest entry. Search results show name, available identifier, date of birth, and archive state so similar names are distinguishable. `Nuevo paciente` remains a separate form. After save, show the patient workspace with identity and the next useful action. Unknown values remain `No registrado`; never turn a blank allergy field into “sin alergias.”

**Secretary consideration:** A secretary could search/register or prepare an appointment in a future multi-user product. In this prototype, the doctor performs those actions; no actor or permission model is implied.

### J-02 — Schedule and prepare for a consultation

**Current:** Open a patient and create an appointment, or use the calendar. Preparation is not represented as a state.

**Proposed:** From the patient workspace or calendar, create the appointment with patient identity carried forward. Opening an upcoming appointment shows the patient's safety context, recent encounter dates/reasons, pending studies, and appointment details before the visit. A `Preparar` status or checklist is not added unless the doctor validates specific preparation work.

**Success check:** No patient is reselected or re-entered when moving from appointment to patient context; no implied study completion or clinical record is created by opening the appointment.

### J-03 — Attend a scheduled patient

**Current:** Calendar → appointment detail → the doctor can complete the appointment and optionally choose an existing encounter. There is no start-consultation action.

**Proposed:** Appointment detail offers `Atender paciente`. It opens the consultation workspace with patient and appointment context prefilled and visible. Opening the workspace does not change appointment status. After the encounter is explicitly saved, provide `Completar cita y enlazar esta consulta` with the current encounter selected and actual duration editable. The doctor may save the encounter without completing the appointment; the UI must show that the two records are still separate.

**Open question:** Confirm whether appointment completion and encounter linkage should always be one explicit action, whether completion may occur without an encounter, and how to represent an attended visit with no note. Do not complete or link silently.

### J-04 — Attend a walk-in or unscheduled patient

**Current:** Registry → patient workspace → `Nueva consulta`; no appointment is required.

**Proposed:** Keep the same consultation workspace, with a clear `Sin cita` context. The doctor can document an unscheduled interaction without inventing an appointment. After save, return to the patient workspace or remain in the encounter with related actions available.

### J-05 — Review clinical history while documenting

**Current:** Background and timeline are on the patient overview; new consultation receives only the patient ID and displays the identity strip. The encounter list response contains summaries (date, type, reason), not note sections.

**Proposed:** Keep a right-hand `Contexto clínico` pane beside the note. Show allergies and current medication prominently with an explicit `No registrado` state, followed by other patient-level background and the most recent encounter summaries. Open a previous encounter in a secondary panel on demand; do not fetch every full note up front. Pending studies remain accessible without leaving the note.

**Safety rule:** Context is read-only while a new note is being written. Editing patient background is a separate, explicit action; changing it must not rewrite historical encounter text.

### J-06 — Document the consultation and manage interruptions

**Current:** A long form has date/type, seven clinical text areas, and study rows. `Guardar consulta` persists explicitly; there is no server draft. A failed request preserves typed text, and a native unload warning is used.

**Proposed:** Use a stable header with patient, visit context, persistence state, and `Guardar consulta`. Keep the seven current note sections and their order unless physician review changes them. The note remains the primary column; history and related actions do not replace it. Keep explicit save as the default; do not autosave. Add an in-app unsaved-changes guard for navigation that would discard text. A persisted `Guardar borrador` is a separate decision and must not be implemented just because the form is long.

After save, keep the encounter context open. The doctor can edit the saved note, create linked documents, order a study, or schedule a return visit without going back to the registry. No action is labeled `Firmar` or `Finalizar` unless a separately approved clinical/legal model defines that meaning.

### J-07 — Order a study during or outside a consultation

**During a new consultation:** `Solicitar estudio` adds rows to a visible unsaved-order queue in the workspace. The encounter and its staged studies save together using the current atomic behavior. The row clearly says it is not yet saved. If the doctor leaves, the unsaved-changes guard covers both note and staged orders.

**From a saved encounter:** open the same study panel with patient and encounter preselected. Save the order and remain on the encounter.

**Without an encounter:** from the patient workspace choose `Solicitar estudio`; save a patient-level request without manufacturing a consultation. The encounter association is absent and shown as such. A phone request may need both the time the doctor ordered it and the time it was entered; the doctor must say whether those differ and what minimum reason/source is needed.

Do not add appointment or procedure associations to the study record by default. First determine whether an order needs to target a particular scheduled visit or whether patient + optional encounter is enough. Q-NX-01 remains deferred; no procedure object is assumed.

### J-08 — Receive and review study results

**Current:** Encounter detail advances `ordered → completed/reviewed` or `completed → reviewed`, with optional text. The UI does not identify a distinct result-arrival event.

**Proposed:** Give the study a patient-level detail/review surface reachable from both the patient workspace and a linked encounter. Display the original request, its association, current state, and any doctor-entered result note. Separate the actions that the doctor confirms: examination performed, result received, and result reviewed. A doctor who receives and reviews a result in one step should be able to record that honestly without artificial clicks.

The exact labels, transitions, event dates, and whether a result may be attached are open. Until decided, do not reinterpret stored `completed` values or silently change transition behavior. Uploads, external lab integrations, and automatic interpretation remain out of scope.

### J-09 — Create a prescription/report and arrange follow-up

**Current:** Documents are created from the patient workspace and may link to a saved encounter. Follow-up instructions are free text; scheduling is a separate patient appointment flow.

**Proposed:** From a saved encounter, open `Receta`, `Informe`, or `Programar seguimiento` in a side panel that keeps the encounter visible. Prefill the patient and current encounter where the document API permits. For an unsaved new encounter, explain that saving the consultation first is required to create a linked document; preserve the note and return to the same workspace afterward. Appointment scheduling can be independent; its relationship to the encounter follows the explicit completion/link rule in J-03.

**Procedure preparation:** Keep the existing type and free-text plan only. Any procedure checklist, recommendation/scheduling/performance lifecycle, or preparation module is outside this proposal until Q-NX-01 is resolved in a separate approval.

### J-10 — Return to a patient and understand outstanding work

**Current:** The patient workspace shows upcoming appointments, documents, pending studies, and chronological encounters. There is no cross-patient pending queue or saved draft list.

**Proposed:** Put the next appointment and items needing doctor review in a compact actionable region near the patient identity. Each item links to the exact encounter or study context. Keep historical documents and encounter timeline below it. If drafts are later approved, show them distinctly as drafts and never mix them with completed encounters. The calendar remains the only global schedule until a daily review queue has been validated.

## 4. Screen concepts and low-fidelity layouts

These layouts establish hierarchy and behavior only. They are not pixel specifications or authority to replace the O-005 visual system.

### 4.1 Patient workspace — desktop

```text
┌ Pacientes / Paciente: [Nombre] · ID [identificador] · Archivado? ────────┐
│ [Nueva consulta] [Cita] [Solicitar estudio] [Receta] [Informe]           │
├─────────────────────────────────────────────────────────────────────────┤
│ Alergias: No registrado       Medicamentos: No registrado                 │
│ Antecedentes: Afecciones · Cirugías previas                 [Ver todo]  │
├─────────────────────────────────────────────────────────────────────────┤
│ Pendiente de atención                                                   │
│ • Estudio — estado confirmado por el doctor — [Revisar]                 │
│ • Próxima cita — fecha/hora — [Abrir cita]                              │
├─────────────────────────────────────────────────────────────────────────┤
│ Consultas | Estudios | Citas | Recetas e informes                       │
│ Lista de la sección activa; timeline por fecha en Consultas             │
└─────────────────────────────────────────────────────────────────────────┘
```

The example text is structural, not demo clinical content. Render unknown values as `No registrado`; never render a blank field as a negative finding. Hide the pending region when empty. Keep quick actions available from the existing patient route and keep archive controls visually distinct from clinical actions.

### 4.2 Consultation workspace — desktop

```text
┌ [Nombre] · ID [identificador] · [Cita / Sin cita] · [Sin guardar]         │
│ [Guardar consulta] [Cancelar]                                            │
├─────────────────────────────────────────────┬───────────────────────────┤
│ NOTA CLÍNICA                                │ CONTEXTO CLÍNICO          │
│ Fecha/hora · Tipo de atención               │ Alergias                  │
│ Motivo de consulta                          │ Medicamentos actuales    │
│ Enfermedad actual                           │ Antecedentes              │
│ Antecedentes relevantes                     │ Consultas recientes       │
│ Exploración física                          │ Estudios por atender     │
│ Valoración                                  │ [Abrir nota anterior]     │
│ Plan                                        │                           │
│ Seguimiento                                 │                           │
│ Estudios solicitados · [Agregar estudio]    │                           │
├─────────────────────────────────────────────┴───────────────────────────┤
│ Acciones: [Estudio] [Receta] [Informe] [Programar seguimiento]           │
└─────────────────────────────────────────────────────────────────────────┘
```

The note is the dominant column. The context pane is read-only and independently scrollable only when needed; it must not create a second long page beside the note. Contextual actions open a narrow side panel and preserve note focus and values. A persisted encounter can be revisited and edited; the action row must identify whether the note is saved.

### 4.3 Consultation workspace — narrow screen

```text
┌ [Nombre] · ID [identificador]                             [Sin guardar] ┐
│ [Guardar consulta]                                                       │
│ [Contexto clínico · expandir]                                           │
├─────────────────────────────────────────────────────────────────────────┤
│ Nota clínica: fecha, tipo, motivo, enfermedad, exploración, plan…       │
│                                                                         │
├─────────────────────────────────────────────────────────────────────────┤
│ [Estudio] [Receta] [Informe] [Seguimiento]                              │
└─────────────────────────────────────────────────────────────────────────┘
```

On small screens, context is an accessible disclosure region, not a separate route. Opening/closing it must not reset the note or move focus unexpectedly. The current target remains desktop-first; narrow layouts are readable and operable, not a separate mobile product.

### 4.4 Appointment handoff

```text
┌ Cita · [Nombre] · [fecha/hora] · [tipo] · Programada ────────────────────┐
│ Contexto: alergias/medicamentos · próxima tarea                         │
│ [Atender paciente] [Editar] [Cancelar cita]                             │
│                                                                         │
│ After explicit encounter save:                                          │
│ Consulta guardada · [Completar cita y enlazar esta consulta]            │
│ Duración real [30 min] · [Confirmar] [Dejar cita pendiente]              │
└─────────────────────────────────────────────────────────────────────────┘
```

Opening an appointment never completes it. The doctor sees which encounter will be linked and confirms any appointment status change. Error recovery leaves the encounter and appointment unchanged unless the API confirms the mutation.

### 4.5 Patient study list and request panel

```text
Estudios del paciente                                      [Solicitar estudio]
┌ Fecha/etapa por definir · categoría · descripción · [Consulta opcional] ┐
│ Resultado: nota del doctor, si existe                   [Revisar]        │
└─────────────────────────────────────────────────────────────────────────┘

Solicitar estudio
Paciente: [Nombre] (fijo)
Categoría: [lista actual; Q-NX-02 sigue abierta]
Estudio: [texto del médico]
Motivo / fuente / fecha del pedido: [solo los campos aprobados]
Asociación: [Sin consulta] [Consulta existente…]
[Guardar solicitud] [Cancelar]
```

“Fecha/etapa por definir” marks a design question, not proposed user-facing copy. O-006 resolves the initial field set conservatively: patient is required, encounter is optional and immutable when supplied, category and description use existing fields, and `createdAt` is record-entry time only. Existing statuses remain unchanged; their clinical meaning is still pending physician validation.

### 4.6 Study result review

```text
Estudio · descripción en palabras del doctor
Paciente: [Nombre] · Consulta relacionada: No registrada
Solicitud: fecha/source text only after confirmed
Etapa: [label and meaning approved by the doctor]

Resultado / observación del doctor
[texto ingresado por el doctor; no interpretación automática]

[Registrar resultado] [Marcar revisado] [Cancelar]
```

Keep the existing forward actions (`ordered → completed`, `ordered → reviewed`, `completed → reviewed`) and optional doctor-authored note. The interface must state that `completed` does not separately record performance or result arrival. Do not add event-specific actions or dates until the underlying meanings and transition rules are approved. Result files remain out of scope.

### 4.7 Contextual prescription / follow-up panel

```text
Consulta guardada · [fecha/hora]
┌ Receta / Informe / Programar seguimiento ─────────────────┐
│ Paciente: [Nombre] (fijo)                                 │
│ Consulta relacionada: [esta consulta]                     │
│ Existing doctor-authored form fields                      │
│ [Guardar] [Volver a la consulta]                          │
└───────────────────────────────────────────────────────────┘
```

Date and text above are structural placeholders, not synthetic patient facts. The panel reuses current O-005 prescription/report fields; it does not generate clinical content or add signature/provider fields. When the encounter is not yet saved, the panel first asks the doctor to save the encounter before creating a linked document.

## 5. Consultation workspace behavior

### 5.1 Entry and context

- Entry points: `Nueva consulta` from a patient; `Atender paciente` from a scheduled appointment; optionally an explicitly approved daily agenda.
- Patient identity is fixed in the workspace header. A scheduled entry also shows appointment date/time and planned type; a walk-in shows `Sin cita`.
- Initial context should include patient background and a small recent-encounter summary. Load a full prior note only when the doctor opens it. Do not eagerly fetch every historical note.
- Pending studies are available in the context pane with the patient's current association and state; a study action opens details without replacing the active note.
- Preserve the current seven note fields and doctor-authored text. Reordering sections or adding clinical fields requires physician review.

### 5.2 Contextual actions

| Action | Proposed behavior | Persistence rule |
|---|---|---|
| Solicitar estudio | Open a same-page panel. For a new unsaved encounter, stage the rows beside the form; for a saved encounter, create under the encounter; from patient overview, allow the owner-authorized standalone patient request. | New-encounter note + staged studies use the existing atomic save. A standalone request is visibly independent. Do not imply a staged row was persisted. |
| Nueva receta / Nuevo informe | Open an in-place panel with patient and saved encounter prefilled. | Existing document endpoint can serve a saved encounter. If the note is new/unsaved, ask for an explicit save checkpoint before creating a linked document; keep the note values and return to it. |
| Programar seguimiento | Open appointment form in a panel with patient prefilled and a clear return date/time. | Appointment saves independently. Do not imply it was created merely because free text exists in `Seguimiento`. |
| Abrir nota previa | Show the selected saved encounter in a secondary panel or a stable side view. | Read-only until the user explicitly selects `Editar`; changing patient context never mutates the current note. |

Do not use a modal that obscures patient identity or traps a long task. On desktop use a side panel; on narrow layouts use a full-width in-page region with a clear return-to-note action.

### 5.3 Save and interruption policy

Three approaches were considered:

| Approach | Benefit | Cost / risk | Recommendation |
|---|---|---|---|
| Explicit save only (current) | Simple; save is observable; avoids claiming unsaved data is persisted. | A reload/crash loses a long note; current in-app Cancelar can leave the form. | Keep as the initial approved behavior; add an in-app leave guard and contextual panels that do not navigate away. |
| Explicit persisted draft | A doctor can intentionally save partial work and return after interruption. | Requires draft state, retrieval/filtering, visibility rules, stale/conflicting edit behavior, and careful wording so a draft is not confused with a completed note. | Candidate follow-up only if physician observation confirms frequent interruptions and a need to resume. Define the meaning of “borrador” first. |
| Autosave | Minimizes manual saving. | Can persist unintended or incomplete content, creates ambiguous save state, and needs retry/conflict/recovery behavior. | Not recommended for this prototype without explicit approval and a demonstrated need. |

**Provisional recommendation:** preserve explicit save, add an in-app confirmation before navigation that would discard changed note/study rows, and keep contextual actions in the workspace. Show `Sin guardar` while the note is dirty and `Guardando…` only during a request. After a successful save, show `Guardada` with the saved timestamp and keep the note open. On validation/network errors, retain every value, focus the first invalid field, and state that nothing was saved when the server did not confirm success. Do not use browser local storage for clinical text. Do not use `Firmar`, `Finalizar`, or `Autoguardado` copy.

The `beforeunload` message remains browser-controlled. For in-app navigation, intercept only known app navigation and offer `Seguir editando` / `Descartar cambios`; never intercept a successful save. If draft persistence is later approved, define its API, database state, timeline visibility, and recovery before implementation.

### 5.4 Major-screen interaction contract

| Surface | Primary hierarchy and actions | Empty/loading/error behavior | Navigation and context rule |
|---|---|---|---|
| Patient registry | Search and result identity first; create patient remains a separate action. | Preserve O-005 skeleton, no-results, API retry, and form errors. A failed search is not an empty registry. | Opening a result establishes the patient workspace; do not add a global dashboard in this redesign. |
| Calendar | Preserve day/week/month views; scheduled appointment rows gain `Atender paciente`. Existing edit/reschedule/cancel remains contextual. | Preserve current date validation, overlap notice, out-of-hours listing, and retry behavior. | Opening or attending does not complete an appointment. Appointment and patient context stay visible. |
| Patient workspace | Identity and unknown-vs-known safety context; compact actionable work; then section navigation for consultations, studies, appointments, and documents. | Hide the actionable region when empty; distinguish missing data from load errors; preserve empty-history action. | Keep the stable patient identity and direct actions. Each list item opens its exact patient/encounter context. |
| Appointment detail | Patient/date/type/status; `Atender paciente` for scheduled visits; separate explicit edit, cancel, complete/link. | Preserve last state on network/API failure; completion errors do not imply note-save errors. | Encounter can be opened from the visit; the doctor sees which encounter is linked before confirmation. |
| Consultation workspace | Sticky patient/visit header; seven note sections; compact context rail; same-page action strip; explicit save. | Context may load independently; note save errors preserve all text and focus the first invalid field. | Side panels preserve the current note; internal route changes ask before discarding; successful saves keep encounter context open. |
| Study list/detail | Patient-scoped requests, association/source, status/events only after approval, doctor-entered result note. | No requests is an intentional empty state; absent results are not normal/negative results; failed updates preserve typed note. | Reachable from patient and encounter. Standalone entries remain honestly unlinked. |
| Prescription/report panel | Current O-005 form fields and print rules; patient/current encounter prefilled when saved. | Preserve existing validation and print states; panel/API errors do not clear the encounter. | Same-page panel for an existing encounter. A new encounter requires an explicit save checkpoint before creating a linked document. |
| Follow-up panel | Appointment date/time/type and confirmation, with patient prefilled. | Empty schedule, overlap, validation, and API errors remain distinct. | Saved appointment is shown as a separate record; free-text `Seguimiento` is not evidence that an appointment exists. |

## 6. Study request, result, and review design

### 6.1 Candidate ownership and associations

**Owner-authorized O-006 model (D-034):** every request belongs to a patient. An originating encounter may be absent for telephone, pre-visit, or other patient-level requests. When present, the API verifies that the encounter belongs to that patient. Keep the existing association immutable. Do not add appointment/procedure links absent a demonstrated workflow need. A separate procedure object remains deferred under D-025/Q-NX-01.

| Association option | What it supports | Tradeoff | Provisional direction |
|---|---|---|---|
| Encounter required (O-005) | Clear origin for every study ordered during a documented consultation. | Cannot represent phone/pre-visit orders honestly. | Retained as the historical O-005 behavior; no fake encounter is created. |
| Patient required, encounter optional | In-visit and standalone orders; stable patient-level review. | Minimum source/order-time policy remains open. | Implemented under O-006 with same-patient validation. Keep an existing encounter link immutable. |
| Patient + optional encounter + optional appointment | Can tie a pre-visit study to a planned visit. | Adds multiple relationships, precedence questions, and more invalid/stale cases. | Defer unless Q-O006-07 confirms a concrete clinical need. |
| Generic clinical-event/procedure relationship | Could model many future sources. | Introduces a broad abstraction and a procedure lifecycle outside current scope. | Reject for this prototype unless separately justified and approved. |

The relationship is implemented by the O-006 migration. Standalone requests are not later reassociated; a linked encounter is immutable. Appointment association is excluded unless a demonstrated need changes the decision.

### 6.2 Keep clinical events distinct

The workflow distinguishes at least these real-world events:

1. The doctor requests/orders the study.
2. The study is performed.
3. A result becomes available to the doctor.
4. The doctor reviews the result.

They may occur at different times, and a result may arrive without a consultation. Current `ordered`, `completed`, and `reviewed` do not fully express that sequence. These are the **current persisted values**, not proposed replacements. The question of what old `completed` records mean is unresolved; do not map them to “performed” or “result available” automatically.

### 6.3 Status/event options for physician review

| Option | Representation | Advantages | Tradeoffs |
|---|---|---|---|
| A. Clarify the existing three states | Keep `ordered → completed → reviewed`; doctor defines exactly what `completed` means; allow direct review only if it matches actual work. | Smallest migration/API/UI impact; preserves current behavior. | Cannot distinguish performed from result received if both matter. |
| B. Distinct current state plus event dates | Introduce clinically confirmed labels for performed and result available, then reviewed; record corresponding timestamps. | Clear pending work and dates; avoids combining separate events. | Requires new transitions, user training, migration treatment for historical `completed`, and decisions for direct receipt/review. |
| C. Explicit event history | Keep request identity and record ordered/performed/result-received/reviewed events with time and source; derive a display state. | Best traceability for events that arrive out of order or are corrected. | More schema/API/UI complexity and event-correction rules; likely excessive for a single-doctor prototype unless the doctor needs it. |

**Provisional recommendation:** ask the doctor to define the existing labels first. If the doctor needs to distinguish performance from result receipt, prefer explicit events or timestamps over overloading a single `completed` value. Preserve historical states until each mapping is approved. A direct “result received and reviewed” action may record both events together if the doctor confirms that use case.

Possible Spanish labels for review—not canonical copy or approved enum values—are `Ordenado`, `Realizado`, `Resultado disponible`, and `Revisado`. The doctor must confirm whether these are separate states or whether `Realizado` and `Resultado disponible` can be one stage. Keep the current `Ordenada` / `Completada` / `Revisada` UI until that review.

### 6.4 Result entry and incorrect requests

- The prototype has no result-file uploads, lab integrations, or external record access. A doctor-authored text observation is the only in-scope result content unless new scope is approved.
- A result note records what the doctor enters; it must not interpret the result or generate a diagnosis.
- Decide whether the note is entered when the result arrives, when it is reviewed, or either time; decide if edits after review are allowed and how they are labeled.
- Decide how to correct a wrong request. Current O-005 has no edit/delete path. Candidate approaches include a visible cancelled/entered-in-error state with a reason, or preserving the order and adding a correction event. Do not invent a final state or silently delete clinical history.

## 7. Loading, empty, error, save, and interruption states

| Screen/action | Loading | Empty / unknown | Failure | Success / recovery |
|---|---|---|---|---|
| Patient workspace | Keep patient header; load main summary sections together or show section-level skeletons. | Use explicit `No registrado`; hide the pending-work region when there are no actionable items; keep history empty state and `Nueva consulta`. | Retry the failed section without converting it to “no records”; retain last known context only with a stale indicator. | Mutation returns to the same patient and updates only the affected section. |
| Consultation workspace | Patient identity and appointment context render before the editor; show a quiet status for any delayed context. | Empty background and encounter history use `No registrado` / `Sin consultas previas`; never imply a negative clinical finding. | Context-pane failure is separate from save failure; note fields remain usable. Save failure preserves values and explicitly says not saved. | Explicit save keeps the encounter open, shows saved timestamp, and exposes related actions. |
| Study request panel | Disable duplicate submit and show `Guardando…`. | No studies: explain no prior requests and keep the request action. Unknown association: show `Sin consulta relacionada`. | Inline field errors; network/conflict keeps values and does not show a success state. | Show the patient, optional encounter, request time semantics (once defined), and confirmed status. |
| Study review | Display last known state while loading a mutation; disable only the active action. | Result unavailable and result note absent are distinct; no fabricated “normal” result. | Preserve text and selected action; surface a retryable message. | Show the confirmed event/state and timestamp; keep it in the patient record. |
| Appointment handoff | Load appointment and patient context with skeletons. | Deleted/missing encounter is a clear not-found state; no silent completion. | Failed encounter save leaves appointment status unchanged; failed appointment completion leaves the saved encounter intact and offers retry. | Identify the exact linked encounter and updated appointment state. |
| Contextual document / follow-up | Keep note values and focus in the workspace while the panel loads. | No related document/appointment is a neutral empty state. | Preserve panel values; distinguish “encounter saved” from “document/appointment saved.” | Return to the same patient/encounter with the new item visible. |

Do not reuse “No registrado” for system failures. Do not show a success state until Hono confirms the mutation.

## 8. Accessibility, keyboard use, and responsive behavior

- Use semantic headings, landmarks, labelled form controls, visible focus, and text labels in addition to color or icons.
- Each side panel has a heading, a predictable focus entry point, a close/return control, and focus restoration to the action that opened it. Escape closes only when it will not discard entered panel data; otherwise ask first.
- Preserve the natural note tab order. Do not add undocumented shortcuts that can fire while typing in a clinical text field. Keyboard users must reach save, action buttons, context disclosures, and validation errors without a pointer.
- Link field errors with `aria-describedby`; after a failed save, focus the first invalid field and announce the error without moving the user's text.
- Show patient name and identifier in the workspace at all viewport widths. On a narrow screen, context may collapse into an accessible disclosure; the active note remains in the main reading order.
- Desktop uses a two-column note/context workspace. Tablet may use a narrower context rail or disclosure. Phone uses a single column and full-width action panel. Do not horizontally scroll a note to reach fields or actions.
- Use sufficient contrast and large targets. Do not rely on status color alone; keep visible status text. Avoid motion and timed notifications that disappear before the doctor can read them.

## 9. API and data-model implementation notes

The existing O-005 contract is the implementation baseline. O-006 changes required by the owner mission are authorized; decisions that would add clinical meanings or historical mappings remain open.

| O-006 capability | Contract and implementation | Data-integrity notes |
|---|---|---|
| Read context beside the note | The current patient, encounter-summary, appointment, and pending-study GET routes can provide much of the context. `EncounterSummary` contains date/type/reason only; fetch a full note on demand through the existing encounter detail route instead of N+1 full-note reads. A new aggregate endpoint is optional and should be added only if measured SSR/API needs justify it. | No migration required for read-only context. Keep patient reads request-time/no-store. |
| Appointment → consultation handoff | Add `Atender paciente` and carry appointment context into the consultation route. After encounter save, use the existing completion endpoint with that encounter ID. | Reuses the existing relation and endpoint. No status change on route entry or encounter save. |
| Contextual documents and follow-up | Use current document create and appointment create APIs with the patient and saved encounter context. Require explicit save before a new encounter can have a linked document. | No new document schema. A follow-up appointment is independent and does not imply completion/linking. |
| Patient-level study requests | Implemented `POST /api/patients/:patientId/studies`; optional encounter ID is same-patient validated. DTO permits `encounter: null`; existing encounter-scoped API remains available. | Migration `20261109050649_o006_optional_study_encounter` rebuilds SQLite table and preserves all existing study fields, indexes, and associations; temporary seeded DB verification passed. Tests cover standalone requests and mismatched/missing associations. No appointment/procedure foreign key. |
| Distinct performed/result/review events | Extend request/response contracts, server validation, transition rules, and views only after the doctor defines the events and direct transitions. | If separate timestamps suffice, add nullable columns and leave historical values untouched until a mapping is agreed. If event history is required, an event table is a separate complexity choice. Do not silently backfill `completed` as either performed or resulted. |
| Explicit persisted drafts | Not part of O-006. Keep explicit save and protect unsaved work with in-app/unload confirmation. | No draft state, migration, or local-storage copy is introduced. |

API rules for O-006 implementation: Hono remains authoritative; derive patient association from a patient-scoped route; validate an optional encounter belongs to the same patient; update DTOs and schemas shared by web/API; preserve existing O-005 transitions until the doctor approves a new model; test historical data, migration, seed, idempotency, and rollback where writes span records.

The optional-study migration has been generated and verified against the local Prisma 7/SQLite runtime. Remaining UI-only work should reuse current contracts where possible; any further API or schema change must be tied to an O-006 acceptance need, tested, and documented in the same slice.

## 10. Open decision register for review

These questions are also recorded as open items in `DECISIONS.md`. D-033…D-039 contain the owner-authorized implementation decisions; this register retains the clinical meanings that still require physician input.

| ID | Question and options | Provisional recommendation | Changes gated on answer |
|---|---|---|---|
| Q-O006-01 | Patient-level ordering is authorized; what minimum reason/source or separate clinical order-time information does the doctor require? | Start with patient + optional same-patient encounter, existing category/description, and `createdAt` as entry time only. | Add fields only after physician validation; no implementation blocker for current workflow. |
| Q-O006-02 | What does `completed` mean: performed, result available, or both? Is direct `ordered → reviewed` valid? | Preserve existing records; define distinct events if doctor says performance and receipt occur separately. | Status labels, transitions, timestamps/event data, migration mapping, result-review UI. |
| Q-O006-03 | How does the doctor receive and document a result without uploads/integrations? When may a result note be edited? | Keep a verbatim physician-entered text note; never interpret it. Decide whether a review timestamp is required. | Result-entry fields, review actions, event capture. |
| Q-O006-04 | How should an incorrect or cancelled order be represented under the no-delete rule? | Preserve the request and record an explicit correction/cancellation only after the doctor chooses its meaning. | New status/event, edit policy, correction UI, history display. |
| Q-O006-05 | Should appointment completion and encounter linkage happen together, separately, or at encounter save? Can a completed visit have no note? | Start from appointment context; do not change state on open. Use a separate explicit completion/link action unless the doctor requests another rule. | Handoff UI; possibly API transition rules or relation changes. |
| Q-O006-06 | Are persistent drafts necessary? What does “draft” mean, who may see one, and how is it distinct from a saved/edited encounter? | First add in-app unsaved-change protection and same-page panels. Add persisted drafts only after an observed need and approved semantics. No autosave. | Encounter state, save API, migration, draft list, recovery and concurrency behavior. |
| Q-O006-07 | Does a demonstrated workflow need a study-to-appointment relationship? | O-006 has no appointment/procedure association; encounter association is optional and immutable. Revisit only with a concrete need. | No current implementation change. |
| Q-O006-08 | Which pre-procedure tasks are needed? Which tasks could an assistant prepare, and which must stay doctor-only? | Keep Q-NX-01 deferred; map secretary tasks in research only. Do not add staff roles or a procedure lifecycle in this phase. | Separate scope/decision before any role or procedure implementation. |

Existing Q-NX-02 (study categories) remains open. O-006 retains the current fixed category list; no new category is introduced without physician confirmation.

## 11. Authorized implementation sequence

This is the authorized execution sequence for the current O-006 implementation mission. The owner mission supplies Gate 0 authorization; unresolved clinical questions remain explicit constraints within later slices.

### Gate 0 — Owner/physician review

**Complete — owner authorization:** The full O-006 mission authorizes implementation of this workflow direction. Q-O006-01 through Q-O006-08 remain open where physician input is needed; proceed with the smallest reversible behavior that does not assert an unvalidated clinical meaning.

### Slice 1 — Consultation context workspace (primarily UI)

**Deliver:** persistent patient/visit header, note + context layout, prior encounter on-demand view, pending work summary, accessible in-page action panels, and in-app unsaved-change guard. Keep the seven current note fields and explicit save.

**Dependencies:** Owner authorization is recorded in D-033. Existing SSR reads are the starting point; add no aggregate endpoint unless profiling shows it is needed.

**Acceptance:** scheduled and walk-in entry both show correct context; history is accessible while the note remains intact; no hidden save occurs; validation/network failure preserves content; internal navigation warns before discarding; all O-005 encounter behavior still works.

### Slice 2 — Appointment handoff and follow-up (UI, API only if decision requires)

**Deliver:** `Atender paciente` from appointment detail/calendar, prefilled appointment context, then an explicit completion/link action after encounter save; in-context follow-up appointment form.

**Dependencies:** The owner mission authorizes an explicit completion/link action after encounter save. Reuse `POST /appointments/:id/complete`; keep the appointment unchanged until the doctor confirms that action. Preserve a way to save the encounter and leave the appointment pending.

**Acceptance:** patient and appointment are not re-entered; opening does not mutate status; encounter save and appointment completion failures are reported separately; exact same-patient encounter link is shown; unscheduled care remains available.

### Slice 3 — Patient-level study ordering (API + migration + UI)

**Deliver:** patient-scoped request entry, optional immutable encounter association, patient-level list/detail, encounter-linked entry from the workspace, and visible association plus entry time. A source field remains deferred while Q-O006-01 is open.

**Dependencies:** Owner mission authorizes patient-level requests and optional same-patient encounter links. Use the existing category/description fields and entry timestamp; do not invent source, clinical order-time, cancellation, or reassociation semantics while Q-O006-01/04/07 remain open. Preserve the current status meanings and explain their limits while Q-O006-02/03 remain open.

**Acceptance:** create by phone/pre-visit without a fake encounter; create from an encounter with correct same-patient link; list linked and standalone requests; migration preserves all existing associations; seed is idempotent; all invalid cross-patient associations fail safely.

### Slice 4 — Study event/status behavior (deferred pending physician semantics)

**Deliver:** For this mission, preserve `ordered`, `completed`, and `reviewed` transitions and historical values. Improve the review surface and document that `completed` does not separately identify performance or result arrival. Add event states/timestamps only in a later approved change after physician validation.

**Dependencies:** Q-O006-02/03/04 remain open and block any new event semantics, timestamps, or correction states. They do not block the conservative status-preserving workflow in this mission.

**Acceptance:** Existing transitions and result-note behavior remain validated and unchanged; the UI does not claim a `completed` study was performed or that a result arrived; existing records are not remapped. Further event-level distinctions wait for physician input.

### Slice 5 — Contextual documents and continuity (UI, mostly existing APIs)

**Deliver:** recipe/report actions from saved encounters, follow-up scheduling, return to the same context, and patient overview ordering of actionable work and history.

**Dependencies:** consultation workspace and saved-encounter checkpoint behavior. New endpoints only if a verified need is not covered by O-005.

**Acceptance:** saved document has correct patient/encounter; the active encounter remains reachable; failed document/appointment creation does not claim success or lose note text; browser print retains the fictional-data marker.

### Slice 6 — Persisted drafts, only if approved

**Deliver:** explicit save/resume of partial encounters with clear draft labeling, recovery, visibility and stale-edit behavior.

**Dependencies:** Q-O006-06 plus a separate authorization, migration design and acceptance criteria. Autosave remains excluded unless separately approved.

### Integrated workflow verification

After approved slices, walk through all ten journeys with a physician using synthetic data. Measure task completion, route changes, time, errors, wrong associations, and unsaved-loss incidents against the current baseline. Rerun all O-005 tests, clean migration/seed, idempotency/persistence and browser print checks. Do not claim usability from a successful build alone.

## 12. Proposed design review criteria

If approved, use these as task-based review scenarios rather than coding-only checks:

- **R1 Patient continuity:** From a patient record, the doctor can identify unknown versus recorded safety context and reach the last consultation without losing the current patient identity.
- **R2 Scheduled visit:** From a calendar appointment, start a consultation without re-entering patient data; appointment state stays unchanged until the doctor explicitly changes it.
- **R3 Walk-in:** Create and save an unscheduled encounter without an appointment or fabricated association.
- **R4 History during note:** See allergies, current medication, recent encounter summaries, and pending studies while the note remains visible and editable.
- **R5 Unsaved note:** Open and close a contextual panel; all note values and cursor context remain. Attempt in-app navigation with edits; choose “seguir editando” or explicitly discard. Failed saves never look successful.
- **R6 Standalone study:** Create a phone/pre-visit request with no encounter and find it from the patient workspace without a fake note; show only the entry timestamp unless a separate clinical order time is recorded in a later approved change.
- **R7 Study lifecycle:** Doctor correctly distinguishes order, performance, result availability, and review according to definitions approved for the prototype; historical data is not silently reinterpreted.
- **R8 Clinical actions:** Create a prescription/report and schedule a return visit from the encounter; the patient and encounter context are correct and the note remains accessible.
- **R9 Return to work:** Reopen a patient and identify the next appointment and work that genuinely requires action without scanning unrelated historical cards.
- **R10 O-005 regression:** Existing registry, background, encounter, calendar, appointment, study, document, print, demo-seed and restart behavior remains intact.

Record baseline and proposed completion time, route changes, errors, association mistakes, and user assistance for each task. Do not set performance thresholds until a doctor has tried the tasks; use the baseline to identify which redesign changes actually help.

## 13. Governance and exclusions

- This document is the approved O-006 workflow direction under D-033; `UX_AUDIT.md` remains the source-verified audit of the O-005 baseline.
- Q-O006 items remain unresolved clinical questions. Implementation must not promote uncertain status meanings, timestamps, or role assumptions into facts.
- Revise `PRODUCT.md`, `WORKFLOWS.md`, `UI_SPEC.md`, `DATA_MODEL.md`, `API_CONTRACT.md`, `TASKS.md`, and tests with verified behavior as each slice is delivered.
- This mission authorizes O-006 implementation only; excluded capabilities remain out of scope.
- Excluded here: authentication, staff accounts/permissions, uploads, external labs, AI interpretation, FHIR/HL7, production deployment, billing, and dedicated procedural lifecycle.
