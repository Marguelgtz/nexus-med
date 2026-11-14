# Data Model — Nexus Med Local Prototype

## Current clinic and attribution model — NM-PILOT-001

The clinical entities below remain the core model. The following additions supersede the old exclusions of accounts, clinics, private storage and D1.

| Entity / field | Current meaning |
| --- | --- |
| `Clinic` | Stable ID, name, stored timezone (`America/Mexico_City` for this pilot), active flag and timestamps |
| `ClinicMembership` | Clinic/user unique pair; `doctor`, `secretary` or `administrator`; independent `isAdmin`; active/revoked status; timestamps |
| `User`, `Session`, `Account`, `Verification` | Existing Better Auth identities/credentials and server sessions; `Session.activeClinicId` selects clinic context; pending identities have no automatic clinical access |
| `Invitation` | Clinic, normalized email, doctor/secretary role, issuer, hashed one-time token, expiry and acceptance/revocation metadata |
| Clinic-owned records | `Patient`, `Encounter`, `Appointment`, `StudyRequest`, `StudyReceipt`, `MedicalDocument`, `Invitation` carry explicit clinic ownership |
| `Encounter`, `MedicalDocument` | Nullable historical `authorId`, separate `lastEditedById`; original author remains immutable |
| `Appointment.doctorId` | Active clinic doctor or explicit unassigned state; independent from encounter author |
| Study actor fields | Request ordering/review and receipt receiving/reviewing identities remain distinct |
| `version` | Starts at 1 on patient/encounter/appointment/document; conditional updates increment it |
| `SecurityEvent`, `AuthRateLimit`, `EmailOutbox` | Existing security administration, persistent throttling and encrypted durable email delivery state |

Patients are shared among authorized clinicians within one clinic; identifiers/names/contact values are not globally unique. Secretary DTOs expose administrative fields only. Prescription lines inherit ownership through the document; attachment metadata inherits it through its receipt. Every nested association must match both patient and clinic. The application imposes no arbitrary staff-count limit.

Migration `20261113000000_clinic_ownership` (D1 `0004_clinic_ownership.sql`) preserves original columns/timestamps and assigns existing records to `legacy-clinic`. Existing doctor/secretary identities receive deterministic memberships; disabled identities receive revoked membership. Existing clinical authors, study actors and appointment assignments remain null when unknown; no physician is fabricated. Clinic columns on existing tables intentionally use trigger-backed referential constraints; see [architecture](ARCHITECTURE.md) before schema-drift/migration tooling. New nullable actor references and new membership tables use ordinary FKs. `atomic_write_guards` is an implementation table with a checked validity value, emptied within each successful document write batch.

SQLite and D1 are distinct migration histories. Run [migration-preservation and workerd tests](PILOT_OPERATIONS.md) after SQL changes. Current Prisma schema and shared DTOs are authoritative for field details. The clinical description below is retained with its original verification date; it is not current remote-deployment evidence.

**Historical clinical baseline:** O-005/O-006 description and verification date 2026-11-09; current clinic additions above.
**Persistence:** Prisma 7 + local SQLite / deployed-runtime D1; all product database access remains in Hono.

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

Date of birth uses date-only semantics. `occurredAt`, `startAt`, `createdAt`, and `updatedAt` are instants rendered using the fixed pilot timezone `America/Mexico_City` (earlier local fixtures used the equivalent Monterrey wall-time convention).

## 4. Committed migrations

- `20261107004038_init`: Patient + Encounter.
- `20261107222417_expansion_appointments_encounter_type`: Appointment + encounter type.
- `20261108180347_study_requests`: StudyRequest.
- `20261108195000_medical_documents`: MedicalDocument + PrescriptionLine.
- `20261109050649_o006_optional_study_encounter`: makes `StudyRequest.encounterId` nullable while preserving all existing rows and indexes.
- `20261109200000_study_name_and_optional_description`: migrates each former study `description` into `name`, sets optional `description` to `NULL`, and preserves study IDs, associations, statuses, result notes and timestamps.

The SQLite database lives in `.local/data/medical.db`; the development orchestrator generates Prisma client, deploys migrations and seeds.

## 5. Current synthetic dataset

`docs/demo-dataset.json` and `prisma/seed.ts` define seven patients (six active), nine encounters, nine appointments (four fixed historic plus five first-seed-anchored upcoming), three study requests, two medical documents and one received-study/PDF example. Clean migration/seed, repeat startup, idempotency and preservation of edited document content were reported verified at the O-005 exit. See `DEMO_DATA.md` and `TESTING.md` for evidence.

## 6. Medical documents

`MedicalDocument` belongs to one patient and may link to one of that patient's encounters. Its `kind` is validated as `prescription` or `report`; `title` is optional; `body` stores a report narrative or prescription general instructions. Prescription lines are ordered by `position` and store doctor-entered medication and optional free-text fields. Patient and encounter deletes are restricted; prescription lines cascade only if a document is removed at the database layer. The API exposes no delete endpoint. The API verifies that the linked encounter belongs to the same patient.

Structured medical documents remain separate from received-study attachments. Accounts, clinics and private attachment storage are now implemented; billing remains excluded. The browser forms, detail/edit workflow, patient overview, and CSS print presentation are implemented and browser-verified.

Open questions: procedure lifecycle (Q-NX-01); study-category validation (Q-NX-02); minimum source/reason and the difference between clinical order time and record-entry time for standalone studies (Q-O006-01); meaning of `completed`, result arrival, and review timestamps (Q-O006-02/03); future Cloudflare D1 transaction guarantees and SSR adapter selection remain deployment decisions. Standalone requests use `createdAt` as entry time only; no clinical order time is inferred.

## Secretary extension — D-044/D-045

`Appointment.arrivedAt` and `attentionStartedAt` are nullable instants, separate from scheduled/completed/cancelled. Existing rows migrate to null. Arrival requires scheduled with no prior arrival; start requires arrival and no prior start; undo arrival is only available before attention. Conditional writes reject stale/duplicate transitions. Reschedule resets both markers; cancellation/completion preserve timestamps but remove the visit from active reception.

`StudyReceipt` contains id, patientId (required/restrict), encounterId and requestId (optional/restrict), title, optional studyDate/receiptNote, receivedAt, nullable reviewedAt/reviewNote. `StudyReceiptFile` contains id, receiptId (restrict), unique opaque storageKey, original display name, validated mimeType, and byte size. Patient/request/encounter association is validated by Hono. Nested receipt/file metadata creation is atomic; filesystem writes are cleaned if database creation fails. Existing study requests and printable MedicalDocuments are separate entities. The exact fixture now includes the approved synthetic receipt example described in `DEMO_DATA.md`; do not invent replacement clinical fixtures.
