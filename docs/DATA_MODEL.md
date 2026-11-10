# Data Model — Nexus Med Local Prototype

**Status:** O-005 baseline plus the owner-authorized O-006 patient-study association migration; migration and API behavior are integrated-verified on `feat/o006-clinical-workflows` (PR #7 open for owner review, 2026-11-09).
**Persistence:** Prisma 7 + local SQLite, database access exclusively through Hono.

## 1. Implemented entities

### Patient
- `id`: generated UUID/string primary key; `fullName`: required, indexed.
- Nullable demographic/contact fields: `dateOfBirth` (date-only `YYYY-MM-DD`), `phone`, `email`, `externalIdentifier`.
- Nullable, doctor-entered medical background: `medicalConditions`, `previousSurgeries`, `allergies`, `currentMedications`. Blank means unrecorded, never a confirmed negative.
- `isArchived` defaults false. `createdAt`/`updatedAt` record timestamps.
- Relations: `encounters[]`, `appointments[]`, `studyRequests[]`.

### Encounter
- `id` generated UUID; required `patientId` FK with delete restricted; required `occurredAt` instant.
- `type`: `consulta` default; API permits `consulta`, `procedimiento`, `visita_domicilio`, `urgencia`. This records what actually happened, independently of planned appointment type.
- Nullable note fields: `reason`, `historyOfPresentIllness`, `relevantHistory`, `physicalExamination`, `assessment`, `plan`, `followUp`.
- `createdAt`/`updatedAt`; relations `linkedAppointments[]`, `studyRequests[]`.

### Appointment (NX-001)
- `id` generated UUID; required `patientId` FK (delete restricted), `startAt` instant.
- `durationMinutes`: 5–480, API validated; `type`: planned visit, same four values as encounter.
- `status`: `scheduled` default; `scheduled`, `completed`, `cancelled` API values.
- Nullable `actualDurationMinutes`, `completedAt`, and unique `linkedEncounterId` FK (`onDelete: SetNull`). API checks same-patient encounter links.
- `createdAt`/`updatedAt`.

### StudyRequest (NX-003 / O-006)
- `id` generated UUID; required `patientId` FK and optional `encounterId` FK (delete restricted).
- A request may be standalone. When linked, its encounter is immutable and must belong to the same patient; Hono validates the association. Existing encounter-linked records remain linked.
- Requests can be created in a new encounter transaction, added to an existing encounter, or created from a patient with no encounter.
- `category`: `laboratorio`, `imagenologia`, `rayos_x`, `ecg`, `ecografia`, `otro`; category confirmation is open (Q-NX-02).
- `name`: required 2–200-character doctor-authored study name.
- `description`: nullable optional doctor-authored detail up to 500 characters.
- `status`: `ordered` default; `completed`, `reviewed`; `ordered → completed/reviewed`, `completed → reviewed`, reviewed final.
- Nullable `resultNote` ≤1,000 characters; `createdAt`/`updatedAt`.
- Only status/result note can be updated; no edit/delete/reassociation route for the originating data. The patient relation is always required.
- `ordered` and `completed` are pending until `reviewed` and appear in the patient overview.

## 2. Relations

```text
Patient 1 --- N Encounter
Patient 1 --- N Appointment --- 0..1 Encounter (linkedEncounterId, unique)
Patient 1 --- N StudyRequest --- 0..1 Encounter (immutable when present)
```

All three child entities belong to a patient. The API validates same-patient appointment links. Patient archival keeps all history; permanent deletion is not implemented.

## 3. Database indexes and constraints

Current schema indexes: `Patient(fullName)`; `Encounter(patientId, occurredAt DESC)`; `Appointment(startAt)`, `Appointment(patientId, startAt)`; `StudyRequest(patientId, status)`, `StudyRequest(encounterId)`; `MedicalDocument(patientId, createdAt DESC)`, `MedicalDocument(encounterId)`, `PrescriptionLine(documentId, position)`. The model does not impose uniqueness on patient names, phone or email.

Date of birth uses date-only semantics. `occurredAt`, `startAt`, `createdAt`, and `updatedAt` are instants rendered using the practice timezone `America/Monterrey`.

## 4. Committed migrations

- `20261107004038_init`: Patient + Encounter.
- `20261107222417_expansion_appointments_encounter_type`: Appointment + encounter type.
- `20261108180347_study_requests`: StudyRequest.
- `20261108195000_medical_documents`: MedicalDocument + PrescriptionLine.
- `20261109050649_o006_optional_study_encounter`: makes `StudyRequest.encounterId` nullable while preserving all existing rows and indexes.
- `20261109200000_study_name_and_optional_description`: migrates each former study `description` into `name`, sets optional `description` to `NULL`, and preserves study IDs, associations, statuses, result notes and timestamps.

The SQLite database lives in `.local/data/medical.db`; the development orchestrator generates Prisma client, deploys migrations and seeds.

## 5. Current synthetic dataset

`docs/demo-dataset.json` and `prisma/seed.ts` define seven patients (six active), nine encounters, four fixed historic appointments, five upcoming first-seed-anchored appointments, two study requests, and two medical documents. Clean migration/seed, repeat startup, idempotency and preservation of edited document content were reported verified at the O-005 exit. See `DEMO_DATA.md` and `TESTING.md` for evidence.

## 6. Medical documents

`MedicalDocument` belongs to one patient and may link to one of that patient's encounters. Its `kind` is validated as `prescription` or `report`; `title` is optional; `body` stores a report narrative or prescription general instructions. Prescription lines are ordered by `position` and store doctor-entered medication and optional free-text fields. Patient and encounter deletes are restricted; prescription lines cascade only if a document is removed at the database layer. The API exposes no delete endpoint. The API verifies that the linked encounter belongs to the same patient.

This is separate from excluded file uploads and R2 storage. User/account/session, clinic/organization, and billing models remain excluded. The browser forms, detail/edit workflow, patient overview, and CSS print presentation are implemented and browser-verified.

Open questions: procedure lifecycle (Q-NX-01); study-category validation (Q-NX-02); minimum source/reason and the difference between clinical order time and record-entry time for standalone studies (Q-O006-01); meaning of `completed`, result arrival, and review timestamps (Q-O006-02/03); future Cloudflare D1 transaction guarantees and SSR adapter selection remain deployment decisions. Standalone requests use `createdAt` as entry time only; no clinical order time is inferred.
