# ADR-0006: REST over GraphQL

- **Date:** 2026-08-19
- **Status:** accepted

## Context

The API surface: a handful of resources (requests, votes, comments, taxonomy,
settings), one list view with filters, and exactly two clients under our control —
the Angular SPA and the test suite. The API style decides where authorization
lives, how contracts are typed, and whether publishing an API specification is
cheap or expensive.

## Options considered

- **GraphQL** — one flexible query surface, typed client via codegen — earns its
  keep when many clients need different shapes of the same data or when
  over-fetching matters. Neither applies here: one client, known shapes. The costs
  are real and immediate: a codegen chain in the build, resolver-level authorization
  (subtler to implement and to test exhaustively than route guards), and no free
  OpenAPI output.
- **REST + OpenAPI** — routes map one-to-one onto the domain's operations; per-route
  guards make the authorization matrix explicit and testable; `@nestjs/swagger`
  produces the API-spec deliverable from the controllers we write anyway —
  over-fetching in theory, irrelevant at these payload sizes.

## Decision

REST with problem-details errors and zod-validated contracts shared through
`packages/types` (patterns in `docs/rules/api-patterns.md`). OpenAPI is generated,
not hand-written.

## Consequences

- Authorization is per-route and the integration tests enumerate the full matrix —
  the security-critical logic lands on the API's most legible layer.
- The OpenAPI deliverable is a build artifact, essentially free.
- Type safety across the API boundary comes from shared zod schemas instead of
  GraphQL codegen — one mechanism, no generation step in the dev loop.
- If a second, differently-shaped client ever appears, GraphQL becomes worth
  re-arguing; that day is not today.
