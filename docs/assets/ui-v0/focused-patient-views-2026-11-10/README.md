# Focused patient views — 2026-11-10

Eighteen production Chromium screenshots show six separate patient views at 1440×900, 1024×768 and 390×844 CSS-pixel viewports. The old overview anchor navigation has been replaced with focused SSR routes. Summary has demographics/pending work; consultation history, schedule, studies, documents and background each have one owning view.

Environment: production Next.js on loopback 3105, Hono on 4105, a separately migrated and seeded exact synthetic fixture DB (7 patients, 9 encounters, 9 appointments, 2 studies, 2 documents). No clinical writes were submitted and the owner DB was not reset. `inventory.json` records routes, viewports, image dimensions and SHA-256.

| Image | Route | Dimensions |
|---|---|---|
| [summary-desktop.png](summary-desktop.png) | `/patients/demo-patient-002` | 1440×900 |
| [consultations-desktop.png](consultations-desktop.png) | `/patients/demo-patient-002/consultas` | 1440×900 |
| [appointments-desktop.png](appointments-desktop.png) | `/patients/demo-patient-002/citas` | 1440×900 |
| [studies-desktop.png](studies-desktop.png) | `/patients/demo-patient-002/estudios` | 1440×900 |
| [documents-desktop.png](documents-desktop.png) | `/patients/demo-patient-002/documentos` | 1440×900 |
| [background-desktop.png](background-desktop.png) | `/patients/demo-patient-002/contexto-clinico` | 1440×900 |
| [summary-tablet.png](summary-tablet.png) | `/patients/demo-patient-002` | 1024×768 |
| [consultations-tablet.png](consultations-tablet.png) | `/patients/demo-patient-002/consultas` | 1024×768 |
| [appointments-tablet.png](appointments-tablet.png) | `/patients/demo-patient-002/citas` | 1024×768 |
| [studies-tablet.png](studies-tablet.png) | `/patients/demo-patient-002/estudios` | 1024×780 |
| [documents-tablet.png](documents-tablet.png) | `/patients/demo-patient-002/documentos` | 1024×768 |
| [background-tablet.png](background-tablet.png) | `/patients/demo-patient-002/contexto-clinico` | 1024×768 |
| [summary-mobile.png](summary-mobile.png) | `/patients/demo-patient-002` | 390×1085 |
| [consultations-mobile.png](consultations-mobile.png) | `/patients/demo-patient-002/consultas` | 390×844 |
| [appointments-mobile.png](appointments-mobile.png) | `/patients/demo-patient-002/citas` | 390×939 |
| [studies-mobile.png](studies-mobile.png) | `/patients/demo-patient-002/estudios` | 390×1231 |
| [documents-mobile.png](documents-mobile.png) | `/patients/demo-patient-002/documentos` | 390×844 |
| [background-mobile.png](background-mobile.png) | `/patients/demo-patient-002/contexto-clinico` | 390×844 |

All images were inspected through contact sheets; full-resolution desktop summary and mobile appointments/consultations/background were inspected individually. The additional 320px geometry pass has no screenshot. Browser tests cover 24 view/viewport combinations, current navigation, exclusive content, legacy hashes, browser history, linked-note handoff, empty records, 404 behavior cancel/accept navigation from a dirty study form, keyboard/skip-link focus and workflow-specific form cancellation. No screen-reader, Safari/Firefox or physician usability validation is claimed. This is the next UX iteration, not final branding approval.
