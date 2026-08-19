# Security

The threat model is an internal tool — and "internal" never excuses trusting the
client. Every rule below is enforced server-side; the UI only mirrors it.

## Authentication

- All authentication is delegated to Keycloak (ADR-0002). This codebase contains no
  password handling, no token issuance, no session storage.
- The API validates the OIDC JWT (issuer, audience, signature via JWKS, expiry) on
  every request behind a global guard; public routes are explicitly allow-listed,
  not the reverse.

## Authorization — server-side, always

- Angular route guards and hidden buttons are UX. Every rule is enforced again in
  the API:
  - Users mutate only their own requests/comments/votes/profile — ownership checked
    against the JWT subject in the service, not trusted from the payload.
  - Admin routes require the realm `admin` role from the verified token.
- The integration suite carries the authorization matrix for every mutating
  endpoint (see testing.md). This is the enforcement mechanism, not code review
  vigilance.

## Input handling

- Every request body/query is parsed through its zod schema from `packages/types`;
  unknown fields are stripped. Nothing reaches a service unvalidated.
- IDs from the URL are validated for shape and existence; ownership errors return
  404 (not 403) where distinguishing would leak existence of others' resources.
- All DB access goes through Drizzle's parameterized queries; no string-built SQL.
- User text (descriptions, comments) is stored raw, rendered as text by Angular's
  default sanitization — never through `innerHTML`.

## Operational

- Secrets come from environment/k8s secrets; nothing secret in the repo — compose
  uses obvious dev-only values, and `.env.example` documents every variable.
- Rate limiting on submissions per user is an admin setting enforced in the API.
