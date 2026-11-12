# Living Action Plan — Medical Platform MVP

## Active objective — Alternative UI exploration (2026-11-12)

**Readability follow-up (D-050, implemented):** Owner finds the first sample better but still too thin/small and explicitly prioritizes working users aged 60–70. The sample now uses sturdy sans-serif headings, 18px main text/names, 16px functional metadata, 14px auxiliary copy, stronger text/control contrast, 52px controls, a persistent search label and explicit `Ver datos` row actions. Decorative slogans and the paper illustration are removed. Mobile navigation/filters reorganize without reducing text. Paper/ink/terracotta, page-based registration, synthetic fixture and transient state remain. No API/data/auth behavior or deployment changes. Usability with the intended audience remains untested; this constraint is also recorded in `PRODUCT.md` and `DECISIONS.md`.

**Readability verification:** Frontend typecheck, lint (inherited warnings) and production build pass. Browser confirms 18px/700 patient names, 40px/700 desktop headings, 16px labels/inputs and >=52px primary/filter/navigation/row controls. Focused contrast pairs: main text on table 12.75:1, secondary text on paper 7.33:1, white on primary 7.29:1 and input border on field 4.15:1. These are selected pairs, not a full accessibility audit. Current screenshots: ignored `.local/ui-exploration/readability/`. Existing behavior tests and production-route exclusion remain the prior sample evidence; no API tests were rerun for this presentation change.

**Outcome:** Give the owner a visibly different interactive sample before an application-wide redesign. Owner requests new navigation, controls and colors, with a registration alternative to a pop-up.

**Scope:** Local-development-only `/exploracion-ui`: directory, patient preview and registration using exact checked-in synthetic demographics. Preview changes live only in component memory and are explicitly labeled; no API writes, clinical data, auth changes, remote deployment or changes to existing product screens. Interpreted “signup” as patient registration in a full work surface; an optional page-versus-panel question received no answer during implementation, so this remains a reversible design assumption.

**Sequence:** (1) Inspect current UI, historical audits and primary references; specify the sample in `UI_SPEC.md`. (2) Implement isolated styles and complete preview interactions. (3) Verify desktop/mobile, keyboard, search/filter, validation, unsaved exit and temporary registration; run lint, typecheck, web tests and build. (4) Reconcile evidence and commit for owner review. Work is sequential; no delegation.

**Design:** Warm paper surfaces, dark ink navigation, darker terracotta primary actions, sturdy sans-serif headings, aligned directory rows, full-page registration. CSS module isolation; reuse icons and transport schemas; no new dependencies or external assets.

**Branch:** `codex/ui-editorial-exploration`, based on `codex/ux-qa-fixes` at `9d0f7c2` (PR #31). Clean initial tree. Focused local commit; no merge/deployment planned. Earlier active sections below are inherited historical handoffs.

**Acceptance/status:** Sample implemented and verified; visual preference remains for owner review. Directory and registration have no horizontal overflow at 320/390/768/1440px. Browser checks passed identifier search, no results/reset, archived filter, quick view with Escape/focus restoration, required name, invalid email, future-date rejection, duplicate warning, temporary registration and reset on reload. Source reuses the existing dirty-navigation guard; its native-confirm acceptance/cancellation flow could not be completed because browser control timed out on the open dialog. Do not count that check as passed. No new persisted records or clinical writes.

**Verification:** Web 44/44; web TypeScript check; lint (only inherited TopBar and Pages-directory warnings); final Next production build pass. Sandbox build initially failed to parse the TypeScript subprocess output; permitted rerun passed. Local production server confirmed `/exploracion-ui` HTTP 404, then was stopped. Existing `/patients` still renders its original shell and six active fixtures. Normal startup applied no migrations and both seed runs created zero rows. Browser snapshots in ignored `.local/ui-exploration/`; sample running at http://127.0.0.1:3000/exploracion-ui. Next-generated `next-env.d.ts` is back to its original contents after the build.

**Next:** Owner compares the readability revision with the current application, including `Nuevo paciente`. Review the local exploration branch and its `fix(ui): improve sample readability and controls` follow-up. No final branding or broad rollout is approved by this sample; no push, PR, merge or remote deployment in this session.

## Active objective — Reception and patient-study UX refinement (O-009, 2026-11-11)

**Outcome:** Implement D-048/D-049: direct reception workflows, one patient activity destination, compact patient lookup, reliable dialogs, study detail with current-day sample data, and removal of fixture-only fictitious note labels.

**UX research:** W3C combobox guidance supports a collapsed, filtered suggestion panel with explicit selection and Escape dismissal; W3C modal guidance calls for a visible close control, focus containment and focus restoration. AHRQ EHR usability research supports aligning the interface to role workflow and quick cross-function navigation. The resulting design is recorded in `UI_SPEC.md` O-009.

**Scope and exclusions:** Local synthetic MVP only; no authentication, remote services, clinical interpretation, new study states, or merging of Appointment and Encounter records. Keep the existing patient summary and physician review semantics. Preserve the owner’s `apps/web/next-env.d.ts` change.

**Sequence:** (1) Reception controls, role-specific start actions, patient search panel, and modal repair. (2) One `Citas y consultas` patient destination with legacy redirects and separate event types. (3) Patient StudyRequest detail with received file/note associations. (4) Idempotent today-dated sample receipt and safe exact-fixture label cleanup migration. (5) API/web verification, browser walkthrough, and reviewable PR stack.

**PR strategy:** Stack starts with documentation PR #23 on PR #22. Follow-ups: reception/patient selection on `codex/reception-flow-ux` → patient activity navigation → study detail and sample data. Keep each PR at 15 changed files or fewer; publish only after its focused verification passes. Do not merge feature PRs.

**Acceptance:** Reception date applies without a `Ver` button; secretary arrival and physician consultation-start are clear; direct new consultation works for found and newly registered patients; patient dialog is compact and search-first; edit dialog remains closable while scrolling; patient activity combines navigation without conflating event semantics; request rows open detail and expose related receipts/files; today's seeded receipt and sample attachment persist without duplication; user edits remain unchanged; no explicit `NOTA FICTICIA DE DEMOSTRACIÓN` marker remains in fixture notes.

**Current status (2026-11-11):** O009-1 is implemented on `codex/reception-flow-ux`: immediate date selection, secretary-only arrival, physician direct consultation start, separate `Nueva cita`/`Nueva consulta`, compact patient search, modal close/scroll repair and patient field placeholders. Verification: API reception tests 5/5; web tests 42/42; workspace typecheck and lint pass (existing Pages-directory warning); Chrome confirms search-only results, anchor position, Escape close, direct consultation route and sticky-dialog structure; viewport checks at 390px and 320px show no horizontal overflow. PR #23 (research/spec, 5 files) and [PR #24](https://github.com/Marguelgtz/nexus-med/pull/24) (reception, 13 files; commit `4bda2b7`) are open and unmerged; #24 is based on #23.

O009-2 is implemented on `codex/patient-activity-unification`: one `Citas y consultas` navigation entry, upcoming and past-scheduled appointment sections, a mixed chronological history with distinct appointment/consultation labels and detail actions, and redirects from both former list URLs. The unused consultation-only timeline component was removed. Verification: web tests 44/44, workspace typecheck and lint pass (existing Pages-directory warning), Chrome confirms both old list URLs reach the combined page, and 390px/320px viewport checks show no overflow. [PR #25](https://github.com/Marguelgtz/nexus-med/pull/25) contains 14 files (commit `ae6d904`), is based on #24, and remains open/unmerged.

O009-3 is implemented on `codex/patient-study-detail-example`: patient study names and associated medical-view receipts open a request-specific detail page; attachments, order notes, dates, consultation association, and explicit physician review remain visible with request and receipt state separate. The seed adds a patient 005 chest X-ray request and stable current-day local PDF receipt. The cleanup migration clears only exact legacy fixture note text and preserves edits. Verification: API seed 14/14; web 44/44; workspace typecheck, lint (existing Pages-directory warning), and `git diff --check` pass. Chromium confirmed the study link, detail page and PDF signature, and desktop/390px layouts. The migration was applied to the existing local database and idempotent seeding added one request and one receipt; a second run created no duplicate records. [PR #26](https://github.com/Marguelgtz/nexus-med/pull/26) is open on #25 with 13 files (commits `82ac95d` and `de56add`); no PR is merged. PRs #23–#25 remain open/unmerged. The owner's `next-env.d.ts` change remains unstaged.

**Document type:** Active execution state (living document)  
**Last updated:** 2026-11-11
**Owner:** Project owner  
**Primary agent:** Hermes Agent  
**Current implementation state (updated 2026-11-11):** O-008 secretary/reception/local study receipt is implemented on `codex/secretary-workspace`, based on UI PR #9. The original 59-file PR #10 is closed as superseded by a seven-layer review stack: #11 data/contracts (11 files), #12 reception API (8), #13 receipt API/storage (6), #14 patient action dialogs (9), #15 reception UI (10), #16 received-study UI and polling fix (6), and #17 docs/evidence (9). Each layer is based on the previous layer; #11 is based on PR #9. Original branch/history is retained, no PR is merged. Preserve the owner's pre-existing `apps/web/next-env.d.ts` change.

## Completed objective — Reception at a glance (2026-11-10)

**Outcome:** Owner-approved presentation without demonstration labels, plus an operational reception overview using existing agenda/queue data.

**Sequence:** Remove visible application/document labels (D-046); derive and test date/queue summaries; render responsive overview; verify build and browser; publish a focused PR based on #18.

**Branch:** `codex/reception-overview`. Scope is presentation and derived summaries, no changes to stored records or API. Preserve the owner's next-env edit. **Verification:** web 42/42, workspace typecheck, lint (existing Pages warning), production build pass. Chromium confirms reception/secretary metrics and no banner at desktop, 390px and 320px, without overflow. No record writes. Published as [PR #19](https://github.com/Marguelgtz/nexus-med/pull/19), 15 files, based on #18; commit `9463685`. Open and unmerged. Dev is running at http://127.0.0.1:3000/recepcion; next action is owner walkthrough.

## Active objective — Secretary patient cards and shared study sync (2026-11-11)

**Outcome:** Keep contact details visible on secretary patient cards, name the shared study area simply **Estudios**, and let the secretary/physician views reflect shared updates within 30 seconds.

**Scope:** Administrative list DTO includes contact only; no clinical fields. Existing study receipt, separate physician review, and local file storage remain the source of truth. Poll while the page is visible, refresh on focus, and retain a compact manual refresh. No push-notification service.

**Sequence:** (1) Add/test the administrative patient-list projection and render phone/email in each card. (2) Rename study entry points and add a shared 30-second interval constant. (3) Apply 30-second polling to reception and studies, keep an accessible icon refresh, and document synchronization behavior. (4) Run API/web checks, browser walkthrough in both views, inspect diff, commit and publish small stacked PRs under 15 files where practical.

**Branch stack:** [PR #20](https://github.com/Marguelgtz/nexus-med/pull/20), 12 files, based on PR #19 → [PR #21](https://github.com/Marguelgtz/nexus-med/pull/21), 15 files, based on #20 → [PR #22](https://github.com/Marguelgtz/nexus-med/pull/22), docs-only, based on #21. Preserve `apps/web/next-env.d.ts`. **Acceptance:** Secretary cards show phone/email or “Sin registrar”; API response excludes medical background; both views show “Estudios”; secretary/physician views refresh within 30 seconds or on focus; no unsaved receipt/review form is overwritten; no narrow-screen overflow. **Status:** all three layers implemented, verified as applicable, pushed, and open; no PR has been merged. Commits: `84472bb` (administrative list and contact cards), `1487bc0` (startup labels), `8b13cf6` (Studies sync), `65f5890` (D-046 documentation), followed by the execution-plan update.

**Verification:** API 121/121, web 42/42, workspace typecheck, lint (existing Pages warning), and production build pass. Chromium confirms secretary contact cards, 30-second polling on physician/secretary reception and Studies, successful manual API refresh, legacy-route redirect, no visible demo labels, and no horizontal overflow at 1440/390/320px. Final `npm run dev` applied no migrations and created zero seed rows; `/patients`, `/secretaria?seccion=agenda`, `/estudios`, and `/health` returned 200. The app is left running at http://127.0.0.1:3000. Next action: owner walkthrough and review of PRs #20–#22.

## Active objective — Contemporary UI refresh (2026-11-10)

**Status:** Delivered in [PR #18](https://github.com/Marguelgtz/nexus-med/pull/18), nine files, based on PR #17; initial code commit `36880a0` followed by owner-directed glass component redesign. Open and unmerged.

**Outcome:** Redesign shared components with translucent surfaces, floating navigation, iconography, identity-based patient rows, integrated controls and glass dialogs while preserving existing layout, navigation and clinical workflows.

**Next action:** Owner visual review at http://127.0.0.1:3000/patients and /secretaria; dev remains running.

**Sequence:** (1) Record the visual direction in UI_SPEC. (2) Update shared tokens, shell, controls, panels and dialog styling. (3) Check type/lint/build and desktop/mobile rendering; record results and commit a focused PR under 15 files.

**Scope:** Presentation only, on `codex/contemporary-ui-refresh`, based on PR #17. Preserve the owner's next-env edit. Acceptance: clear contrast and keyboard focus, consistent components across physician/secretary views, no horizontal mobile overflow and unchanged print layout. **Verification:** workspace typecheck and lint pass (existing Pages warning); production build passes outside the subprocess-restricted sandbox. Chromium inspected registry, patient overview and secretary at 1440px, plus registry/secretary at 390px, all with viewport-width scroll bounds. Startup had no pending migrations and seed created zero records. Additional Chromium checks cover calendar, consultation entry, 320px registry and an opened native patient dialog with input focus. A two-pixel compact-header overflow was corrected and measured again with no elements beyond 320px. Production build and typecheck pass after component changes; lint passes with its existing warning. No clinical writes or test suites were run for this presentation-only change.

## Active objective — Secretary workspace (2026-11-10)

**Status:** Implemented and verified on `codex/secretary-workspace`, based on open UI PR #9. Source commits `a16857b`, `db417a8`, and review fix `ae901ef`; preserve the `next-env.d.ts` edit. Published as [PRs #11–#17](https://github.com/Marguelgtz/nexus-med/pull/11) in a stack of 6–11 files each. Original PR #10 was closed after the replacement stack was published; no PR is merged.

**Outcome:** Administrative secretary view without authentication: patient/contact management, scheduling, reception and shared waiting list, and receipt of studies for physician review. Both views share study entry with required patient and optional consultation. Short tasks open in native dialogs.

**Ordered delivery:** (1) Add reception contracts, safe additive migration, API operations and integration coverage. (2) Build the secretary workspace and physician queue using existing forms/dialogs; keep clinical information out of the administrative view. (3) Add shared received-study workflow with owner-approved PDF/image attachments. (4) Consolidate short task entry points, run tests/typecheck/lint/build and runtime checks, reconcile docs, commit reviewable milestones; leave feature PRs unmerged.

**Defaults/dependencies:** Local loopback runtime and a visible Medical/Secretary view selector; no accounts or security roles. D-045 approves local PDF/image attachments. Both views share reception; runtime remains loopback-only. No delegation.

**Acceptance:** Arrival persists and is shared; duplicate/invalid/concurrent transitions fail clearly; cancellations/rescheduling cannot leave active phantom queue entries. Secretary can create/edit demographic data and appointments in dialogs without visiting clinical records. Forms preserve input on failure and confirm dirty dismissal. Long clinical notes and printable documents retain full pages. Existing fixtures and edits survive migration/seed.

**Verification so far:** Final API 121/121, web 39/39, workspace typecheck, lint (existing Pages warning), and production build pass. Isolated production Chromium passes patient/contact persistence, appointment entry, shared arrival/start, dirty dismissal/focus return, upload failure recovery, physician review, physician receipt from a saved consultation, view-switch protection for unsaved notes and 390/320px reflow; no runtime exceptions. Repeat QA seed creates zero rows and preserves the complete nine-table digest plus three attachment hashes.

**Final runtime evidence:** All three QA attachments retain exact bytes after API restart. Normal startup applied the two additive migrations, created zero seeded rows, returned Secretary HTTP200, and preserved every original data column/row (excluding only new migration-log entries). Original `next-env.d.ts` bytes are retained.

**Review finding:** PR #10's polling issue is corrected in PR #16. Receipt refresh now calls the receipt API directly, keeps the existing rows on network errors, and applies upload/review results locally instead of refreshing the route that contains the clinical editor. Workspace typecheck, lint, and `git diff --check` pass after this change; the full API/web suites and build are from the integrated source before the polling fix and were not rerun for stack extraction.

**Next action:** review the stack bottom-up from [PR #11](https://github.com/Marguelgtz/nexus-med/pull/11) through #17 and inspect `http://127.0.0.1:3000/secretaria`. Leave all feature PRs unmerged. Normal `npm run dev` remains running on 3000/4000; the only unstaged change is the preserved owner `next-env.d.ts` edit.

## Active follow-up — Figma UI v0 foundation alignment (2026-11-10)

**Status:** Implemented and pushed on `feat/o007-ui-foundation`, including the CSS parser correction found during local startup; PR #9 remains open and unmerged. The owner-selected Figma UI v0 system and key workflow artboards were reviewed in the browser; no MCP used. Preserve the pre-existing `apps/web/next-env.d.ts` change.

**Outcome/scope:** Align shared typography, control geometry, content width, navigation density and consultation-stage layout to the reviewed system board. Consolidate conflicting/duplicated CSS rules. Keep clinical behavior, API/schema, existing tokens/colors, and print-specific layout intact.

**Sequence:** (1) Record the reviewed system measurements in `UI_SPEC.md` — complete. (2) Apply shared CSS tokens and remove conflicting overrides — complete. (3) Match compact mobile navigation and consultation steps to the mobile artboard — complete. (4) Run web typecheck/lint, inspect the final diff, commit and push to PR #9 — complete. Leave the PR unmerged.

**Acceptance:** Body/title/section-label scale and 42px/44px control heights follow the UI v0 system; patient screens stay within 1120px; mobile menus do not wrap into crowded rows; the active consultation stage is full-width while other steps stay directly operable; duplicate rules no longer override intended registry/document/nav layout. No clinical or persistence behavior changes.

**Verification:** `npm run typecheck --workspace apps/web` passes. `npm run lint` exits 0 with the existing Pages-directory configuration warning. `git diff --check` passes. On startup, `npm run dev` applied no pending migrations, the idempotent seed created zero rows, Next compiled the corrected stylesheet, `/` returned 307, `/patients` returned 200, and `/health` returned `ok`. No test suite or post-edit visual browser capture was run; the Figma reference itself was reviewed in the browser.

**Next action:** owner review of updated PR #9; leave it open and unmerged.

## Active follow-up — Compact clinical entry and dialogs (2026-11-10)

**Status:** Delivered and published for owner review. Documentation remains in English.

**Outcome/scope:** Make long consultation/prescription entry manageable with reversible in-memory stages and focused native dialogs. Request studies within the current consultation with automatic association; move background from navigation into overview. Preserve explicit saves, clinical fields, API/schema, stored prescription instructions, status meanings, print isolation and patient identity.

**Ordered delivery:** (1) Add the accessible dialog primitive and guarded follow-up scheduling; verify/commit. (2) Stage new consultation entry and contextual study requests; verify/commit. (3) Compact medication entry in a dialog, retain existing per-line instructions, and move background into overview; verify/commit. (4) Reconcile existing English docs, inspect synthetic production screenshots, verify build/workflows, push and update open PR #9 without merging.

**Acceptance:** Dialogs name their purpose/patient, contain keyboard focus, handle Escape/close without discarding dirty text silently, and restore trigger focus. Consultation stages keep all typed fields and route errors to the relevant stage, with a final complete-note review and explicit save. New-note studies save atomically with the note; saved-note requests retain immutable association. Follow-up saves an independent appointment and returns to the mounted workspace. Medications are reviewed as compact summaries and edited individually; general instructions have one capture field and historical per-line instructions survive editing/printing. Background has no navigation item and is visible/editable from Resumen; existing read links remain valid.

**Verification/delivery:** Use focused browser checks plus web tests/typecheck/lint for each code milestone; final production build and isolated exact-fixture mutation/print checks. Keep incremental digestible commits on `feat/o007-ui-foundation`, preserve local `next-env.d.ts`, update ACTION_PLAN throughout. No API/schema change is planned.

**Milestone 1 verified:** Native dialog and new/saved-consultation follow-up modal implemented. Web 39/39, web typecheck and lint pass (existing App Router warning only). Chromium at 390px verifies modal focus containment/return, dirty Escape cancel/accept, and preservation of the unsaved note. Native repeated Escape close requests were prevented at keydown before accepting a close. No clinical write submitted.

**Milestone 1 commit:** `786533b`.

**Milestone 2 verified:** Three presentation stages preserve all seven note fields and explicit final save; contextual new/saved-note study dialogs retain association. Web typecheck/lint and Chromium stage/draft/error/focus/320px checks pass. Stage transitions make zero POST requests. The conditional Continue→Save button reuse regression was fixed with distinct keys; two own synthetic test artifacts from the failed check were strictly scoped, backed up and cleaned with unrelated-row digest/FK preservation.

**Milestone 2 commit:** `fd2cf83`.

**Milestone 3 verified:** Compact medication dialogs/expandable rows, one general-instructions capture field and preserved historical per-line instructions; background moved into overview and old URL redirects. Web 39/39, typecheck/lint and Chromium modal create/edit/dirty-close/focus/payload/failure/background checks pass; all writes intercepted.

**Milestone 3 commit:** `e39a604`. Final production build passes; isolated note/study, follow-up and two-medication persistence/failure recovery pass. Repeat seed preserves the complete mutated DB digest (7/10/10/4/3). Screenshot review led to full-size study controls, non-wrapping close buttons, inline new-note actions and deferred saved-study focus restoration; these final fixes pass the production build, final screenshots and saved-study focus/print checks.

**Final delivery:** Corrections `06a4fa8` and evidence `a4434dc` are pushed; PR #9 includes current behavior, incremental commits, tests, screenshots and limits. Saved-study focus, print/background checks and 320px reflow pass after API restart. Normal dev startup is restored with zero new seeded records.

**Next action:** owner review of the compact entry flows. Leave PR #9 unmerged; final visual/physician/screen-reader validation remains outside this verification claim.

## Previous follow-up — Focused patient views (2026-11-10)

**Status:** Delivered and published as `03be1b8`; PR #9 is updated and remains open/unmerged. The owner-reported combined-page navigation and repeated clinical history are resolved.

**Outcome/scope:** Replace combined overview anchors with focused SSR views for summary, consultations, appointments, studies, documents and background. Clarify scheduling versus clinical notes without merging their entities or changing API/schema/status semantics. Keep the existing shell and domain components.

**Sequence:** (1) Split views and update navigation/legacy anchors. (2) Remove repeated history/studies/appointments from background; preserve encounter safety context. (3) Clarify appointment handoff and verify each navigation destination, empty states, mobile reflow and unsaved form guard. (4) Update authoritative conventions, capture screenshots, commit/push and update PR #9 without merging.

**Acceptance:** Each navigation item renders its own content and active state; overview has demographics/next action rather than full lists; consultation history has one canonical list; background has no copied encounter/study lists. Citas describes scheduling and links to the corresponding clinical note when present. Existing mutations remain domain-owned and explicit.

**Verification:** Web 39/39; final production build including TypeScript validation; ESLint exit 0 with existing warning; 24 route/viewport cases at 1440/1024/390/320px; current navigation/exclusive content, legacy bookmarks, browser history, keyboard/skip focus, dirty-form cancel/accept, linked note, workflow-specific form cancels, empty record and missing patient checks pass. Eighteen production screenshots were inspected and their hashes validated. Isolated fixture counts remain 7/9/9/2/2; no clinical save or owner DB reset. API suite is not rerun for presentation-only changes.

**Branch/delivery:** `feat/o007-ui-foundation` is pushed through `03be1b8`; PR #9 targets PR #8 and includes the focused-view behavior, actual verification and screenshots. No merge. The pre-existing local `next-env.d.ts` modification is preserved. Normal `npm run dev` is restored at 3000/4000; no pending migration and seed created zero records.

**Next action:** owner review of the focused patient views; subsequent visual/interaction refinement remains review-driven. Figma was not accessed.

## Previous follow-up — Owner UI review

**Status:** Delivered and published for owner review. Code, runtime, data-preservation, responsive visual checks, screenshots, and implementation documentation are verified. Code commit `28c00cc` and evidence/documentation commit `b371bbc` are pushed, and PR #9 has the final verification/evidence summary. Preserve the pre-existing `apps/web/next-env.d.ts` modification.

**Outcome:** Make the main clinical workflows easier to start and scan, reduce nested/dense encounter UI, give patient context its own focused page, and improve the visual identity and mobile calendar while preserving O-007 clinical semantics, API ownership, explicit saving, synthetic-only data, the persistent demo warning, and print isolation.

**Ordered sequence:**
1. **Navigation and entry points — verified:** patient workflow side navigation, registry-level `Nueva consulta`, appointment actions beside pending work, and appointment creation from the full context page. Filtered synthetic registry, patient summary and context routes returned 200 in Chromium at 1440/1024/390px; document width matched viewport.
2. **Clinical information and actions — verified:** one-field-at-a-time consultation editing; study action beside encounter actions; concise study composition; readable association and status caveat. The contract now stores required study `name` plus optional detail; the new migration preserves existing values and associations. API suite passes 113/113.
3. **Patient workspace and timeline — verified:** all four background fields shown together, dedicated full context page, inline appointment entry, compact date/time/type timeline. Desktop/tablet/mobile patient and context screenshots were individually inspected; no page overflow at 1440/1024/390px.
4. **Responsive visual refinement — verified:** evergreen/warm-neutral token refinement and selectable mobile month cells with selected-day agenda. Mobile month, patient summary and focused forms were inspected; focused token contrast checks pass. The side-nav grid and registry action sizing were corrected after inspecting desktop screenshots.
5. **Reconcile and deliver — complete:** API 113/113, web 39/39, workspace typecheck, lint and final Next.js production build pass. Migration/seed ran against existing local data with no pending migration, zero created records and no data reset. Fourteen owner-review screenshots and testing/documentation updates are committed and pushed; PR #9 contains the final evidence summary and remains open/unmerged.

**Acceptance:** Existing patient, encounter, study, appointment, document, print, and persistence behavior remains intact. The registry can start a consultation for an active patient in one action. Patient-specific screens offer simple navigation and preserve patient identity. Encounter editing shows a single named field at a time with explicit save/cancel and preserved validation/failure recovery. New encounter studies retain the association statement and category, readable status copy, and a specific name when `Otro` is selected; no study status meaning changes. Full clinical context presents allergies, medications, conditions, and prior surgeries together and offers an appointment path. Timeline entries remain bounded on narrow screens and scan through concise date/time and encounter type. Month view works at 320–390px without horizontal page overflow and routes clearly to that day's appointments. The palette maintains readable contrast and visible keyboard focus. Existing local data and the owner change to `next-env.d.ts` are preserved.

**Branch/PR:** `feat/o007-ui-foundation` is pushed through `b371bbc`; PR #9 targets PR #8 and remains open/unmerged for owner review. No independent work was delegated.

**Next action:** owner review of PR #9. Figma exploration remains a separate follow-up; the code palette is explicitly provisional and no Figma file was accessed.

---

## O-006 follow-up review — verification cleared 2026-11-09

PR #7's post-review study saving reset, draft protection and embedded prescription/report changes have now passed the required automated and browser checks during UI v0. The old runtime-verification boundary is cleared; `TESTING.md` records the actual coverage/limits. PR #7 and its PR #6 parent remain unmerged.

**Research dependency:** [PR #8](https://github.com/Marguelgtz/nexus-med/pull/8) remains the documentation/evidence parent; its research-only authorization was superseded by the owner's explicit UI v0 mission.

## Most recent mission — O-007 UI v0 implementation — COMPLETE

Owner-authorized continuation on `feat/o007-ui-foundation`, based on PR #8 (`1a0432f`). Research is complete; UI implementation is now authorized. Preserve the owner modification to `apps/web/next-env.d.ts` uncommitted.

Outcome: a coherent, responsive clinical UI baseline for later Figma work, with existing clinical behavior and API/schema unchanged.

Completed delivery sequence:
1. Baseline: run the outstanding O-006 gates and browser follow-ups; preserve working behavior.
2. Foundation: repair UI-01…UI-11, consolidate existing CSS tokens/control rules and repeatable study input; verify geometry, keyboard and responsive behavior; commit.
3. Experience: refine shared navigation, registry alignment, context density, feedback and document/form composition; verify critical journeys and print isolation; commit.
4. Handoff: inspect screenshots against PR #8, run full checks, reconcile authoritative docs/evidence and publish reviewable dependent PR(s); leave unmerged.

Dependencies: sequential implementation and final verification; no delegation. No new packages, Figma, API/schema changes or clinical semantics. P2 visual preferences remain provisional. One focused implementation PR against PR #8 is sufficient if the final diff stays cohesive.

Foundation committed as `6c412c3`. API 112/112, web 36/36, workspace typecheck/lint and production build pass (existing tool warnings retained). Initial sandbox-only failures were resolved by permitting Prisma/Next subprocesses; no app workaround. Geometry: 64 route/viewport combinations at 320/390/639/640/768/900/1024/1440px, no document overflow, equal week tracks, month alignment; skip-link/main focus and 200%-equivalent CSS-width reflow pass. Browser checks across reruns verified consultation/staged-study save/reload, cancelled dirty navigation, standalone/linked study draft protection and create, consecutive completed/reviewed status saves, both embedded document kinds and association/cancel/save feedback, note edit persistence, follow-up return, explicit appointment completion/link, delayed failure retention and print visibility/PDF generation. Patient create/edit/archive, standalone document create/edit, and appointment edit/cancel checks also pass. Browser harness waits for hydration before submitting SSR forms. No existing application DB reset. Final evidence: 89 PNGs inventoried with dimensions/hashes; all contact sheets and key full-resolution/print images inspected. Exact capture fixture counts remain 7/9/9/2/2.

Delivery: foundation `6c412c3`, interaction refinement `99468b3`, evidence/docs `c657334`, plus this publication handoff. [PR #9](https://github.com/Marguelgtz/nexus-med/pull/9) is open against `docs/ui-v0-readiness-research` (PR #8); all implementation commits are pushed. No PR merged. No external blocker or required implementation work remains; owner review and later Figma exploration are next. The only remaining local modification is the preserved `next-env.d.ts` dev-path change.

## 1. Purpose and operating model

This is the active execution plan. Update it continuously as work progresses: current objective, ordered sub-objectives, actual progress, dependencies, blockers, verification evidence, branch/PR state, and the next action.

It is deliberately different from the other planning documents:

- `ACTION_PLAN.md` is the living execution state, updated throughout work.
- `TASKS.md` defines phase-level work packages, deliverables, dependencies, and acceptance criteria. Revise it at phase boundaries or after an approved material scope change, not after each task or commit.
- `ROADMAP.md` describes the strategic order and intended outcomes.
- `PROJECT_HISTORY.md` is a retrospective archive of significant milestones, findings, and lessons.
- `DECISIONS.md` is authoritative for current accepted decisions.

Do not duplicate the entire phase task catalog here. Reference task IDs where useful and keep the active sequence concise and actionable.

## 2. Current project state

### Overall status

**O-001–O-007 implementation complete; O-007 is published for owner review.** The O-005 local MVP and four product expansions remain the verified code baseline. O-006 adds the integrated consultation workspace, patient-level study requests, conservative study review, appointment handoff, contextual documents/follow-up, and focused patient workspace. Synthetic-only data, explicit saving, O-005 behavior, and open clinical-status questions are preserved.

### Confirmed direction

- One npm-workspaces monorepo with `apps/web` and `apps/api`; the narrow `packages/contracts` workspace is confirmed and in use for shared DTOs/schemas.
- `apps/api`: Hono + TypeScript on local Node.js; authoritative API, validation, domain behavior, and database access.
- Persistence: local SQLite through Prisma ORM 7.
- `apps/web`: Next.js App Router + TypeScript using request-time SSR / Server Components for clinical reads from Hono.
- No Cloudflare connection, Wrangler runtime, Docker, or CI/CD in the prototype.
- File storage and Google authentication remain pending and excluded.
- Synthetic data only; normal startup must preserve local edits and user-created records.
- Remote pushes and PRs are allowed when useful. Only an exceptionally solid foundational/base PR may be merged autonomously; feature PRs normally remain open unless the owner explicitly authorizes their merge.

See `DECISIONS.md` and `ARCHITECTURE.md` for details.

### Current progress snapshot

| Area | Current state | Evidence / note |
|---|---|---|
| Product definition | Prepared | `PRODUCT.md`, `WORKFLOWS.md` |
| Architecture | Implemented per `ARCHITECTURE.md` | Monorepo, Hono API, Prisma 7 + SQLite, SSR shell |
| Data model | Implemented and migrated | `prisma/schema.prisma`, committed migration |
| API surface | Patient/encounter/appointment/study/document routes present | O-006 patient-scoped study create supports standalone and validated same-patient encounter requests; owner-reviewed study-name contract and migration pass 113/113 API tests |
| Synthetic fixture | Patient, encounter, appointment, study, prescription and report fixtures present | 7 patients, 9 encounters, 9 appointments, 2 studies, 2 documents (one linked prescription with 2 lines, one unlinked report) |
| Database and API code | Core and NX-001…NX-004 implemented | Prisma domain modules, migrations, validation, shared DTOs, integration coverage, and seed idempotency pass |
| UX/UI specification | Complete (O-002) | `docs/UI_SPEC.md` — screens, interactions, states, visual system, story coverage, decisions U-01–U-08 |
| Frontend product workflows | Complete (O-003/O-004) | Full product UI per `UI_SPEC.md` (registry, forms, timeline, detail, edit); first-run demo verified with persistence across restarts |
| Expansion (NX-001…NX-004) | Complete on `feat/nx-expansion-complete` | All four vertical slices browser-verified; complete automated quality gate is green; implementation committed through `e2d6590` |
| O-006 implementation | Complete; owner review pending | PR #7 is open against PR #6's latest documentation head; API/web tests, workspace checks, isolated startup, and Chrome journey checks pass; Q-O006-01…08 remain open where clinical meaning needs validation |

## 3a. Previous objective — O-007 UI research and visual investigation — COMPLETE

**Outcome:** Evidence-backed presentation audit and reference research against the latest O-006, before code-first UI v0, later Figma exploration, and eventual implementation of approved Figma designs. This mission authorizes research only.

**Scope/exclusions:** Rendered layouts, responsiveness, consistency, accessibility, styling architecture, public interface references and preserved workflow strengths. No application/CSS/API/contracts/schema/dependency changes, design system, wireframes, mockups, Figma access, or UI v0 implementation.

**Completed sequence:** (1) Reviewed source/docs and checked remote freshness; local `99b0d7c` lacked follow-ups `9811192` and `30eafd1`, so fast-forwarded this research branch. (2) Launched an isolated exact-fixture runtime at `30eafd1`; inspected desktop/tablet/mobile, intermediate widths, interactive states and references. (3) Captured and visually inspected 87 images; documented classified/prioritized findings, constraints, strengths and readiness assessment in `UI_AUDIT.md`, with primary-source comparisons in `UI_RESEARCH.md`.

**Dependencies/verification:** Separate detached runtime/worktree and SQLite DB; all five migrations applied, seed counts 7/9/9/2/2. Browser requests were forwarded to the isolated API to accommodate fixed default-port CORS. Required viewports 1440×900, 1024×768 and 390×844, plus 768px and exploratory body-text scaling. Saving/error captures use controlled delayed HTTP 500 without persistence. Verified all 87 PNGs, exact inventory/file matching, 115 local documentation links, unchanged application source, and `git diff --check`; isolated DB counts remain 7/9/9/2/2. No application test suite/build rerun is warranted for documentation/images only; prior O-006 gates remain historical evidence.

**Findings:** P0 month geometry/clipping, overflowing timeline reasons, malformed study-entry grid. P1 includes week sizing, low-contrast secondary/banner text, inconsistent controls and mobile/context density. Preferences about dated aesthetics remain P2. Preserve O-006 clinical workflows and open clinical questions. Assessment is a research handoff, not an approved design or implementation plan.

**Branch/commits:** `docs/ui-v0-readiness-research`, directly based on `feat/o006-clinical-workflows` at `30eafd1`. Evidence commit `7c3d61a`; audit/research commit `e5fa1af`; this final handoff records publication. [PR #8](https://github.com/Marguelgtz/nexus-med/pull/8) is open against `feat/o006-clinical-workflows`; branch pushed to origin. No merge performed.

**Historical handoff:** PR #8 completed the research-only mission. The subsequent owner UI v0 directive authorizes the current implementation above; Figma remains later and was not connected.

## 3. Most recent objective — O-006 full clinical workflow and UX implementation — COMPLETE

**Outcome:** Delivered the owner-authorized O-006 experience end to end through Next.js, Hono, shared contracts, Prisma/SQLite, tests, synthetic data, and synchronized documentation. PR #6 is the design/documentation parent; PR #7 contains the implementation. Both remain open and unmerged for owner review.

**Scope:** Implement the approved consultation workspace and patient context, independent study requests, conservative study review, appointment-to-consultation entry, contextual prescriptions/reports/follow-up, and patient workspace hierarchy. Preserve historical study associations and status values; do not add uploads, staff accounts, AI, external services, persistent drafts, appointment/procedure study links, or a procedure lifecycle.

**Ordered sub-objectives:**

1. **Complete — data/API foundation:** made encounter association optional; added patient-scoped creation with same-patient validation; retained the existing encounter endpoint/statuses; migration preserves existing study rows; API suite passes.
2. **Complete — canonical UX contract:** reconciled product, UI, workflow, API, data-model, decision, and redesign documents with authorized behavior and conservative status/association rules.
3. **Complete — consultation and study workspace:** added request-time patient/encounter context, on-demand prior notes, responsive note workspace, staged studies, patient-level create/review, and unsaved-change protection.
4. **Complete — patient workspace and care continuity:** prioritized safety context and current work; added appointment handoff, contextual prescriptions/reports, follow-up scheduling, and return paths.
5. **Complete — integrated verification and handoff:** full API/web tests, typecheck, lint, production build, isolated migration/seed/repeat startup, and headless Chrome flows passed; docs reconciled; implementation PR opened without merging.

**Dependencies and assumptions:** Start from O-005 at `1309b513` through the latest O-006 docs head `b63e806`. Use existing SSR reads where practical. Q-O006-02/03 remain clinically unresolved: retain `ordered`/`completed`/`reviewed`, preserve old rows, and do not label `completed` as performed or result-received. Do not introduce event timestamps or new status semantics without physician validation. Use `createdAt` only as entry time for standalone requests; do not claim it is the clinical order time.

**Deliverables:** Safe migration, Hono routes/services, shared DTOs/schemas, API integration tests, complete responsive workflow screens, updated normative product/API/UI/data docs, updated demo/test evidence, reviewable commits, and an open PR based on PR #6.

**Final verification (2026-11-09):** API 112/112; web 32/32; workspace typecheck and Next.js production build pass; ESLint exits 0 with the existing missing-`pages/` warning. Fresh isolated SQLite startup applied all five migrations and seeded the exact 7/9/9/2/2 demo counts; repeat startup had no pending migration and created zero records. The optional-study migration preserved both existing study rows and fields, associations, timestamps, indexes, and foreign keys. Headless Chrome verified the primary study, consultation, appointment handoff, contextual document/follow-up, unsaved-navigation, keyboard-operated mobile disclosure, and 390px responsive journeys. Default local `/health` and `/patients` returned 200 after applying the O-006 migration; seed created zero records.

**Acceptance:** All twelve criteria in the owner O-006 mission are met, including persisted patient and optional same-patient encounter study associations; explicit appointment linking/completion; preserved unsaved notes and patient context; no invented clinical facts; legacy study status values unchanged; accessible responsive behavior; O-005 regression coverage; verified clean startup/re-seeding; and an implementation PR left unmerged.

**Branch/PR:** `feat/o006-clinical-workflows` is based on `docs/o006-clinical-workflow-ux` at `b63e806`. PR #7 (`docs/o006-clinical-workflow-ux` ← `feat/o006-clinical-workflows`) is open for owner review. PR #6 (`feat/nx-expansion-complete` ← `docs/o006-clinical-workflow-ux`) remains open and unmerged. No PR was merged.

## 4. Most recent completed objective — O-005

### NX-Expansion — product expansion (NX-001…NX-004) — COMPLETE

**Desired outcome:** All four approved vertical slices work together: (1) patient appointments + basic calendar, (2) encounter types, (3) study requests + follow-up, and (4) printable prescriptions and medical reports. No new runtime dependencies, no speculative foundations, no full-EHR scope (D-023). A dedicated surgical/procedure lifecycle is excluded unless separately approved; this mission does not add one.

**Status:** Complete on `feat/nx-expansion-complete`, based on merged documentation commit `f176de0`. NX-001 commits: `16a0f1f`, `147efd6`. NX-002 commit: `7aca5ca`. NX-003 commit: `1bd6390`. NX-004 API foundation: `870ecff`; fixtures/seed: `66869cc`; UI, print, and synchronized docs: `e2d6590`.

**Reconstructed task board (2026-11-08):**

| Requirement group | Classification | Current evidence / remaining work |
|---|---|---|
| O-001–O-004 patient and encounter workflows | Implemented; prior verification recorded | Preserve these flows and rerun regression checks with the expansion integrated. |
| NX-001 appointment schema/API/forms/seed | Implemented and browser-verified | Created, edited, cancelled, reprogrammed, completed with 35-minute actual duration, linked to a same-patient consultation, and visible in patient history. API regression now maps duplicate consultation links to a 409 conflict and preserves the appointment on failed completion. |
| NX-001 calendar layout and date handling | Implemented and browser-verified | Day grid is 48 px/hour with 16 rows; out-of-window starts appear below; week view shows three chips plus overflow; invalid `fecha` returns route-level 404; month grid links to the appointment. |
| NX-002 encounter type persistence/edit/detail | Implemented and browser-verified | Created a `procedimiento` encounter, edited it through `urgencia` to `visita_domicilio`, and confirmed the saved type in detail and the patient timeline. The edit now exits edit mode after saving. |
| NX-002 timeline default badge | Implemented and browser-verified | Timeline shows non-default types and omits `Consulta`; detail retains its type badge. The new-form `beforeunload` guard now treats a changed type as dirty. |
| NX-002 surgical/procedure lifecycle | Explicitly deferred | Do not add a dedicated lifecycle without separate approval (D-025/Q-NX-01 and this mission). |
| NX-003 schema/migration/contracts/encounter-form/detail/fixtures | Implemented; focused API and browser flows verified | Exact fixtures and migrations remain unchanged. Existing nested encounter creation, detail transitions, and seed behavior are preserved; full regression suite remains. |
| NX-003 pending overview status | Reconciled and browser-verified | D-032 follows the explicit `TASKS.md` acceptance: ordered and completed remain pending until reviewed. The server filters both statuses and the card shows each status badge; reviewed studies leave the card. |
| NX-003 endpoint coverage | Implemented; focused API tests pass | Added shared contracts, `POST /api/encounters/:id/studies` (atomic, derives patient association), and repeatable `?status=` filtering; tests cover validation, association, status filters, and missing records. |
| NX-004 documents | Implemented and browser-verified | Models, routes, forms, overview, edit/detail, print, synthetic fixtures, and seed preservation are complete. Browser checks exercised create/edit/reload, line add/remove, validation recovery, 404 copy, and print output. |
| Integrated first run and existing MVP regression | Verified | Clean temporary database migrated and seeded 7 patients, 9 encounters, 9 appointments, 2 studies, and 2 documents; repeat startup created zero records, preserved edits, health passed, and `/` redirected to `/patients`. Full automated checks and all O-005 browser flows pass. |

**Decision reconciliation:** D-032 records the explicit `TASKS.md` acceptance: `ordered` and `completed` remain pending until reviewed. O-006 adds a patient-scoped create route where the patient ID comes from the route and an optional encounter must match that patient; the existing encounter-scoped route still derives the patient from the encounter. Nested encounter creation remains atomic. The open study-category confirmation remains recorded as Q-NX-02 and does not block the approved fixed list. D-025/Q-NX-01 remains deferred.

**Ordered execution stack:** (1) NX-003 acceptance and docs; (2) NX-004 database/API, fixtures and seed; (3) document overview, forms, edit/detail and print; (4) integrated clean-start, restart, regression and quality gate. All steps are complete and committed.

**NX-004 execution status:** (1) schema/migration/contracts/API/tests complete in `870ecff`; (2) synthetic prescription/report fixtures and idempotent edit-preserving seed complete in `66869cc`; (3) overview, prescription/report forms, detail/edit, print styling, and typed client complete; (4) browser create/edit/reload/validation/404/print checks and clean-start/restart/regression gates complete. No new runtime dependencies, uploads, PDF library, clinical generation, or legal/signature claims were introduced.

**Implementation queue (original plan; see slice status above for actual progress)** — each slice delivers UI + API + schema/migration + tests + docs in the same change, per D-017:

1. **NX-001** — `Appointment` model + endpoints; `/calendar` (day/week/month, CSS grid); patient appointment list/detail (edit, complete with actual duration + optional encounter link, cancel, reschedule); overview `Citas` card; demo appointments (fixed past + first-seed-anchored upcoming, D-029); `DEMO_DATA.md` update.
2. **NX-002** — `Encounter.type` field + migration (existing records → `consulta`); form/detail/timeline integration (U-12); surgical follow-through per conservative default D-031 (type field only; no surgery lifecycle — Q-NX-01 remains open for doctor validation).
3. **NX-003** — `StudyRequest` model + endpoints; studies section in the consultation form (repeatable rows); encounter-detail studies section with the ordered→completed→reviewed status flow; overview `Estudios pendientes` card; demo studies.
4. **NX-004** — `MedicalDocument` + `PrescriptionLine`; new prescription/report forms; detail + print (WYSIWYG paper card, `@media print`, printed demo marker); overview `Recetas e informes` card; demo documents.

**Dependency:** O-001–O-004 foundation (complete). **Exit condition per slice:** mission acceptance criteria met; docs reconciled in the same change; demo flow verified end-to-end. Expansion phase is defined in `TASKS.md` §6 (2026-11-08).

**Verification completed (2026-11-08):** Full API suite 107/107 and web suite 32/32 pass; workspace typecheck passes; lint exits 0 with the existing missing-`pages` warning; Next.js production build passes and lists all four dynamic document routes. Four migrations apply cleanly to empty SQLite test databases. Clean `npm run dev` on a temporary DB seeded 7 patients, 9 encounters, 9 appointments, 2 studies, and 2 documents; repeat startup created 0 and preserved an edited report. Browser verified prescription/report create, edit, reload, patient/optional same-patient encounter association, repeatable line add/remove, validation recovery, overview links, kind-specific 404, and print PDFs. Extracted PDFs contain the demo marker and authored content while omitting navigation, banner, controls, and screen-only copy. NX-001…NX-003 browser evidence remains recorded above and was preserved by the full regression suite. O-005 commits: `16a0f1f`, `147efd6`, `7aca5ca`, `1bd6390`, `870ecff`, `66869cc`, `e2d6590`.

### O-001 — Establish a solid database and API foundation

**Desired outcome:** A reliable, tested local data model and Hono API for the core patient and encounter workflows, backed by Prisma 7 and SQLite, with deterministic synthetic data and a reproducible local startup. The frontend may be scaffolded as a minimal shell for runtime verification, but no product UX/UI work should begin yet.

**Status:** Complete (2026-11-07). All sub-objectives A-001 through A-008 are done and verified.  
**Exit evidence:**

- 36/36 API integration tests pass (`npm run test -w apps/api`) against an isolated migrated SQLite database: CRUD, search, archive, associations, timeline ordering, validation field errors, seed idempotency/edit preservation/fixture counts, and transaction rollback.
- `npm run typecheck` is clean across all workspaces; `npm run build -w apps/web` (Next.js production build) succeeds.
- `npm run dev` verified end-to-end: prepares `.local/data`, applies migrations, seeds idempotently (7 patients / 9 encounters), starts API (`/health` ok) and Next.js; the `/patients` smoke page reports "API conectada" and the 7 seeded records.
- Local data persists across restarts in `.local/data/medical.db`; seed re-runs create nothing.
- Only the minimal shell exists; no product UI has been implemented.

**Branch / PR state:** Work committed on `main` in small logical increments; no remote push or PR created (no remote configured yet — see O-002 handoff for when to push).

#### Sequential sub-objective stack

| Order | ID | Sub-objective | Deliverable | Depends on | Acceptance / verification | Status |
|---:|---|---|---|---|---|---|
| 1 | A-001 | Inspect environment and repository | Environment report and safe Git baseline | None | Node/npm and repository/Git state inspected; existing owner changes preserved; no destructive commands | Complete — Git baseline on `main` |
| 2 | A-002 | Establish workspace and runtime skeleton | npm workspaces with `apps/api` and `apps/web`, plus `packages/contracts` if confirmed; organized source layout and minimal Next.js/Hono startup | A-001 | Both apps install and start independently; no product screens or UX assumptions added | Complete — workspaces + contracts confirmed |
| 3 | A-003 | Finalize and implement the initial relational model | Prisma 7 schema for Patient, medical background, and Encounter; reviewed SQLite migrations | A-002 | Relationships, nullability, indexes, date semantics, and archive behavior are verified against `DATA_MODEL.md` | Complete — initial migration committed |
| 4 | A-004 | Establish database operations and seed | Prisma client boundary, migration scripts, deterministic idempotent seed | A-003 | Clean DB migrates and seeds; repeat seed neither duplicates nor overwrites edits; local transaction rollback is tested | Complete — seed idempotency + rollback tested |
| 5 | A-005 | Build the Hono API foundation | Health route, patient/encounter query and command endpoints, server validation, consistent errors, explicit DTOs | A-003, A-004 | API supports core data workflows; no Prisma access outside API; invalid relationships are rejected | Complete — `GET /health` + patient/encounter domains |
| 6 | A-006 | Verify API and data contracts | API integration/contract tests and documented request/response behavior | A-005 | CRUD/search/archive and encounter association behaviors pass; contract and tests agree; no UI dependency | Complete — 36/36 tests |
| 7 | A-007 | Establish one-command local runtime | Root `npm run dev` migrates/seeds, starts API and minimal web shell, shuts down cleanly | A-002–A-006 | Local services run on loopback; API health and minimal SSR-to-Hono connectivity work; no remote service needed | Complete — smoke-tested end-to-end |
| 8 | A-008 | Review and close data/API foundation | Verified evidence and optional PR/PR stack | A-001–A-007 | Foundation exit criteria pass; docs, migrations, tests, commit history, and PR state match reality | Complete — docs reconciled (this update) |

**O-001 exit criteria:**

- Prisma 7 and SQLite work locally with committed, reproducible migrations.
- Patient, medical-background, and encounter relationships are represented correctly.
- Hono is the sole authoritative API and the only database access boundary.
- API request validation, response DTOs, error behavior, and relationship checks are explicit and tested.
- Synthetic fixture data can be loaded idempotently and is available through the API.
- Local SQLite transaction behavior is tested for representative multi-write operations.
- `npm run dev` starts the local services without manual database setup or remote dependencies.
- Only a minimal frontend shell/connectivity check exists; product UI implementation has not begun.

## 5. Queued objectives

### O-002 — UX and UI design

**Status:** Complete (2026-11-07). Deliverable: `docs/UI_SPEC.md`.  
**Exit evidence:** Spec covers all T-007–T-011 work: API capability reconciliation (no API/data gaps required; two client-level decisions recorded), information architecture and screen map (7 routes + 404), full screen specs for registry, create/edit patient, background edit, overview, consultation form, encounter detail/edit, archive flow, and not-found; state matrix and visual system (tokens, components, responsive, accessibility); all 14 P0 stories mapped to observable behavior (US-001…US-014); decisions U-01–U-08 recorded (§6.2). Owner can review screen structure, interactions, and visual direction before UI implementation.

**Outcome:** A validated, implementation-ready UX/UI specification based on the working data model and API contracts, before building product screens.

Planned sub-objectives:
1. Revisit the documented user workflows and map them to the actual API/data capabilities.
2. Define information architecture, navigation, screen inventory, and patient-context hierarchy.
3. Design key screens and interactions: patient registry/search, patient overview, medical background, consultation form, encounter detail, and timeline.
4. Specify loading, empty, error, validation, save, archive, and demo states.
5. Define a small visual system and reusable interaction patterns.
6. Produce `docs/UI_SPEC.md` (and design artifacts if useful) with enough detail to implement consistently.

**Dependency:** O-001 data/API foundation.  
**Exit condition:** The owner can review the screen structure, core interactions, and visual direction before feature UI implementation begins.

### O-003 — Product implementation in complete vertical slices — **COMPLETE (2026-11-07)**

**Outcome:** The doctor can use the patient and encounter workflows through the designed Next.js interface, backed by Hono and SQLite.

Planned implementation slices:
1. Application shell and navigation.
2. Patient registry, search, create, and edit.
3. Patient overview and medical background.
4. Encounter creation and consultation documentation.
5. Encounter detail and chronological patient timeline.
6. Integration, recovery states, and end-to-end workflow verification.

**Dependency:** O-002 UX/UI specification.  
**Important:** O-001 does not freeze the database schema or API. During O-003, change Prisma models, migrations, Hono endpoints, validation, and contracts whenever real implementation or UX requirements justify it. Every such change must be deliberate, tested, migrated safely, and reflected in the relevant docs. Prefer vertical slices that include the UI, API, persistence, and tests needed for a complete user outcome.

### O-004 — First-run demo and local reliability — **COMPLETE (2026-11-07)**

**Outcome:** The app opens to a populated patient registry with a clear Spanish demo warning and preserves changes across restarts.

Planned sub-objectives:
1. Ensure the exact checked-in fixture is seeded on first startup.
2. Redirect `/` to `/patients` and display `MODO DEMOSTRACIÓN — DATOS FICTICIOS` (canonical copy: `UI_SPEC.md`).
3. Verify all 7 synthetic patients (6 active, 1 archived) and 9 encounters appear in the correct contexts.
4. Verify idempotent startup, persistence, and preservation of edits/user-created records.
5. Run the final end-to-end and offline-runtime checks.

**Dependencies:** O-001 seed/API foundation and O-003 product UI.

## 6. Current blockers and technical questions

No implementation blocker remains. Owner review is pending on PR #7. Pending-study visibility follows `TASKS.md` acceptance (`ordered` and `completed` until `reviewed`); underlying clinical meaning remains open under Q-O006-02/03. The patient-study migration preserves existing associations and adds validated optional same-patient association. A fresh empty SQLite path initially caused Prisma 7 to emit an empty “Schema engine error”; append-opening the database file before migration fixes startup while preserving an existing database. This is covered by the clean-start/API test setup and verified on the fresh local run.

Resolved during O-001 (implementation findings now recorded in `DECISIONS.md`):

- Prisma 7 works locally with `@prisma/adapter-better-sqlite3` (export is `PrismaBetterSqlite3`), committed migrations, and transaction rollback (D-019).
- Prisma 7 forbids `url` in the schema datasource and its config loader cannot import modules; `prisma.config.ts` is self-contained and assumes the repo root as cwd.
- Validation uses the shared `packages/contracts` zod schemas in one place (no duplicated schemas); zod 4 reports strict-mode extras as one empty-path issue with a `keys` array, fanned out per field in `parseOrThrow`.
- The dev orchestrator (`scripts/dev.mjs`) starts API then frontend, waits on `/health`, and tears both down on either failure; Ctrl+C stops both cleanly.

Do not allow future Cloudflare/D1 transaction constraints, Google authentication, or file storage to block local work. No O-005 implementation blocker remains. Q-NX-01 remains explicitly deferred; Q-NX-02 remains a doctor-validation follow-up for the provisional fixed study-category list and does not block the documented acceptance criteria.

## 7. Next action

Owner review of [UI v0 PR #9](https://github.com/Marguelgtz/nexus-med/pull/9). Review/merge prerequisites in dependency order: PR #6 → PR #7 → PR #8 → PR #9. All remain subject to owner merge authority. Later Figma exploration should start from the working UI and `UI_SPEC.md` §9, keeping clinical questions Q-O006-01…08 open.

## 8. Living update rules

Update this file as work progresses, not only at phase boundaries. Record meaningful status changes, actual evidence, blockers, branch/commit/PR state, and the next action. Do not record every command or trivial edit.

At the end of a substantial session, leave a handoff with current objective, active sub-objective, work completed, verification performed, blockers, PR stack state, and next action. Keep `TASKS.md` phase-level and update it only at a phase boundary or material scope change. Append to `PROJECT_HISTORY.md` only for significant milestones or durable findings.
