# API Contract — Medical Platform MVP

**Status:** Initial contract proposal; validate and finalize during O-001 before UX/UI design.  
**Owner:** Hono API (`apps/api`)  
**Transport:** HTTP + JSON over local Node.js  
**Audience:** Next.js frontend, API tests, future maintainers

---

## 1. Contract principles

- Hono is the single authoritative API for product data and operations.
- The frontend consumes this contract; it does not access Prisma or SQLite directly.
- Proposed: define shared request and response DTOs in `packages/contracts`; both `apps/web` and `apps/api` can consume that package. Confirm this small workspace during O-001; regardless of package choice, maintain one authoritative contract and do not duplicate DTO definitions.
- Never expose raw Prisma models or generated database types as the transport contract.
- Validate all untrusted input in Hono. Client-side validation may improve UX but is not authoritative.
- Use consistent HTTP status codes and a consistent error envelope.
- Use ISO-8601 strings for timestamps and `YYYY-MM-DD` for date-only values.
- Keep IDs opaque to the frontend.
- Do not add document, authentication, billing, appointment, or other deferred endpoints.
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

Request fields correspond to `DATA_MODEL.md`: `occurredAt`, `reason`, `historyOfPresentIllness`, `relevantHistory`, `physicalExamination`, `assessment`, `plan`, and `followUp`. Optional clinical sections may be empty. The server generates ID and creation/update timestamps.

Success: `201 Created` with the encounter DTO.

### `GET /api/encounters/:encounterId`

Returns the complete encounter detail DTO, including its patient identifier.

### `PATCH /api/encounters/:encounterId`

Updates editable encounter fields. The patient association must not be silently changed. Verify the encounter exists and validate all field limits and date/time values.

## 6. DTO conventions

If P-010 is accepted, TypeScript DTOs and runtime-safe schemas live in `packages/contracts` and are finalized during O-001. Otherwise, keep them in one clearly owned API-contract module. The selected validation library must work in both Node.js and the browser. Follow these rules:

- Use explicit DTOs separate from Prisma models.
- Return nullable or absent values consistently; choose one convention per field and document it.
- Return dates in an unambiguous representation.
- Do not return database-only fields or internal adapter objects.
- Do not return full encounter notes in patient-list summaries.
- Include stable IDs and the fields needed to identify the current patient/encounter.
- Preserve created/updated timestamps where they help explain data state.

## 7. Error response convention

Use one consistent JSON error envelope, defined in `packages/contracts` if P-010 is accepted or otherwise in the single authoritative API-contract module, and finalized/tested during O-001.

Proposed shape:

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
