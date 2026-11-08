# Data Model — Nexus Med Local Prototype

**Status:** As implemented in `prisma/schema.prisma` on `feat/studies-web` (inspected 2026-11-08), not a claim of new runtime verification.  
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

### StudyRequest (NX-003)
- `id` generated UUID; required `patientId` and `encounterId` FKs (delete restricted).
- `encounterId` is the immutable originating encounter. Study creation is currently bundled with **new encounter creation** in one transaction.
- `category`: `laboratorio`, `imagenologia`, `rayos_x`, `ecg`, `ecografia`, `otro`; category confirmation is open (Q-NX-02).
- `description`: 2–200-character doctor-authored text.
- `status`: `ordered` default; `completed`, `reviewed`; `ordered → completed/reviewed`, `completed → reviewed`, reviewed final.
- Nullable `resultNote` ≤1,000 characters; `createdAt`/`updatedAt`.
- Only status/result note can be updated; no edit/delete route for the originating data.

## 2. Relations

```text
Patient 1 --- N Encounter
Patient 1 --- N Appointment --- 0..1 Encounter (linkedEncounterId, unique)
Patient 1 --- N StudyRequest --- 1 Encounter (immutable origin)
```

All three child entities belong to a patient. The API validates same-patient appointment links. Patient archival keeps all history; permanent deletion is not implemented.

## 3. Database indexes and constraints

Current schema indexes: `Patient(fullName)`; `Encounter(patientId, occurredAt DESC)`; `Appointment(startAt)`, `Appointment(patientId, startAt)`; `StudyRequest(patientId, status)`, `StudyRequest(encounterId)`. The model does not impose uniqueness on patient names, phone or email.

Date of birth uses date-only semantics. `occurredAt`, `startAt`, `createdAt`, and `updatedAt` are instants rendered using the practice timezone `America/Monterrey`.

## 4. Committed migrations

- `20261107004038_init`: Patient + Encounter.
- `20261107222417_expansion_appointments_encounter_type`: Appointment + encounter type.
- `20261108180347_study_requests`: StudyRequest.

The SQLite database lives in `.local/data/medical.db`; the development orchestrator generates Prisma client, deploys migrations and seeds.

## 5. Current synthetic dataset

`docs/demo-dataset.json` and `prisma/seed.ts` define seven patients (six active), nine encounters, four fixed historic appointments, five upcoming first-seed-anchored appointments, and two study requests. Seeding is create-if-missing and preserves user edits. The study seed requires independent verification before NX-003 is declared complete. See `DEMO_DATA.md` and `TESTING.md`.

## 6. Deferred or missing models

`MedicalDocument` and `PrescriptionLine` (NX-004 browser-printable reports and prescriptions) are approved but absent from the current code. This is distinct from excluded file uploads and R2 storage. User/account/session, clinic/organization, and billing models remain excluded.

Open questions: procedure lifecycle (Q-NX-01); study-category validation (Q-NX-02); independent study-order workflow not implemented; future Cloudflare D1 transaction guarantees and SSR adapter selection remain deployment decisions.
