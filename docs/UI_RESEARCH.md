# O-007 — UI research

**Date:** 2026-11-09. **Status:** research handoff, not an approved design or implementation specification. Baseline: O-006 `30eafd1` (PR #7 including follow-up fixes). Read with [UI_AUDIT.md](UI_AUDIT.md). No Figma access, new palette, mockups, wireframes, design system, or application changes.

## Method and evidence boundary

Consulted primary public sources and rendered reference pages in Chromium. GOV.UK's summary-list example and FullCalendar's live month demonstration were visually inspected. Carbon's documentation and Bahmni's screenshots landing page were rendered; the latter embeds a December 2015 presentation and is historical illustration, not evidence of current product behavior. OpenMRS and NHS observations below come from their official documentation; no authenticated clinical product was used. Public references are comparisons, not usability validation for a Mexican surgical practice.

## Relevant references

| Reference and evidence type | What it demonstrates | Relevance to Nexus Med | Limits / tradeoffs |
|---|---|---|---|
| [OpenMRS O3 workspaces](https://o3-docs.openmrs.org/en-US/docs/workspaces/) — official behavior documentation | Desktop entry tasks use side windows; tablet/phone use overlays. Groups retain related tasks in a patient-chart context. | Supports evaluating whether clinical context and the active entry task remain understandable as space shrinks. O-006 already preserves patient context; presentation quality can be assessed independently. | Not directly tested in a running OpenMRS chart. Its modular hospital framework and overlay model are not selected for this MVP. |
| [Bahmni clinical services](https://www.bahmni.org/clinical-services/) and [screenshots](https://www.bahmni.org/screenshots/) — product description and historical presentation | Distinguishes patient-wide summaries from visit-specific documentation and printable views. | Useful distinction between ongoing safety context, encounter text, and a paper document. | Large hospital scope; historical presentation is dated. No inference about current responsive behavior, task speed, or visual superiority. |
| [Carbon data table](https://www.carbondesignsystem.com/building-blocks/core/components/data-table/guidelines) — official component guidance, rendered documentation | Aligns comparable fields into rows/columns and separates the toolbar's search, filters, and actions from data. | Exposes the registry's weak metadata alignment and the difference between meaningful density and empty horizontal space. | Generic enterprise component, not a clinical registry. Does not establish a need for table dependencies, sorting, pagination, bulk actions, or an IBM visual style. |
| [GOV.UK summary list](https://design-system.service.gov.uk/components/summary-list/) — rendered coded example | Clear label/value associations, aligned actions, and readable multiline values. | Useful comparison for demographic data, safety summaries, and long background text. Hierarchy works without numerous nested surfaces. | Citizen-service review patterns differ from repeated clinical entry; brand/type sizes and page structure are not chosen for Nexus Med. |
| [NHS text input](https://service-manual.nhs.uk/design-system/components/text-input) — official component guidance | Persistent visible labels, contextual hints, field widths suited to content, and textarea use for longer answers. | Relevant to study descriptions compressed by category/removal controls and differing appointment versus clinical form treatments. | Public health services rather than clinician charting. One-question-per-page guidance is not evidence for splitting the existing consultation workflow. |
| [FullCalendar demos](https://fullcalendar.io/demos) — rendered live month demo; documented week/list views | Stable weekday-to-date alignment, bounded day cells, event summaries, overflow counts, and a distinct view/date toolbar. | Makes the Nexus monthly date displacement objectively distinguishable from an aesthetic preference. Scheduling information should remain associated with the correct day. | Demo data and a feature-rich library. No adoption, drag/drop, resource scheduling, recurrence, theme, or dependency is proposed. Mobile behavior was not systematically tested. |

## Comparative findings

- **Information density:** Carbon's row alignment and GOV.UK's label/value example provide distinct ways to make repeated information scannable. Nexus currently has a very wide registry whose identifying metadata occupies only its left edge, while its consultation sidebar wraps long reasons into many lines. Neither greater density nor more whitespace is inherently better; task testing is still needed.
- **Context beside entry:** OpenMRS documents an explicit adaptation between large and small displays. Nexus's context disclosure is already available, but opens above the entire note on narrow screens. The observed displacement is measurable; the best adaptation remains undecided.
- **Long forms and actions:** NHS guidance helps distinguish persistent labels from placeholders and field width from arbitrary card width. Nexus's explicit saving and retained values are functional strengths. A new visual treatment must not imply autosave or combine independent appointment/document saves.
- **Status and emphasis:** Information state, action emphasis, and encounter type serve different purposes. Nexus already uses text with status color; its legacy study caveat is necessary while clinical meaning remains open. Changing a shade must not silently redefine `completed` as performed or result-received.
- **Scheduling:** FullCalendar is useful as a rendered geometry comparison, not a chosen aesthetic. Nexus's month header/date geometry and week sizing require correction before visual preference can be meaningfully judged.

## Accessibility and usability evidence

[W3C contrast guidance](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html) explains the 4.5:1 threshold for ordinary text and 3:1 for large text. The audit calculates actual current foreground/background pairs: faint text and the demo banner need attention independently of whether the palette feels dated.

[W3C target-size guidance](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) uses 24 × 24 CSS px with explicit spacing and other exceptions. A 44px comfort target is not the universal WCAG AA minimum. The audit therefore treats small controls as a usability concern unless spacing and exceptions establish a specific failure.

The [Vercel Web Interface Guidelines](https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md) supplied a secondary checklist for labels, focus, semantic navigation, motion, and narrow layouts. They are not a clinical standard or a substitute for WCAG evaluation. No full accessibility certification, screen-reader study, or physician usability study was performed.

## Questions left for later design work

The desired palette character, typography refinement, density preference, card/border emphasis, calendar mobile presentation, and task-control placement require owner preference and task observation. Existing clinical semantics and explicit-save rules remain authoritative. The evidence supports repairing rendering and consistency first; it does not select a new visual direction or authorize an implementation plan.
