# Security, Clinic Isolation and Pilot Boundaries

## Current authorization and data boundary — NM-PILOT-001

**Synthetic data only.** The mission authorizes a multi-user clinic pilot and the existing authentication/private-storage/Cloudflare stack. It does not establish real-patient readiness, certification or legal compliance. D-046 removes visible fictional-data labels from application chrome/prints; it does not authorize identifiable patient data.

Better Auth owns email/password verification, recovery, sessions and optional Google OIDC. Account role and session clinic fields are server-owned. Signup creates a pending identity, not clinical access. Only a verified authenticated non-demo identity can bootstrap its own clinic or accept a matching invitation. Clinic bootstrap is idempotent; invitation role/clinic/expiry/issuer come from the server grant. Existing accounts need explicit verified acceptance, not just an email match.

Membership and clinic status are resolved from the database on every request. `isAdmin` controls membership administration independently from `doctor`/`secretary`/`administrator` clinical role. Revocation removes the selected clinic grant and applicable sessions without changing historical records. Disabled/unverified accounts are denied. Secure production cookies are HttpOnly/SameSite=Lax; cookie caching is disabled. Better Auth origin/CSRF protection stays enabled; Hono also checks unsafe-request origins and persists rate limits. A role-aware sidebar is not the access-control boundary.

### Permission matrix

| Identity / capability | Administrative patient/scheduling/reception/receipt | Protected clinical history, note/document authoring, study review | Membership management |
| --- | --- | --- | --- |
| Active clinic doctor | Allowed; non-admin doctor controls own assigned schedule | Allowed within clinic, with immutable original author | Only with separate `isAdmin` |
| Active clinic secretary | Administrative DTOs and permitted operations only | Denied, including direct API calls | Only if separately granted administration capability; no clinical powers |
| Active clinic administrator | Administrative operations | Denied unless clinical doctor role is separately applicable | With `isAdmin` |
| Demo doctor/secretary view | Corresponding allowed operations in separate demo persistence | Doctor view only, no fabricated real author | Denied |
| Verified identity without membership | Onboarding/explicit invitation acceptance only | Denied | Denied |
| Unauthenticated, unverified or disabled | Denied except public auth/options/demo entry | Denied | Denied |
| Revoked membership | Denied in that clinic; other valid memberships are separate | Denied in that clinic | Denied in that clinic |

All lists, details, writes, searches and file lookups constrain clinic ownership. Every supplied patient/encounter/order/document/doctor association is validated in clinic scope. Cross-clinic IDs must not expose records through SSR or nested references. Secretary DTOs omit notes/background/review text; physician-only start/completion/review/authoring operations remain enforced in Hono. Stored clinical authors are not overwritten by edits or substituted by the current viewer in print.

## Local and deployed-runtime controls

- Local Next.js/Hono bind to loopback. Do not expose development services or local email capture through tunnels. Core local workflows use installed/local assets and remain independent from Google/SMTP connectivity.
- Keep SQLite files, `.local/`, `.env*`, `.dev.vars`, uploads, secrets and generated runtime data out of Git. Never log notes, identifiers, credentials, tokens or private file contents. Public errors omit internals.
- Next development request logging is disabled because URLs may contain tokens or identifiers. Worker configuration enables query-string redaction and disables automatic invocation logs while retaining application logs; deployment and deployed-log verification are still pending. Application logging must also avoid sensitive values.
- Product data remains in Hono; Next.js SSR/browser requests use explicit `no-store` and authenticated same-origin/API service transport. Database access never moves into frontend components.
- Practice and demo use separate database storage and R2 prefixes. Existing configured cloud resources are not staging. [Operations](PILOT_OPERATIONS.md) defines isolated targets and recovery; this document does not claim deployment verification.
- PDF/PNG/JPEG receipts use MIME/signature, size/count and same-patient checks, opaque keys, private storage and authorized downloads with no-store/nosniff/sandbox headers. DB metadata and actor associations stay distinct from clinical review. Backups must include both database and attachment bytes.
- Conditional version/state writes protect existing records. Multi-record note/study/document operations use SQLite transactions or D1 atomic batches; failed document version guards roll back prescription-line replacement. Version conflicts are surfaced to users, not retried silently.
- Sessions, token validation and membership controls reduce risk; they are not a complete clinical audit/record-signature, incident-response or regulatory compliance platform.

## Google OAuth configuration handoff

The implementation uses the existing Better Auth Google provider, scopes `openid email profile`, provider-managed callback/state handling and explicit account linking (implicit email-based linking disabled). Missing provider credentials leave Google disabled and its buttons hidden. Real Google round-trip verification remains credential-dependent; mocks/options checks do not prove provider login.

1. In the clinic owner's Google Cloud project, configure Google Auth Platform branding, audience/consent and allowed test users while testing. Create an OAuth **Web application** client. Request no Drive/Gmail/clinical-content scopes.
2. Configure the exact browser origin and callback. For a consistent local test, start with `APP_BASE_URL=http://localhost:3000` and browse that origin; register `http://localhost:3000/api/auth/callback/google`. For the isolated deployed pilot use `https://PILOT-APP-HOST/api/auth/callback/google`, replacing the host with the reviewed frontend origin. Authorized JavaScript origins, if configured, contain the corresponding origin only, without a callback path. Do not use the private API Worker hostname for browser callbacks.
3. Set server-side `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_BASE_URL` and a strong environment-specific `BETTER_AUTH_SECRET`. Local Node startup reads process environment; `apps/api/.dev.vars` is for Wrangler local runtime and is not automatically loaded by `npm run dev`. Never expose provider secrets through `NEXT_PUBLIC_*` or commit them.
4. For the reviewed isolated Worker config, set secrets using interactive commands such as `npx wrangler secret put GOOGLE_CLIENT_SECRET --config /absolute/local/pilot-api.wrangler.jsonc`; similarly configure the client ID/auth/SMTP secrets on the API Worker. Secret changes are external deployments: confirm the exact isolated target and follow the existing staging/deployment policy. Keep `APP_BASE_URL` consistent across API and frontend configs and Google Console.
5. Verify `/api/options` hides Google without both values, then exercise successful existing-user login, new verified doctor onboarding, invitation acceptance, cancellation/error return, unverified/mismatched account denial, disabled/revoked access and external-redirect rejection. Confirm secure cookies and no secret exposure over HTTPS. Account collisions must require explicit linking rather than silently attach an identity based solely on email.

Callback conventions and provider setup were checked against [Better Auth Google documentation](https://better-auth.com/docs/authentication/google) and [Google OpenID Connect configuration](https://developers.google.com/identity/openid-connect/openid-connect). [Operations](PILOT_OPERATIONS.md) records deployment/restore boundaries; current test results belong to `TESTING.md`.

## Real-patient readiness: open Mexican clinical/privacy review

This is a technical review inventory, not a legal determination. Before real data, the clinic's responsible professionals must assess the actual use, provider arrangements and current applicable rules. Synthetic pilot testing may continue independently.

- **Private-sector privacy:** the Cámara de Diputados current LFPDPPP text identifies the new law published March 20, 2025, with latest listed reform November 14, 2025. Health data are sensitive. Review lawful purposes, explicit written sensitive-data consent and applicable exceptions, privacy notices, access/rectification/cancellation/opposition handling, processor/vendor terms, international transfers, security measures and breach response. The current app does not supply this complete operational/privacy program. Use the current law rather than assuming old article numbering or authorities. [Official LFPDPPP](https://www.diputados.gob.mx/LeyesBiblio/pdf/LFPDPPP.pdf).
- **Clinical records:** NOM-004 requires review of record content, confidentiality and preservation, including the minimum five years from the last medical act (§5.4), and author/date/time/signature requirements (§5.10). Persisted author attribution and ordinary browser prints alone do not establish a legally sufficient clinical signature or record. Assess correction history, retention, export and clinician credentials against the actual services. [Official NOM-004-SSA3-2012](https://www.diariooficial.gob.mx/nota_detalle_popup.php?codigo=5272787).
- **Electronic health-record systems:** NOM-024 addresses SIRES scope, confidentiality/integrity, access, traceability, information exchange and conformity assessment. Obtain a qualified applicability/gap assessment for Nexus Med's intended operation and applicable DGIS guides. There has been no conformity/certification assessment. Do not describe the application as NOM-024-certified or infer compliance from tests. [Official NOM-024-SSA3-2012](https://dof.gob.mx/nota_detalle_popup.php?codigo=5280847).

Remaining technical/operational gates include independent security review, isolated remote D1/R2 restore, measured backup/retention/RTO/RPO, deployed access/cookie/storage checks, SMTP/Google provider validation, incident ownership and approved access policy. See `PILOT_OPERATIONS.md` and the living release gates; never classify an untested control PASS.

## Historical scope evolution

The original local MVP excluded authentication, staff roles, remote infrastructure and files. D-044/D-045 then authorized an unauthenticated local secretary view and received-study attachments. Those restrictions described earlier prototypes and are superseded by the current clinic/auth/cloud mission. Useful enduring boundaries remain: synthetic fixtures, explicit physician review, private file handling, preserved history, loopback-only local development and no unsupported compliance claims.
