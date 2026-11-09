# Product Definition — Medical Platform MVP

**Status:** MVP scope confirmed; field-level details remain open where noted  
**Version:** 1.0  
**Primary user:** One general surgeon  
**Interface language:** Spanish (Mexico)  
**Prototype:** Local-only, offline at runtime, synthetic data only

---

## 1. Product vision

Build a lightweight patient-management and clinical-continuity application for one general surgeon. The doctor should be able to register patients, review relevant patient context, document consultations, and retrieve a patient's history from one place.

This is not a hospital management system or a full enterprise EHR. Optimize for the smallest complete workflow that provides practical value to the doctor.

## 2. User and operating context

- Exactly one doctor operates the prototype.
- No assistants, receptionists, nurses, administrators, patient accounts, or additional doctors are in scope.
- Primary use is a desktop browser in a medical practice.
- The interface uses Spanish appropriate for a Mexican medical practice.
- All prototype records are fictional and clearly labeled as demo data.

## 3. Core product objects

1. **Patient:** the person receiving care and the stable center of the clinical record.
2. **Medical background:** relevant ongoing context associated with the patient, such as conditions, previous surgeries, allergies, and current medications.
3. **Encounter:** one consultation or clinical interaction associated with exactly one patient. Clinical note sections belong to the encounter in the initial model.

This section describes the **original P0 MVP**. O-005 subsequently approved appointments, encounter types, study requests, and printable doctor-authored prescriptions/reports. NX-001…NX-004 are implemented and verified on `feat/nx-expansion-complete`. Authentication and file storage remain excluded.

## 4. MVP capabilities

### P0 — Required

**Patient registry and search**
- Create, list, search, view, and update patients.
- Search by partial patient name and internal identifier.
- Show enough identifying information to distinguish similar names.
- Archive an inactive patient without deleting clinical history.

**Patient overview**
- Display patient identity and available demographic information.
- Display medical background.
- Display chronological encounter history.
- Provide direct actions to edit the patient/background and create a consultation.

**Medical background**
- Record and update relevant previous medical conditions, surgeries, allergies, and current medications.
- Keep fields optional when information is unknown or not relevant.
- Distinguish “not recorded” from a confirmed absence of a condition or allergy.

**Consultation / encounter documentation**
- Create an encounter from a patient record.
- Associate each encounter with exactly one patient.
- Capture encounter date/time, reason, history of present illness, relevant background, physical examination, assessment, plan, and follow-up.
- Allow optional sections to remain blank.
- Save and retrieve an encounter.
- Show saved encounters in the patient's timeline.
- Do not imply an ordinary saved note is electronically signed or legally finalized.

**Clinical timeline and continuity**
- Display newest encounters first by encounter occurrence time.
- Open a prior encounter to review its full note.
- Preserve historical encounter content when patient demographics or medical background are updated.

**Local persistence and first-run experience**
- Keep patient and encounter data after application restarts.
- Seed the database with clearly fictional demo patients and encounter records on first setup.
- Open the patient registry by default with demo records visible.
- Show a persistent demo-mode banner.

### Original MVP exclusions and updated O-005 boundary

These exclusions were drafted before the accepted O-005 expansion. They remain historical P0 scope notes; `TASKS.md` §6 and `DECISIONS.md` D-023 govern the approved expansion. Do not interpret earlier exclusions as negating implemented functionality.

- File storage, document uploads/downloads, and stored-file association.
- Google authentication/OAuth/OIDC, sessions, and user management.
- Multiple doctors, staff roles, or multi-clinic tenancy.
- Appointment reminders and recurrence. Basic scheduling is now in-scope and implemented under NX-001.
- Billing, payments, insurance, accounting, or inventory.
- Pharmacy integrations, AI diagnosis, treatment recommendations, or clinical decision support. Doctor-authored browser-printable prescriptions/reports are approved as NX-004, but not yet implemented.
- FHIR/HL7 or external hospital integrations.
- DICOM viewing, OCR, automated document interpretation, or analytics.
- Docker, CI/CD, remote Cloudflare resources, and production deployment.

These remaining exclusions must not be implemented as speculative scaffolding. File storage and Google authentication are **pending future decisions**, not abandoned ideas. For implemented workflows see `WORKFLOWS.md`; for missing NX-004 work see `TASKS.md` / `UI_SPEC.md`.

## 5. Consultation note structure

The initial consultation form should contain these sections:

| Field | Requirement |
|---|---|
| Encounter date/time | Required; sensible default, editable |
| Reason for consultation | Optional/doctor-defined; keep entry straightforward |
| History of present illness | Optional free text |
| Relevant medical background | Optional free text or reference to existing patient context |
| Physical examination | Optional free text |
| Assessment | Optional free text entered by doctor |
| Plan | Optional free text entered by doctor |
| Follow-up | Optional free text |

Do not force every field to be completed. Do not generate or infer clinical findings, diagnoses, or treatment plans.

## 6. User stories and acceptance criteria

These are examples of expected observable behavior. A story is not complete because a screen exists; its acceptance criteria must work end to end.

### Epic A — Patient management

**US-001 — Register a patient**  
As a doctor, I want to register a patient so that I can maintain their information and create a clinical record.

Acceptance criteria:
- A registration form is accessible from the patient registry.
- Full name is required; agreed optional demographics can remain blank.
- A stable internal identifier is generated.
- Successful save creates a persistent record and opens its overview.
- Validation errors are clear and preserve entered values.

**US-002 — Find a patient**  
As a doctor, I want to find a patient by name or identifier so that I can retrieve their record quickly.

Acceptance criteria:
- Partial name matching works.
- Internal ID search works.
- Results show enough context to distinguish similar names.
- No-results and empty-registry states are clear.
- Selecting a result opens the correct patient.

**US-003 — Update patient information**  
As a doctor, I want to update demographic information so that the record remains current.

Acceptance criteria:
- Existing values populate the edit form.
- Saving updates the same patient rather than creating another.
- Changes persist after restart.
- Existing encounters remain associated and their historical note contents are not rewritten.

**US-004 — Archive a patient**  
As a doctor, I want to archive an inactive patient without losing their history.

Acceptance criteria:
- Archiving requires an explicit action/confirmation.
- Archived patients are distinguishable and hidden from the default active list.
- Archived patients remain searchable/retrievable.
- Encounters remain accessible.

### Epic B — Patient context

**US-005 — Review the patient overview**  
As a doctor, I want one overview of patient information and clinical history so that I can prepare for a consultation.

Acceptance criteria:
- The page identifies the patient clearly.
- Demographics, medical background, and encounter timeline are accessible from the same patient context.
- New consultation and edit actions are easy to find.
- A patient with no encounters has a useful empty state.

**US-006 — Maintain medical background**  
As a doctor, I want to record relevant medical background so that important context is available across encounters.

Acceptance criteria:
- Previous conditions, surgeries, allergies, and current medications can be recorded and updated.
- Unknown or unrecorded values are not presented as confirmed negatives.
- Updates persist.
- Historical encounter notes remain unchanged.

### Epic C — Encounters and continuity

**US-007 — Start a consultation**  
As a doctor, I want to start a consultation from a patient record so that it is associated with the correct patient.

Acceptance criteria:
- The action is available from the patient overview.
- Patient association is established server-side.
- Patient identity remains visible throughout the form.
- Encounter date/time receives a sensible default and can be corrected.

**US-008 — Document a consultation**  
As a doctor, I want organized clinical note sections so that the encounter is readable and retrievable.

Acceptance criteria:
- The form contains the agreed sections.
- Free-text clinical documentation is supported.
- Optional sections may remain blank.
- The application does not invent findings or produce clinical recommendations.

**US-009 — Save and retrieve a consultation**  
As a doctor, I want to save and reopen a consultation so that the note is preserved.

Acceptance criteria:
- Save success/failure is unambiguous.
- Saved encounter is retrievable from the patient timeline.
- Patient association is correct.
- Created and updated timestamps are maintained.
- A normal saved note is not represented as electronically signed.

**US-010 — Review previous consultations**  
As a doctor, I want to review previous notes so that I can understand the patient's history over time.

Acceptance criteria:
- Timeline is ordered by encounter occurrence time, newest first.
- Each row identifies date/time and reason/title where available.
- Selecting an entry opens the complete note.
- Returning to the patient overview preserves the correct patient context.

**US-011 — Maintain clinical continuity**  
As a doctor, I want to review patient background and previous encounters before recording a new one.

Acceptance criteria:
- Existing background and encounter history are accessible from the patient context.
- Opening a historical encounter does not silently replace a new/active form.
- The doctor can return to the current patient workflow without losing unsaved input.

### Epic D — Reliability and demo experience

**US-012 — Know whether information was saved**  
As a doctor, I want clear save feedback so that I do not mistake unsaved information for a persisted record.

Acceptance criteria:
- In-progress, success, validation, and failure states are distinct.
- Recoverable errors preserve form input where practical.
- Failed persistence is never presented as success.

**US-013 — Resume after restart**  
As a doctor, I want patient and encounter data to remain available after restarting the application.

Acceptance criteria:
- Local SQLite persists across restarts.
- Migrations are applied reproducibly.
- Demo records are created on first setup.
- Running the seed repeatedly does not duplicate records or overwrite existing edits.

**US-014 — Open a populated prototype**  
As a doctor testing the prototype, I want the application to open on a populated patient registry so that I can explore it immediately without manually entering records.

Acceptance criteria:
- `npm run dev` prepares the local database and starts both apps.
- The browser opens to the patient registry by default.
- At least six active synthetic patients are visible in the default list; the archived demo patient is accessible through archived records.
- Encounter history is present for multiple patients; at least one patient has no encounters to demonstrate the empty state.
- A persistent demo-mode banner warns that all records are fictional.

## 7. Product and UX principles

- Patient context first: keep identity visible on patient-specific screens.
- Fast entry: avoid unnecessary required fields, navigation, and repeated entry.
- Clear history: distinguish encounter date/time from record creation/update timestamps.
- Predictable save behavior: explicit success/failure feedback.
- Spanish interface: use consistent Mexican clinical terminology.
- Keep the UI calm, readable, and practical; avoid decorative dashboards and excess cards.

## 8. Open product questions

Do not block scaffolding unless a decision directly affects schema or workflow. Make a reversible proposal and record it when safe.

- Exact mandatory demographic fields and any practice-specific patient identifier.
- Whether emergency-contact details are necessary.
- Exact representation of medical background fields.
- Whether vital signs are required in the first consultation template.
- Whether encounters need draft state or only explicit save.
- Whether printed/exportable patient summaries are required later.

## 9. Prototype boundary

The prototype is local-only, binds to loopback, and uses synthetic data. It is not production-ready, is not a declaration of regulatory compliance, and must not be used with real patient information. No remote Cloudflare resources, authentication, file storage, Docker, or CI/CD are implemented.

**Product objective:** make patient information easy to find, clinical context easy to understand, and consultation documentation straightforward to maintain for one general surgeon.
