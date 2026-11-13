# Testing and Verification


## Pilot integration evidence — 2026-11-13

Workspace typecheck and lint pass (the existing missing-Pages notice remains). The latest integrated suite passed API 163/163 and web 64/64 after the receipt, redirect, calendar-filter and appointment feedback fixes; combined local migration, recovery and restore-preparation checks passed 11/11. Vitest reports a configuration-loader deprecation warning. Local SSR checks verified doctor filters on 13 week and 90 month calendar links; the calendar and appointment feedback fixes have not yet been deployed to the pilot. Focused feedback tests cover failed, stale, conflicting and clear overlap results; the in-form retry controls have not been browser verified. The focused isolation suite passed 7/7, including cross-clinic appointment-email retry. The actual-session API journey covers two clinics, two doctors and two secretaries, clinical attribution, attachment access, conflicts and logout/relogin. A separate browser/API-session check (same synthetic doctor account) edited an encounter concurrently, triggered a partial refresh through its study action, and verified the stale save showed a conflict, retained the draft and preserved the other session’s value. Browser also completed an appointment and subsequently linked an encounter with controls disabled during refresh. Other editors now capture their initial version, but their individual refresh scenarios have not been browser tested. Receipt failure-injection tests pass 3/3 for committed-write acknowledgement failure, response lookup failure, confirmed rollback and unavailable recovery lookup. Separate migration tests passed on SQLite and local workerd D1; local recovery tests passed 7/7 including WAL and attachment bytes.

The synthetic Worker email guard test confirms a scheduled invocation does not touch the outbox even when SMTP settings exist, and the full API suite passed 164/164. Pilot API version `1d882971-9009-4632-85d7-6e620aee3894` reports the guard enabled, zero cron schedules and expected bindings. Read-only checks returned login 200, protected patient route 307 and options 200; the scheduled guard was not exercised in the deployed runtime.

After the email-history follow-up, web typecheck, lint and 64/64 web tests passed; a fresh local OpenNext production bundle and pilot web Wrangler dry-run passed (7,301.16 KiB, gzip 1,474.40 KiB). These checks do not exercise the email history failure/retry, compact expansion or fast-send race in a browser; the browser controller timed out. No deployment followed this build.

A local restored-application smoke backed up and restored separate synthetic practice/demo databases and their attachment directories to fresh temporary paths, then started the API against those copies. Unauthenticated patient access returned 401; demo sign-in, six-patient registry, exact attachment bytes and `no-store` passed. The restored session and registry remained available after API restart. A synthetic physician signed in, retained clinic membership and read an authored encounter; foreign-clinic patient, encounter list, document list and attachment requests returned 404. Sign-ins wrote to the restored copy; this is not remote recovery or a full multi-clinic test.

The pilot frontend script settings were updated to redact query strings and disable invocation logs without replacing the Worker code. Read-back confirmed both settings and unchanged web version `8342cf77-3c85-4261-a962-709f58b09ab4`; login 200, patient redirect 307 and options 200 passed. Actual emitted logs were not inspected.

A fresh isolated local startup seeded synthetic data. Browser checks covered demo sign-in/sign-out, registration, local email verification, login and new clinic setup; reception was inspected at five widths from 320 to 1440px. A subsequent synthetic physician browser journey registered a patient, scheduled an assigned doctor, started reception, saved an encounter with a study request, confirmed the author, saved a prescription, explicitly completed/linked the appointment and reloaded the prescription with its author intact. A synthetic secretary was invited through locally captured mail, verified and signed in; patient search, doctor assignment, scheduling and arrival passed in browser. Browser file upload was blocked by the Chrome extension file-URL permission (open `chrome://extensions`, choose Details for the ChatGPT extension and enable “Allow access to file URLs”); receipt review and print rendering remain outstanding. The actual-session API journey separately verifies multipart upload and physician review. These checks do not constitute a complete browser workflow or accessibility audit. OpenNext production bundling and web/API Wrangler dry-runs pass; OpenNext warns that Node middleware support is experimental. A separate local Wrangler/workerd run connected both built web and API Workers to newly migrated local D1 and R2: unauthenticated patient access redirected, demo sign-in and SSR reception returned 200, and a synthetic patient was created and retrieved through the web service binding. Both local Worker processes were stopped afterwards. Real Google OAuth, SMTP delivery, complete deployed multi-user workflows and full browser workflows remain unverified. The original remote D1 databases still report the clinic migration pending. Separate new pilot D1 databases received all five migrations; the synthetic demo seed ran twice there. After retry confirmed the pilot Worker names were unused, the isolated API and web Workers were deployed. Remote synthetic smoke passed login, protected redirect, demo session, six active patients, secure HttpOnly cookie, no-store API response and byte-for-byte fixture attachment retrieval. Read-only Wrangler checks show r2.dev disabled and no custom domains for both pilot and restore buckets. A separate synthetic D1 export was restored into a new database after reordering table creation before inserts; all rows in 21 tables matched, foreign-key checks were empty, and its single R2 object matched by SHA-256 in a new bucket. Raw import initially failed and rolled back. The new preparation script passed its local regression checks. A remote signup found that the web service binding followed an authentication redirect into the API root (404). After `9159cef`, its focused web test, typecheck, lint and OpenNext build passed; the pilot frontend was redeployed and the existing synthetic verification link returned 302. The separate-session remote run remains unverified: automatic approval review rejected it on a disputed paused-goal interpretation. This does not verify remote multi-session workflows, application cutover to restored bindings, measured RTO/RPO, SMTP or Google.

## Proposal 2 daily Citas view — 2026-11-12

`/recepcion?seccion=citas` renders a focused agenda for the selected date, with the same appointment statuses and existing start/reschedule/cancel actions as Recepción. Its Recepción/Citas tabs and previous/today/next controls preserve the selected section and date. `/calendar` is unchanged, and administrative section resolution cannot select the physician Citas view. Web tests pass **46/46**, web typecheck passes, lint exits 0 with the inherited missing-Pages notice and TopBar `window.location.assign()` warning, production build passes after a sandbox-only `--showConfig` subprocess parsing failure (the unsandboxed rerun succeeded), and `git diff --check` passes. Browser inspection confirmed the focused heading, selected date, seeded appointment and actions, then navigation back to Recepción; no records were changed. No API tests were needed because the API and persistence contract did not change.

## Proposal 2 role-aware sidebar — 2026-11-12

Secretary global navigation exposes only **Citas**, administrative **Pacientes**, and **Estudios**, all under `/secretaria`; `Pacientes` opens the existing name/identifier search and contact-card list. Physician navigation adds **Citas** at `/recepcion?seccion=citas`, highlights it on that section, and keeps Recepción and Citas links on the selected agenda date. Helper tests cover role destinations, active selection, and absence of the physician `/patients` link for secretary. Web tests pass **49/49**, typecheck passes, lint exits 0 with the existing Pages-directory notice and TopBar navigation warning, production build succeeds on the unsandboxed rerun, and `git diff --check` passes. Browser confirmed both role routes and patient search without making record changes. No API tests were needed.

## Proposal 2 patient-card expediente navigation — 2026-11-12

The main identity area of each patient card opens the expediente with a visible `Abrir expediente` cue; an active patient has a distinct `Nueva consulta` link below it, while archived cards have no consultation action. A validated `/patients` return path carries only the current search and status filter. Web tests pass **52/52**, typecheck passes, lint exits 0 with the same existing notices, production build passes on the unsandboxed rerun, and `git diff --check` passes. Browser verified the separate card destinations, opened an archived synthetic record, and returned to `/patients?q=Elena&status=archived` with the search and filter intact. No records were changed and no API tests were needed. Screenshot: ignored `.local/ui-exploration/proposal-2-rollout/patient-directory-navigation.png`.

## Proposal 2 operations styling — 2026-11-12

Applied the new surface, type, action, card, reception metric, secretary tab, and calendar treatment to the shared operations views. Week layout uses an internal horizontal scroll area at narrow widths. These are CSS-only changes; interaction and API workflow code is unchanged. Slice checks passed: web 44/44, typecheck, lint (inherited notices), build and diff check. The final integrated browser pass is recorded below.

## Proposal 2 patient directory and registration — 2026-11-12

Production registry now displays API-backed selectable patient cards and a demographics-only preview panel. Selecting a record does not change route; opening the expediente or starting a consultation are explicit actions. `Nuevo paciente` routes to the existing persisted form page and includes an internal return path preserving registry search/filter on cancel. The return path accepts only `/patients` paths. Typecheck, web 44/44, lint, production build and final browser inspection pass. No patient records were changed.

## Proposal 2 application shell — 2026-11-12

Implemented role-aware global sidebar, retained patient section navigation/session actions, and applied shared cool-white, midnight/cobalt, typography and control tokens. Web 44/44, typecheck, lint (existing missing Pages-directory and `window.location.assign` notices), production build, and `git diff --check` pass. The build needed a rerun outside the sandbox because the sandbox blocked parsing Next's TypeScript subprocess output. No API suite was needed or run. The integrated browser pass and final application-wide presentation migration are recorded below.

## Separate UI iteration 2 — 2026-11-12

The current application, proposal 1 and proposal 2 remain at `/patients`, `/exploracion-ui` and `/exploracion-ui-2`. The prior sample stylesheet is unchanged; only its comparison navigation and shared registration import changed. Both previews share the original registration rendering/validation through `preview-registration.tsx`; all shared CSS class references exist in both modules.

Final frontend typecheck, lint (inherited TopBar/Pages notices only), 44/44 existing web tests, production build and diff whitespace check pass. The first extraction check failed on an old unused form copy; it was removed before the successful final typecheck/lint/build. No new unit tests were added; API tests were not rerun because no API/domain code changed.

Chrome passed proposal navigation, previous-sample form open/required-name focus/clean cancellation, new patient selection, Escape/focus return, archived filtering, no-results/reset, required-name and invalid-email validation, retained values, temporary registration and reset to the original fixtures on reload. New directory and registration fit 320/390/768/1440px; at 320px no input extends past the viewport. Names are 18px/700; card actions 16px and 54px high; mobile navigation 16px and 56px high; new-form inputs 18px and >=56px high. Selected contrast pairs: text/white 14.54:1, secondary/white 6.27:1, white/primary 7.53:1, sidebar text/background 12.64:1, field border/white 3.40:1. These are focused checks, not accessibility certification or intended-user testing. Native dirty-confirm interaction retains the earlier tooling limitation; its shared implementation is unchanged.

A temporary local production server returned HTTP 404 for both preview routes and was stopped. No patient API writes or stored records were created by the previews. Evidence is ignored under `.local/ui-exploration/iteration-2/`; desktop/form screenshots show the separate card-and-detail composition. No deployment was performed.

## Readability follow-up — 2026-11-12 (D-050)

Only the isolated UI sample changed. Frontend typecheck, lint (the same inherited warnings) and production build pass. No new tests were added, and the existing behavior/API suites were not rerun for CSS and visible-label changes.

Chrome computed-style checks confirm 18px/700 patient names, 40px/700 desktop headings, 16px field text/labels and 52px-or-larger navigation, filters, fields and row actions. Directory reflow was measured at 320/390/768/1024/1440px; registration at 320/390/768/1440px, with no horizontal document overflow or clipped form inputs at 320px. At 768px, table and available container width both measure 695px. Screenshots found and corrected mobile filters splitting words; mobile navigation and filters now reorganize instead of shrinking text. Quick-view open/Escape close, registration open, required-name focus and clean cancellation were checked. Dirty-confirm behavior is unchanged and retains the previous tooling limitation below.

Selected WCAG relative-luminance pairs: ink `#26352f` on table `#fffefa` **12.75:1**; secondary `#46544b` on paper `#f7f5f0` **7.33:1**; white on primary `#913c28` **7.29:1**; field border `#71806f` on `#fffefa` **4.15:1**. These are focused pairs, not an exhaustive audit or accessibility certification. Snapshots are ignored in `.local/ui-exploration/readability/`. No intended-user study, screen-reader test or native 200% browser-zoom certification was performed. No application records were written.

## Alternative UI sample — 2026-11-12

`codex/ui-editorial-exploration`: web tests 44/44, web typecheck, lint and final production build pass. Lint retains the existing TopBar navigation warning and missing-Pages notice. Build required a permitted subprocess rerun after the sandbox could not parse TypeScript's configuration output. No API code changed; API integration tests were not rerun.

Chrome verified directory search by identifier, empty/reset state, archive filtering, patient quick view, Escape focus return, required-name and invalid-email messages, future-date rejection, duplicate warning, successful temporary registration and reset to exact fixtures on reload. The native date input needed a keyboard edit after browser-automation `fill` to emit its React change event; fill-only attempts are not counted as date validation passes. Directory and registration document widths fit 320/390/768/1440px. Visual inspection corrected wrapping mobile navigation labels. Screenshots are ignored local evidence in `.local/ui-exploration/`.

The sample reuses `useBeforeUnloadGuard`; native dirty-confirm acceptance/cancellation was not verified because browser control timed out while the confirmation was open. This limitation does not count as a passed check. Keyboard preview close/focus return did pass. Existing `/patients` retains its original presentation and six active fixture rows. Normal startup applied no pending migrations and both seeds created zero rows. A separate loopback production server on port 3002 returned HTTP **404** for the sample and was stopped after verification. No application data was created by the sample; its registration changes exist only in memory.

## Compact entry — final verification (2026-11-10)

Dialog/follow-up milestone: web 39/39, web typecheck and ESLint pass (existing warning only). Local Chromium at 390px checks new/saved consultation follow-up dialogs, initial field focus, Tab containment, trigger focus return, dirty Escape cancel/accept and note retention. No clinical write was submitted. A repeated native Escape close-request behavior was found and fixed by handling/preventing Escape at keydown before the guarded close.

Consultation-stage milestone: web typecheck/lint and Chromium checks pass for three stages, retained text/review, custom contextual study, zero requests during stage changes, captured atomic-save payload, simulated 500 retention, simulated cross-stage 400 focus, 320px reflow and saved-note study modal. All final test writes were intercepted. An earlier failed check exposed a Continue/Save DOM-button reuse default-submit bug; separate keyed buttons fixed it. That failed check created exactly two uniquely identified synthetic notes/requests in the local DB. They were backed up and removed with strict fixture/time/association checks; all unrelated table rows matched the pre-cleanup digest and foreign-key checks passed. Final persistence verification uses an isolated fixture DB.

Medication/background milestone: web typecheck/lint and Chromium checks pass for modal create/edit/dirty Escape/focus return, compact two-medication payload, simulated save failure retention, preserved existing per-line instructions, overview-only background, edit/cancel return and former-context redirect. All writes were intercepted. Validation alert selectors were scoped away from Next's route announcer in the harness.

Final production verification: build/TypeScript validation and lint pass; web 39/39 remains green. Separate exact-fixture production captures cover 24 state/viewport combinations without horizontal page overflow. The isolated mutation DB verifies all seven note fields plus atomic studies, a second saved-note request, unchanged original appointment state/linkage, independent follow-up, contextual two-medication prescription, existing line-instruction retention, and background persistence without rewriting notes. Simulated encounter/appointment/document save failures keep values; busy fields are disabled. Empty follow-up dates remain recoverable. Print uses visibility isolation (not display:none for all chrome); a PDF was rendered and inspected. Saved-study close restores focus after unmount. The API was restarted and existing synthetic records remained retrievable. Repeat seed preserved the full mutated DB dump digest and foreign keys (7/10/10/4/3). Full API tests were not rerun for these presentation-only changes.

Evidence: [25 final PNGs and hashes](assets/ui-v0/compact-entry-2026-11-10/README.md). Screenshot inspection corrected study control sizing, close-button wrapping and unnecessary mobile action-card height. Verification also corrected a focus-after-unmount race; the print harness was aligned with the existing visibility-based rules. Limits remain Chromium-only and no physician/screen-reader validation.

## Focused patient views — 2026-11-10

The second owner review replaces overview anchor navigation with separate SSR views (D-042). Web tests pass **39/39**; the final Next.js production build, including TypeScript validation, passes; ESLint exits 0 with its existing App Router `pages/` warning. No API/schema/domain code changed, so the historical 113-test API result is not presented as a fresh run.

Chromium checks use the production build and a separately migrated/seeded exact fixture DB (7/9/9/2/2) on loopback 3105/4105. No clinical write was submitted. Checks cover:

- Six view destinations and exclusive content/current-page navigation at 1440, 1024, 390 and 320px: **24 route/viewport checks**, all without horizontal page overflow.
- Legacy overview bookmarks (including the owner's patient-005 history bookmark), back/forward navigation, direct linked-note entry and active consultation navigation.
- Summary-to-study request entry, dirty study text preserved when navigation is cancelled, and successful navigation when discarding is confirmed.
- Keyboard Enter activates section navigation; the skip link focuses main content. Prescription, standalone consultation and appointment-origin consultation cancellation return to their owning destinations. Background edit/cancel return, six routes on an empty patient record and a genuine 404 for a missing synthetic patient also pass.

Eighteen production screenshots are inventoried and inspected in [focused patient views](assets/ui-v0/focused-patient-views-2026-11-10/README.md). Summary carries only demographics and compact pending work; the background view no longer repeats consultations/studies/scheduling. Scheduled past dates remain visible without inferred completion. The short appointment date plus time range no longer repeats the start time, and `Tipo de cita` distinguishes the planned classification from a clinical note.

Limits: Chromium only, no screen-reader or physician task study; no renewed claim of final visual/brand approval. Previous full workflow/print/API checks remain historical baseline evidence.

## O-007 owner-review follow-up — 2026-11-10

- Automated checks on the owner-review code: API **113/113** (7 files; 1 intentionally skipped), web **39/39**, workspace typecheck, and ESLint exit 0. The first API attempt hit sandbox `EPERM` when the rollback test spawned `npx`; the permitted rerun passed all 113 tests. ESLint prints the existing non-failing warning that this App Router repository has no `pages/` directory.
- The Next.js 16 production build passed after all owner-review code changes, including the patient layout and registry action sizing.
- Existing local SQLite was migrated in place, never reset. The two study rows and their patient/encounter associations, status, result notes, IDs and timestamps were retained; the field digest matched after accounting for the intentional `description` → `name` mapping. SQLite `foreign_key_check` returned zero violations. Re-seeding created zero records.
- Chromium owner-review captures show registry/patient entry points, full clinical context, the consultation actions and study-status panel, month calendar, focused field editing, and `Otro` study entry. Patient/context/calendar/encounter document widths matched the 390px mobile viewport; patient and registry layouts were also captured at 1024px and 1440px. The study form now opens from `Acciones de esta consulta`, states its patient/encounter association, and uses full-width stacked fields in the narrow consultation sidebar. `Completada` caveat and existing study status badges remain present. No clinical write was submitted during capture.
- Focused token-pair WCAG relative-luminance checks after the palette change: main text/surface **14.81:1**, muted text/surface **6.58:1**, faint text/page background **5.48:1**, primary action/surface **6.32:1**, warning/banner **6.57:1**, success/badge **6.35:1**, and control border/surface **3.16:1**. This checks core token pairs, not every composed screen state.
- The prior UI v0 suite's 64-route/viewport geometry checks, print checks and core workflow checks remain documented above as baseline evidence; this follow-up did not repeat the full 64-combination matrix. Its additional owner-review screenshots were inspected individually at desktop, tablet and mobile sizes.
- Keyboard follow-up: canceling the study form and the embedded prescription form both return focus to the `Acciones de esta consulta` heading. No save was submitted in this check.

Evidence: [owner-review screenshots and dimensions](assets/ui-v0/owner-review-2026-11-10/README.md). Limits: Chromium only for this follow-up, no physician task study, screen-reader validation, Safari/Firefox, or final branding approval. The persistent fictional-data warning and clinical fictional markers remain visible by project safety requirements.

## O-006 follow-up acceptance checks — cleared by UI v0 verification (2026-11-09)

The following are required before merging PR #7. They were added after the original 112/112 API and 32/32 web test report; do not treat those earlier results as verification of this follow-up.

1. Run `npm run test -w apps/web` and verify `study-draft.test.ts` passes (blank, typed, whitespace, category, encounter association, added row).
2. Run `npm run test -w apps/api`, `npm run typecheck`, `npm run lint`, and `npm run build -w apps/web`. Check for regressions.
3. Patient-level and saved-encounter study forms: start typing, choose Cancel and reject the confirmation; verify all input persists. Confirm closing intentionally discards. Verify the form cannot be silently closed from its header while dirty.
4. In a saved encounter, mark a study `Completada`, then `Revisada` **without leaving the page**. Verify neither saving flag sticks; requests persist and reviewed work disappears from pending lists.
5. From a saved encounter, create a prescription and a report in the **embedded** form. Verify patient and encounter association, saved-success message, cancellation with unsaved text, repeated prescription lines, and that the encounter remains visible. Check mobile viewport at 390px.
6. Regression-check the existing standalone prescription/report routes, browser print output, in-place encounter editing, follow-up return navigation, and study creation/review flows. Do not use real patient data.

**Status:** The post-change automated gate and all six follow-up groups above were executed during UI v0. See the current evidence below; the earlier inability to execute through the GitHub connector is historical. PR #7 remains unmerged.

## O-007 UI v0 verification — 2026-11-09

- Automated: API **112/112**, web **36/36**, workspace typecheck, ESLint and Next.js production build pass. Initial sandbox runs blocked Prisma/TypeScript subprocesses; permitted reruns passed. Existing lint missing-`pages/` and Vitest config-loader warnings remain non-failing.
- Runtime: separate copied frontend (same source) on loopback 3102 and API on 4102. A new SQLite DB applied all five committed migrations and seeded exactly 7 patients / 9 encounters / 9 appointments / 2 studies / 2 documents. Browser writes used a different isolated verification DB. Re-seeding that DB created zero records; a full SQL-dump digest was unchanged, preserving edited fixtures and new synthetic records. The existing owner DB was untouched.
- Browser mutations across reruns: patient required-name validation/create, demographics update, medical-background update, archive with retained history; consultation with staged study save/reload, dirty navigation cancellation, in-place note edit/reload; patient/encounter study creation and cancel/navigation protection; consecutive completed→reviewed saves without leaving the page; both embedded document kinds with same-patient encounter association, repeated medication rows, cancellation protection, explicit save/status; standalone prescription/report create/edit/reload; appointment create/edit/cancel, follow-up return, appointment entry and explicit completion/link with duration. Harness selectors and navigation/hydration waits were corrected before recording passes; failed harness runs are not counted as successful whole-suite runs.
- Responsive: 64 route/viewport combinations at 1440, 1024, 900, 768, 640, 639, 390 and 320 CSS px. No document-level overflow. Month first/seventh cells align and the eighth starts the next row; week tracks equal above 639px and form seven separate full-width rows below it. 640px at half-height models a 1280px viewport at 200% zoom; 320px covers narrow reflow. Body-text scaling is exploratory only, not native zoom certification.
- Keyboard/accessibility: skip link focuses main; mobile context opens with Space and closes with Enter; repeated study controls have visible accessible labels; removal is named by row; focus outlines visible; navigation/filter state conveyed programmatically. Busy states, inline validation, loading skeleton, empty results, failure alerts and preserved values inspected. No screen-reader or full WCAG conformance claim.
- Contrast (WCAG relative luminance): faint `#626f7c` is **5.14:1** on white, **4.79:1** on page background and **4.54:1** on hover surface; demo text `#805800` on `#fdf3d7` is **5.73:1**; control border `#8493a2` on white is **3.15:1**. Success `#186d3b` on `#e4f3ea` is **5.57:1**, corrected from the earlier 4.44:1 pair. This is a focused semantic-pair check, not an exhaustive rendered color audit.
- Print: Chromium generated both fixture document PDFs; text and rendered pages were inspected. Paper contains authored content and the fictional-data marker, with no shell/actions/screen-only copy. No physical printer test.
- Evidence: [final screenshot inventory](assets/ui-v0/README.md), compared with PR #8's [original audit](UI_AUDIT.md). All captures are synthetic. Saving/error screenshots use controlled delayed HTTP 500 without writes. Alternative-port browser API forwarding compensates for the unchanged port-3000 CORS allowlist; this does not validate an alternate-port deployment.

Limits: Chromium only, no Safari/Firefox or physical tablet, no physician task study, no final branding approval. Figma work has not started. Browser harnesses and DBs remain in ignored `.local/ui-v0/`; the committed screenshots/inventory are review evidence, not a newly installed browser-test framework.

## Current verification setup

Original integrated O-006 verification (2026-11-09, before the post-review gate above): API 112/112; web 32/32; workspace TypeScript typecheck; ESLint; production build; fresh and repeated local startup; and headless Chrome checks of the primary O-006 journeys. A seeded temporary SQLite database preserved both existing study rows, including patient/encounter associations, statuses, result notes, IDs, and timestamps through the table rebuild; foreign-key and index checks passed. The regular local database then applied the new migration and seed created no records; `/health` and `/patients` returned 200. PR #7 is open on `feat/o006-clinical-workflows`, stacked on PR #6.

| Command | Scope |
|---|---|
| `npm run test -w apps/api` | 112 integration tests, including standalone and linked study requests, same-patient validation, study creation/filtering/status transitions, patients, encounters, appointments, documents, seed preservation and transaction behavior. Vitest applies the real committed migrations to isolated SQLite databases under `.local/test/`. |
| `npm run test -w apps/web` | 36 presentation/helper tests (vitest, node): es-MX date formatting, age, `wasEdited`, default encounter-type badge visibility, calendar date math, appointment overlap handling, and calendar layout helpers, and study-draft detection. No app boot or database needed. |
| `npm run typecheck` | `tsc --noEmit` across all workspaces (contracts, api, web). |
| `npm run lint` | ESLint 9 flat config (`eslint.config.mjs`) with `eslint-config-next` 16 (flat-native): exit 0; emits a warning because the App Router repo has no `pages/` directory. Generated artifacts and `.local/` are ignored. |
| `npm run build -w apps/web` | Next.js 16 production build. |
| `npm run dev` | One-command runtime; O-006 verified on an isolated database through migration, exact synthetic seed, repeat startup with zero changes, API `/health`, SSR `/patients`, and browser journeys. |

Verified API coverage (112 passing tests):

- Health response.
- Patient create/list/search (case-insensitive name and identifier)/read/update demographics/update medical background/archive (non-destructive, idempotent); default list excludes archived; `?q=` empty means no filter.
- Encounter create (for existing patient)/read/update; patient association cannot be reassigned via update; unknown patient/encounter IDs return `404`.
- Encounter type (D-024): omitted type defaults to `consulta`; explicit type persists and is exposed in the timeline; invalid type rejected with a field error; type can be changed via `PATCH`.
- Appointments (NX-001): create/list (range filter)/get/update-reschedule/complete (actual duration + optional same-patient encounter link)/cancel; one-directional status transitions enforced; overlap detection in list responses; unknown patient/appointment IDs return `404`; duration 5–480 min validation.
- Study requests (NX-003/O-006): nested atomic creation during encounter creation; atomic addition through the existing encounter endpoint; patient-level creation with no encounter or an optional same-patient encounter; cross-patient association rejection; patient and encounter listing with nullable encounter DTOs; repeated `status` filters; invalid/empty inputs and unknown IDs; unchanged `ordered → completed/reviewed` and `completed → reviewed` transitions, result-note limits, repeated/backward transition conflicts, and persistence.
- Printable documents (NX-004): prescription/report creation, patient and same-patient encounter association, detail/list retrieval, input limits, immutable patient/kind, atomic prescription-line replacement, persistence, and kind-specific UI not-found behavior.
- Timeline ordering by `occurredAt` descending with deterministic tie-break.
- Validation: missing required fields, unknown fields (per-field `fieldErrors`), bad date formats; `400` with the contract envelope.
- Seed: exact fixture IDs/counts (7 patients, 6 active, 1 archived; 9 encounters; 9 appointments — 4 fixed past, 5 first-seed-anchored upcoming; 2 studies; 2 documents and 2 prescription lines), idempotency (second run creates 0), preserved edits to demo documents/lines and user-created records, `demo-patient-003` has no encounters, and atomicity — a mid-run foreign-key violation rolls back the entire seed (no partial records).
- Upcoming-appointment anchor: seeded future appointments sit at their expected `America/Monterrey` wall times and do not move on re-seed.
- Transactions: representative multi-write operation rolls back atomically through the local adapter.
- `demo-patient-004` remains archived across seed runs.

Browser verification covered O-003 and all O-005 slices: calendar and appointment create/edit/cancel/reprogram/complete/link; encounter type creation/edit/detail/timeline; study creation/status transitions/failure recovery/pending-card visibility; and prescription/report create/edit/reopen, repeatable prescription lines, same-patient encounter selection, validation recovery, overview links, 404 copy, and browser printing. Printed prescription/report PDFs were inspected for page content, fictional-data marker, and absence of app controls/screen-only copy. O-006 headless Chrome checks covered standalone patient study creation/review with a doctor-authored note, consultation save with staged study, adding a study to a saved encounter, contextual prescription/report save and return with the encounter preselected, follow-up return, scheduled appointment entry and explicit completion/link, cancellation of unsaved navigation, and a 390px mobile consultation layout. The mobile context disclosure toggled closed with Space and reopened with Enter. Automated frontend coverage remains limited to presentation/helper unit tests; broad component automation and the destructive-reset confirmation path remain post-MVP gaps.

## NX-003 verified behavior

The 29 cases in `apps/api/test/studies.test.ts` cover nested, encounter-linked, and standalone study creation; optional same-patient association; cross-patient rejection; input validation; patient/encounter listing; repeatable status filters; missing IDs; forward transitions; rejected repeated/backward transitions; result-note limits; and persistence. O-005 browser evidence covers study entry with a consultation, failed-save preservation, `ordered → completed → reviewed`, pending-card visibility, and removal after review. O-006 browser checks also passed for patient-level creation/review, staged and saved-encounter study entry, and patient context. The exact two studies in `docs/demo-dataset.json` remain unchanged.

## NX-004 verified behavior

The document API tests cover both kinds, patient/encounter association, validation, detail/list, edit persistence, prescription-line replacement, and unsupported delete behavior. Seed tests cover the exact fictional fixtures, line order, idempotency, edit preservation, and user-created records. Browser checks exercised both creation/edit flows, overview integration, field-level validation recovery, line add/remove capability, report line breaks after reload, kind-specific 404 copy, and CSS printing. A clean temporary startup seeded 2 documents; a repeat startup applied no migrations, created 0 records, and retained an edited user report. The browser print PDFs showed the demo footer and omitted navigation, banner, controls, and the screen-only print note.

The NX-001 and NX-002 source-review discrepancies identified at expansion start have been resolved and browser-verified; see `ACTION_PLAN.md` for the evidence summary.

## Principles

Testing follows the development sequence: verify the database and API foundation first, validate UX/UI against the agreed workflows, then verify the complete implementation in vertical slices. The API/data foundation must be independently testable before the frontend feature screens exist.

- Test observable behavior, not merely the existence of UI components.
- Use synthetic deterministic data only.
- Verify Next.js Server Components retrieve initial page data from Hono rather than accessing Prisma/SQLite directly.
- Verify clinical page data is request-time and not shared-cached/static.
- Verify browser-initiated mutations go through Hono and server-side validation.
- Verify local Prisma/SQLite transaction rollback for representative multi-write operations.
- Verify patient/encounter association integrity and chronological timeline ordering.
- Test empty, invalid, loading, success, network-error, and persistence-error states.

## Database and seed tests

- Apply migrations to a clean local database.
- Run the explicit Prisma 7 seed command.
- On a clean database, verify all 7 patient fixture IDs, all 9 encounter fixture IDs, and all 4 fixed past appointment IDs from `docs/demo-dataset.json` are present; exactly 6 seeded patients are active and 1 is archived; 5 additional first-seed-anchored upcoming appointments exist.
- Run the seed twice and confirm no duplicate records.
- Edit a seeded record, rerun the seed, and confirm the edit is preserved.
- Create a user-added record, rerun the seed, and confirm it is untouched.
- Verify `demo-patient-003` has no encounters and `demo-patient-004` remains archived after repeated seed runs.
- Verify reset is destructive and requires interactive confirmation or `--confirm`; normal startup never resets the database.

## Database/API foundation tests

Before product UI implementation, verify:

- Prisma schema and migrations apply to a clean SQLite database.
- Patient and encounter foreign-key/relationship rules are enforced.
- Hono request validation rejects invalid inputs and cross-patient encounter associations.
- API DTOs and error responses match the documented contract.
- The synthetic dataset is retrievable through the API.
- Local transaction rollback works for representative multi-write operations.
- API tests do not require a browser or Next.js UI.

## End-to-end workflows

1. Start from a clean local database.
2. Run `npm run dev`.
3. Confirm Next.js and Hono start and print their local URLs.
4. Open `http://127.0.0.1:3000`; confirm redirect to a populated `/patients` registry.
5. Confirm the populated registry opens without a demonstration or fictional-data label (D-046).
6. Search for a synthetic patient and open the overview.
7. Create a patient and verify it persists.
8. Create an encounter for that patient and verify it appears in the correct timeline.
9. Verify the local Prisma transaction rollback test.
10. Stop and restart both apps.
11. Confirm all locally created and seeded records remain.
12. Run seed again and confirm no duplicates or overwrites.
13. Confirm no remote Cloudflare service or network connection is required after dependencies are installed.

## Clean-clone acceptance

The Prisma client (`apps/api/src/generated`) is gitignored, so a fresh clone has no generated code. `npm run dev` runs `prisma generate` before `migrate deploy` and `db seed`, making the first run self-contained. Acceptance check (performed 2026-11-07):

1. `git clone` the repository into an empty directory.
2. Confirm `apps/api/src/generated` is absent.
3. `npm ci`.
4. `npm run dev` → client generated, migrations applied, idempotent seed (7 patients / 9 encounters / 9 appointments / 2 studies / 2 documents), API `/health` green, SSR patient page returns `200`.

Do not treat a warm working directory (with a pre-generated client) as proof; the check must start from a fresh clone.

## Before declaring a task complete

Run the relevant commands that exist in the repository, normally:

1. formatter or formatting check;
2. linter;
3. TypeScript type check;
4. focused unit/integration tests;
5. production build;
6. end-to-end checks for completed vertical slices.

Do not claim a command passed unless it was executed successfully. Report skipped checks and why.

## Secretary and local received studies — 2026-11-10

Source milestones: `a16857b` (API/contracts/migrations/storage) and `db417a8` (workspace/shared dialogs). Final checks: API **121/121**, web **39/39**, workspace typecheck, lint exit 0 (existing Pages-directory warning), and Next production build all pass. Installed Next.js API guides for router refresh/navigation and fetch were consulted; the existing SSR/no-store architecture is retained. No runtime packages were added.

Isolated production Chromium, driven directly through the browser protocol (no MCP), passed patient create/contact edit persistence; guarded dirty Escape cancel/accept and focus restoration; patient selection and appointment creation in dialogs; shared arrival and physician start; secretary absence of physician start controls; synthetic PDF upload with a deliberately blocked network request and successful retry preserving fields/files; physician review and administrative omission of review notes; patient-background and appointment dialogs; unsaved consultation protection on rejected/accepted view changes; and physician attachment entry from a saved consultation with preselected association. Untouched association prefill closes without a dirty prompt. No runtime exceptions occurred. Secretary agenda/studies, physician reception and registry have no horizontal overflow at 320px; 390px agenda/modal captures were inspected. Four inspected synthetic screenshots and hashes are in `assets/secretary/README.md`.

API coverage includes concurrent/repeated/invalid reception transitions, rescheduling reset, administrative read/create/edit projection, invalid clinical input rejection, external receipt without an order, cross-patient consultation rejection, MIME/signature/file-count/transport-size rejection, foreign-browser-origin rejection, file retrieval/no-store, explicit one-time review, and original order-status preservation.

QA used a separate `.local/secretary-qa/medical.db`, exact seeded fixtures plus explicitly fictional browser records, and a generated synthetic PDF. Repeat seed created zero rows and preserved the full nine-table digest and all three stored attachment hashes. After API restart all three attachments were retrieved with identical SHA-256 bytes. No QA mutations reached the owner's database.

Normal `npm run dev` then applied the two additive migrations to the existing local DB and seeded zero new records. A before/after digest of all original columns/rows across seven existing tables matched exactly after excluding only the two intentionally added migration-log entries. New receipt tables remained empty in the normal DB. The original `next-env.d.ts` owner bytes are preserved. Secretary route returns HTTP 200 on normal startup.

Limits: this is a local synthetic-data demonstration. View selection is not authentication/authorization. These checks do not establish network deployment safety, physician policy approval, assistive-technology validation, or real medical-document validity. There is no attachment replacement/deletion UI in this slice.

## Proposal 2 clinical presentation — 2026-11-12

Clinical page styles now use the larger field and section labels, readable note body text, white section surfaces, visible patient context, firm controls, and low-noise study/document panels. No clinical component logic, API contract, save behavior or print-specific rules changed. Integrated clinical browser workflow verification is pending.

## Proposal 2 auth and access presentation — 2026-11-12

Login, invitation, recovery, verification, demo entry and access-management pages now use the same square white/cool surface treatment, navy identity, cobalt controls and larger labels/inputs. Existing auth behavior is unchanged.

## Proposal 2 integrated application review — 2026-11-12

Final visual pass found that the application shell places a semantic `<main>` directly inside `.app-main`, while the earlier spacing rule targeted a child `.container` that does not exist. The rule now pads the actual main element and retains the corresponding compact tablet/mobile gutters. Directory consultation actions are kept at 15px and 44px high. Browser capture confirms the patient directory sits clear of the sidebar and viewport edges. Full-page screenshot is saved, ignored by Git, at `.local/ui-exploration/proposal-2-rollout/patient-directory.png`.

Using the existing local application and synthetic demo account, browser review confirmed the global sidebar links to the patient directory and calendar; registry patient selection updates the preview; search by `NM-001` returns Juan Pérez; `Nuevo paciente` opens the real page-based form; Cancel returns to `/patients?q=NM-001` with the search/filter retained; calendar exposes the seeded appointments; and opening Carlos Hernández's record then `Citas y consultas` shows the pending appointment and chronological history under the same patient context. No form was submitted and no patient/API record was created or edited. No runtime error was observed during this navigation pass.

Final checks after the spacing fix: web 44/44; web TypeScript typecheck; ESLint exits 0 with the existing missing-Pages-directory notice and `window.location.assign()` warning in `top-bar.tsx`; production build passes after a sandbox retry outside the TypeScript subprocess restriction; `git diff --check` passes. API tests were not rerun because no API/domain/contracts code changed. The build lists all current application and comparison routes. Intended-user testing, 200% zoom, exhaustive route/role/print regression, and assistive-technology validation remain outstanding; the browser walkthrough covers primary navigation and patient continuity rather than every acceptance row.
