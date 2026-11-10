# Demo Data and First-Run Experience

**Status:** Required for prototype completion  
**Data classification:** Entirely fictional synthetic data  
**Locale:** Spanish (Mexico)

## 1. Objective

When the developer opens the local prototype for the first time, it must already be useful to explore. The patient registry must not be empty. Demo records must demonstrate the main patient and encounter workflows without requiring manual data entry first.

This is a development fixture dataset, not medical guidance and not a substitute for real clinical records.

## 2. Required dataset shape

Seed at least:

- **7 patients** with plausible fictional Spanish names. The persistent demo banner identifies the entire dataset as synthetic without making every patient row look like a placeholder.
- **9 encounters** distributed across at least four patients.
- **9 appointments**: 4 fixed past appointments (3 completed — two linked to demo encounters, one `procedimiento` — and 1 cancelled) plus 5 upcoming appointments anchored to the first seed run (see Section 3).
- **2 study requests** attached to `demo-encounter-002b` / `demo-patient-002`: one `ordered`, one `reviewed` with a fictional result note.
- **1 prescription** with two visibly fictional free-text lines, linked to `demo-encounter-002b` / `demo-patient-002`.
- **1 report** with fictional narrative text for `demo-patient-007`, with no encounter link.
- At least **2 patients with multiple encounters** so the timeline can be evaluated.
- At least **1 patient with no encounters** to demonstrate the timeline empty state.
- At least **1 archived patient** to demonstrate active/archive behavior.
- A mix of populated and unrecorded optional medical-background fields.

Printable prescription/report records contain no real medication, dose, findings, or recommendations. File storage and uploads remain separately excluded.

## 3. Suggested deterministic fixture composition

The exact checked-in fixture payload is `docs/demo-dataset.json`; use it as the source dataset instead of inventing patient records during implementation. The nine `occurredAt` values are fixed ISO-8601 timestamps with an explicit `-06:00` offset; persist them exactly rather than recalculating relative dates at seed time. Use this minimum composition so the first screen demonstrates several UI states:

| Seed patient | Encounters | State / purpose |
|---|---:|---|
| `Juan Pérez` (`NM-001`) | 2 | Medical background populated; demonstrates repeat consultation history |
| `Mariana López` (`NM-002`) | 2 | Different fictional context; demonstrates timeline ordering |
| `José Martínez` (`NM-003`) | 0 | Demonstrates a patient with no recorded consultations |
| `Elena Rodríguez` (`NM-004`) | 1 | Archived patient; demonstrates archive visibility and retrieval |
| `Carlos Hernández` (`NM-005`) | 2 | Demonstrates multiple encounters and partially unrecorded background |
| `Sofía Torres` (`NM-006`) | 1 | Demonstrates a simple patient record |
| `Lucía Gómez` (`NM-007`) | 1 | Demonstrates another active patient record |

On a clean database, this fixture produces exactly seven demo patients (six active and one archived), nine demo encounters, nine demo appointments, and two demo study requests. All seven fixture patient IDs, nine fixture encounter IDs, and the four fixture appointment IDs must be inserted. Keep all note text visibly marked as fictional. The agent may add more fixtures when useful, but must preserve these UI states.

### Appointment fixtures (NX-001)

**Fixed past appointments** (in `docs/demo-dataset.json`, deterministic like the encounters):

| Seed appointment | Patient | startAt (America/Monterrey) | State / purpose |
|---|---|---|---|
| `demo-appt-past-001` | `Juan Pérez` | 2026-09-04 12:00 | Completed, linked to `demo-encounter-001a` (actual 35 min) |
| `demo-appt-past-002` | `Mariana López` | 2026-10-08 10:00 | Completed, linked to `demo-encounter-002b` (actual 40 min) |
| `demo-appt-past-003` | `Carlos Hernández` | 2026-10-16 11:00 | Cancelled (demonstrates the cancelled state) |
| `demo-appt-past-004` | `Lucía Gómez` | 2026-10-25 09:00 | Completed `procedimiento`, linked to `demo-encounter-007a` (actual 75 min) |

**Upcoming appointments** (computed in `prisma/seed.ts`, deliberately NOT in the fixture file): five `scheduled` appointments for demo patients at practice-timezone wall times — anchor +1 d 09:00 (consulta), +3 d 10:30 (procedimiento), +6 d 12:00 (consulta), +10 d 16:00 (visita_domicilio), +14 d 11:00 (urgencia).

**Anchor behavior (D-029/U-14):** `anchor` is the date of the **first seed run** that created the upcoming appointments (practice timezone, `America/Monterrey`). The seed computes each instant once and stores it under a stable ID; because seeding is create-if-missing, later runs — including days or weeks later — never recompute, move, or duplicate the anchor. A calendar demo whose dates all predate "today" would demonstrate nothing, so this is the one documented exception to fixed-timestamp seeding.

### Study-request fixtures (NX-003 implementation)

`docs/demo-dataset.json` contains two fixed studies; `prisma/seed.ts` uses create-if-missing behavior for them.

| ID | Patient / encounter | Study | Status |
|---|---|---|---|
| `demo-study-001` | `demo-patient-002` / `demo-encounter-002b` | `laboratorio`: Biometría hemática | `ordered` |
| `demo-study-002` | `demo-patient-002` / `demo-encounter-002b` | `imagenologia`: Radiografía de tórax AP | `reviewed` (fictional result note) |

The seed creates both records if missing, including the prescription lines in the same transaction. Existing documents and edited lines are preserved on later runs.

### Printable-document fixtures (NX-004)

| ID | Patient / encounter | Kind | Content |
|---|---|---|---|
| `demo-document-prescription-001` | `demo-patient-002` / `demo-encounter-002b` | `prescription` | Two `[DEMO]` fictional medication placeholders and explicit non-use text; not a real prescription. |
| `demo-document-report-001` | `demo-patient-007` / no encounter | `report` | Fictional format example that explicitly contains no findings or recommendations. |

The fixture lines use stable IDs and positions. Document and line records are create-if-missing, use the deterministic seed timestamp, and are not overwritten on re-seed.

## 4. Synthetic content rules

- Use deterministic fictional names and stable internal IDs.
- Do not use actual patient data, real contact details, actual medical record numbers, or copied medical notes.
- Leave phone numbers blank. If an email is useful for testing, use a reserved `.invalid` domain such as `demo001@example.invalid`.
- Every clinical note must contain a clear label such as `NOTA FICTICIA DE DEMOSTRACIÓN — NO USAR PARA ATENCIÓN REAL`.
- Use short fictional examples appropriate to a general surgery practice only to exercise the fields and UI. Do not encode clinical recommendations as authoritative advice.
- Keep the text in Spanish (Mexico).
- Do not put real patient data in screenshots, logs, test snapshots, agent memory, or commit messages.

## 5. Visible demo state

- Show a persistent banner in the application shell: **MODO DEMOSTRACIÓN — TODOS LOS DATOS SON FICTICIOS**.
- Patient display names and identifiers should look natural; the persistent banner and explicit fictional labels in note/document examples identify demo content.
- The registry should show seeded records immediately.
- The root route `/` should redirect to `/patients`.
- Empty states must still be reachable, including a patient with no encounters.

The UI should make it impossible to mistake the seeded dataset for real patient data.

## 6. Seed implementation

Use Prisma ORM 7's explicit seed command (`prisma db seed`) and configure the seed command in `prisma.config.ts`. In Prisma 7, seeding is not automatically run by `migrate dev` or `migrate reset`; startup must invoke the seed command explicitly.

Required behavior:

1. Seed stable, deterministic patient and encounter identifiers.
2. Use create-if-missing or equivalent idempotent upsert behavior.
3. Existing seed records must not be overwritten on subsequent runs. A doctor/tester may have edited a demo record; rerunning the seed must preserve that edit.
4. Running the seed multiple times must not duplicate records.
5. The seed must never delete user-created records or reset the database.
6. New demo fixture records may be added in later revisions, but existing records should not be rewritten automatically.
7. Normal startup runs migrations first, then the seed command, then starts both services.

One owner-approved exception updates the seven untouched placeholder patient names and `DEMO-00x` identifiers once. Its migration matches each stable fixture ID plus both original placeholder values, so renamed or otherwise edited patient rows and all user-created rows remain unchanged. The fixture seeds the same plausible fictional display names on clean installs. Clinical note text keeps its fictional-content markers, and the persistent banner stays visible.

A destructive reset belongs only in an explicit local-only command (`npm run db:reset`) and must never run as part of normal startup.

## 7. First-run command

After dependencies are installed:

```bash
npm run dev
```

Expected startup sequence:

1. Ensure `.local/data/` exists.
2. Apply pending Prisma migrations to local SQLite.
3. Run the idempotent demo seed explicitly.
4. Start Hono and Next.js together.
5. Print both local URLs and the demo mode status.

Open `http://127.0.0.1:3000` and land on the populated patient registry.

## 8. Repeat-start behavior

After the developer creates or edits local patients/encounters:

- Stopping and restarting the application must preserve all records.
- Running the seed again must not reset, replace, or duplicate records.
- The demo banner remains enabled for the prototype.
- A database reset is explicit and destructive; provide a clear warning and require an explicit confirmation flag or interactive confirmation.

## 9. Seed verification

Tests must verify:

- A clean database receives required demo records (patients, encounters, appointments, studies, prescriptions/reports and prescription lines).
- Running the seed twice yields the same record counts.
- Existing edited demo records are not overwritten.
- Existing user-created records are not deleted or modified.
- A patient with no encounters remains available to exercise the empty state.
- The archived demo patient remains archived after a repeated seed.
- Past appointments keep their exact fixture timestamps, states, and encounter links.
- Upcoming appointments are in the future, sit on the expected practice-timezone wall times, and do not move on re-seed (first-seed anchor).
- Study fixture IDs, patient/encounter associations and preservation after repeat seed are covered by seed tests.
- Prescription/report fixture IDs, optional encounter association, line ordering, exact fictional content, idempotency, and edit preservation are covered by seed tests.
- Startup does not require Cloudflare or internet connectivity after dependencies have been installed.
