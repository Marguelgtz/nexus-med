# Security and Prototype Boundaries

## Prototype status

This is an experimental local prototype, not a production medical-record system and not a declaration of compliance with any law or certification standard.

**Use synthetic data only.** Do not enter real patient names, contact details, medical histories, scans, reports, or other identifiable health information. Demo records must be unmistakably fictional and must be labeled in the UI.

## Local development

- Bind Next.js and Hono to `127.0.0.1` by default.
- Do not expose development services through a public tunnel or public network interface.
- Do not use remote/production Cloudflare bindings.
- Do not load external assets or call third-party services at application runtime; the prototype must work offline after dependency installation.
- Keep `.local/`, SQLite database files, `.env` files, secrets, uploads, and generated runtime data out of Git.
- Do not log clinical note bodies or personal identifiers.
- After dependencies are installed, all prototype workflows should work without internet access.

## Application design

- Treat patient and clinical data as sensitive even in the prototype.
- Validate all untrusted input in Hono; client validation is only for usability.
- Keep database access on the API server.
- Avoid logging clinical content, identifiers, credentials, tokens, or file contents.
- Do not implement authentication in the prototype. This is acceptable only while both services are bound to loopback and only synthetic data is used.
- File storage is out of prototype scope; do not implement upload endpoints or public file URLs.
- Before any remote deployment or real patient data, require authentication and authorization. Google OAuth/OIDC, session handling, callback URLs, and access policy remain open.

## Demo data

- Seed data must be fictional and clearly marked.
- Do not use realistic phone numbers or real email domains; omit contact details or use `.invalid` test domains.
- Demo notes must state that they are fictional and not for actual care.
- Seed scripts must not delete user-created records or overwrite edited records.

## Before any real-data pilot

A separate review is required for the applicable jurisdiction, hosting configuration, authentication/authorization, encryption, backups, retention, auditability, incident response, vendor terms, and legal/clinical obligations. These requirements are deliberately not implemented as a full compliance program in this prototype.

## Pending future security decisions

- Google OAuth/OIDC integration and session handling.
- Authorization policy for a remotely reachable deployment.
- Private object storage and document access controls if R2/file storage is added.

## D-044/D-045 prototype boundary update

Secretary/Physician are unauthenticated views of the same local synthetic dataset; UI differences do not enforce authorization. Services remain bound to loopback, CORS limited to the local frontend; do not expose this runtime to a network. Secretary screens use administrative DTOs and do not render clinical notes or physician review notes.

Local received-study PDFs/PNGs/JPEGs are owner-approved. Hono bounds request/file sizes, validates signatures and patient associations, uses generated opaque storage keys, and serves file bytes with no-store/nosniff/sandbox headers. Files reside beside SQLite outside Git/public assets. Use synthetic attachments only. Preserve both DB and files in any local backup. This approval adds no real patient-data handling, legal document claims, remote storage or authentication.
