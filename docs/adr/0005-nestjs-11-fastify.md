# ADR-0005: NestJS 11 + Fastify; v12 pre-release deliberately avoided

- **Date:** 2026-08-19
- **Status:** accepted

## Context

The backend is Node.js. The API needs structured modules (the seams from ADR-0001),
dependency injection for testability, OpenAPI generation, and guard/interceptor
machinery for auth and validation.

## Options considered

- **NestJS 11 + Fastify adapter** — module system maps one-to-one onto the modular
  monolith seams; guards centralize JWT validation and role checks; `@nestjs/swagger`
  yields the optional OpenAPI deliverable nearly free — heavier abstraction than the
  app strictly needs.
- **NestJS 12 (pre-release)** — full-ESM future — shipping a pre-release major under
  a short delivery window is risk with no payoff (verified 2026-08-19: v12 is
  `next`-tag only, 11.2 is latest stable).
- **Plain Fastify** — right-sized, minimal — module boundaries, DI and OpenAPI wiring
  become hand-rolled conventions; more decisions to maintain and more surface for
  drift as the codebase grows.
- **Express** — universally known — slowest of the three, with idioms that predate
  the patterns the rest of this stack is built on.

## Decision

NestJS 11 (latest stable) on the Fastify adapter. Validation via `zod` pipes shared
with the frontend through `packages/types`, so request contracts exist exactly once.

## Consequences

- Module seams from ADR-0001 are visible in the framework's own structure.
- Server-side authorization is a guard concern with tests, not per-route boilerplate.
- We accept Nest's abstraction weight; the mitigation is restraint — no CQRS, no
  microservice transport, none of Nest's optional machinery the app doesn't need.
- v12 (ESM/Vitest/oxlint toolchain) is a documented future migration, not today's risk.
