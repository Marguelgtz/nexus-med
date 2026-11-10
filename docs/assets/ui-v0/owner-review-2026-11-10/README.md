# O-007 owner-review screenshots — 2026-11-10

Fourteen Chromium captures document the owner-requested workflow and presentation refinements. Page screenshots use desktop 1440 × 900, tablet 1024 × 768, or mobile 390 × 844 CSS-pixel viewports. Focused form images are crops. All patient content is from the repository's synthetic fixture; the registry is filtered to the synthetic identifier `NM-002`. No clinical write was submitted during capture.

| Image | Viewport / state | What it records | Dimensions | SHA-256 |
|---|---|---|---:|---|
| [registry-desktop-filtered.png](registry-desktop-filtered.png) | Desktop, filtered to `NM-002` | Registry-level `Nueva consulta` action; label remains on one line | 1440 × 900 | `44c1d0f505c2218add801b493bc731889d54cfb3cbec8d6a1b23f9f4bb1654bf` |
| [registry-tablet-filtered.png](registry-tablet-filtered.png) | Tablet, filtered to `NM-002` | Registry action at intermediate width | 1024 × 768 | `498b306c72905ecaee6ea9791562de885ada031837a77b1dd10940bee6d89640` |
| [registry-mobile-filtered.png](registry-mobile-filtered.png) | Mobile, filtered to `NM-002` | Registry action and stacked patient metadata | 390 × 844 | `fa2dfab26725d90206aa210e953a7c712695b72d6b9e70ec94784da07d89fc6e` |
| [patient-desktop.png](patient-desktop.png) | Desktop | Patient workflow side navigation, immediate consultation entry, and all four background fields | 1440 × 900 | `0f1fec51a156de542316f145261185f08959fee35e3050c2d0ee95db697ff811` |
| [patient-tablet.png](patient-tablet.png) | Tablet | Side navigation, summary actions, and two-by-two background grid | 1024 × 768 | `b5071790defa9cff09e6b04b5086a58c1d79dbba356912b4d2abaceb0d9c3ae2` |
| [patient-mobile.png](patient-mobile.png) | Mobile | Wrapped patient navigation, direct actions, and responsive background grid | 390 × 844 | `7c34933443fc039cb099393197998afae3c0298b15297a66da48504a7ff11e2e` |
| [clinical-context-desktop.png](clinical-context-desktop.png) | Desktop | Dedicated clinical-context page, grouped background, and recent encounters | 1440 × 900 | `27f9bef9bbdb4fcb32138786b3a850588c03ad403c3874bcf1d7378a434dc48b` |
| [clinical-context-mobile.png](clinical-context-mobile.png) | Mobile, full page | Context, recent encounters, pending study section, and appointment entry | 390 × 1612 | `aa669a4f7e7e937ae2cdc5c7891889d2c1a9b493426998c8a9c632f00a6e180e` |
| [calendar-month-mobile.png](calendar-month-mobile.png) | Mobile, selected day | Compact seven-column month and selected-day agenda below it | 390 × 844 | `7023c1fe9579208100e52d70a2f71ed09a85c986fe0f92c798f9306d7a6c965a` |
| [encounter-desktop.png](encounter-desktop.png) | Desktop | Study statuses and `Acciones de esta consulta` beside the clinical note | 1440 × 900 | `e9fa202b1840cb535e4ee04cb2f161ab7f3ae40b60ea01b1fbbc3f29b6b8b3ea` |
| [encounter-mobile.png](encounter-mobile.png) | Mobile, full page | Context summary, consultation actions, preserved study states, and individually editable fields | 390 × 2929 | `18f70b3089d1ea0a8e5b90b34c2aa879e0238f4eb3e87498574debd38a10bf25` |
| [encounter-field-edit.png](encounter-field-edit.png) | Focused consultation edit | One labeled clinical field with explicit save and cancel | 332 × 121 | `b70cf44bb95a796c06d51cff5de208219ca920a1753023727af137e99118953f` |
| [study-request-action-desktop.png](study-request-action-desktop.png) | `Otro` form opened from consultation actions | Stacked full-width fields in the narrow desktop context column; association remains visible | 404 × 580 | `4332881f0d43aa2d796f7f5924586373c32de8981a58d5105a3154735c4ccde0` |
| [study-request-action-mobile.png](study-request-action-mobile.png) | `Otro` form opened from consultation actions | Single-level request form with required name and optional detail | 366 × 580 | `c10c892e039278f841bfaa31971f577a5942b785154928c3ce5ccf1c278b2a78` |

At the measured page sizes, `document.documentElement.scrollWidth` matched the viewport width at desktop, tablet and mobile. The full-page context image is taller than the viewport by design. These captures are visual evidence, not physician usability, screen-reader or final brand approval.
