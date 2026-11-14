# Pilot authentication and clinic access

NM-PILOT-001, implementation reference, November 13, 2026. This supplements
`SECURITY.md` and `API_CONTRACT.md`; release verification remains in
`ACTION_PLAN.md`. Only synthetic data has been used in the automated checks.

## Identity and onboarding

Better Auth owns identity, email verification, password credentials, OIDC and
server-side sessions. `User.role` is retained for legacy/demo compatibility;
ordinary application permissions come from an active `ClinicMembership`,
resolved from the database on every request. An inactive clinic or revoked
membership never grants domain access.

Email signup creates a **pending, unverified identity**, regardless of supplied
role/verification fields. Signup grants no clinical or administrative clinic
permissions. After verification and login, `GET /api/session` returns
`onboardingRequired: true`, a null clinic and false capability flags.

`POST /api/onboarding/clinic` accepts only `{name, timezone?}`. The supported pilot
timezone is `America/Mexico_City`; the field is retained in the model for later
multi-timezone support. Verified identities can create a new clinic and become
its doctor and administrator. They cannot choose an existing clinic ID or
assign privileges through the request. Stable per-user bootstrap IDs and one
atomic SQL batch make retries safe on SQLite and D1. Retrying with an existing
active membership selects that clinic without creating or renaming one.
Revoked bootstrap memberships are not silently restored.

`GET /api/session` returns the effective user role, selected clinic, onboarding
state and capability flags. `Session.activeClinicId` pins the chosen membership.
When absent, the earliest active membership is the initial primary clinic. The
pilot UI assumes one primary clinic; it does not offer a general clinic switcher.
Invitation acceptance explicitly selects the invited clinic for that session.

## Permissions

Clinic administration is independent of clinical authoring. `isAdmin` grants
membership administration; it does not turn a secretary/administrator into a
doctor. There are no application staff-count limits.

| Operation | Doctor | Secretary / administrator | Pending / anonymous |
|---|---|---|---|
| Administrative patient list/contact/create/update | Yes | Yes | No |
| Calendar, scheduling, cancellation, arrival/undo arrival | Yes, assigned schedule rules apply | Yes | No |
| Clinical background, encounter notes, studies, documents | Yes | No | No |
| Start/complete attention and link encounter | Yes, assigned schedule rules apply | No | No |
| Receive studies and open authorized received files | Yes | Yes | No |
| Physician study review | Yes | No | No |
| Invite/list/revoke clinic members | Only with `isAdmin` | Only with `isAdmin` | No |
| New-clinic bootstrap / invitation acceptance | Verified identity | Verified identity | Verified pending identity only |

Doctor access to longitudinal clinical records is shared within the clinic.
Clinical author and last editor remain separately attributed. Version-aware
edits prevent stale forms from silently overwriting another editor's changes.
Read visibility does not permit a nonadmin doctor to mutate another assigned
appointment. The explicitly supported unassigned state remains available.

The reserved demo identity is confined to the separate demo domain database.
Its view preference is per session. It cannot bootstrap a clinic, accept staff
invitations or manage access. Unverified/disabled identities and expired
sessions receive no application access.

## Invitations and revocation

Administrators with a session created within the last ten minutes may create a
72-hour invitation for a doctor or secretary. Both new and existing identities
are supported. Invitations contain clinic, intended role, normalized email,
issuer, expiry and a token hash; only the email contains the raw opaque token.

`POST /api/auth/prepare-invitation` validates a token and exposes only its email,
role, clinic name and expiry. It creates no membership and consumes nothing.
`POST /api/invitations/accept` requires an authenticated, verified identity with
the exact invited email. The server derives clinic and role from the invitation.
A conditional atomic batch creates/reactivates the membership and consumes the
invitation together. A revoked/expired/mismatched invitation cannot grant access.
A repeated acceptance by its already accepted identity is idempotent while the
membership remains active; it never resurrects a revoked membership.

Membership revocation is clinic-scoped and does not disable the global identity.
It invalidates sessions selecting that clinic, preserves clinical authorship and
retains membership history. Self-revocation is denied. Conditional writes check
that the acting administrator remains active, preventing two administrators
from simultaneously removing all administrators.

## Sessions, email and security boundaries

Sessions use HttpOnly, SameSite=Lax cookies and Secure cookies in deployed
runtimes. Cookie caching is disabled so database revocation is immediately
observed. The server session has a one-day lifetime with refresh and a seven-day
absolute cap. A missing/expired session or lookup failure fails closed.

The session-refresh hook resolves the loaded session from Better Auth's endpoint
context: refresh patches contain only expiry/update fields, not the session ID.
A controlled regression test exercises this behavior. Browser cookie renewal
requires a browser request to `/api/auth/get-session`; an internal SSR lookup
alone cannot write a browser cookie.

Unsafe requests require the canonical application Origin. Loopback origins are
accepted only by the local runtime; request Host/URL never adds trust. Better
Auth origin and CSRF validation are explicitly enabled even under test mode.
Rate limits use persistent hashed keys. Auth emails use the encrypted durable
outbox. Password-reset tokens are short-lived and single-use; reset revokes old
sessions. Tokens, passwords and clinical text are not included in auth logs.

## Google configuration and verification boundary

Google is conditionally enabled only when both provider variables are present.
Missing credentials leave email authentication operational and hide Google UI.
Better Auth owns state/CSRF validation, authorization code exchange and sessions;
implicit account linking is disabled. An existing password identity must use its
password or explicitly link the provider from an authenticated account, rather
than gaining a link solely from an email match.

Owner setup:

1. Select/create a Google Cloud project and configure its OAuth consent screen.
   For a controlled external test, add the intended synthetic tester accounts.
2. Create an OAuth client of type **Web application**.
3. Add the precise application's callback URI, including host and port:
   local `http://127.0.0.1:3000/api/auth/callback/google` (or the matching localhost
   base URL); deployed
   `https://nexus-med-app.marguel-gtz.workers.dev/api/auth/callback/google` for the
   currently configured app host. Custom domains must use their own exact URI.
4. If Google requests an authorized JavaScript origin, use the matching app
   origin, without a callback path. No client secret belongs in browser code.
5. Supply `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to the API runtime, and
   ensure `APP_BASE_URL` is exactly the canonical app URL. Local development uses
   the same variable names; keep local secrets outside Git.
6. For Cloudflare, set the two provider values as API Worker secrets through the
   existing Cloudflare setup flow or the Worker secret tooling. Deploy API and
   app through the documented deployment procedure. Never include secrets in PRs.
7. Verify the enabled option, consent/cancellation, returning Google identity,
   verified new-doctor onboarding, invitation acceptance, logout and denied
   disabled identities in the deployed environment.

Controlled tests prepare the Google authorization URL, canonical callback, scope,
state cookie, invalid-state rejection, untrusted redirect denial and disabled
provider behavior with synthetic client values and no Google network exchange.
They **do not establish successful Google token exchange or real SMTP delivery**.
Those are credential-dependent deployment gates.

Official references checked for this implementation:
[Google provider](https://better-auth.com/docs/authentication/google),
[Users and accounts](https://better-auth.com/docs/concepts/users-accounts),
[Session management](https://better-auth.com/docs/concepts/session-management).

## Verification

Focused command:

```sh
npm run test -w apps/api -- test/auth-authorization.test.ts test/clinic-auth.test.ts
```

The tests use actual Better Auth request handlers, encrypted captured emails,
verification/reset links, server sessions and SQLite persistence. They cover
signup privilege injection, pending denial, retry-safe onboarding, two doctors
and two secretaries with separate sessions, invitation roles/existing accounts,
revocation, nonclinical administrators, expiration, reset reuse, logout, refresh,
absolute age, OIDC preparation and trusted-origin enforcement. Full integrated
clinical, browser and D1 evidence is recorded separately; these focused tests
alone do not establish pilot readiness.
