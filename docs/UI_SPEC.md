# UI Specification — Medical Platform MVP

**Status:** O-002 design delivered; O-005 expansion scope approved in D-023. NX-001 and NX-002 are implemented and browser-verified; NX-003 is implemented with its pending-status behavior reconciled to `TASKS.md`; NX-004 schema/API and synthetic seed are implemented while its web workflow remains active.
**Owner:** `apps/web` (Next.js App Router)  
**Interface language:** Spanish (Mexico) — all UI strings below are the canonical copy; technical prose stays in English.  
**Data:** Synthetic demo records only. A persistent demo banner is part of every screen.

This spec follows `TASKS.md` work packages T-007–T-011: it reconciles workflows with the implemented API (Section 1), defines the information architecture (Section 2), specifies every screen and interaction (Sections 3–4), the states and visual system (Section 5), and closes with story coverage and recorded decisions (Section 6).

---

## 1. Capability reconciliation (T-007)

What the verified O-001 API actually provides, and how the design uses it:

| Capability | API behavior (verified) | Design consequence |
|---|---|---|
| Patient list | `GET /patients?q=&status=active\|archived\|all`, server-side case-insensitive partial search over full name and external identifier; sorted by `fullName` asc; no pagination. | Registry renders the full result set (prototype scale: single-digit to low-double-digit patients). No pagination UI. |
| Patient read | `GET /patients/:id` → `PatientDetail` (demographics, four background fields, timestamps). | Overview is SSR: server component fetches detail directly. |
| Patient create | `POST /patients` (`fullName` required; `dateOfBirth`, `phone`, `email`, `externalIdentifier` optional; strict). | "Nuevo paciente" page with a single form. No wizard. |
| Patient update | `PATCH /patients/:id` — partial update, at least one field required; `null` clears `dateOfBirth`/`phone`/`email`/`externalIdentifier`. | Edit page pre-filled; clearing a field = empty input on save. |
| Medical background | `PATCH /patients/:id/medical-background` — four independent free-text fields; absent = unchanged, `null` = cleared. | Separate edit page (not part of demographics), so a background edit never risks demographics. |
| Archive | `PATCH /patients/:id/archive` — idempotent, non-destructive. **No unarchive endpoint exists.** | Archiving is a one-way action in this prototype. The confirmation copy states this explicitly. The UI offers no unarchive control. |
| Encounters list | `GET /patients/:id/encounters` → summaries ordered `occurredAt` desc (tie-break `id` asc). | Timeline renders newest first; server ordering is authoritative. |
| Encounter create | `POST /patients/:id/encounters` — `occurredAt` required; seven note sections optional (≤ 10,000 chars each, trimmed). Patient association is fixed by the URL path and validated server-side. | Consultation form lives in the patient context; the client never sends `patientId`. |
| Encounter read/update | `GET /encounters/:id`, `PATCH /encounters/:id` (partial, updates `updatedAt`). | Encounter detail page with an explicit "Editar" mode; editing is never silent. |
| Errors | One JSON envelope: `400` with `fieldErrors` map for validation, `404` for unknown ids, `500` otherwise. | Inline per-field validation errors from `fieldErrors`; API/network failures show a page-level error banner and preserve form values. |
| Health | `GET /health`. | Used by startup smoke test only; no UI surface. |

Gaps and decisions recorded here (no API/data changes required; per D-017 the API stays revisable if O-003 uncovers a real need):

1. **Duplicate detection.** No API endpoint suggests duplicates. Workflow US-001 says duplicates "may be flagged, but never automatically merged." Decision: client-side heuristic only — when creating a patient, if the registry (already fetched for the page) contains an exact case-insensitive full-name match, show a non-blocking notice above the save button ("Existe un paciente con este nombre: [link]"). Never blocks saving; never merges.
2. **No unarchive.** One-way archive is by design (no permanent delete, no restore, in this prototype). The confirmation dialog copy makes this explicit.
3. **Age display.** `dateOfBirth` is a `YYYY-MM-DD` string. Age is computed client-side and shown as `edad` next to the date; never stored.
4. **Dates and times.** All ISO 8601 values render with `Intl` in `es-MX` in the local practice timezone: dates as `d 'de' MMMM yyyy`, datetimes as `d 'de' MMMM yyyy, HH:mm`. No UTC display anywhere.
5. **No auth, no multi-user.** Single-doctor local tool; no login screen, no user management. The demo banner carries the privacy warning instead.
6. **Form submission style.** Per `ARCHITECTURE.md`, browser mutations use the typed API client (contract zod schemas validate in the browser first, then the API re-validates authoritatively). After a successful mutation, the page re-renders server-side so the visible state always matches the database.

---

## 2. Information architecture and screen map (T-008)

```
/ ──────────────── 307 redirect ────────────────▶ /patients
                                                        │
┌───────────────────────────────────────────────────────┤
│  Top bar (all screens):  [Nexus Med]  Pacientes · Calendario │
│  Demo banner: MODO DEMOSTRACIÓN — DATOS FICTICIOS     │
└───────────────────────────────────────────────────────┘

/patients                        Registro de pacientes (list + search + filter)
/patients/new                    Nuevo paciente (create form)
/patients/[id]                   Resumen del paciente (identity, background, citas card, timeline, actions)
/patients/[id]/editar            Editar datos del paciente (demographics form)
/patients/[id]/antecedentes      Editar antecedentes médicos (background form)
/patients/[id]/citas             Citas del paciente (próximas + historial)
/patients/[id]/citas/nueva       Nueva cita (appointment form)
/patients/[id]/citas/[cid]       Cita (detail; edit + complete/cancel flows)
/patients/[id]/consultas/nueva   Nueva consulta (consultation form; + tipo, + estudios)
/patients/[id]/consultas/[eid]   Consulta (detail; + estudios section)
/patients/[id]/recetas/nueva     Nueva receta (prescription form)
/patients/[id]/recetas/[did]     Receta (detail + print)
/patients/[id]/informes/nueva    Nuevo informe (report form)
/patients/[id]/informes/[did]    Informe (detail + print)
/calendar?vista=semana&fecha=…   Calendario (day/week/month views)
/not-found                       404 page (unknown id, unknown route, invalid fecha)
```

Navigation rules:

- The primary nav items are **Pacientes** (the registry is the home working screen) and **Calendario** (the schedule at a glance). Everything else is reached through contextual actions on the registry row, the calendar, or the patient overview.
- Patient-specific screens carry a persistent context strip under the top bar: `← Pacientes` (back link) + patient full name + external identifier (if any) + `Archivado` badge when archived.
- Encounter screens nest under the patient; back from an encounter returns to the patient overview, not the registry.
- URL patterns are the single source of navigation state (shareable, bookmarkable, restorable after restart — US-013).
- No modals for data entry. The only inline confirmations are archiving (destructive-feeling, one-way) and leaving a form with unsaved changes (native `beforeunload` only; in-app navigation to a form that is dirty is allowed to proceed — acceptable prototype tradeoff, recorded in Section 6).

---

## 3. Screen specifications (T-009)

Common to all screens: top bar, demo banner (Section 5.4), container `max-width: 1040px`, content left-aligned. All text in Spanish (Mexico).

### 3.1 Registro de pacientes — `/patients`

**Purpose:** find or create a patient; the default working screen (US-002, US-014).

Layout (top to bottom):

1. Heading row: `Pacientes` (H1) + right-aligned primary button `Nuevo paciente`.
2. Search field: full-width input, placeholder `Buscar por nombre o identificador`, leading magnifier icon. Search is debounced 300 ms and applied as `?q=` (history-replaced, not pushed, so the back button does not walk through keystrokes).
3. Filter tabs (segmented control): `Activos` (default) · `Archivados` · `Todos` → `status=active|archived|all`. Active tab is visually marked; count per tab is shown in parentheses when known from the same fetch (prototype: fetch the active list; tab counts update after re-render — counts are optional and may be omitted if they require extra requests; never block the list on them).
4. Result list: one row per patient (see row spec). Sorted by the server (`fullName` asc).
5. States:
   - **Loading** (first SSR only): skeleton rows (3).
   - **Empty, no search:** `Aún no hay pacientes` + `Nuevo paciente` button.
   - **Empty, with search:** `Sin resultados para "q"` + actions: `Limpiar búsqueda` (ghost) and `Crear un paciente con este nombre` (primary; carries the query as the pre-filled name on `/patients/new?nombre=`).
   - **API error:** page-level error banner (`No se pudo cargar el listado`) + `Reintentar` button (client refetch); last good data is not displayed as fresh (no stale-data masquerading).

**Row spec** (each row is a link to `/patients/[id]`):

| Column | Content | Notes |
|---|---|---|
| Nombre | `fullName` | Bold; primary tap target |
| Edad / Nacimiento | Age if `dateOfBirth` present, else `—` | Age computed from `dateOfBirth` |
| Identificador | `externalIdentifier` or `—` | Monospace, muted |
| Estado | `Archivado` badge (amber) only when archived | Active rows show nothing |

Row hover: subtle background change; the whole row is clickable. Archived rows keep their normal row styling plus the badge.

### 3.2 Nuevo paciente — `/patients/new`

**Purpose:** register a patient (US-001).

Form fields (label → input → API field):

| Label | Input | API field | Rules |
|---|---|---|---|
| Nombre completo * | text | `fullName` | Required; 1–200 chars; client-trimmed |
| Fecha de nacimiento | date | `dateOfBirth` | Optional; `YYYY-MM-DD`; must not be in the future (client check) |
| Teléfono | text (tel) | `phone` | Optional; ≤ 30 chars |
| Correo electrónico | text (email) | `email` | Optional; format-validated client-side |
| Identificador externo | text | `externalIdentifier` | Optional; ≤ 100 chars |

- `?nombre=` (from the no-results state) pre-fills the name field and focuses the form.
- **Duplicate notice:** if the current active registry contains a case-insensitive exact name match, a non-blocking info notice renders above the actions: `Existe un paciente con este nombre: [link to that patient]`. Saving is never blocked.
- **Actions:** `Guardar paciente` (primary) + `Cancelar` (ghost → back to `/patients`).
- **Submission:** button shows `Guardando…` (disabled) during the request.
  - Success → navigate to the new patient's overview. The fresh page *is* the saved confirmation.
  - `400` → per-field inline errors under each input (from `fieldErrors`); values preserved; focus first invalid field.
  - `500`/network → banner `No se pudo guardar el paciente. Tus datos siguen en el formulario.` values preserved.
- Cancel never loses data: leaving via back navigation while dirty uses native `beforeunload`.

### 3.3 Resumen del paciente — `/patients/[id]`

**Purpose:** the central clinical workspace for one patient (US-005, US-011). SSR: server component fetches `GET /patients/:id` + `GET /patients/:id/encounters`.

Context strip (Section 2) + content in this hierarchy:

1. **Identity header.** `fullName` (H1) + `Archivado` badge if archived. Sub-line: `Nacimiento: 12 de marzo de 1958 (67 años)` (or `No registrado`), `Tel: …`, `Correo: …`, `Identificador: …` — each missing value renders `No registrado` (never "no tiene").
   - Action row (right-aligned): `Nueva consulta` (primary), `Editar` (secondary), `Antecedentes` (secondary), `Archivar paciente` (ghost-danger, hidden when already archived).
2. **Antecedentes médicos.** Card with four labeled rows: `Afecciones`, `Cirugías previas`, `Alergias`, `Medicamentos actuales`. Each row: label (muted, 60% width on desktop) + value, or `No registrado` (italic, muted) when null/empty. A single `Editar` text-button in the card header links to the background edit page.
3. **Historial de consultas.** Timeline card:
   - Header: `Historial` + count (`9 consultas`).
   - One entry per encounter, newest first: line 1 = `12 de marzo de 2025, 10:30` + a neutral type badge (`Consulta`, `Procedimiento`, `Visita a domicilio`, `Urgencia` — same `badge-type` label used on citas, no color) + `Motivo: …` (reason, truncated to one line, or `Sin motivo` muted if null); line 2 (muted) = `Actualizada 14 de marzo de 2025` only when `updatedAt` differs from `createdAt` (i.e., the note was edited after its first save — a backdated consultation entered later is never mislabeled; signals continuity, never silently).
   - Each entry links to the encounter detail.
   - **Empty state:** `Este paciente aún no tiene consultas` + `Nueva consulta` button (primary).
4. **Footer actions:** none (all actions live in the header).

**Archive flow (US-004).** `Archivar paciente` toggles an inline confirmation panel (not a modal) below the header:

> `¿Archivar a {name}?` — `El paciente dejará de aparecer en el listado activo. Sus consultas y antecedentes se conservan. Esta acción no puede deshacerse en esta versión.`  
> `Cancelar` (ghost) · `Archivar` (danger)

Success → navigate to `/patients?status=archived` so the doctor sees the patient in its new place. The timeline and background are untouched (server-guaranteed non-destructive).

### 3.4 Editar datos del paciente — `/patients/[id]/editar`

Pre-filled demographics form (same fields/rules as 3.2 minus the duplicate notice — an update never creates a duplicate, per US-003).

- Header: `Editar a {name}`.
- Empty input on save = field cleared (the API treats `null` as clear). `Fecha de nacimiento` empty → cleared.
- Success → return to `/patients/[id]`; the re-rendered overview *is* the confirmation. Encounter history is unchanged (server-guaranteed).
- Errors behave as in 3.2 (field-level + banner, values preserved).
- Actions: `Guardar cambios` (primary) · `Cancelar` (ghost).

### 3.5 Editar antecedentes — `/patients/[id]/antecedentes`

**Purpose:** maintain the patient-level medical background (US-006).

- Header: `Antecedentes de {name}`.
- Four textareas (label → API field), pre-filled, placeholder `Sin registro` when empty:
  - `Afecciones médicas` → `medicalConditions`
  - `Cirugías previas` → `previousSurgeries`
  - `Alergias` → `allergies`
  - `Medicamentos actuales` → `currentMedications`
- Each ≤ 5,000 chars (server limit; client shows a character counter only past 4,500).
- Info line under the header: `Los antecedentes pertenecen al paciente. Las consultas ya registradas no se modifican.`
- Semantics reminder (footer, muted): `Un campo vacío significa "sin registro", no un resultado negativo.`
- Success → return to overview with the updated background. Errors as in 3.2.
- Free text only — no catalogs, no terminology (per `WORKFLOWS.md` §4).

### 3.6 Nueva consulta — `/patients/[id]/consultas/nueva`

**Purpose:** document a consultation (US-007, US-008). The patient context strip is mandatory — the doctor always sees whose note they are writing.

Form (top to bottom), all sections optional except the date:

| Label | Input | API field |
|---|---|---|
| Fecha y hora de la consulta * | `datetime-local` | `occurredAt` |
| Tipo de consulta | `select` (default `Consulta`; options from the shared `encounterTypeSchema`, labels from the shared type-label map, D-024) | `type` |
| Motivo de consulta | textarea (2 rows) | `reason` |
| Enfermedad actual | textarea (4 rows) | `historyOfPresentIllness` |
| Antecedentes relevantes | textarea (3 rows) | `relevantHistory` |
| Exploración física | textarea (4 rows) | `physicalExamination` |
| Valoración | textarea (3 rows) | `assessment` |
| Plan | textarea (4 rows) | `plan` |
| Seguimiento | textarea (2 rows) | `followUp` |

- `occurredAt` defaults to now (local), editable; must not be in the future (client check; the API accepts any instant — the client rule is usability).
- Textareas: no autosize beyond 8 rows; each ≤ 10,000 chars (counter past 9,500).
- **Explicit save only — never autosave** (per workflow).
- Actions: `Guardar consulta` (primary) · `Cancelar` (ghost → back to overview).
- Success → navigate to the new encounter's detail page; the overview timeline will show it at the top on return (server orders by `occurredAt` desc).
- `400` → `fieldErrors` inline (`occurredAt` message in Spanish from the contract; other sections only fail on length); values preserved; focus first error.
- `500`/network → banner `No se pudo guardar la consulta. Tu texto se conserva.`; values preserved.
- No diagnosis/finding/plan suggestions anywhere in the form (clinical content is the doctor's, verbatim).
- The saved note is never labeled "signed" or "final" — no signature UI exists.

### 3.7 Consulta (detail + edit) — `/patients/[id]/consultas/[eid]`

**Purpose:** review a historical encounter (US-010, US-009 retrieve). SSR fetches `GET /encounters/:eid`.

- Header: occurrence datetime (full form, e.g. `12 de marzo de 2025, 10:30`) + a neutral type badge (`badge-type`, same label as citas) + `Editada` badge when `updatedAt` is after `createdAt` (shows the edit timestamp: `Editada el 14 de marzo de 2025 a las 16:05`).
- Sections in canonical order (3.6), each: label (muted small caps) + verbatim text; null/empty sections render `No registrado` (italic, muted) — the full note is readable, not a form.
- Actions: `Editar consulta` (secondary) toggles **edit mode** in place (type selector + same field layout as 3.6, pre-filled; `Guardar cambios` / `Cancelar edición`). Save is explicit; success re-renders the detail (new `updatedAt` badge appears if the time differs). Editing never reassigns the patient (API-enforced) and never reorders the timeline except via `occurredAt`.
- `404` on an unknown encounter id (e.g., stale bookmark) → the standard not-found page (3.8).

### 3.8 Not found — 404

- `Paciente no encontrado` or `Consulta no encontrada` (depending on the route shape) + `El registro no existe o fue eliminado.` + `Volver al listado` (primary → `/patients`).
- Used for unknown ids and unknown routes. No stack traces, no API internals.

---

## 4. Interaction and error rules (cross-cutting)

Carried from `WORKFLOWS.md` §9 and made concrete:

- **State separation:** loading (skeletons/spinner), empty, saved (post-refresh render), validation error (inline, field-level), API error (banner), network error (banner + retry). They are visually distinct (Section 5.3).
- **No stale data as fresh:** after any failed mutation, the screen keeps showing the last *known* data with an error banner; it never claims a successful update.
- **Form preservation:** every recoverable failure (`400`, `500`, network) preserves typed values.
- **Server is authoritative:** browser-side zod validation (shared contract) is for speed/usability only; the API's `400` is the final word and is always rendered.
- **No shared caching** of patient/encounter data across sessions; each SSR render fetches fresh (per `ARCHITECTURE.md`).
- **Identify the patient** on every patient-specific screen (context strip) and on every encounter form.
- **One-way archive** with explicit, unhiding confirmation copy.
- **Demo banner** always visible; demo data is fictional.

---

## 5. States and visual system (T-010)

### 5.1 Design direction

Minimal, calm, high legibility. A local tool for a single surgeon working during the day: light theme only (no dark mode in the prototype), no decorative graphics, generous whitespace, one accent color. Deliberately restrained so clinical content dominates.

### 5.2 Tokens (CSS custom properties, `apps/web/app/globals.css`)

```css
:root {
  /* Surfaces */
  --bg:            #f6f7f8;   /* page background */
  --surface:       #ffffff;   /* cards, inputs, rows */
  --surface-hover: #eef1f4;
  --border:        #d8dee4;
  --border-strong: #b9c2cb;

  /* Text */
  --text:          #1c2430;
  --text-muted:    #5c6875;
  --text-faint:    #8b96a2;   /* "No registrado", timestamps */

  /* Brand / action */
  --primary:       #155eab;   /* clinical blue */
  --primary-hover: #114c8c;
  --primary-contrast: #ffffff;

  /* Semantic */
  --success:       #1e7e44;
  --warning:       #9a6b00;   /* archived badge, demo banner text */
  --warning-bg:    #fdf3d7;
  --danger:        #c23b3b;
  --danger-hover:  #a52f2f;
  --error-bg:      #fbe9e9;
  --info-bg:       #e8f1fb;

  /* Type */
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
               "Helvetica Neue", Arial, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;

  /* Spacing scale (px) */
  --s-1: 4;  --s-2: 8;  --s-3: 12; --s-4: 16;
  --s-5: 24; --s-6: 32; --s-7: 48;

  /* Radii */
  --radius-sm: 4px; --radius-md: 8px;

  /* Layout */
  --container: 1040px;
  --topbar-h: 56px;
}
```

No web fonts (offline requirement: O-004 "works offline after dependency install"). No icon library: the three glyphs needed (search, back arrow, warning) are inline SVG.

Type scale: H1 24/32 semibold · H2 18/26 medium · body 15/24 regular · small 13/20 · label 12/16 medium uppercase-tracked (for section labels in the encounter note).

### 5.3 Components (behavioral spec)

| Component | Variants / rules |
|---|---|
| **Button** | `primary` (blue fill), `secondary` (white fill, border), `ghost` (no fill), `ghost-danger` (danger text, no fill), `danger` (red fill). Disabled: 50% opacity, `cursor: not-allowed`. `Guardando…`/saving state: disabled + label swap, no spinner (fast local calls; a spinner would flicker). Min height 40 px; touch-friendly. |
| **Input / textarea** | White surface, 1 px `--border`, focus: 2 px `--primary` outline (offset 1). Error: `--danger` border + 13 px message under the field in `--danger`. Disabled during in-flight save. |
| **Segmented control** | For registry tabs: connected buttons, active = white surface + `--border` + shadow-sm, inactive = transparent muted text. |
| **Badge** | `Archivado` (warning-bg/warning text), `Editada` (info-bg/primary text). Uppercase 11 px, pill radius. |
| **Card** | White surface, 1 px `--border`, `--radius-md`, padding `--s-5`. No elevation shadows beyond the segmented control — flat by design. |
| **List row** | 56 px min height, 1 px bottom border, hover `--surface-hover`, cursor pointer. |
| **Timeline entry** | Card list; 4 px left accent bar in `--border-strong` (no per-entry accent colors); entry gap `--s-3`. |
| **Error banner** | Full-width, `--error-bg`, `--danger` left border 3 px, 15 px text, inline `Reintentar` ghost button where retry applies. |
| **Info notice** | `--info-bg`, 15 px text (duplicate notice). |
| **Skeleton** | 8 px radius bars in `--surface-hover` with a subtle shimmer; registry: 3 rows; overview: header + 2 cards. |
| **Inline confirm** | Bordered panel (`--warning-bg` header strip for archive), message + `Cancelar`/action buttons right-aligned. |

### 5.4 Demo banner

Persistent, directly under the top bar on every screen:

`MODO DEMOSTRACIÓN — DATOS FICTICIOS` — `--warning-bg` background, `--warning` text, 13 px medium, centered, full width. Never dismissible (prototype requirement).

### 5.5 State matrix

| Screen | Loading | Empty | Not found | Validation error | API error | Success feedback |
|---|---|---|---|---|---|---|
| Registry | 3 skeleton rows | "Aún no hay pacientes" / "Sin resultados" | — | — | Banner + Reintentar | List re-render |
| New patient | — | — | — | Inline per field | Banner, values kept | Navigate to overview |
| Overview | Skeletons | Empty timeline state | 404 page | — | Banner over last good data | Re-render after mutation |
| Patient edit / background | — | — | 404 page | Inline per field | Banner, values kept | Navigate to overview |
| New consultation | — | — | 404 page (patient gone) | Inline per field | Banner, text kept | Navigate to encounter detail |
| Encounter detail | Skeletons | — | 404 page | Inline per field | Banner, values kept | Re-render + `Editada` badge |

### 5.6 Responsive

- ≥ 1040 px: full container, background label/value rows side by side.
- 640–1039 px (tablet): container with `--s-4` gutters; registry rows keep all columns; background rows stack (label above value).
- < 640 px (phone, secondary): single column; action rows wrap; context strip compresses to back-link + name (identifier moves below). Touch targets ≥ 44 px. The prototype's primary target is a desktop/tablet at the practice; phone is readable, not optimized.

### 5.7 Accessibility baseline

Semantic landmarks (`header`, `main`, `nav`); one H1 per page; labels programmatically associated with inputs; error messages linked via `aria-describedby`; focus order natural, focus visible (`--primary` outline); demo banner in a `role="status"`-neutral static element (no live-region noise); color never the only signal (badges have text; errors have text + border); contrast: all token pairs ≥ 4.5:1 for body text.

---

## 6. Story coverage and recorded decisions (T-011)

### 6.1 P0 story → screen mapping

| Story | Spec location |
|---|---|
| US-001 Register a patient | 3.2 (+ duplicate notice, §1.1) |
| US-002 Find a patient | 3.1 |
| US-003 Update patient information | 3.4 |
| US-004 Archive a patient | 3.3 (archive flow) |
| US-005 Review patient overview | 3.3 |
| US-006 Maintain medical background | 3.5 |
| US-007 Start a consultation | 3.6 |
| US-008 Document a consultation | 3.6 |
| US-009 Save and retrieve a consultation | 3.6 (save) + 3.7 (retrieve) |
| US-010 Review previous consultations | 3.7 (+ 3.3 timeline) |
| US-011 Maintain clinical continuity | 3.3 (context strip, timeline, `Editada` badge) |
| US-012 Know whether information was saved | §4 (state separation, banners, navigation-as-confirmation) |
| US-013 Resume after restart | §2 (URL-driven navigation), §1.4 (local dates), O-004 persistence |
| US-014 Open a populated prototype | 3.1 (populated registry + demo banner) |

All 14 stories are covered by observable behavior in this spec. No story requires a capability the API lacks; the two heuristic/one-way decisions in §1 (duplicate notice, one-way archive) are design-level and change no API or data assumptions.

### 6.2 Decisions recorded during O-002

| # | Decision | Why |
|---|---|---|
| U-01 | Edit screens are pages, not modals | Simpler SSR + typed client; no overlay state; deep-linkable; matches the "no modals for data entry" rule |
| U-02 | Background editing is a separate page from demographics | A background edit can never corrupt demographics (and vice versa); matches the API's separate endpoint |
| U-03 | Archive confirmation is inline, one-way, with explicit non-reversible copy | No unarchive endpoint exists; the doctor must know before confirming |
| U-04 | Success feedback = navigation + re-render (+ banner only for failures) | The refreshed server data is the honest confirmation; no optimistic UI, no "saved" toasts that could lie |
| U-05 | Duplicate detection is a non-blocking client notice | No API support; never blocks, never merges (US-001 constraint) |
| U-06 | System font stack, no icon library, no dark mode | Offline requirement; minimal prototype scope; clinical legibility |
| U-07 | `Editada` badge surfaces post-creation edits without silent content replacement | US-010: edits are explicit and timestamped |
| U-08 | Dirty-form protection = native `beforeunload` only; in-app navigation may drop unsaved form values | Prototype tradeoff; the cost of a full dirty-state manager outweighs the benefit at this scale. Recorded so O-003 implements exactly this, not more |

### 6.3 Open items (do not block O-003)

- Tab counts in the registry (3.1) are optional; implement only if a single fetch makes them free.
- Character counters appear only near the limit — confirm during implementation that this stays calm and unobtrusive.
- If O-003 implementation reveals a real API gap (e.g., an endpoint the screens genuinely need), revise the API per D-017 and update `API_CONTRACT.md` + tests in the same change — do not work around gaps with client hacks.

---

---

## 7. Expansion design — NX-001…NX-004 (2026-11-07)

Design for the four expansion objectives from the owner's mission brief, in order: appointments + calendar, encounter types, study requests, printable prescriptions/reports. This section extends the MVP spec; Sections 1–6 remain authoritative for the existing screens and nothing in them changes behavior. New API/data capabilities listed here are implemented with each objective (per D-017), not before.

**Navigation change:** the top bar gains a second primary item: `Pacientes · Calendario`. Everything else stays contextual. The registry remains the default working screen (`/` still redirects to `/patients`).

### 7.0 Objects and endpoints the design assumes

| Object | Fields (beyond id/timestamps) | Endpoints |
|---|---|---|
| `Appointment` | `patientId`, `startAt` (instant), `durationMinutes` (5–480), `type` (`consulta` · `procedimiento` · `visita_domicilio` · `urgencia`), `status` (`scheduled` · `completed` · `cancelled`), `actualDurationMinutes` (optional, set on completion), `linkedEncounterId` (optional, set on completion; same patient, server-validated) | `GET /api/appointments?from=&to=` · `GET /api/patients/:id/appointments` · `POST /api/patients/:id/appointments` · `GET /api/appointments/:id` · `PATCH /api/appointments/:id` · `POST /api/appointments/:id/complete` · `POST /api/appointments/:id/cancel` |
| `Encounter.type` | new field, fixed list above, default `consulta`; existing records migrate to `consulta` (their meaning is unchanged — they are consultations) | `POST/PATCH /encounters` gain `type`; timeline summaries include it |
| `StudyRequest` | `patientId`, `encounterId` (originating encounter, immutable), `category` (closed list: `laboratorio` · `imagenologia` · `rayos_x` · `ecg` · `ecografia` · `otro`), `description` (free text, e.g. `Biometría hemática`), `status` (`ordered` · `completed` · `reviewed`), `resultNote` (≤ 1,000 chars, optional) | `POST /api/encounters/:id/studies` (also in the encounter create payload as `studies[]`) · `PATCH /api/studies/:id` (status + `resultNote` only) · included in encounter detail; `GET /api/patients/:id/studies?status=` for the overview pending list |
| `MedicalDocument` | `patientId`, `encounterId` (optional), `kind` (`prescription` · `report`), `title` (optional), `body` (narrative, reports), plus `PrescriptionLine[]` for prescriptions: `medication` (required), `dose`, `route`, `frequency`, `duration`, `instructions` (all free text) | `POST /api/patients/:id/documents` · `GET /api/documents/:id` · `PATCH /api/documents/:id` · `GET /api/patients/:id/documents` |

No other entities. No recurrence, reminders, resources, catalogs, or integrations (mission constraints).

#### 7.0.1 Implemented versus designed behavior (2026-11-08)

This is an **as-built inventory**, not approval to change the requirements in the original §7.0 table.

- NX-001: the API also offers `POST /api/appointments/:id/link-encounter` for eligible appointments. Day/week/month views, patient appointment screens, date validation, outside-hours display, and weekly overflow behavior meet the detailed acceptance criteria.
- NX-002: encounter type is persisted and editable, appears in the detail header, and appears in the timeline only for non-default types. Dedicated surgical workflow remains deferred under Q-NX-01.
- NX-003: new-encounter creation continues to create studies atomically with the encounter; `POST /api/encounters/:id/studies` adds rows to an existing encounter with patient association derived by the API. Patient study listing accepts repeatable `status` values; `ordered` and `completed` remain pending until reviewed, matching `TASKS.md`.
- `ordered → reviewed` is permitted directly, in addition to `ordered → completed → reviewed`. The two exact study fixtures remain unchanged and the seed remains idempotent.
- NX-004 models, migration, contracts, API, and synthetic document fixtures are implemented; prescription/report forms and print views remain in progress.

Refer to `API_CONTRACT.md`, `DATA_MODEL.md`, and `ACTION_PLAN.md` for the current implementation inventory and verification status.

### 7.1 NX-001 — Appointments and calendar

**Labels (canonical Spanish):** types `Consulta` · `Procedimiento` · `Visita a domicilio` · `Urgencia`; statuses `Programada` · `Completada` · `Cancelada`.

**Status transitions (the complete, explicit rule set):**

| From | Action | To | Notes |
|---|---|---|---|
| `scheduled` | `Completar` | `completed` | optional `actualDurationMinutes` + optional encounter link |
| `scheduled` | `Cancelar` | `cancelled` | inline confirmation; record is kept, never deleted |
| `cancelled` | `Reprogramar` | `scheduled` | opens the edit form; saving re-schedules |
| `completed` | — | (final) | read-only except: if no encounter linked yet, `Enlazar consulta` is offered |

Illegal transitions return `409 CONFLICT`. The UI only offers legal actions, so the conflict is a defense against stale pages, not a normal path.

**Time handling:** `startAt` is stored as an instant (like `occurredAt`); all display/entry in `America/Monterrey` via the existing `lib/format.ts`. The doctor may create past appointments (late logging); the app never auto-changes status based on time.

#### 7.1.1 Calendario — `/calendar?vista=semana&fecha=YYYY-MM-DD`

One route, URL-driven state: `vista` = `dia | semana | mes`, `fecha` = anchor date (week view shows the Monday-starting week containing it; Mexico week starts Monday — documented). Defaults: today, `semana`.

Layout (top to bottom):

1. Heading row: `Calendario` (H1) + view segmented control `Día · Semana · Mes` (same component as registry tabs).
2. Date-navigation row: `‹` `›` ghost buttons (aria-labels `Día/Semana/Mes anterior|siguiente`) + range label (day: `12 de noviembre de 2026`; week: `9–15 de noviembre de 2026`; month: `noviembre de 2026`) + `Hoy` ghost button (resets to today, keeps view).
3. The calendar surface (per view below).

**Day view.** CSS-grid time grid, no library: left time gutter (56 px, `12 px` muted labels `06:00`…`22:00`) + one day column. Hour rows are 48 px (`1 h = 48 px`, so 30 min = 24 px). Fixed display window **06:00–22:00** (U-10); appointments starting outside the window are listed below the grid under `Fuera del horario mostrado (06:00–22:00)` as plain rows. Appointment block: positioned by `startAt`, height by duration (min 24 px), 12 px text, two-line clamp (`10:30 — García, María` / type, truncated). Status styling: `Programada` = `--info-bg` fill + `--primary` left border; `Completada` = white fill + `--success` left border + muted text; `Cancelada` = `--surface-hover` fill, `--text-faint` text, line-through. Block is a link to the appointment detail.

**Overlaps (U-11):** the server accepts overlaps — no rejection, no silent moves. In day view, overlapping blocks split the column width side by side; the second and later blocks get a `--warning` left border so the clash is visible. The new-appointment form (7.1.3) shows a non-blocking overlap notice.

**Week view.** 7 columns (header `Lu Ma Mi Ju Vi Sá Do` + day number; today's column header in `--primary`), each a stacked list of **time chips** sorted by `startAt`: 22 px chips, 11 px text (`10:30 · García, María`, truncated), same status styling as day blocks, 2 px gap. Up to 3 chips per day + `+N más` ghost chip → navigates to day view for that date. Overlaps render as stacked chips with the `--warning` border (visible, not resolved).

**Month view.** Standard 7×(4–6) grid, Monday-start; cell header = day number (today circled with `--primary`); each cell lists up to 3 chips (same styling) + `+N más` → day view. Cells for other months render muted and empty (no data fetched for them).

**States:** loading = 3 skeleton rows above an empty grid; API error = banner `No se pudo cargar el calendario` + `Reintentar`; there is no meaningful "empty" state for the grid (an empty week shows the hour lines/chips-less cells — that is the calm state, not an error). Invalid `fecha` → 404 page (`Fecha no válida`).

**Data fetching (SSR):** one range query per render — day: the displayed local day midnight-to-midnight; week: 7 local days; month: the days of the displayed month. Server orders by `startAt`; the client only positions.

#### 7.1.2 Citas del paciente — `/patients/[id]/citas`

Context strip (7.1.3 pattern) + card list in two sections:

1. **`Próximas`** — scheduled, `startAt >= now`, ascending. Row: `Miércoles 12 de noviembre, 10:30` + type badge + `30 min` + status badge (muted, since the section implies it).
2. **`Historial`** — everything else, descending: completed (with `Duración real: 45 min` when set and `Consulta: [link]` when linked), cancelled (`Cancelada el {fecha}`), and past-scheduled entries shown honestly as `Programada` (the app never back-fills status — U-12 note).

Empty: `Sin citas` + `Nueva cita` (primary). Header action: `Nueva cita` (primary, right-aligned).

#### 7.1.3 Nueva cita — `/patients/[id]/citas/nueva`

Patient context strip mandatory (whose appointment is being scheduled). Form:

| Label | Input | API field | Rules |
|---|---|---|---|
| Paciente | display only (from context) | — | fixed by URL; server-validated |
| Fecha y hora * | `datetime-local` | `startAt` | required; default = next full hour local |
| Duración (minutos) * | number | `durationMinutes` | required; 5–480; step 5; default 30 |
| Tipo * | select | `type` | required; default `Consulta` |

- **Overlap notice (non-blocking):** if another *scheduled* appointment exists at the same time (any patient — one doctor), an info notice renders above the actions: `Otra cita en este horario: {hora} — {paciente}` (pattern of U-05 duplicate notice). Saving is never blocked; the overlap remains visible on the calendar.
- Actions: `Guardar cita` (primary) · `Cancelar` (ghost).
- Success → navigate to the appointment detail (the fresh page is the confirmation, U-04).
- Errors as in 3.2 (inline `fieldErrors`, banner on 500/network, values preserved).

#### 7.1.4 Cita (detail + edit + status actions) — `/patients/[id]/citas/[cid]`

- Header: full es-MX datetime (`Miércoles 12 de noviembre de 2026, 10:30`) + type badge + status badge. Sub-line: `Duración: 30 min` · `Paciente: [fullName → overview]`.
- Completed adds: `Duración real: 45 min` (when set) and `Consulta vinculada: [12 de noviembre, 10:30 — Motivo → encounter detail]` (when linked; otherwise an `Enlazar consulta` secondary action).
- Cancelled adds: `Cancelada el {fecha de updatedAt}` (muted).
- **Edit mode** (`Editar` secondary, available for `scheduled` and `cancelled`): in place, same fields as 7.1.3; for `cancelled` the save button reads `Reprogramar` and saving returns status to `scheduled`. `Guardar cambios` / `Cancelar edición`.
- **Complete flow** (`Completar cita` primary, only for `scheduled`): toggles an inline panel (archive-flow pattern, §3.3):
  > `Completar la cita de {nombre}`
  > `Duración real (minutos)` — number, optional, default = planned duration
  > `Enlazar consulta` — select, default `Sin enlazar`; options = the patient's encounters newest first, labeled `{fecha, hora} — {motivo | Sin motivo}`. The server re-validates that the selected encounter belongs to the same patient (mismatch → `400` fieldErrors; the note is never copied into the appointment — the link is the only relationship).
  > `Cancelar` (ghost) · `Completar` (primary)
- **Cancel flow** (`Cancelar cita` ghost-danger, only for `scheduled`): inline confirmation:
  > `¿Cancelar la cita del {fecha, hora}?` — `La cita se conserva en el historial del paciente como cancelada.`
  > `Volver` (ghost) · `Cancelar cita` (danger)
- Success of any mutation → re-render (U-04); `404` on unknown id → not-found page (`Cita no encontrada`).

#### 7.1.5 Patient overview integration

New card between `Antecedentes médicos` and `Historial de consultas`:

- Header: `Citas` + count of upcoming scheduled + `Nueva cita` (primary small) + `Ver todas` (ghost link → `/patients/[id]/citas`).
- Body: up to 3 upcoming scheduled appointments (`12 de noviembre, 10:30 — Procedimiento`), each linking to the detail; then `…y N más` when truncated.
- Empty: `Sin citas programadas` (muted) + `Nueva cita` (primary).
- The card is always present (it carries the primary scheduling entry point — U-17).

### 7.2 NX-002 — Encounter types

**Decision (U-12):** `type` lives on **both** the appointment (what was planned) and the encounter (what actually happened), as two independent fields on the same fixed list. They can legitimately differ (a planned procedure that ended as a consultation). The encounter field defaults to `consulta`.

- **Existing records:** migrate to `type = consulta` — their meaning does not change (they are consultations). No UI migration notice is needed.
- **New consultation form (3.6):** one added field, between the date and `Motivo`: `Tipo de atención` — select, default `Consulta`, options per 7.0. Everything else in the form is unchanged.
- **Encounter detail (3.7):** header gains the type badge next to the datetime (before `Editada`).
- **Timeline (3.3):** a type badge renders on the entry **only when the type is not `consulta`** — the default keeps the timeline calm; `Procedimiento · Motivo: …` for the rest.
- **Surgical follow-through (U-13):** deliberately **not built** in this pass. The free-text `plan` + appointment `type = Procedimiento` + encounter `type = procedimiento` already express the basic flow (recommend in plan → schedule a procedure appointment → document the performed procedure as an encounter). A dedicated procedure record (status recommended/scheduled/performed/cancelled + links) is recorded as open question **Q-NX-01** in `DECISIONS.md`; if the owner wants it, it is designed and built as its own step before or with NX-003. No operating-room, team, anesthesia, or supplies concepts.

### 7.3 NX-003 — Study requests

**Labels:** statuses `Ordenada` · `Completada` · `Revisada`; categories `Laboratorio` · `Imagenología` · `Rayos X` · `ECG` · `Ecografía` · `Otro` (Q-NX-02: confirm the list with the doctor). `description` carries the specific study (`Biometría hemática`, `Rayos X de tórax`); when category is `Otro`, the description is what identifies the study.

**Form (added to Nueva consulta, 3.6):** section `Estudios solicitados` after `Seguimiento`. Starts empty with a ghost button `Agregar estudio`. Each added row (U-15): `Categoría` select (default `Laboratorio`) + `Descripción` input (placeholder `Ej. Biometría hemática`) + `Quitar` ghost (hidden when one row). A kept row requires category + description (client check; server `400` with per-row `fieldErrors`, e.g. `studies[0].description`). Zero rows = no studies (ordinary consultations are unchanged). Rows are created with the encounter in the same explicit save — no autosave, no separate study screen at creation time.

**Encounter detail (3.7):** new section `Estudios` between `Plan`/`Seguimiento` display and the footer — rendered **only when the encounter has studies**. One row per study: `Laboratorio · Biometría hemática` + status badge. Actions per status (inline, no navigation):
- `Ordenada`: `Marcar completada` (ghost) · `Marcar revisada` (ghost).
- `Completada`: `Marcar revisada` (ghost).
- `Revisada`: none (final).
Clicking any action opens an inline panel (complete-flow pattern) with an optional `Resultado / observación` textarea (≤ 1,000 chars; the doctor's words, never an interpretation) + `Guardar` / `Cancelar`. Saving sets the status and stores the note. Studies are never edited (category/description are immutable after save — the originating encounter is the record of what was ordered) and never deleted (consistent with the no-permanent-delete rule). A failed status update keeps the last known state + banner.

**Patient overview (U-17):** card `Estudios pendientes` — shown **only when the patient has ≥ 1 study with status `Ordenada` or `Completada`** (both remain pending until reviewed, per `TASKS.md`). The server requests `GET /api/patients/:id/studies?status=ordered&status=completed`, and the response count includes both statuses. Rows show `Laboratorio · Biometría hemática`, a status badge, and `Solicitada en {fecha} — [motivo de la consulta → encounter]`. No actions on the card; status changes happen in the encounter context, where the clinical note is visible.

**Follow-up:** unchanged mechanism — the doctor writes instructions in the encounter's free-text `Seguimiento` and schedules the return visit as an appointment (7.1). No second scheduler, no follow-up entity.

### 7.4 NX-004 — Printable prescriptions and reports

**Labels:** `Receta` / `Informe médico`; overview card `Recetas e informes`.

**Patient overview (U-17):** always-present card after `Citas`: header `Recetas e informes` + count + `Nueva receta` (secondary) + `Nuevo informe` (ghost). Rows (newest first): kind badge + `title` or truncated first line of the content + `{fecha}`; each links to the detail. Empty: `Sin recetas ni informes` (muted) + the two actions.

#### 7.4.1 Nueva receta — `/patients/[id]/recetas/nueva`

- Context strip mandatory.
- `Consulta relacionada` — select, default `Sin consulta relacionada`; options = the patient's encounters (same labeling as 7.1.4).
- `Título` — optional text (placeholder `Ej. Receta — control de dolor`); printed documents fall back to `Receta`.
- `Medicamentos` — repeatable rows (pattern of 7.3), starting empty + `Agregar medicamento`. Per row: `Medicamento *` (text) · `Dosis` (text, placeholder `Ej. 500 mg`) · `Vía` (placeholder `Ej. Oral`) · `Frecuencia` (placeholder `Ej. Cada 8 h`) · `Duración` (placeholder `Ej. 5 días`) · `Indicaciones` (placeholder `Ej. Tomar con alimentos`). Only `Medicamento` is required per kept row (server `400` fieldErrors `lines[0].medication` etc.).
- `Indicaciones generales` — textarea (optional, ≤ 2,000 chars).
- No catalog, no dose calculation, no interaction checks, no formulary (mission constraint).
- Actions: `Guardar receta` (primary) · `Cancelar` (ghost). Success → detail.

#### 7.4.2 Nuevo informe — `/patients/[id]/informes/nueva`

- `Título` optional (placeholder `Ej. Informe de evolución`); `Consulta relacionada` select (same as 7.4.1); `Texto del informe *` — large textarea (≤ 20,000 chars; counter past 19,500).
- Success → detail.

#### 7.4.3 Receta / Informe (detail + print) — `/patients/[id]/recetas/[did]` and `/patients/[id]/informes/[did]`

- Screen = actions row (`Imprimir` primary · `Editar` secondary) above a **paper card** that shows exactly what will print (WYSIWYG — U-16):
  - Printed header: `RECETA` or `INFORME MÉDICO` (or the document `title`), then `Paciente: {fullName}` · `Nacimiento: {fecha} ({edad})` (only when present) · `Fecha: {fecha de creación}`.
  - Prescription body: one block per line — `1. {medicamento} — {dosis} {vía} {frecuencia} {duración}` with the line's `indicaciones` on a second, indented line; missing sub-fields are simply omitted; then `Indicaciones generales:` + text when present.
  - Report body: the narrative with line breaks preserved (`white-space: pre-line`).
  - Printed footer (always): `MODO DEMOSTRACIÓN — DATOS FICTICIOS` (small, muted) — printed output must carry the demo marker (DEMO_DATA rule) and **nothing else**: no invented doctor name, license number, signature, or clinic details (only patient/practice facts actually present in the app).
- `Imprimir` calls `window.print()`; `@media print` hides the top bar, demo banner, context strip, actions, and everything outside the paper card; the card prints borderless at full width with 24 mm page margins; medication/report blocks use `break-inside: avoid`. The browser print dialog doubles as "save as PDF" — the UI never describes this as server-generated PDF.
- Screen-only note under the card (13 px muted): `La impresión se abre en el diálogo del navegador (también puede guardarse como PDF). Copia local; no constituye receta electrónica certificada.`
- **Edit mode** (`Editar`): in place, same form as creation (pre-filled; encounter link and title editable; lines addable/removable). Save re-renders; `Editada` badge when `updatedAt` is after `createdAt` (same rule as encounters). No delete for documents (no permanent-delete rule).
- `404`: `Receta no encontrada` / `Informe no encontrado` + standard copy.

### 7.5 Cross-cutting additions

**New screen states** (append to §5.5):

| Screen | Loading | Empty | Not found | Validation error | API error | Success feedback |
|---|---|---|---|---|---|---|
| Calendar | 3 skeleton rows | (none — grid is the calm state) | 404 `Fecha no válida` | — | Banner + Reintentar | Re-render |
| Patient citas | Skeleton rows | `Sin citas` + Nueva cita | 404 | — | Banner | Re-render |
| New appointment | — | — | 404 (patient gone) | Inline per field | Banner, values kept | Navigate to detail |
| Appointment detail | Skeletons | — | 404 `Cita no encontrada` | Inline (incl. complete panel) | Banner | Re-render + status badge |
| New receta / informe | — | — | 404 (patient gone) | Inline per field/row | Banner, values kept | Navigate to detail |
| Receta / informe detail | Skeletons | — | 404 per kind | Inline per field/row | Banner, values kept | Re-render (+ Editada badge) |

**New components** (append to §5.3):

| Component | Rules |
|---|---|
| **Time grid (day)** | Hour rows 48 px with 1 px `--border` lines; gutter 56 px, 12 px muted labels; appointment blocks positioned by start, height by duration (min 24 px); status fills per 7.1.1; overlap = side-by-side width split, later blocks get `--warning` left border. |
| **Time chip (week/month)** | 22 px height, 11 px text, `--radius-sm`, status styling per 7.1.1; max 3 per cell/day + `+N más` ghost chip → day view. |
| **Status badges** | `Programada` (info-bg/primary), `Completada` (white fill, `--success` text + 1 px `--success` border), `Cancelada` (white fill, `--text-faint` text + `--border` border), `Ordenada` (info-bg/primary), `Completada` study (same as appointment `Completada`), `Revisada` (white fill, `--success` border, success text). Type badge = info-bg/primary. Kind badges `Receta`/`Informe` = white fill + `--border`. |
| **Repeatable row group** | Rows with a trailing `Quitar` ghost button (13 px, hidden at one row); `Agregar …` ghost button below the group; used by studies and medication lines. |
| **Paper card (print)** | White, 1 px `--border`, padding `--s-5` on screen; borderless full-width at print; `break-inside: avoid` on content blocks. |

**404 copy additions:** `Cita no encontrada`, `Receta no encontrada`, `Informe no encontrado`, `Fecha no válida` — same page pattern (3.8).

**Demo data additions (U-14, detailed in DEMO_DATA.md at implementation):**
- Fixed past appointments on existing demo patients (completed with linked encounters, one cancelled) using fixed ISO timestamps like the encounters — deterministic, never recomputed.
- A small number (≈4–6) of *upcoming* appointments anchored to the **first seed run's date** (e.g. seed date +2 d, +5 d, +9 d; stored once, never moved on re-seed) so the demo calendar always shows a live schedule. Documented as the deliberate exception to fixed-timestamp seeding, with the rationale that a calendar demo whose dates all predate "today" demonstrates nothing.
- Two demo study requests (one `Ordenada` — drives the overview pending card; one `Revisada` with a short result note) attached to existing demo encounters.
- One demo prescription (2 lines + general instructions) and one demo report on a demo patient.
- All new fixture records follow DEMO_DATA rules: `DEMO`-marked, fictional, idempotent create-if-missing, never overwrite user edits.

### 7.6 Expansion decisions recorded (U-09…U-17)

| # | Decision | Why |
|---|---|---|
| U-09 | Calendar is one route (`/calendar`) with `vista`/`fecha` query params, rendered with a CSS grid | URL-driven state (existing rule); no calendar/date library (mission constraint); views share one component surface |
| U-10 | Day view window fixed 06:00–22:00; out-of-window appointments listed separately | A single-doctor practice day; keeps the grid honest instead of silently clipping; zero configuration surface |
| U-11 | Overlaps are accepted by the server, visible everywhere (split blocks, warning border, form notice); never auto-rejected or moved | The mission requires an explicit documented rule, not silent behavior; one doctor can see a clash and decide |
| U-12 | `type` on both appointment (planned) and encounter (actual); same fixed list; encounter default `consulta`; timeline shows the type badge only when not `consulta` | The two meanings differ in reality; defaulting keeps ordinary consultations calm; past records migrate without meaning change |
| U-13 | Dedicated surgical/procedure tracking deferred; open question Q-NX-01 recorded | plan free-text + appointment/encounter types already carry the basic flow; the mission says to leave it out when unclear rather than invent clinical behavior |
| U-14 | Demo appointments: fixed past + first-seed-anchored upcoming | Deterministic where it matters (history); live where the demo lives (the calendar); re-seed never moves them |
| U-15 | Studies: closed category list + free-text description; created with the encounter; after creation only status + result note change; no edit, no delete | Matches the mission's lifecycle; immutable order-of-record keeps the clinical history honest; no permanent-delete rule |
| U-16 | Printing = WYSIWYG paper card + browser print CSS; printed page carries the demo marker; no PDF library, no invented doctor identity, no legal claims | Mission constraint + DEMO_DATA rule; the screen shows exactly what prints |
| U-17 | Overview cards: `Citas` and `Recetas e informes` always present (they host creation actions); `Estudios pendientes` only when non-empty (encounter-scoped, no overview action) | Entry points stay one click away; a pending-studies card with nothing pending would be pure noise |

---

*Reviewed against: `WORKFLOWS.md` (all sections, §11 story map), `PRODUCT.md` P0 stories, `DATA_MODEL.md`, `API_CONTRACT.md` (as implemented in O-001: 40/40 API tests), `DEMO_DATA.md` (7 patients / 9 encounters), `ARCHITECTURE.md` (SSR + typed client). §7 (NX-001…NX-004 expansion) was authorized in D-023; Q-NX-01/Q-NX-02 and the explicit implementation discrepancies in §7.0.1 remain open. Historical O-001 test counts here refer to their original review date, not NX-003 verification.*
