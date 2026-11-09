# O-007 screenshot evidence

Baseline: `30eafd1`. Captured 2026-11-09 in Chromium, `es-MX`, `America/Mexico_City`, using the exact synthetic fixture in an isolated database. See [the audit](../../UI_AUDIT.md) for harness, scope and limitations.

87 captures: full-page unless a filename/state says `focus`. Image dimensions can exceed the reference viewport because of document overflow or page length. All captures were visually inspected with overview sheets and focused originals; the audit distinguishes source-backed defects, inconsistencies, preferences, and usability hypotheses. Native Next.js development indicators are not product UI.

The busy/error captures use a controlled delayed HTTP 500 without persistence. CSS text scaling is exploratory, not browser zoom. Upcoming appointments are anchored to this isolated first seed on November 9; the fixed date in each calendar URL is intentional.

| Screenshot | Reference viewport | State | Route | PNG dimensions |
|---|---|---|---|---|
| [appointment-desktop.png](appointment-desktop.png) | 1440 × 900 | default | `/patients/demo-patient-001/citas/demo-appt-up-003` | 1440 × 900 |
| [appointment-mobile-handoff.png](appointment-mobile-handoff.png) | 390 × 844 | handoff | `/patients/demo-patient-001/consultas/nueva?appointmentId=demo-appt-up-003` | 390 × 2697 |
| [appointment-mobile.png](appointment-mobile.png) | 390 × 844 | default | `/patients/demo-patient-001/citas/demo-appt-up-003` | 390 × 844 |
| [appointment-tablet.png](appointment-tablet.png) | 1024 × 768 | default | `/patients/demo-patient-001/citas/demo-appt-up-003` | 1024 × 768 |
| [appointmentform-desktop.png](appointmentform-desktop.png) | 1440 × 900 | default | `/patients/demo-patient-001/citas/nueva` | 1440 × 900 |
| [appointmentform-mobile.png](appointmentform-mobile.png) | 390 × 844 | default | `/patients/demo-patient-001/citas/nueva` | 390 × 844 |
| [appointmentform-tablet.png](appointmentform-tablet.png) | 1024 × 768 | default | `/patients/demo-patient-001/citas/nueva` | 1024 × 768 |
| [background-desktop.png](background-desktop.png) | 1440 × 900 | default | `/patients/demo-patient-001/antecedentes` | 1440 × 900 |
| [background-mobile.png](background-mobile.png) | 390 × 844 | default | `/patients/demo-patient-001/antecedentes` | 390 × 844 |
| [background-tablet.png](background-tablet.png) | 1024 × 768 | default | `/patients/demo-patient-001/antecedentes` | 1024 × 810 |
| [consultation-desktop-two-studies.png](consultation-desktop-two-studies.png) | 1440 × 900 | two-studies | `/patients/demo-patient-001/consultas/nueva` | 1440 × 1655 |
| [consultation-desktop.png](consultation-desktop.png) | 1440 × 900 | default | `/patients/demo-patient-001/consultas/nueva` | 1440 × 1559 |
| [consultation-mobile-context-collapsed.png](consultation-mobile-context-collapsed.png) | 390 × 844 | context-collapsed | `/patients/demo-patient-001/consultas/nueva?appointmentId=demo-appt-up-003` | 390 × 1968 |
| [consultation-mobile-two-studies.png](consultation-mobile-two-studies.png) | 390 × 844 | two-studies | `/patients/demo-patient-001/consultas/nueva` | 390 × 2751 |
| [consultation-mobile.png](consultation-mobile.png) | 390 × 844 | default | `/patients/demo-patient-001/consultas/nueva` | 390 × 2647 |
| [consultation-tablet-two-studies.png](consultation-tablet-two-studies.png) | 1024 × 768 | two-studies | `/patients/demo-patient-001/consultas/nueva` | 1024 × 1655 |
| [consultation-tablet.png](consultation-tablet.png) | 1024 × 768 | default | `/patients/demo-patient-001/consultas/nueva` | 1024 × 1559 |
| [day-desktop-populated.png](day-desktop-populated.png) | 1440 × 900 | populated | `/calendar?vista=dia&fecha=2026-11-10` | 1440 × 980 |
| [day-desktop.png](day-desktop.png) | 1440 × 900 | default | `/calendar?vista=dia&fecha=2026-11-09` | 1440 × 1004 |
| [day-mobile-populated.png](day-mobile-populated.png) | 390 × 844 | populated | `/calendar?vista=dia&fecha=2026-11-10` | 390 × 1032 |
| [day-mobile.png](day-mobile.png) | 390 × 844 | default | `/calendar?vista=dia&fecha=2026-11-09` | 390 × 1024 |
| [day-tablet-populated.png](day-tablet-populated.png) | 1024 × 768 | populated | `/calendar?vista=dia&fecha=2026-11-10` | 1024 × 980 |
| [day-tablet.png](day-tablet.png) | 1024 × 768 | default | `/calendar?vista=dia&fecha=2026-11-09` | 1024 × 1004 |
| [empty-desktop.png](empty-desktop.png) | 1440 × 900 | default | `/patients/demo-patient-003` | 1440 × 1101 |
| [empty-mobile.png](empty-mobile.png) | 390 × 844 | default | `/patients/demo-patient-003` | 390 × 1422 |
| [empty-tablet.png](empty-tablet.png) | 1024 × 768 | default | `/patients/demo-patient-003` | 1024 × 1101 |
| [month-desktop.png](month-desktop.png) | 1440 × 900 | default | `/calendar?vista=mes&fecha=2026-11-09` | 1440 × 900 |
| [month-mobile.png](month-mobile.png) | 390 × 844 | default | `/calendar?vista=mes&fecha=2026-11-09` | 390 × 854 |
| [month-tablet.png](month-tablet.png) | 1024 × 768 | default | `/calendar?vista=mes&fecha=2026-11-09` | 1024 × 834 |
| [patient-768px.png](patient-768px.png) | 768 × 900 | default | `/patients/demo-patient-001` | 953 × 1324 |
| [patient-desktop-expanded.png](patient-desktop-expanded.png) | 1440 × 900 | expanded | `/patients/demo-patient-001` | 1440 × 1372 |
| [patient-desktop-text200-text-scaling.png](patient-desktop-text200-text-scaling.png) | 1440 × 900; body text 30px | text-scaling | `/patients/demo-patient-001` | 1440 × 1423 |
| [patient-desktop.png](patient-desktop.png) | 1440 × 900 | default | `/patients/demo-patient-001` | 1440 × 1249 |
| [patient-mobile-expanded.png](patient-mobile-expanded.png) | 390 × 844 | expanded | `/patients/demo-patient-001` | 949 × 1844 |
| [patient-mobile.png](patient-mobile.png) | 390 × 844 | default | `/patients/demo-patient-001` | 949 × 1646 |
| [patient-tablet-expanded.png](patient-tablet-expanded.png) | 1024 × 768 | expanded | `/patients/demo-patient-001` | 1024 × 1372 |
| [patient-tablet.png](patient-tablet.png) | 1024 × 768 | default | `/patients/demo-patient-001` | 1024 × 1249 |
| [prescription-desktop.png](prescription-desktop.png) | 1440 × 900 | default | `/patients/demo-patient-002/recetas/demo-document-prescription-001` | 1440 × 900 |
| [prescription-mobile.png](prescription-mobile.png) | 390 × 844 | default | `/patients/demo-patient-002/recetas/demo-document-prescription-001` | 390 × 844 |
| [prescription-tablet.png](prescription-tablet.png) | 1024 × 768 | default | `/patients/demo-patient-002/recetas/demo-document-prescription-001` | 1024 × 812 |
| [registry-desktop-no-results.png](registry-desktop-no-results.png) | 1440 × 900 | no-results | `/patients?q=NO_MATCH_SYNTHETIC` | 1440 × 900 |
| [registry-desktop-search.png](registry-desktop-search.png) | 1440 × 900 | search | `/patients?q=DEMO-002` | 1440 × 900 |
| [registry-desktop.png](registry-desktop.png) | 1440 × 900 | default | `/patients` | 1440 × 900 |
| [registry-mobile-no-results.png](registry-mobile-no-results.png) | 390 × 844 | no-results | `/patients?q=NO_MATCH_SYNTHETIC` | 390 × 844 |
| [registry-mobile-search.png](registry-mobile-search.png) | 390 × 844 | search | `/patients?q=DEMO-002` | 390 × 844 |
| [registry-mobile.png](registry-mobile.png) | 390 × 844 | default | `/patients` | 390 × 844 |
| [registry-tablet-no-results.png](registry-tablet-no-results.png) | 1024 × 768 | no-results | `/patients?q=NO_MATCH_SYNTHETIC` | 1024 × 768 |
| [registry-tablet-search.png](registry-tablet-search.png) | 1024 × 768 | search | `/patients?q=DEMO-002` | 1024 × 768 |
| [registry-tablet.png](registry-tablet.png) | 1024 × 768 | default | `/patients` | 1024 × 768 |
| [report-desktop.png](report-desktop.png) | 1440 × 900 | default | `/patients/demo-patient-007/informes/demo-document-report-001` | 1440 × 900 |
| [report-mobile.png](report-mobile.png) | 390 × 844 | default | `/patients/demo-patient-007/informes/demo-document-report-001` | 390 × 844 |
| [report-tablet.png](report-tablet.png) | 1024 × 768 | default | `/patients/demo-patient-007/informes/demo-document-report-001` | 1024 × 812 |
| [saved-desktop-editing.png](saved-desktop-editing.png) | 1440 × 900 | editing | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 1440 × 1301 |
| [saved-desktop-embedded-prescription.png](saved-desktop-embedded-prescription.png) | 1440 × 900 | embedded-prescription | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 1440 × 2481 |
| [saved-desktop-embedded-report.png](saved-desktop-embedded-report.png) | 1440 × 900 | embedded-report | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 1440 × 2222 |
| [saved-desktop-linked-study.png](saved-desktop-linked-study.png) | 1440 × 900 | linked-study | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 1440 × 1902 |
| [saved-desktop.png](saved-desktop.png) | 1440 × 900 | default | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 1440 × 1626 |
| [saved-mobile-editing.png](saved-mobile-editing.png) | 390 × 844 | editing | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 390 × 2303 |
| [saved-mobile-embedded-prescription.png](saved-mobile-embedded-prescription.png) | 390 × 844 | embedded-prescription | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 390 × 4425 |
| [saved-mobile-embedded-report.png](saved-mobile-embedded-report.png) | 390 × 844 | embedded-report | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 390 × 3919 |
| [saved-mobile-linked-study.png](saved-mobile-linked-study.png) | 390 × 844 | linked-study | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 390 × 3694 |
| [saved-mobile.png](saved-mobile.png) | 390 × 844 | default | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 390 × 3363 |
| [saved-tablet-editing.png](saved-tablet-editing.png) | 1024 × 768 | editing | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 1024 × 1301 |
| [saved-tablet-embedded-prescription.png](saved-tablet-embedded-prescription.png) | 1024 × 768 | embedded-prescription | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 1024 × 2481 |
| [saved-tablet-embedded-report.png](saved-tablet-embedded-report.png) | 1024 × 768 | embedded-report | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 1024 × 2222 |
| [saved-tablet-linked-study.png](saved-tablet-linked-study.png) | 1024 × 768 | linked-study | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 1024 × 1902 |
| [saved-tablet.png](saved-tablet.png) | 1024 × 768 | default | `/patients/demo-patient-002/consultas/demo-encounter-002b` | 1024 × 1626 |
| [shell-mobile-keyboard-focus.png](shell-mobile-keyboard-focus.png) | 390 × 844 | keyboard-focus | `/patients` | 390 × 844 |
| [studies-desktop-ordering.png](studies-desktop-ordering.png) | 1440 × 900 | ordering | `/patients/demo-patient-002` | 1440 × 1987 |
| [studies-desktop-review.png](studies-desktop-review.png) | 1440 × 900 | review | `/patients/demo-patient-002` | 1440 × 1845 |
| [studies-desktop-validation.png](studies-desktop-validation.png) | 1440 × 900 | validation | `/patients/demo-patient-002` | 1440 × 2008 |
| [studies-desktop.png](studies-desktop.png) | 1440 × 900 | default | `/patients/demo-patient-002` | 1440 × 1640 |
| [studies-mobile-ordering-focus.png](studies-mobile-ordering-focus.png) | 390 × 844 | ordering-focus | `/patients/demo-patient-002` | 390 × 844 |
| [studies-mobile-ordering.png](studies-mobile-ordering.png) | 390 × 844 | ordering | `/patients/demo-patient-002` | 836 × 2877 |
| [studies-mobile-review.png](studies-mobile-review.png) | 390 × 844 | review | `/patients/demo-patient-002` | 836 × 2685 |
| [studies-mobile-save-error.png](studies-mobile-save-error.png) | 390 × 844 | save-error | `/patients/demo-patient-002` | 836 × 2961 |
| [studies-mobile-saving.png](studies-mobile-saving.png) | 390 × 844 | saving | `/patients/demo-patient-002` | 836 × 2877 |
| [studies-mobile-validation.png](studies-mobile-validation.png) | 390 × 844 | validation | `/patients/demo-patient-002` | 836 × 2898 |
| [studies-mobile.png](studies-mobile.png) | 390 × 844 | default | `/patients/demo-patient-002` | 836 × 2470 |
| [studies-tablet-ordering.png](studies-tablet-ordering.png) | 1024 × 768 | ordering | `/patients/demo-patient-002` | 1024 × 1987 |
| [studies-tablet-review.png](studies-tablet-review.png) | 1024 × 768 | review | `/patients/demo-patient-002` | 1024 × 1845 |
| [studies-tablet-validation.png](studies-tablet-validation.png) | 1024 × 768 | validation | `/patients/demo-patient-002` | 1024 × 2008 |
| [studies-tablet.png](studies-tablet.png) | 1024 × 768 | default | `/patients/demo-patient-002` | 1024 × 1640 |
| [week-768px.png](week-768px.png) | 768 × 900 | default | `/calendar?vista=semana&fecha=2026-11-09` | 798 × 900 |
| [week-desktop.png](week-desktop.png) | 1440 × 900 | default | `/calendar?vista=semana&fecha=2026-11-09` | 1440 × 900 |
| [week-mobile.png](week-mobile.png) | 390 × 844 | default | `/calendar?vista=semana&fecha=2026-11-09` | 390 × 844 |
| [week-tablet.png](week-tablet.png) | 1024 × 768 | default | `/calendar?vista=semana&fecha=2026-11-09` | 1024 × 768 |
