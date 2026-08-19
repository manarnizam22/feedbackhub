# Testing

Tests verify intent, not implementation. A test that cannot fail when business logic
changes is worthless; a test asserting a mock was called usually is one.

## Levels and what belongs at each

- **Unit (Vitest)** — pure logic: settings resolution (defaults vs user overrides),
  validation schemas, vote toggling rules, sorting/pinning order. Fast, no I/O.
- **API integration (Vitest + real Postgres via testcontainers)** — every endpoint's
  contract: happy path, validation failure, and — non-negotiable — the authorization
  matrix: anonymous vs user vs owner vs admin for each mutating route. Auth is
  faked at the JWT boundary (verified test tokens), never by disabling guards.
- **E2E (Playwright, against the compose stack)** — the core user and admin
  journeys, end to end. Includes one keyboard-only pass of the main user journey
  (list → open → vote → comment): keyboard accessibility is a requirement, and only
  a test keeps that kind of promise true over time.

## Rules

- Every mutating endpoint has authorization tests before it is called done. A
  missing 403 test is a missing feature.
- Derived values (vote count, comment count) are asserted through the API after real
  mutations, not read from fixtures.
- No skipped tests on main. A skip is either deleted or fixed; anything else lands in
  SCOPE.md as a known gap.
- Seed data is deterministic; e2e tests never depend on ordering luck.
