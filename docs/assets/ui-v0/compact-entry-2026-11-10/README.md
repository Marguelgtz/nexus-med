# Compact clinical entry — 2026-11-10

Twenty-four production Chromium captures cover overview background, three consultation stages, contextual study requests, follow-up scheduling and compact prescription/medication entry at 1440×900, 1024×768 and 390×844. Dialogs use viewport captures; other screens use full-page captures. All were inspected in contact sheets; key mobile dialogs and the rendered print page were inspected individually.

Screen captures use untouched separately migrated/seeded exact fixtures (7/9/9/2/2) on loopback 3107/4107. Entered form text is explicitly synthetic; no capture write occurred. The print raster comes from a separate mutation-test database, proving that existing line instructions still print after a dose edit. No user database was reset.

| Image | State | Dimensions |
|---|---|---|
| [overview-desktop.png](overview-desktop.png) | overview | 1440×1046 |
| [consultation-stage-1-desktop.png](consultation-stage-1-desktop.png) | consultation-stage-1 | 1440×1034 |
| [consultation-stage-2-desktop.png](consultation-stage-2-desktop.png) | consultation-stage-2 | 1440×900 |
| [study-request-dialog-desktop.png](study-request-dialog-desktop.png) | study-request-dialog | 1440×900 |
| [consultation-stage-3-desktop.png](consultation-stage-3-desktop.png) | consultation-stage-3 | 1440×1056 |
| [follow-up-dialog-desktop.png](follow-up-dialog-desktop.png) | follow-up-dialog | 1440×900 |
| [prescription-summary-desktop.png](prescription-summary-desktop.png) | prescription-summary | 1440×918 |
| [medication-dialog-desktop.png](medication-dialog-desktop.png) | medication-dialog | 1440×900 |
| [overview-tablet.png](overview-tablet.png) | overview | 1024×1046 |
| [consultation-stage-1-tablet.png](consultation-stage-1-tablet.png) | consultation-stage-1 | 1024×1094 |
| [consultation-stage-2-tablet.png](consultation-stage-2-tablet.png) | consultation-stage-2 | 1024×931 |
| [study-request-dialog-tablet.png](study-request-dialog-tablet.png) | study-request-dialog | 1024×768 |
| [consultation-stage-3-tablet.png](consultation-stage-3-tablet.png) | consultation-stage-3 | 1024×1079 |
| [follow-up-dialog-tablet.png](follow-up-dialog-tablet.png) | follow-up-dialog | 1024×768 |
| [prescription-summary-tablet.png](prescription-summary-tablet.png) | prescription-summary | 1024×918 |
| [medication-dialog-tablet.png](medication-dialog-tablet.png) | medication-dialog | 1024×768 |
| [overview-mobile.png](overview-mobile.png) | overview | 390×1449 |
| [consultation-stage-1-mobile.png](consultation-stage-1-mobile.png) | consultation-stage-1 | 390×1390 |
| [consultation-stage-2-mobile.png](consultation-stage-2-mobile.png) | consultation-stage-2 | 390×1156 |
| [study-request-dialog-mobile.png](study-request-dialog-mobile.png) | study-request-dialog | 390×844 |
| [consultation-stage-3-mobile.png](consultation-stage-3-mobile.png) | consultation-stage-3 | 390×1422 |
| [follow-up-dialog-mobile.png](follow-up-dialog-mobile.png) | follow-up-dialog | 390×844 |
| [prescription-summary-mobile.png](prescription-summary-mobile.png) | prescription-summary | 390×1180 |
| [medication-dialog-mobile.png](medication-dialog-mobile.png) | medication-dialog | 390×844 |
| [prescription-print.png](prescription-print.png) | rendered-print | 990×1400 |

`inventory.json` contains URL, viewport, dimensions and SHA-256 for all 25 PNGs. Mutation checks separately verified atomic note/study saving, independent follow-up, contextual two-medication prescription, legacy instruction preservation, background saving without rewriting notes, simulated save failures and print isolation. Repeat seed preserved the complete mutated database dump digest.

Limits: Chromium only; no screen-reader, Safari/Firefox, physician task study, physical printer or final branding approval. See TESTING.md for actual incremental checks and resolved failures.
