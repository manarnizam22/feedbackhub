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

Policy is defined once as CASL abilities in `packages/auth` (ADR-0008), enforced
in the API against fetched entities, mirrored in Angular for visibility only.
The matrix:

| Subject          | Action           | User | Admin | Condition                |
| ---------------- | ---------------- | ---- | ----- | ------------------------ |
| Request          | read             | ✅   | ✅    | not deleted (else 404)   |
| Request          | create           | ✅   | ✅    | rate-limit setting       |
| Request          | update content   | own  | own   | `authorId = user.id`     |
| Request          | set status / pin | ❌   | ✅    |                          |
| Request          | delete           | own  | ❌    | admins decline instead   |
| Vote             | cast / withdraw  | own  | own   | `userId = user.id`       |
| Comment          | create           | ✅   | ✅    | approval setting         |
| Comment          | update           | own  | own   | `authorId = user.id`     |
| Comment          | delete           | own  | any   | admin = moderation       |
| Comment          | approve          | ❌   | ✅    |                          |
| Category, Status | manage           | ❌   | ✅    |                          |
| App settings     | manage           | ❌   | ✅    |                          |
| Account/profile  | read / update    | own  | own   | `id = user.id`           |
| Account          | delete           | own  | ❌    | personal, even to admins |
| Audit log        | any              | ❌   | ❌    | write-only in v1         |

- Ownership evaluates against the loaded record and the verified JWT subject —
  never against anything the client sent.
- Admin = realm `admin` role from the verified token.
- The integration suite mirrors this table row by row: for every mutating
  endpoint — anonymous, non-owner, owner, admin. The matrix is the test plan.

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
