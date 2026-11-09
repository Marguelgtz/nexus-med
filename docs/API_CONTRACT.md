# API Contract — Medical Platform MVP

**Status:** O-001 contract plus NX-001…NX-004 document API addenda (§11) on `feat/nx-expansion-complete` (2026-11-08); NX-004 web workflow remains in progress.
**Owner:** Hono API (`apps/api`)  
**Transport:** HTTP + JSON over local Node.js  
**Audience:** Next.js frontend, API tests, future maintainers

---

## 1. Contract principles

- Hono is the single authoritative API for product data and operations.
- The frontend consumes this contract; it does not access Prisma or SQLite directly.
- Shared request and response DTOs live in `packages/contracts` (confirmed D-018); both `apps/web` and `apps/api` consume that package. One authoritative contract, no duplicated DTO definitions.
- Never expose raw Prisma models or generated database types as the transport contract.
- Validate all untrusted input in Hono. Client-side validation may improve UX but is not authoritative.
- Use consistent HTTP status codes and a consistent error envelope.
- Use ISO-8601 strings for timestamps and `YYYY-MM-DD` for date-only values.
- Keep IDs opaque to the frontend.
- Authentication, billing, uploads, and other deferred endpoints remain excluded. Appointments, study requests, and structured medical-document endpoints are implemented.
- The contract is versioned with the application and tests. A URL `/v1` prefix is not necessary for this single internal prototype unless a concrete compatibility need appears.
- This is a starting contract, not an immutable freeze. Revise it when real workflow requirements justify a change; update API tests and this document together.

## 2. Base paths

- Health: `/health`
- Product API: `/api`
- Content type for JSON requests: `application/json`

The API binds to loopback during local development. Do not expose it publicly.

## 3. Health

### `GET /health`

Returns process health and is used by the root development orchestrator before starting Next.js.

Example response:

```json
{
  "status": "ok"
}
```

Do not include patient data, environment secrets, database credentials, or internal stack traces.

## 4. Patients

### `GET /api/patients`

Lists and searches patients.

Initial query parameters:

- `q` — optional partial name or identifier search.
- `status` — `active` (default), `archived`, or `all`.

Response: a collection of patient summary DTOs. Keep the response small and include only fields needed by the registry.

### `POST /api/patients`

Creates a patient.

Request fields are based on `DATA_MODEL.md`: full name is required; date of birth, phone, email, and external identifier are optional. The server generates the internal ID and timestamps.

Success: `201 Created` with the created patient summary or detail DTO.

### `GET /api/patients/:patientId`

Returns a patient detail DTO containing demographic information and the patient's medical background. Encounter history may be retrieved separately to keep responses bounded and explicit.

### `PATCH /api/patients/:patientId`

Updates patient demographic/contact information. It must not rewrite historical encounter content.

### `PATCH /api/patients/:patientId/medical-background`

Updates the patient's medical background fields: medical conditions, previous surgeries, allergies, and current medications. Empty/unrecorded values must not be interpreted as confirmed negative findings.

### `PATCH /api/patients/:patientId/archive`

Archives the patient without deleting the patient record, encounters, or clinical history.

A restore endpoint may be added if the approved workflow includes unarchiving; do not add it speculatively.

## 5. Encounters

### `GET /api/patients/:patientId/encounters`

Returns the patient's encounters ordered by `occurredAt` descending. Verify the patient exists. Include only summary fields needed for the timeline.

### `POST /api/patients/:patientId/encounters`

Creates an encounter for the specified patient.

Request includes required `occurredAt`; optional `type` (`consulta` by default), note sections (`reason`, `historyOfPresentIllness`, `relevantHistory`, `physicalExamination`, `assessment`, `plan`, `followUp`), and `studies[]` rows with `category` + `description`. Study rows are created atomically with the new encounter in a Prisma transaction. The server generates IDs and timestamps.

Success: `201 Created` with the encounter DTO.

### `GET /api/encounters/:encounterId`

Returns the complete encounter detail DTO, including its patient identifier.

### `PATCH /api/encounters/:encounterId`

Updates editable encounter fields including `type` and `occurredAt`; the patient association cannot change. The PATCH endpoint does not create new studies. Verify the encounter exists and validate field limits and dates.

## 5.1 Encounter type and study creation

The encounter type is the **actual** clinical interaction, independent of an appointment's planned type. API-validated values: `consulta`, `procedimiento`, `visita_domicilio`, `urgencia`. Encounter summaries include type. Studies can be created atomically with a new encounter by supplying optional `studies: [{ category, description }]`, or appended to an existing encounter through `POST /api/encounters/:encounterId/studies`. In both paths the server derives the patient association from the encounter.

## 6. DTO conventions

The TypeScript DTOs and runtime-safe zod 4 schemas live in `packages/contracts` and are consumed by both applications. They follow these rules:

- Use explicit DTOs separate from Prisma models.
- Return nullable or absent values consistently; choose one convention per field and document it.
- Return dates in an unambiguous representation.
- Do not return database-only fields or internal adapter objects.
- Do not return full encounter notes in patient-list summaries.
- Include stable IDs and the fields needed to identify the current patient/encounter.
- Preserve created/updated timestamps where they help explain data state.

## 7. Error response convention

One consistent JSON error envelope is defined in `packages/contracts` and implemented/tested in `apps/api`.

Shape (implemented):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Some fields need attention.",
    "fieldErrors": {
      "fullName": ["Full name is required."]
    }
  }
}
```

Expected categories include:

- `VALIDATION_ERROR` — malformed or invalid request data (`400`).
- `NOT_FOUND` — requested patient or encounter does not exist (`404`).
- `CONFLICT` — a real uniqueness or state conflict (`409`).
- `INTERNAL_ERROR` — unexpected server failure (`500`), with no stack trace or sensitive detail exposed.

Use appropriate HTTP semantics and do not return `200 OK` for failed operations.

## 8. Relationship and integrity rules

- Every encounter belongs to exactly one patient.
- A patient archive operation preserves all encounters.
- Encounter queries must be scoped/validated against the intended patient.
- Client-supplied IDs must never bypass server-side relationship checks.
- Multi-write operations use local SQLite transactions when atomicity is required.
- Failed persistence must not be reported as successful.

## 9. Testing requirements

Before UX/UI design begins, API tests must verify:

- Health response.
- Patient create/list/search/read/update/archive.
- Medical-background update and retrieval.
- Encounter create/read/update and patient timeline retrieval.
- Invalid payloads and field errors.
- Unknown patient/encounter IDs.
- Attempts to associate an encounter with the wrong patient.
- Timeline ordering by `occurredAt`.
- Correct response DTOs and error envelopes.
- Persistence and representative SQLite transaction rollback.
- Seeded fixture records are available via the API.

The API must be testable without starting the Next.js UI.

## 10. Change policy

The contract is a strong starting boundary, not an untouchable specification. During UX design and implementation:

1. Identify the actual requirement that makes a contract change necessary.
2. Update the Hono route/DTO and validation in one coherent change.
3. Add or update API tests.
4. Add a Prisma migration if the data model changes.
5. Update this contract and relevant product/workflow documentation.
6. Keep the frontend consumer aligned; do not duplicate business rules in Next.js.

Do not change the contract merely for stylistic preference or speculative future integrations.

## 11. Implemented expansion endpoints (2026-11-08)

This section supersedes the original foundation-only endpoint inventory above where it differs. Sources: `apps/api/src/domains/{appointments,studies,encounters}/`, `packages/contracts/src/{appointments,studies,encounters}.ts`, `prisma/schema.prisma`. Full API tests and browser workflows are recorded in `TESTING.md` and `ACTION_PLAN.md`.

### NX-001: Appointments and calendar

| Method | Route | Current behavior |
|---|---|---|
| GET | `/api/appointments?from=<ISO>&to=<ISO>` | Required half-open time range; calendar list |
| GET | `/api/patients/:patientId/appointments` | Patient appointment list |
| POST | `/api/patients/:patientId/appointments` | Create a scheduled appointment (`201`) |
| GET | `/api/appointments/:appointmentId` | Appointment detail |
| PATCH | `/api/appointments/:appointmentId` | Update start/duration/type; reschedule cancelled appointment |
| POST | `/api/appointments/:appointmentId/complete` | Complete with optional actual duration and encounter link |
| POST | `/api/appointments/:appointmentId/cancel` | Cancel a scheduled appointment |
| POST | `/api/appointments/:appointmentId/link-encounter` | Link an existing same-patient encounter to an eligible unlinked appointment |

`Appointment` carries `patient: {id, fullName}`, `startAt`, `durationMinutes`, `type`, `status`, nullable `actualDurationMinutes`, `completedAt`, `linkedEncounterId`, plus ID and timestamps. Duration: integer 5–480 minutes. Planned types: `consulta`, `procedimiento`, `visita_domicilio`, `urgencia`. States: `scheduled`, `completed`, `cancelled`; allowed transitions include `scheduled → completed/cancelled` and `cancelled → scheduled` (via PATCH). Completed appointments cannot be generally edited; late encounter linkage is permitted when unlinked. Illegal transitions respond `409`; overlaps are allowed, not automatically resolved.

### NX-003: Study requests

| Method | Route | Current behavior |
|---|---|---|
| POST | `/api/patients/:patientId/encounters` | Creates new encounter and optional `studies[]` together |
| POST | `/api/encounters/:encounterId/studies` | Adds one or more study requests to an existing encounter; patient association is derived from the encounter |
| GET | `/api/patients/:patientId/studies?status=` | Lists patient studies, newest first; optional repeatable status filter |
| GET | `/api/encounters/:encounterId/studies` | Studies from one encounter |
| PATCH | `/api/studies/:studyId` | Change status and optional result note |

`POST /api/encounters/:encounterId/studies` accepts `{ "studies": [{ "category": "laboratorio", "description": "Biometría hemática" }] }` and returns the created `StudyRequest[]` with status `ordered` and `201`. At least one row is required. The API loads the encounter, derives its `patientId`, and creates all rows in one transaction; callers cannot supply a patient association. Unknown encounters return `404`.

The patient-list `status` query parameter may be repeated; values are ORed. For example, `?status=ordered&status=completed` returns studies still pending doctor review. Omitting the filter returns all statuses. Invalid or empty values and unknown query keys return `400`.

Study categories: `laboratorio`, `imagenologia`, `rayos_x`, `ecg`, `ecografia`, `otro`; doctor confirmation is still open (Q-NX-02). `description` is 2–200 characters; `resultNote` nullable and up to 1,000 characters. Legal transitions: `ordered → completed`, `ordered → reviewed`, `completed → reviewed`; `reviewed` is final. Repeated or backward transitions return `409`. The category, description and originating encounter cannot be edited and studies cannot be deleted.

Study responses include `patientId`, nested `encounter: {id, occurredAt, reason}`, category, description, status, nullable result note, ID and timestamps. Per `TASKS.md`, `ordered` and `completed` remain pending until `reviewed`; the patient overview uses the repeatable status filter and shows the current status badge.

### NX-004: Printable documents

| Method | Route | Purpose |
|---|---|---|
| POST | `/api/patients/:patientId/documents` | Create a prescription or report for the patient |
| GET | `/api/patients/:patientId/documents` | List the patient's documents, newest first |
| GET | `/api/documents/:documentId` | Retrieve a document with patient and optional encounter context |
| PATCH | `/api/documents/:documentId` | Replace editable document fields and prescription lines |

Create/update bodies are discriminated by `kind`. A prescription contains optional `title`, optional `encounterId`, optional general `body`, and 1–50 `lines`; each line requires `medication`, with optional free-text dose, route, frequency, duration, and instructions. A report contains optional title and encounter plus required narrative `body`. An encounter link must belong to the same patient. The API derives the patient from the route for creation; updates cannot change the patient or document kind. Prescription-line replacement and document updates run atomically. There is no delete endpoint or file/PDF storage. Shared request/response schemas are in `packages/contracts/src/documents.ts`; print views remain in progress.
