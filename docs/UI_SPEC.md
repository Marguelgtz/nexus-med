# UI Specification — Medical Platform MVP

**Status:** O-002 design deliverable (2026-11-07); implementation-ready, reviewed against O-001 verified API capabilities and all P0 stories.  
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
│  Top bar (all screens):  [Nexus Med]  Pacientes  ···  │
│  Demo banner: MODO DEMOSTRACIÓN — DATOS FICTICIOS     │
└───────────────────────────────────────────────────────┘

/patients                        Registro de pacientes (list + search + filter)
/patients/new                    Nuevo paciente (create form)
/patients/[id]                   Resumen del paciente (identity, background, timeline, actions)
/patients/[id]/editar            Editar datos del paciente (demographics form)
/patients/[id]/antecedentes      Editar antecedentes médicos (background form)
/patients/[id]/consultas/nueva   Nueva consulta (consultation form)
/patients/[id]/consultas/[eid]   Consulta (detail; explicit edit mode)
/not-found                       404 page (unknown id, unknown route)
```

Navigation rules:

- The only primary nav item is **Pacientes** — the registry is the home working screen. Everything else is reached through contextual actions on the registry row or the patient overview.
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
   - One entry per encounter, newest first: line 1 = `12 de marzo de 2025, 10:30` + `Motivo: …` (reason, truncated to one line, or `Sin motivo` muted if null); line 2 (muted) = `Actualizada 14 de marzo de 2025` only when `updatedAt` differs from `createdAt` (i.e., the note was edited after its first save — a backdated consultation entered later is never mislabeled; signals continuity, never silently).
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

- Header: occurrence datetime (full form, e.g. `12 de marzo de 2025, 10:30`) + `Editada` badge when `updatedAt` is after `createdAt` (shows the edit timestamp: `Editada el 14 de marzo de 2025 a las 16:05`).
- Sections in canonical order (3.6), each: label (muted small caps) + verbatim text; null/empty sections render `No registrado` (italic, muted) — the full note is readable, not a form.
- Actions: `Editar consulta` (secondary) toggles **edit mode** in place (same field layout as 3.6, pre-filled; `Guardar cambios` / `Cancelar edición`). Save is explicit; success re-renders the detail (new `updatedAt` badge appears if the time differs). Editing never reassigns the patient (API-enforced) and never reorders the timeline except via `occurredAt`.
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

*Reviewed against: `WORKFLOWS.md` (all sections, §11 story map), `PRODUCT.md` P0 stories, `DATA_MODEL.md`, `API_CONTRACT.md` (as implemented in O-001: 36/36 tests), `DEMO_DATA.md` (7 patients / 9 encounters), `ARCHITECTURE.md` (SSR + typed client).*
