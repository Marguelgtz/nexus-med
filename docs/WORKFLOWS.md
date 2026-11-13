# Product Workflows — Medical Platform MVP

## Current account and multi-user workflows — NM-PILOT-001

The existing clinical workflows below remain applicable under authenticated clinic scope. Older no-auth/no-file/single-doctor entry assumptions are historical and superseded here.

1. **Register and establish a clinic:** `/registro` accepts doctor account details (or configured Google sign-in). Email verification precedes login/privileged access. A verified identity without clinic access reaches `/onboarding`, records the clinic name (pilot timezone `America/Mexico_City`), and receives doctor membership with administration capability. Server-generated stable bootstrap IDs make retries reuse the intended clinic; callers cannot choose an existing clinic to own. An account alone grants no clinic data access.
2. **Invite staff:** a clinic administrator with recent authentication opens access management and chooses doctor or secretary plus email. The server binds clinic, role, expiry and issuer. New accounts register/verify, or existing accounts sign in; acceptance requires the verified matching identity and token, never an email-string match alone. Expired/revoked invitations fail; replay cannot create another membership. No arbitrary member-count cap.
3. **Enter the workspace:** verified session membership is reloaded on each request. Doctors enter reception/clinical routes; secretaries use administrative routes. Revocation removes the clinic grant and applicable sessions while preserving authored records. Administrative capability alone does not authorize clinical notes.
4. **Schedule and receive:** an authorized secretary/administrator selects an active clinic doctor or the explicit unassigned state. A non-administrator doctor defaults to self and cannot manage another assigned doctor's appointment. Clinic-wide views can filter by doctor. Reassignment is explicit and links must remain compatible with encounter authorship. Existing overlap warnings do not reject a doctor's deliberate overlapping schedule. Arrival and attention start do not save a note or complete the appointment.
5. **Document and preserve continuity:** an authorized clinic doctor opens shared patient history, saves their own encounter, orders studies and creates documents. Original author survives later authorized edits; last editor is separate. Unknown legacy attribution is shown as unknown. Historical print output uses the stored author, never the currently signed-in doctor's identity. Receipt does not imply physician review.
6. **Handle competing edits:** edit forms retain the loaded version and submit `expectedVersion` on demographics/background, notes, appointment editing and structured-document replacement. Stale writes return a conflict; preserve entered text, reload the record and reconcile intentionally. Discrete state transitions use conditional server writes. Do not retry a stale clinical write silently.

A representative integrated journey is registration → assigned appointment → arrival → doctor encounter → optional study/receipt/review → prescription/report → explicit appointment completion/link → reload/new login → second doctor reviews history. Verification must use separate sessions and a second synthetic clinic; direct API requests must enforce the same policy as navigation. Current execution and unverified browser/deployment cases remain in [ACTION_PLAN](ACTION_PLAN.md)/[TESTING](TESTING.md).

## Existing clinical workflow reference

**Status:** Original MVP workflows plus verified NX-001…NX-004 and owner-authorized O-006 behavior (2026-11-09), with navigation corrections D-052 (2026-11-12).
**Users:** Clinic doctors, administrative secretaries and administrators under explicit memberships
**Interface:** Spanish (Mexico)  
**Data:** Synthetic demo records only

`PRODUCT.md` defines scope and user-story acceptance criteria. This document describes how those stories should flow through the application. Together, the workflow sections cover patient create/search/update/archive, patient context, medical-background editing, encounter creation/review, save/error behavior, and the first-run demo experience. O-005 approved appointments, encounter types, study requests, and printable documents; all four slices are implemented and verified. Received-study attachments and conditional Google authentication are now in scope; their current boundaries are described above and in `SECURITY.md`.

**Documentation boundary:** Sections 1–14 record the existing MVP/O-005 workflows. Section 15 records the implemented O-006 behavior and supersedes earlier details where stated. Q-O006 clinical questions remain open; the conservative implementation does not settle them.

## 1. Application entry and navigation

- Opening `/` resolves the authenticated session: login, onboarding, physician reception or secretary workspace as applicable.
- The patient registry remains a physician navigation destination; authenticated entry is role-aware.
- On first run, six active seeded patients are visible; the one archived fixture is accessible through the archived view/filter.
- Physician primary navigation: **Recepción**, **Citas**, **Estudios**, **Pacientes**, and **Calendario**, with contextual patient/encounter/appointment actions. **Citas** opens a selected-day list in Reception; **Calendario** remains the existing day/week/month view.
- Secretary primary navigation: **Citas**, **Pacientes**, and **Estudios**, all within `/secretaria`. Patient search uses administrative contact data and never routes to the physician's clinical record pages.
- Do not show demonstration or fictional-data labels in the application (D-046); the synthetic-data restriction remains a development boundary.
- Keep the active patient's name and internal identifier visible on patient-specific screens.

## 2. Find or create a patient

### Find
1. Doctor opens the patient registry.
2. The list displays active patients alphabetically by full name (case-insensitive), giving the registry a predictable default order.
3. Doctor searches by partial name or internal ID.
4. Results show full name, date of birth/age when available, ID, and archive status.
5. The main patient-card target opens the overview. `Nueva consulta` remains a separate action on the card.

Expected behavior:
- Search is case-insensitive and supports partial matches.
- No-results state offers a way to clear the search or create a patient.
- Archived patients are omitted from the default active list but remain retrievable through an archived filter or search.
- Similar names are distinguishable through additional metadata.
- Returning from an overview to **Pacientes** restores the originating search/filter when present.

### Create
1. Doctor selects **Nuevo paciente**.
2. Form asks for full name and the agreed demographic/contact fields.
3. Doctor saves.
4. Hono validates the input and creates the record.
5. Next.js refreshes/re-renders the patient context and opens the new overview.

Expected behavior:
- Full name is required; other fields remain optional unless explicitly decided.
- Possible duplicates may be flagged, but never automatically merged.
- Validation or persistence errors preserve entered values where practical.

## 3. Patient overview

The overview is the central clinical workspace for one patient.

Information hierarchy:
1. Patient identity and basic demographics.
2. Medical background: conditions, previous surgeries, allergies, current medications.
3. Upcoming appointments and an optional ordered-studies panel (when such studies exist).
4. Chronological encounter timeline.
5. Actions to edit patient/background, create consultation, or schedule an appointment.

Expected behavior:
- The patient is always clearly identified.
- Missing background is shown as **No registrado**, not as “No tiene”.
- If there are no encounters, show an intentional empty state and a **Nueva consulta** action.
- For long histories, keep the list scannable and paginate/progressively load only when needed.

### Edit patient demographics

1. Doctor opens a patient overview and selects **Editar paciente**.
2. The application pre-fills the existing demographic fields.
3. Doctor updates the required or optional information.
4. Doctor saves; Hono validates and updates the existing patient record.
5. The application returns to or refreshes the same patient overview.

Expected behavior:
- The existing patient ID is preserved; an update never creates a duplicate patient.
- Existing encounter associations and historical note contents remain unchanged.
- Validation and persistence errors preserve entered values where practical.

## 4. Maintain medical background

1. Doctor selects **Editar antecedentes** from the patient overview.
2. Existing values are displayed.
3. Doctor updates conditions, previous surgeries, allergies, and/or medications.
4. Doctor saves.
5. Hono validates and persists the changes.
6. The overview displays the updated background.

Rules:
- Background belongs to the patient, not to one encounter.
- Historical encounter notes are not rewritten when background changes.
- Empty fields mean unknown/not recorded unless the doctor explicitly records a negative finding.
- Use straightforward free-text entry for the prototype; do not build medication catalogs or terminology integrations.

## 5. Create and save a consultation

1. Doctor opens the patient overview.
2. Doctor selects **Nueva consulta**.
3. The form is created in the selected patient context.
4. Patient identity remains visible.
5. Encounter date/time defaults sensibly and is editable.
6. Doctor selects an encounter type (default `consulta`), records the clinical sections, and may add zero or more `Estudios solicitados` rows (category + required study name, plus optional detail for `Otro`).
7. Doctor selects **Guardar consulta**.
8. Hono validates the input and persists the encounter and initial studies in one transaction.
9. Next.js refreshes the relevant patient view and displays the saved encounter in the timeline.

Rules:
- Patient association is determined/validated server-side, not trusted from arbitrary client input.
- Optional sections can remain blank.
- Use explicit save, not autosave, for the first prototype.
- Do not generate diagnoses, clinical findings, or treatment recommendations.
- Show saving, saved, validation error, and save failure distinctly.
- Preserve typed content on recoverable failure.
- A saved encounter is not represented as signed or legally finalized.

## 6. Review a historical encounter

1. Doctor opens the patient overview.
2. Doctor selects an encounter from the timeline.
3. Application displays the complete note, encounter date/time, type, and any attached studies and their status actions.
4. Doctor returns to the patient overview.

Expected behavior:
- Newest encounter appears first by encounter occurrence time, not database creation time.
- Historical data remains associated with the original patient.
- The note is readable and dates are unambiguous.
- If editing an existing note is implemented, it is explicit and updates the modification timestamp. Do not silently replace content.

## 7. Archive a patient

1. Doctor opens the patient overview.
2. Doctor selects **Archivar paciente**.
3. Application asks for confirmation.
4. Hono changes the patient status.
5. Patient disappears from the default active registry but remains accessible from archived records/search.

Archiving never deletes encounters or history. No permanent delete workflow is part of the prototype.

## 8. First-run and demo-data workflow

1. Developer installs dependencies once.
2. Developer runs `npm run dev`.
3. Bootstrap ensures the local SQLite directory exists.
4. Pending Prisma migrations are applied.
5. The Prisma seed command is invoked explicitly.
6. The idempotent seed creates any missing demo records without overwriting existing data.
7. Next.js and Hono start together.
8. Browser opens to `/patients` and displays the seeded records. Per D-046, the application does not add a visible demonstration label.

On later starts, existing database contents and user edits must be preserved. Normal startup must never reset the database. See `DEMO_DATA.md` and `ARCHITECTURE.md`.

## 9. Cross-cutting interaction and error rules

- Every patient-specific page identifies the active patient.
- Every encounter form identifies the selected patient at save time.
- Distinguish loading, empty, saved, validation error, API error, and network error states.
- Do not show stale clinical data as though it reflects a successful latest update.
- Preserve entered form content after recoverable errors.
- Server-side validation is authoritative; client validation is for usability.
- Do not cache patient/encounter data in shared caches.
- Use local Spanish date/time presentation configured for the practice timezone.

## 10. Primary end-to-end acceptance scenario

1. Start the application with `npm run dev` on a clean local database.
2. Open the browser and see the populated patient registry.
3. Search for a demo patient and open the overview.
4. Review that patient's synthetic background and prior encounter history.
5. Create and save a new consultation.
6. Confirm the encounter appears at the top of the correct patient's timeline.
7. Stop and restart the application.
8. Find the patient and verify both the original seed history and the newly created consultation remain.

All data in this scenario is fictional. Document upload and authentication are not part of the flow.


## 11. Current appointment workflow (NX-001)

1. Open **Calendario**, selecting day/week/month and date.
2. From a patient overview choose **Nueva cita**, enter practice-local date/time, duration (5–480 minutes), and type.
3. Save to create a scheduled appointment; open its detail to edit/reschedule, complete (optionally recording actual duration and linking an existing encounter), or cancel.
4. Completed/cancelled visits remain visible in the patient and calendar history. A same-patient encounter can be linked when eligible.

Overlaps are allowed but visibly signaled, not resolved automatically. Appointments and encounters have independent planned/actual type fields. The controlled pilot calendar uses `America/Mexico_City`.

## 12. O-005 study-request workflow (baseline behavior)

1. From **Nueva consulta**, add zero or more study rows with category and required name; `Otro` also allows optional additional detail.
2. Saving a **new** encounter creates those study requests atomically, initially `ordered`.
3. From encounter detail mark a study `completed` or `reviewed` and optionally write a doctor-authored result note; `ordered → reviewed` directly is allowed.
4. Patient overview lists both `ordered` and `completed` studies until they reach `reviewed`; each row shows its current status and links to the originating encounter. Reviewed studies leave the overview card but remain on encounter detail.

**O-005 creation behavior:** The consultation form creates studies atomically with a new encounter. The API supports adding studies to an existing encounter, while preserving the patient and encounter association. The O-005 patient overview had no study-creation action.

**Limitations:** No upload, laboratory integration, or automated interpretation. The doctor records and reviews study status and any result note.

## 13. Printable documents (NX-004)

The doctor can create a prescription using individual medication dialogs and expandable summary rows, or a report with a free-text narrative. The prescription has one general-instructions capture field; stored per-line instructions remain visible and preserved when editing/printing. Each document belongs to one patient and may link to one of that patient's encounters. The detail view supports editing and presents the same paper card sent to the browser print dialog. Print output follows D-046 (no fictional-data marker), preserves stored authorship and contains no invented provider credentials or legal-validity claims. Document content persists through reloads; failed validation preserves form values. The screen explains that printing is local and is not a certified electronic prescription. Private received-study PDF/image uploads are a separate workflow; browser-printable prescriptions/reports are not stored generated PDFs.

## 14. Original MVP user story coverage

This map keeps product requirements and interaction flows aligned:

| Product story | Workflow coverage |
|---|---|
| US-001 Register a patient | Section 2 — Create |
| US-002 Find a patient | Section 2 — Find |
| US-003 Update patient information | Section 3 — Edit patient demographics |
| US-004 Archive a patient | Section 7 — Archive a patient |
| US-005 Review patient overview | Section 3 — Patient overview |
| US-006 Maintain medical background | Section 4 — Maintain medical background |
| US-007 Start a consultation | Section 5 — Create and save a consultation |
| US-008 Document a consultation | Section 5 — Create and save a consultation |
| US-009 Save and retrieve a consultation | Sections 5 and 6 |
| US-010 Review previous consultations | Section 6 — Review a historical encounter |
| US-011 Maintain clinical continuity | Sections 3, 5, and 6 |
| US-012 Know whether information was saved | Section 9 — Cross-cutting interaction and error rules |
| US-013 Resume after restart | Sections 8 and 10 |
| US-014 Open a populated prototype | Section 8 — First-run and demo-data workflow |

Every product story must have observable acceptance criteria. If implementation reveals a workflow gap, update this mapping and the relevant workflow section rather than marking the story complete based only on a screen existing.

## 15. Owner-authorized O-006 clinical workflow

**Status:** Implemented and verified on `feat/o006-clinical-workflows`; PR #7 is open for owner review. Q-O006-01…08 remain open where physician validation is required.

### 15.1 Prepare and document a consultation

1. From a patient, start an unscheduled consultation or select **Atender paciente** from an eligible scheduled appointment. Keep patient identity and appointment context visible. Opening the appointment does not complete or link it.
2. In the consultation workspace, keep the existing seven note sections in three freely selectable presentation stages and an explicit final save. Stage changes never submit or discard content. On desktop show the note beside read-only safety context (allergies and current medications first), background, recent encounter summaries, and pending studies. On narrow screens expose context through a keyboard-accessible disclosure.
3. Load a previous full note only after the doctor asks to open it. Never infer, copy, or generate clinical facts.
4. Keep staged studies in an unsaved queue. The note and studies are created atomically. On a recoverable save failure, preserve all entered text and staged rows.
5. Warn before an in-app link, history navigation, or unload would discard dirty consultation text or staged rows. Do not autosave or persist drafts.
6. After a scheduled-visit encounter is saved, offer explicit appointment completion and linking to that encounter. Declining leaves appointment state and association unchanged.

### 15.2 Order and review studies

Study requests belong to a patient and may have no encounter or one immutable same-patient encounter. Use Estudios for a standalone request, the encounter-scoped request dialog for a saved encounter, and the contextual study dialog plus nested encounter creation for a new note. New/saved encounter dialogs require no manual association selection. An optional encounter is preselected only when the workflow has a saved encounter in context.

Keep existing categories, statuses, legal transitions, and result-note behavior until physician validation. Both `ordered` and `completed` remain pending until `reviewed`. Display `createdAt` as record-entry time only for standalone requests. State that `completed` does not separately tell the doctor whether the study was performed or when a result arrived. Do not add source/order-time fields, event dates, appointment/procedure links, editing/reassociation, delete, or automatic interpretation.

The patient workspace shows linked and standalone studies, current stored status, association (or `Sin consulta asociada`), doctor-authored result note, and available forward-only review actions. Encounter detail provides the same review actions and a control to add studies.

### 15.3 Create related records and return

From a saved encounter, open the existing prescription/report form or a follow-up appointment dialog with patient context preserved. Follow-up can also be scheduled in a dialog while a new note remains mounted and unsaved. Prefill the encounter association for documents. After a successful save, return to that encounter. A new unsaved encounter cannot create a linked document; keep the note on screen and explain the save checkpoint. A follow-up appointment is an ordinary appointment and is not silently linked to or used to complete an encounter.

### 15.4 Focus the patient workspace

Use one patient navigation with five focused views: Resumen, Consultas, Citas, Estudios, and Recetas e informes (D-042/D-043; route responsibilities in `UI_SPEC.md` §8.1). Selecting one replaces the visible workflow. Resumen contains demographics, compact pending attention and the four background fields, without full note/study/document histories. Background has no navigation item.

A cita reserves/plans attention and carries its scheduling state; a consulta documents clinical attention and may exist without a cita. In Citas, start a note from an unlinked scheduled appointment or open the linked note. A scheduled date in the past stays visible as still scheduled, without inferred attendance/cancellation. Opening or saving a note never completes/links the cita automatically.

Consultas owns the chronological note list; Resumen owns background and its edit entry, with no repeated recent notes/studies/scheduling form. The old clinical-context read URL redirects to overview background. Consultation safety context still shows allergies/current medication while documenting care. Default form/detail returns stay in their owning section; explicit return-to-consultation paths remain intact. Legacy overview bookmarks route to the corresponding focused view. Navigation keeps the existing unsaved-change confirmation and preserves entered text when the doctor cancels leaving.

## 16. Secretary, reception and received studies — D-044/D-045

1. Select Secretary from the view selector. Global **Citas**, **Pacientes**, and **Estudios** destinations stay within the administrative workspace. **Citas** shows the selected day's appointments and shared live waiting queue; **Pacientes** provides name/ID search and administrative contact cards, not the physician's clinical records. Patient/contact and scheduling tasks open in native dialogs, preserving the workspace. Walk-ins are registered as an ordinary appointment for the current date before recording arrival.
2. Register arrival explicitly. The physician sees the same persistent queue, starts attention explicitly, opens the consultation, and completes the appointment explicitly. Opening/saving a note does not complete the appointment or record a physician review. Undo arrival is available before attention starts. Rescheduling confirms that reception will reset; cancellation removes the visit from the active queue. The live queue includes unfinished arrivals from earlier dates.
3. Both views add a received study: select patient, title, optional study date, optional consultation, optional existing order, optional receipt note and 1–5 PDF/PNG/JPEG files. No prior order is required. Order/consultation associations must belong to the patient; an order's existing consultation is respected. Save creates the metadata and local files, then refreshes the workspace. Failure preserves the form and file selection.
4. Physician opens the received-study inbox or the patient's Studies section, opens files, and explicitly records review with an optional physician-authored note. Secretary sees received/reviewed state but no clinical review note/editor. Neither receipt nor review rewrites the original order. Both views operate on the same records without separate databases.
5. Physician Reception offers **Recepción** and focused **Citas** tabs. Citas shows and manages the selected day's existing appointments; the independent **Calendario** day/week/month view remains unchanged. Brief registration/demographic/background/scheduling actions use shared native modals; direct routes remain valid fallback/bookmarks. Long consultation entry, historical clinical notes, and printable documents retain dedicated pages. Closing a changed form requires confirmation; failed saves remain visible with input intact.

The view selector shapes presentation; it does not authenticate users or enforce authorization.
