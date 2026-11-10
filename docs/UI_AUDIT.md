# O-007 — UI visual audit

**Date:** 2026-11-09. **Baseline:** `feat/o006-clinical-workflows`, `30eafd1` (PR #7 including follow-up `9811192`). **Status at PR #8 research completion:** research handoff; no approved design, implementation specification, or UI v0 implementation.

**Assessment at PR #8 research completion:** The interface supported the intended clinical workflows, but was not yet a credible visual baseline for Figma. Calendar geometry, overflowing history, and malformed study-entry rows required attention before aesthetic refinement could be judged fairly. The existing shell and O-006 workflow structure were worth preserving.

## UI v0 implementation follow-up — 2026-11-09

The original findings/evidence below remain historical PR #8 research. The owner subsequently authorized implementation on `feat/o007-ui-foundation`. Current presentation rules are in `UI_SPEC.md` §9; final evidence/limits are in [the UI v0 inventory](assets/ui-v0/README.md) and `TESTING.md`.

| Findings | Implementation disposition |
|---|---|
| UI-01 / UI-04 / UI-05 | Month header spans seven equal tracks; week uses equal wide columns and chronological full-width mobile days. Measured alignment and reflow pass. |
| UI-02 | Timeline reasons are block-level wrapping text. Exact fixture pages fit narrow screens. |
| UI-03 / UI-08 | One shared study row with visible labels and flexible tracks; mobile fields stack at full width. |
| UI-06 | Darker faint/warning/success tokens and control borders; no opacity-based cancellation/month text. Focused contrast evidence recorded in testing. |
| UI-07 / UI-10 | Narrow context starts collapsed; context/actions use page scrolling. Embedded document launch focuses the editor and returns focus after save/cancel. |
| UI-09 / UI-11 | One control styling rule, stable button variants, wrapping actions, named previous/next navigation and current-page cues. |
| UI-12 | Registry metadata aligns in stable wide columns and stacks at narrow widths; physician scanning study remains unperformed. |
| UI-13 | Restrained spacing, radius and badge refinement is provisional. Final visual preference and branding remain for later Figma/owner review. |

This is a verified implementation disposition, not a claim of complete accessibility certification or physician validation.

## Owner review refinements — 2026-11-10

The owner then reviewed the running application and requested faster workflow entry, less crowded encounter editing, a dedicated clinical-context page, a clearer `Otro` study name, and a more current visual direction. These refinements extend the initial implementation disposition above.

| Owner observation | Follow-up disposition |
|---|---|
| Start consultation directly from a patient; show actions beside pending appointments | Registry rows and patient overview provide direct `Nueva consulta`; pending appointments expose `Ver cita` and `Iniciar consulta`. Patient workflow navigation switches focused views instead of overview anchors (D-042). |
| Put patient context on a full page and keep four important background fields together | `Antecedentes` (`/patients/[id]/contexto-clinico`) presents allergies, current medication, conditions and prior surgeries in a two-by-two grid; recent notes, studies and scheduling are confined to their owning views after the second owner review. Unknown remains distinct from negative. |
| Make consultation editing less dense and put study actions with the active consultation | Saved notes expose one labeled field at a time with explicit save/cancel. Study ordering opens from `Acciones de esta consulta`, uses stacked fields in the narrow side panel, and retains the immutable patient/encounter association statement. |
| Clarify the study request when category is `Otro` | D-041 adds required `name` and optional `description` detail. The migration preserves historical study text and all clinical associations/status fields. |
| Make timeline entries and mobile month view easier to scan | Timeline cards use short date/time, encounter type and wrapping text. Mobile month cells stay selectable and show that day's appointments in an agenda below. |
| Replace the grayscale-plus-blue feel and generic demo patient identifiers | Existing CSS tokens now use evergreen actions with warm-neutral surfaces. Synthetic fixture names and identifiers are more natural (`NM-00x`); the persistent fictional-data warning and clinical fiction markers remain for safety. Palette personality remains provisional for later Figma review. |

Follow-up screenshots captured after the desktop layout correction are catalogued in [the owner-review evidence set](assets/ui-v0/owner-review-2026-11-10/README.md). These are implementation decisions based on owner feedback, not physician-study findings.

## Compact-entry follow-up — 2026-11-10

D-043 implements reversible consultation stages, contextual study/follow-up dialogs and one-medication dialogs with compact prescription summaries. Background now belongs to Resumen; its previous read URL redirects. Existing line instructions are preserved/read-only and still print. Screenshot review repaired small study controls, wrapping close buttons and mobile action placement. The final evidence is [25 PNGs](assets/ui-v0/compact-entry-2026-11-10/README.md), including one rendered print page. These are implementation checks, not physician usability or final aesthetic approval.

## Methodology and coverage

Read project instructions, product/workflow/UI specifications, architecture, current decisions, previous UX audit/redesign, testing notes, and active execution state. Inspected routes, shared primitives, domain components, browser API configuration, and `globals.css`. The earlier `UX_AUDIT.md` concerns O-005 workflow research; this audit assesses the latest O-006 presentation without reopening accepted workflows.

The initially running checkout was behind the remote by two commits. Fetched and fast-forwarded the dedicated research branch from `99b0d7c` to `30eafd1`, then repeated the definitive inspection. No owner history was rewritten or PR merged.

Definitive screenshots use a separate detached worktree at that commit, a new SQLite database seeded from the exact fixture, and Chromium with `es-MX` / `America/Mexico_City`. The five migrations and seed produced 7 patients, 9 encounters, 9 appointments, 2 studies, and 2 documents. The existing application database was not reset or changed. Upcoming appointment dates reflect this isolated first seed; they differ from older installations by design.

The isolated runtime used web `127.0.0.1:3101` and API `127.0.0.1:4101`. Browser API requests were forwarded by the browser harness to that isolated API, with audit-origin CORS handling, because the app's CORS allowlist is fixed to port 3000. SSR used `API_INTERNAL_URL`. This is an inspection harness accommodation, not an app change or a production network test. All submitted saving/error examples were intercepted with a delayed HTTP 500; they did not persist records. Initial search captures with a harness-origin error were discarded and replaced after correcting the harness.

Reference viewports are **1440 × 900**, **1024 × 768**, and **390 × 844**. Additional **768 × 900** captures expose intermediate-width failures. Full-page images can be wider than the viewport when the document itself overflows; that excess is evidence, not an enlarged reference viewport. Default, expanded, empty, search/no-results, editing, study-order/review, linked-study, embedded-document, appointment-handoff, validation, saving, and failed-save states are inventoried separately.

Screenshots were visually reviewed using overview sheets and individual full-resolution evidence for key findings. Focused evidence supplements long pages. Geometry and current CSS color pairs were measured; no physician task study or full WCAG conformance audit is claimed. The Next.js development indicator is tooling chrome, not Nexus Med UI.

## Classification and priority

- **Verified defect:** reproducible rendering/accessibility problem.
- **Inconsistency:** equivalent elements receive different visual treatments.
- **Subjective concern:** owner preference is needed.
- **Potential usability issue:** observation is real but its task impact needs validation.

**P0:** broken layout, inaccessible functionality, clipping, or blocked workflows. **P1:** significant consistency, hierarchy, readability, spacing, or responsive concerns. **P2:** cosmetic or subjective concerns. Priorities express research triage, not an approved scope or implementation sequence.

## Prioritized finding register

| ID / priority / class | Screen, viewport, state | Actual observation and impact | Evidence / source | Reproduction, confidence, uncertainty |
|---|---|---|---|---|
| UI-01 · **P0** · Verified defect | Calendar month; all three sizes; November 2026 | All seven weekday headings occupy the first grid cell. The first date starts in the second cell, so dates are displaced and a trailing date appears on an extra row. At mobile width most columns are clipped inside the grid; the absence of document overflow does not mean the view works. Calendar-day associations cannot be read reliably. | [Desktop](assets/ui-audit/month-desktop.png), [mobile](assets/ui-audit/month-mobile.png). `calendar-views.tsx:220`, `globals.css:1522` (month parent, header, intrinsic column widths, hidden overflow). | Open `/calendar?vista=mes&fecha=2026-11-09`; compare weekday header and day 9 (Monday). **High confidence.** No scheduling data corruption is implied. |
| UI-02 · **P0** · Verified defect | Patient overview/history; 390px and 768px; default/expanded | Long fixture reasons escape their timeline cards. Patient 001 document width measures **949px at a 390px viewport** and **953px at 768px**. Patient 002 measures **836px at 390px**. Sideways reading and the large blank extension make the patient workspace visibly broken. | [Mobile](assets/ui-audit/patient-mobile.png), [768px](assets/ui-audit/patient-768px.png). `timeline.tsx:41`; `globals.css:377` applies ellipsis/overflow to an inline reason span. | Open `/patients/demo-patient-001`; scroll to Historial; compare card edge with reason text. **High confidence**, exact fixture reproduces without long-name stress data. |
| UI-03 · **P0** · Verified defect | Standalone and encounter-linked study ordering; all sizes, severe at mobile | `.sr-only` labels have no stylesheet definition and become normal grid children. A three-track row receives labels, select, label, input, then optional removal action; label/value relationships look scrambled. In patient-level mobile ordering the category select measures **26px wide**, obscuring the selected category. | [Patient ordering](assets/ui-audit/studies-mobile-ordering.png), [linked ordering](assets/ui-audit/saved-mobile-linked-study.png), [desktop](assets/ui-audit/studies-desktop-ordering.png). `study-workflow.tsx:111`; `globals.css:1240`. | Patient 002 → Estudios del paciente → Solicitar estudio; alternatively open saved encounter → Agregar estudio. **High confidence.** Native select can still open; the visible selected value is the defect. |
| UI-04 · **P1** · Verified defect | Calendar week; desktop/tablet and 768px; populated week | Nominal seven-column grid produces unequal day widths driven by appointment-chip intrinsic content. At 768px it expands to about **798px**, pushing the last column offscreen. Empty days collapse to narrow strips while populated days dominate. | [Tablet](assets/ui-audit/week-tablet.png), [768px](assets/ui-audit/week-768px.png). `globals.css:1484`, `.cal-chip` nowrap styling. | Open `/calendar?vista=semana&fecha=2026-11-09`; resize through 1024px to 768px. **High confidence.** Chip text/date association remains present in the DOM. |
| UI-05 · **P1** · Inconsistency | Calendar week; 390px; default | CSS comment promises horizontal scrolling, but inline-block day columns wrap into two columns over four rows, with slightly uneven row alignment. The presentation no longer resembles the desktop week, and patient names are heavily truncated. | [Mobile week](assets/ui-audit/week-mobile.png). `globals.css:1858`. | Open the week at 390px; compare the actual wrap with the documented horizontal-scroll intent. **High confidence** in mismatch; clinical impact and preferred mobile presentation need observation. |
| UI-06 · **P1** · Verified defect | Shared faint text and demo banner; every viewport | `#8b96a2` on white is **3.01:1**, on `#f6f7f8` **2.80:1**. These pairs render ordinary 13–14px missing-data text, timestamps, and hints. Banner `#9a6b00` on `#fdf3d7` is **4.24:1** at 13px, below the ordinary-text 4.5:1 criterion. Important qualifiers are less readable. | [Empty context](assets/ui-audit/empty-mobile.png), [banner/hints](assets/ui-audit/background-desktop.png). `globals.css:19`, `:170`, `.faint`, `.field-hint`. [W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html). | Inspect computed current foreground/background pairs and calculate WCAG relative luminance. **High confidence** for specified pairs; not a complete contrast audit. Primary blue on white is 6.52:1, so this is not a blanket palette failure. |
| UI-07 · **P1** · Potential usability issue | New/saved/edit consultation; 390px; context initially expanded | Context plus related actions appear before the active note. In a new consultation, the note form begins around **y=1200px**, below the 844px initial viewport. Explicit saving remains much farther down. Context is useful but competes with the entry task on phone-sized screens. | [New consultation](assets/ui-audit/consultation-mobile.png), [editing](assets/ui-audit/saved-mobile-editing.png). `clinical-context.tsx:66` opens details; `globals.css:1033` mobile context ordering. | Open new consultation at mobile size without collapsing context. **High confidence** in displacement; **medium confidence** in usability impact. Phone is secondary to the documented desktop use case. |
| UI-08 · **P1** · Potential usability issue | New consultation; 390px; two staged studies | Category stays 190px wide and removal takes another track; the description input is only **77px** wide. This differs from UI-03: this row has no interleaved labels, but still leaves little room to inspect entered text. | [Two studies](assets/ui-audit/consultation-mobile-two-studies.png). `consultation-form.tsx:322`; `globals.css:1240`. | Add two studies in a new consultation. **High confidence** in geometry; editing remains technically possible, so a blocked save is not claimed. |
| UI-09 · **P1** · Inconsistency | Appointment form versus clinical/document forms; all sizes | `.form-row` uses stronger borders, different sizing rules and no explicit font-family; `.field` controls use the regular border and explicit system font. Save/action wrappers and button overrides vary between screens. Equivalent entry tasks do not have a consistent visual rhythm. | [Appointment form](assets/ui-audit/appointmentform-desktop.png), [background](assets/ui-audit/background-desktop.png), [document](assets/ui-audit/saved-desktop-embedded-prescription.png). `globals.css:433`, `:643`, `:1337`. | Compare pages at the same viewport. **High confidence** in CSS divergence; native date/time appearance is browser/OS-dependent and not itself a defect. |
| UI-10 · **P1** · Potential usability issue | Consultation desktop sidebar; default and after scrolling | Sticky context has its own viewport-height scrolling area. In initial full-page captures the related-actions card can appear partly cut off inside the rail, despite being reachable by scrolling that rail. Page and rail scrolling compete. Embedded documents appear later in the main page and may be far from their launch action. | [Saved consultation](assets/ui-audit/saved-desktop.png), [embedded document](assets/ui-audit/saved-desktop-embedded-prescription.png). `globals.css:728`; `encounter-detail.tsx:88`. | Open a saved consultation and scroll the right rail independently of the page. **High confidence** in nested scrolling; not a claim that document actions are permanently inaccessible. |
| UI-11 · **P1** · Verified accessibility defect | Calendar navigation; all sizes | Previous/next links expose only `‹` and `›` as their accessible names. The intended date-navigation action is not described meaningfully. | [Calendar toolbar](assets/ui-audit/week-desktop.png), `app/calendar/page.tsx:128` and `:134`; no aria-label or hidden descriptive text. | Inspect accessible link names in the calendar toolbar. **High confidence** from DOM; no screen-reader session was conducted. |
| UI-12 · **P2** · Potential usability issue | Registry; desktop; default and search | Names, age, and ID are placed sequentially within a wide flex row, with no stable metadata columns. The short fixture names hide how varied names affect scanning; most horizontal space is empty. Rows remain large and clickable. | [Registry](assets/ui-audit/registry-desktop.png), [search](assets/ui-audit/registry-desktop-search.png). `registry.tsx:30`. | Compare identifier alignment across records; assess with varied synthetic name lengths later. **High confidence** in layout; effectiveness with realistic data is unvalidated. |
| UI-13 · **P2** · Subjective concern | Shared buttons, cards, badges, palette | Owner reports a dated feeling. Rectangular outlined controls, repeated bordered white cards, uppercase small pills, and blue action treatments are visible, but are not defects solely because of their aesthetic. Existing tokens already provide substantial consistency. | [Patient overview](assets/ui-audit/patient-desktop.png), [appointment](assets/ui-audit/appointment-desktop.png). | **Preference-dependent.** No replacement palette, radius, font, icon set, or visual direction is selected. |

## Screen-by-screen assessment

| Area | Findings and preserved behavior |
|---|---|
| Registry/search | UI-12; search, active/archive filters, whole-row navigation, and separate no-results actions are useful. Captures distinguish successful search from no results. |
| Patient overview/background/history | UI-02, UI-06, UI-09. Identity and safety context lead; unknown data is explicit; history remains chronological. Empty history and missing background remain distinct. |
| New consultation | UI-07, UI-08, UI-10. Seven note sections, explicit save, patient/visit identity, staged study entry, and a separate clinical context pane remain functional strengths. |
| Saved consultation/edit | UI-06, UI-07, UI-10. Reading and editing are visibly distinct; prior notes can be viewed within context; entered clinical text is not synthesized. |
| Standalone studies/review | UI-03, UI-06. Optional encounter association, entry time, status text, result note, validation, busy state and failure recovery are visible. A layout problem does not invalidate the standalone-study workflow. |
| Encounter studies | UI-03/UI-08. Existing association is explicit and immutable; do not remove this explanation for visual simplicity. |
| Calendar day/week/month | Day empty state renders without document overflow at reference sizes; populated-day evidence supplements it. Week UI-04/UI-05 and month UI-01 dominate readiness. Type color and date navigation are already useful cues. |
| Appointment/handoff | Compact details and explicit `Atender paciente` entry preserve patient context. Completion/linking are separate explicit actions; no evidence justifies changing that behavior. |
| Prescriptions/reports | Paper preview has a distinct purpose and demo mark. Mobile paper text wraps; embedded creation retains the encounter rather than forcing route changes. UI-09/UI-10 concern presentation, not document semantics. Actual printer output was not revalidated in O-007. |

## Accessibility observations

Verified UI-06 contrast pairs and UI-11 navigation names require attention before a credible baseline. Study labels remain programmatically associated, despite their broken visual placement (UI-03); missing label styling is not the same as missing label semantics.

A focused keyboard pass covers navigation focus and the mobile context disclosure. Native buttons/links/summary controls and labelled form fields provide useful existing semantics. The stylesheet supplies input focus styling but no unified `:focus-visible` treatment for other controls, which generally retain browser defaults; absence of custom styling does not prove absence of focus. There is no skip link in `layout.tsx`.

Small buttons and links merit task testing. `.actions .btn` specificity can retain 36px controls despite a later mobile `.btn` 44px rule. This is a consistency/comfort issue, not an automatic WCAG AA failure: the 24px minimum has spacing and other exceptions. Registry tab semantics and arrow-key behavior were not fully audited. Shimmer animation has no reduced-motion rule, but this investigation did not establish a visible long-running animation failure.

The body-text scaling screenshot is an exploratory CSS increase from 15px to 30px, **not** browser zoom and not a WCAG resize-text test. Many labels and controls retain fixed px sizes; a full 200% zoom/text-size and screen-reader pass remains an evidence gap.

## Frontend styling architecture

- **Existing foundation:** one imported global stylesheet (`globals.css`, about 1,900 lines), CSS custom properties for surfaces, colors, spacing, radii, fonts and container width, semantic class names, and small server-safe display primitives. No styling framework dependency is needed to understand the UI.
- **Global coupling:** generic `.card`, `.field`, `.actions`, `.panel`, `.notice`, and `.form-row` rules span domains. Descendant and specificity overrides affect equivalent components differently; declaration order alone does not explain their outcome. Shared primitives do not cover every form/action treatment.
- **Responsive discontinuities:** clinical workspace switches at 900/901px; other changes cluster at 639px. Seven-day calendar grids and fixed study tracks keep intrinsic size constraints between those breakpoints. The 768px findings are distinct from the required 1024px tablet capture.
- **Markup/style mismatch:** month header participates as a grid item; inline timeline reasons do not produce bounded ellipsis; `.sr-only` is referenced without a rule. These are specific mismatches, not evidence that the architecture needs replacement.
- **Token drift:** comments say all colors use tokens, but component rules include literal success backgrounds, procedure purple, shadows, and paper/print colors. Print-specific colors can be deliberate; not every literal requires abstraction. Duplicate `.document-screen-note` blocks and inline spacing styles add maintenance friction.
- **Required boundaries:** preserve Next SSR/no-store reads through Hono, browser mutation feedback, offline system fonts/assets, Spanish copy, demo visibility, and print CSS isolation. A visual task has no demonstrated need for API, Prisma, schema, or contract changes. Browser-native date/time controls vary by platform.
- **Inspection constraint:** alternative local ports need API URL/CORS accommodation; the default runtime binds to loopback. This affects audit setup rather than visual quality.

## Existing UX strengths to protect

1. Patient identity, identifier, safety context, and `No registrado` distinguish unknown information from a negative clinical finding.
2. O-006 keeps relevant context and prior-note access beside encounter work; new and saved encounters remain distinguishable.
3. Explicit save, dirty-work protection, visible saving/error feedback, and retained values must survive visual changes. Separate document/appointment saves must remain separate.
4. Standalone patient studies and same-patient encounter-linked requests both exist; immutable associations and conservative legacy status meanings are intentional.
5. Appointment handoff preserves the patient and appointment without completing a visit on entry.
6. Embedded prescriptions/reports keep the encounter accessible; paper preview and demo marking serve a different purpose from screen chrome.
7. Chronology, contextual return links, registry search/filtering, native disclosures, and the quiet two-item app navigation are useful foundations.

## Evidence gaps and unresolved questions

No physician observation, measured task-time comparison, screen-reader testing, Safari/Firefox/mobile-device testing, complete zoom/reflow audit, very-long synthetic names, dense overlapping-day appointment test, or physical print check was performed. The empty-day screenshot alone is not scheduling coverage; a separate populated-day capture is included. Busy/error screenshots are controlled network simulations, not a service outage or persistence regression. O-006 verification recorded elsewhere remains historical evidence, not a check rerun by this research mission.

Clinical Q-O006 questions remain open. Study status semantics, autosave/persistent drafts, staff roles, and procedure lifecycle are outside this visual mission. A preference for modern styling cannot authorize those changes.

## UI v0 readiness assessment

**Not ready as a coherent Figma baseline yet.**

- **Critical layout/responsiveness:** UI-01 month date displacement/clipping, UI-02 overflowing history, and UI-03 malformed study rows are the clearest blockers. Week sizing at intermediate widths also fails (UI-04).
- **Coherence/readability:** deficient contrast, inconsistent form/action treatments, narrow study text entry, and mobile context displacement deserve attention before visual polish is evaluated. Their final treatment remains undecided.
- **Preserve:** patient/safety context, chronology, standalone studies, explicit saves, appointment handoff, embedded documents, offline shell and demo marking.
- **Technical limits:** global cascade/specificity, fixed/intrinsic grid sizing, missing utility styling, native controls, and print isolation constrain later changes. Existing tokens and primitives are a usable starting point.
- **Can wait for later Figma refinement:** brand character, palette preference beyond contrast, typographic personality, iconography, radius/border/shadow polish, detailed density preferences, and a formal design system. No design solution or implementation plan is approved here.

Next mission: decide the minimal code-first UI v0 changes using this evidence, preserve clinical workflows, then use the working v0 for later Figma exploration. This research does not begin that implementation.

## Screenshot inventory

See [the evidence inventory](assets/ui-audit/README.md) for every committed filename, route, viewport and state. Images are actual browser captures of the isolated synthetic dataset; no mockups are included.
