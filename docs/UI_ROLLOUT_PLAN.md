# Proposal 2 — application rollout plan

**Owner request:** 2026-11-12. **State:** planned, no product implementation yet. Visual reference: `/exploracion-ui-2`, commit `4fb3557`. Adoption decision: D-051. Readability: D-050. ACTION_PLAN.md tracks execution; this document defines the rollout contract.

## Intended outcome and boundaries

Apply the approved midnight sidebar, cobalt actions, white/cool workspaces and firm typography to every application screen. Make movement between reception, patients, clinical work and follow-up predictable. Keep Spanish (Mexico), local assets, exact synthetic fixtures, existing HTTP contracts, SSR reads, authorization and persisted saves. The preview's temporary state must never replace production data flows.

Include authenticated physician, secretary and demo views; all patient routes; calendar/reception; studies and received attachments; prescriptions/reports and print; login, invitation/registration information, verification, reset and access management. Marketing content and Cloudflare hostname migration are separate work. No clinical meaning, automatic appointment completion, draft storage, permission expansion or database migration is proposed.

Retain both sample routes for comparison. The live app remains available through its existing routes throughout migration; comparison with the original is retained through Git, not a duplicate production application. New UI claims require new verification.

## Navigation and interaction decisions

- **Global navigation:** permanent desktop sidebar with Recepción, Pacientes, Calendario and Estudios, using existing permission/session rules. Secretary sees authorized administrative destinations. Account, demo-view selection, access management and logout remain available. Never expose a clinical destination merely by restyling the secretary view.
- **Patient navigation:** identity strip above Resumen, Citas y consultas, Estudios, Recetas e informes. Use a compact section row on desktop rather than a second large sidebar. Wrap or disclose sections on small screens. Keep patient identity visible in long forms without consuming the entire mobile viewport.
- **Active states:** highlight one global destination and the relevant patient section, including nested study details, appointment details, consultation create/edit, prescriptions and reports. Global Estudios and a patient's Estudios have distinct context labels. Preserve existing legacy redirects and hash entry points.
- **Mobile navigation:** labeled menu button opens an accessible drawer with visible close, Escape, focus containment/restoration and current location. Closing the menu does not navigate or discard work. No hover-only actions or icon-only primary destinations.
- **Directory:** production search/filter use the existing API. Cards and a demographic preview follow Proposal 2. Preview selection has an explicit Abrir expediente action to the real patient route; clinical history stays in the patient workspace. Preserve query/filter in the URL so returning restores the list. Avoid automatic navigation when selecting a card.
- **Registration:** Nuevo paciente opens the real full-page form. Save persists through the current typed API client, then returns to the initiating workflow with the new patient selected, or opens the patient summary from the registry. Cancel returns to a validated internal origin; dirty input requires confirmation. Reuse demographic fields and validation, not the transient preview form.
- **Contextual actions:** keep small appointment/study actions in accessible dialogs when that preserves the consultation draft. Long clinical notes, registration, full document editors and historical records use pages. Do not replace clinical shortcuts with navigation that silently loses work.
- **Return paths:** use explicit internal destinations for Volver/Cancelar; never rely solely on browser history. Retain patient, appointment and encounter association through create/edit/detail/save. Validate any return parameter as an allowed internal route; refresh/direct entry must have a sensible fallback.
- **Feedback:** consistent primary action per task; busy/disabled states; announced success/errors; field errors and first-invalid focus. Failed writes retain values and do not show success. Destructive/archive actions remain explicit and separate from navigation.

## Ordered implementation slices

### 1. Shared visual foundation and shell

Move the approved palette/spacing into authoritative app tokens, then update shared buttons, inputs, badges, empty/error/loading states and dialogs. Replace TopBar/AppFrame global navigation with the sidebar; retain skip link, session controls and guards. Use Segoe UI/Verdana local fallback; 18px primary content and inputs, 16px functional labels, 14px auxiliary copy only, firm weights and generally 52px primary controls. Keep contrast/focus boundaries visible. Scope print rules explicitly.

**Deliverable:** working authenticated shell across current routes with sidebar and responsive navigation. **Gate:** role/view switching, logout, active nested routes, keyboard drawer behavior and dirty navigation work; no broken main-content layout. Fix inherited nested-study active-state gap during navigation migration.

### 2. Patient directory and patient workspace

Implement API-backed cards/preview/search/filter, page registration and demographic/background edits. Establish patient identity/section navigation and migrate summary, activity and archive controls. Preserve unknown versus negative findings and archived restrictions.

**Deliverable:** complete find → register/open → edit → activity journey. **Gate:** real saves survive reload; returning preserves directory search; registration from reception/consultation selection resumes the correct workflow; direct links and legacy routes still resolve.

### 3. Practice operations

Migrate reception date/list/actions, secretary contact/arrival/receipt workflows and day/week/month calendar. Keep dense chronological/schedule information in aligned lists or calendar grids rather than forcing every screen into patient cards. Retain explicit start/arrival/completion and cross-view refresh behavior.

**Deliverable:** coherent operational workspace. **Gate:** found and newly registered patients can be scheduled/seen; arrival and consultation start remain role-appropriate; changing date/view does not invent status transitions or lose context.

### 4. Clinical workspace and follow-through

Migrate consultation stages, read-only safety context, historical note detail/edit, staged studies, global/patient study lists/details, receipt attachment workflows and physician review. Then migrate prescriptions/reports, medication rows, follow-up shortcuts and print layouts. Preserve all seven note fields, atomic note/study creation, independent follow-up, same-patient associations and explicit appointment completion/linking.

**Deliverable:** complete clinical journey with the approved visual system. **Gate:** unsaved protection works across sidebar, sections, shortcuts, history and unload; failed saves keep notes/studies; receipt upload never implies physician review; printed documents retain authored content and exclude navigation.

### 5. Account screens and integrated finish

Apply the same form system to auth/invitation/verification/password recovery and access management. Preserve current account eligibility and error behavior. Audit every route, transient state, mobile layout and print output; remove obsolete product styles after all consumers migrate. Reconcile UI_SPEC, WORKFLOWS and TESTING with actual behavior.

**Deliverable:** consistent application, with screenshots and verification evidence. **Gate:** all acceptance journeys below pass; unresolved limitations are documented honestly. Remote deployment is a separate delivery step after verifying the completed implementation and valid hostname configuration.

## Dependencies and Git delivery

Shell/tokens precede screen migration; patient identity and return behavior precede operations/clinical changes. Shared CSS/navigation edits run sequentially. No delegation is planned. Each slice ends with focused checks and a coherent commit. Use dependent `codex/` branches when separate reviews help: shell → patients → operations → clinical → integrated finish. Open PRs only when useful; leave UI feature PRs unmerged without owner authorization. Do not bundle hostname changes into these commits.

## Acceptance journeys and verification

| Journey | Required evidence |
| --- | --- |
| Physician navigation | Reception → patient → activity → appointment/consultation → detail → patient; correct active items, patient identity and explicit return throughout |
| Registry | Search/filter → preview → expediente → back restores search; no-results/reset, archived records and error/retry work |
| Registration | Registry and contextual entry; required/invalid input; cancel/dirty exit; successful persisted save; return selects correct patient |
| Clinical record | Background and demographics persist without altering old notes; all note sections save/reload; historical note edit stays on correct patient |
| Consultation continuity | Staged studies, historical note/context, prescription and follow-up shortcuts preserve draft; link/complete appointment only on explicit action |
| Operations | Reception date, calendar views, new/edit/cancel/reschedule appointments, secretary arrival and direct consultation start work |
| Studies | Standalone and encounter requests, received files and detail navigation, explicit physician review; cross-view refresh preserves dirty receipt forms |
| Documents | Create/edit/reload prescription/report, add/remove medication rows, correct patient/encounter, readable browser print without app chrome |
| Session/access | Physician, secretary and demo boundaries, view switch, logout, restricted direct links, auth errors and account flows remain correct |
| Recovery | Simulated save/network failures retain input, retry succeeds without duplicate records; cancel/Escape/back restore sensible focus/context |

Run typecheck, lint, existing web tests and production build at relevant slice boundaries; API tests when a contract/domain interaction changes, and focused integration tests for affected persistence behavior. Add regression tests only for meaningful navigation/data-loss risks. Exercise browser journeys with deterministic synthetic data and inspect persisted results, not just screen rendering.

Inspect 320/390/768/1024/1440px, 200% browser zoom, keyboard-only navigation, focus restoration, dialog/drawer semantics, accessible labels/announcements and contrast. Allow local scroll for genuine calendar/table structures where necessary, not page-wide overflow. Record screenshots of directory, patient summary, long consultation, reception, secretary, calendar, studies, document editor and print. Intended-user comfort still needs feedback from users in the target age range; automated checks cannot establish that.
