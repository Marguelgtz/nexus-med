# Product Workflows — Medical Platform MVP

**Status:** MVP workflows  
**Primary user:** One general surgeon  
**Interface:** Spanish (Mexico)  
**Data:** Synthetic demo records only

`PRODUCT.md` defines scope and user-story acceptance criteria. This document describes how those stories should flow through the application. Together, the workflow sections cover patient create/search/update/archive, patient context, medical-background editing, encounter creation/review, save/error behavior, and the first-run demo experience. Documents, file uploads, Google authentication, and scheduling are excluded from the current prototype.

## 1. Application entry and navigation

- Opening `/` redirects to `/patients`.
- The patient registry is the default working screen.
- On first run, six active seeded patients are visible; the one archived fixture is accessible through the archived view/filter.
- Keep navigation small: Patients, plus contextual patient/encounter actions.
- Show a persistent **MODO DEMOSTRACIÓN — DATOS FICTICIOS** banner while demo mode is enabled.
- Keep the active patient's name and internal identifier visible on patient-specific screens.

## 2. Find or create a patient

### Find
1. Doctor opens the patient registry.
2. The list displays active patients alphabetically by full name (case-insensitive), giving the registry a predictable default order.
3. Doctor searches by partial name or internal ID.
4. Results show full name, date of birth/age when available, ID, and archive status.
5. Doctor selects a result and opens its overview.

Expected behavior:
- Search is case-insensitive and supports partial matches.
- No-results state offers a way to clear the search or create a patient.
- Archived patients are omitted from the default active list but remain retrievable through an archived filter or search.
- Similar names are distinguishable through additional metadata.

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
3. Chronological encounter timeline.
4. Primary actions: edit patient, edit medical background, create consultation.

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
6. Doctor records reason, history of present illness, relevant background, physical examination, assessment, plan, and follow-up as applicable.
7. Doctor selects **Guardar consulta**.
8. Hono validates the input and persists the encounter.
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
3. Application displays the complete note and encounter date/time.
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
8. Browser opens to `/patients` and displays synthetic data plus the demo banner.

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


## 11. User story coverage

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
