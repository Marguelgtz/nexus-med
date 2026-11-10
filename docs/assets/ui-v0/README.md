# UI v0 — final browser evidence

Captured 2026-11-09 against implementation `99468b3` (source unchanged by this evidence commit), compared with the historical [PR #8 audit](../../UI_AUDIT.md). **89 PNGs:** 85 route/state captures, two registry loading/error captures and two rendered print PDF pages. Every image was inspected through contact sheets; key mobile forms/history/calendars, desktop context and both print pages were inspected individually. `inventory.json` records filename, route/state, pixel dimensions and SHA-256 for integrity.

The later owner-review refinements have a 14-image set in [owner-review-2026-11-10](owner-review-2026-11-10/README.md). These follow-up screenshots do not change the 89-image historical inventory above.

Environment: Chromium, `es-MX`, `America/Mexico_City`; primary desktop 1440×900, tablet 1024×768, mobile 390×844. Additional 768px and exploratory body-text scaling captures are labelled separately. Registry state captures use 1280×720. Full-page height varies. The Next.js development indicator is tooling, not product chrome.

Isolation: copied frontend source on loopback 3102, API on 4102, newly migrated/seeded exact-fixture SQLite DB (7/9/9/2/2). Browser API forwarding handles the unchanged default-port CORS policy. No fixture writes were made during this capture run. Separate mutation checks used a different isolated DB; no owner DB was reset. Saving/error captures deliberately intercept a delayed HTTP 500; text remains in the form. Registry loading/error capture waits for the actual application banner, not Next's route announcer. Handoff capture waits for the consultation destination.

Print images are rasterized Chromium A4 PDFs of `/patients/demo-patient-002/recetas/demo-document-prescription-001` and `/patients/demo-patient-007/informes/demo-document-report-001`; shell/actions are absent and the fictional-data mark is retained. Physical printing was not tested.

Validation: 64 route/viewport geometry checks at 320/390/639/640/768/900/1024/1440px plus focused keyboard/states/print checks; no document overflow in the 81 measured main captures. Populated day captures confirm the 56px hour gutter does not overlap appointment blocks. See [TESTING.md](../../TESTING.md) for workflow checks, automated results and limits. CSS-width reflow is not native browser zoom certification. No physician usability study, screen-reader certification or final aesthetic approval is implied.

Useful comparisons: [month mobile](month-mobile.png), [week tablet](week-tablet.png), [patient mobile](patient-mobile.png), [standalone study mobile](studies-mobile-ordering.png), [two staged studies](consultation-mobile-two-studies.png), [desktop consultation](consultation-desktop.png), [populated day](day-mobile-populated.png), [print prescription](print-prescription.png).

| Image | Viewport | State | Route |
|---|---|---|---|
| [appointment-desktop.png](appointment-desktop.png) | desktop | default | `/patients/demo-patient-001/citas/demo-appt-up-003` |
| [appointment-mobile-handoff.png](appointment-mobile-handoff.png) | mobile | handoff | `/patients/demo-patient-001/consultas/nueva?appointmentId=demo-appt-up-003` |
| [appointment-mobile.png](appointment-mobile.png) | mobile | default | `/patients/demo-patient-001/citas/demo-appt-up-003` |
| [appointment-tablet.png](appointment-tablet.png) | tablet | default | `/patients/demo-patient-001/citas/demo-appt-up-003` |
| [appointmentform-desktop.png](appointmentform-desktop.png) | desktop | default | `/patients/demo-patient-001/citas/nueva` |
| [appointmentform-mobile.png](appointmentform-mobile.png) | mobile | default | `/patients/demo-patient-001/citas/nueva` |
| [appointmentform-tablet.png](appointmentform-tablet.png) | tablet | default | `/patients/demo-patient-001/citas/nueva` |
| [background-desktop.png](background-desktop.png) | desktop | default | `/patients/demo-patient-001/antecedentes` |
| [background-mobile.png](background-mobile.png) | mobile | default | `/patients/demo-patient-001/antecedentes` |
| [background-tablet.png](background-tablet.png) | tablet | default | `/patients/demo-patient-001/antecedentes` |
| [consultation-desktop-two-studies.png](consultation-desktop-two-studies.png) | desktop | two-studies | `/patients/demo-patient-001/consultas/nueva` |
| [consultation-desktop.png](consultation-desktop.png) | desktop | default | `/patients/demo-patient-001/consultas/nueva` |
| [consultation-mobile-context-expanded.png](consultation-mobile-context-expanded.png) | mobile | keyboard-expanded | `/patients/demo-patient-001/consultas/nueva` |
| [consultation-mobile-two-studies.png](consultation-mobile-two-studies.png) | mobile | two-studies | `/patients/demo-patient-001/consultas/nueva` |
| [consultation-mobile.png](consultation-mobile.png) | mobile | default | `/patients/demo-patient-001/consultas/nueva` |
| [consultation-tablet-two-studies.png](consultation-tablet-two-studies.png) | tablet | two-studies | `/patients/demo-patient-001/consultas/nueva` |
| [consultation-tablet.png](consultation-tablet.png) | tablet | default | `/patients/demo-patient-001/consultas/nueva` |
| [day-desktop-populated.png](day-desktop-populated.png) | desktop | populated | `/calendar?vista=dia&fecha=2026-11-10` |
| [day-desktop.png](day-desktop.png) | desktop | default | `/calendar?vista=dia&fecha=2026-11-09` |
| [day-mobile-populated.png](day-mobile-populated.png) | mobile | populated | `/calendar?vista=dia&fecha=2026-11-10` |
| [day-mobile.png](day-mobile.png) | mobile | default | `/calendar?vista=dia&fecha=2026-11-09` |
| [day-tablet-populated.png](day-tablet-populated.png) | tablet | populated | `/calendar?vista=dia&fecha=2026-11-10` |
| [day-tablet.png](day-tablet.png) | tablet | default | `/calendar?vista=dia&fecha=2026-11-09` |
| [empty-desktop.png](empty-desktop.png) | desktop | default | `/patients/demo-patient-003` |
| [empty-mobile.png](empty-mobile.png) | mobile | default | `/patients/demo-patient-003` |
| [empty-tablet.png](empty-tablet.png) | tablet | default | `/patients/demo-patient-003` |
| [month-desktop.png](month-desktop.png) | desktop | default | `/calendar?vista=mes&fecha=2026-11-09` |
| [month-mobile.png](month-mobile.png) | mobile | default | `/calendar?vista=mes&fecha=2026-11-09` |
| [month-tablet.png](month-tablet.png) | tablet | default | `/calendar?vista=mes&fecha=2026-11-09` |
| [patient-768px.png](patient-768px.png) | 768px | default | `/patients/demo-patient-001` |
| [patient-desktop-expanded.png](patient-desktop-expanded.png) | desktop | expanded | `/patients/demo-patient-001` |
| [patient-desktop-text200-text-scaling.png](patient-desktop-text200-text-scaling.png) | desktop-text200 | text-scaling | `/patients/demo-patient-001` |
| [patient-desktop.png](patient-desktop.png) | desktop | default | `/patients/demo-patient-001` |
| [patient-mobile-expanded.png](patient-mobile-expanded.png) | mobile | expanded | `/patients/demo-patient-001` |
| [patient-mobile.png](patient-mobile.png) | mobile | default | `/patients/demo-patient-001` |
| [patient-tablet-expanded.png](patient-tablet-expanded.png) | tablet | expanded | `/patients/demo-patient-001` |
| [patient-tablet.png](patient-tablet.png) | tablet | default | `/patients/demo-patient-001` |
| [prescription-desktop.png](prescription-desktop.png) | desktop | default | `/patients/demo-patient-002/recetas/demo-document-prescription-001` |
| [prescription-mobile.png](prescription-mobile.png) | mobile | default | `/patients/demo-patient-002/recetas/demo-document-prescription-001` |
| [prescription-tablet.png](prescription-tablet.png) | tablet | default | `/patients/demo-patient-002/recetas/demo-document-prescription-001` |
| [print-prescription.png](print-prescription.png) | A4 | rendered-browser-pdf | `see fixture document routes below` |
| [print-report.png](print-report.png) | A4 | rendered-browser-pdf | `see fixture document routes below` |
| [registry-desktop-no-results.png](registry-desktop-no-results.png) | desktop | no-results | `/patients?q=NO_MATCH_SYNTHETIC` |
| [registry-desktop-search.png](registry-desktop-search.png) | desktop | search | `/patients?q=DEMO-002` |
| [registry-desktop.png](registry-desktop.png) | desktop | default | `/patients` |
| [registry-error.png](registry-error.png) | desktop | controlled-http500 | `/patients` |
| [registry-loading.png](registry-loading.png) | desktop | delayed-loading | `/patients` |
| [registry-mobile-no-results.png](registry-mobile-no-results.png) | mobile | no-results | `/patients?q=NO_MATCH_SYNTHETIC` |
| [registry-mobile-search.png](registry-mobile-search.png) | mobile | search | `/patients?q=DEMO-002` |
| [registry-mobile.png](registry-mobile.png) | mobile | default | `/patients` |
| [registry-tablet-no-results.png](registry-tablet-no-results.png) | tablet | no-results | `/patients?q=NO_MATCH_SYNTHETIC` |
| [registry-tablet-search.png](registry-tablet-search.png) | tablet | search | `/patients?q=DEMO-002` |
| [registry-tablet.png](registry-tablet.png) | tablet | default | `/patients` |
| [report-desktop.png](report-desktop.png) | desktop | default | `/patients/demo-patient-007/informes/demo-document-report-001` |
| [report-mobile.png](report-mobile.png) | mobile | default | `/patients/demo-patient-007/informes/demo-document-report-001` |
| [report-tablet.png](report-tablet.png) | tablet | default | `/patients/demo-patient-007/informes/demo-document-report-001` |
| [saved-desktop-editing.png](saved-desktop-editing.png) | desktop | editing | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-desktop-embedded-prescription.png](saved-desktop-embedded-prescription.png) | desktop | embedded-prescription | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-desktop-embedded-report.png](saved-desktop-embedded-report.png) | desktop | embedded-report | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-desktop-linked-study.png](saved-desktop-linked-study.png) | desktop | linked-study | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-desktop.png](saved-desktop.png) | desktop | default | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-mobile-editing.png](saved-mobile-editing.png) | mobile | editing | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-mobile-embedded-prescription.png](saved-mobile-embedded-prescription.png) | mobile | embedded-prescription | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-mobile-embedded-report.png](saved-mobile-embedded-report.png) | mobile | embedded-report | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-mobile-linked-study.png](saved-mobile-linked-study.png) | mobile | linked-study | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-mobile.png](saved-mobile.png) | mobile | default | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-tablet-editing.png](saved-tablet-editing.png) | tablet | editing | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-tablet-embedded-prescription.png](saved-tablet-embedded-prescription.png) | tablet | embedded-prescription | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-tablet-embedded-report.png](saved-tablet-embedded-report.png) | tablet | embedded-report | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-tablet-linked-study.png](saved-tablet-linked-study.png) | tablet | linked-study | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [saved-tablet.png](saved-tablet.png) | tablet | default | `/patients/demo-patient-002/consultas/demo-encounter-002b` |
| [studies-desktop-ordering.png](studies-desktop-ordering.png) | desktop | ordering | `/patients/demo-patient-002` |
| [studies-desktop-review.png](studies-desktop-review.png) | desktop | review | `/patients/demo-patient-002` |
| [studies-desktop-validation.png](studies-desktop-validation.png) | desktop | validation | `/patients/demo-patient-002` |
| [studies-desktop.png](studies-desktop.png) | desktop | default | `/patients/demo-patient-002` |
| [studies-mobile-ordering.png](studies-mobile-ordering.png) | mobile | ordering | `/patients/demo-patient-002` |
| [studies-mobile-review.png](studies-mobile-review.png) | mobile | review | `/patients/demo-patient-002` |
| [studies-mobile-save-error.png](studies-mobile-save-error.png) | mobile | save-error | `/patients/demo-patient-002` |
| [studies-mobile-saving.png](studies-mobile-saving.png) | mobile | saving | `/patients/demo-patient-002` |
| [studies-mobile-validation.png](studies-mobile-validation.png) | mobile | validation | `/patients/demo-patient-002` |
| [studies-mobile.png](studies-mobile.png) | mobile | default | `/patients/demo-patient-002` |
| [studies-tablet-ordering.png](studies-tablet-ordering.png) | tablet | ordering | `/patients/demo-patient-002` |
| [studies-tablet-review.png](studies-tablet-review.png) | tablet | review | `/patients/demo-patient-002` |
| [studies-tablet-validation.png](studies-tablet-validation.png) | tablet | validation | `/patients/demo-patient-002` |
| [studies-tablet.png](studies-tablet.png) | tablet | default | `/patients/demo-patient-002` |
| [week-768px.png](week-768px.png) | 768px | default | `/calendar?vista=semana&fecha=2026-11-09` |
| [week-desktop.png](week-desktop.png) | desktop | default | `/calendar?vista=semana&fecha=2026-11-09` |
| [week-mobile.png](week-mobile.png) | mobile | default | `/calendar?vista=semana&fecha=2026-11-09` |
| [week-tablet.png](week-tablet.png) | tablet | default | `/calendar?vista=semana&fecha=2026-11-09` |
