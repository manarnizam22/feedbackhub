# ADR-0001: Modular monolith API inside a pnpm/Turborepo monorepo

- **Date:** 2026-08-19
- **Status:** accepted

## Context

The domain: feedback requests with votes, comments, taxonomy (categories/statuses),
user preferences and admin settings — one bounded context whose read side is tightly
coupled (the list view joins requests, votes, comments and taxonomy). One team, one
deploy cadence, one database, a short delivery window. The question is how many
deployables this domain actually justifies.

## Options considered

- **Microservices (feedback / identity / config as separate deployables)** — the
  conventional service-oriented answer — pays distributed-system costs (network
  contracts, independent releases, cross-service auth) that nothing in this domain
  needs; a split along these lines would be shape without necessity.
- **Single NestJS app, no internal structure** — fastest — with no visible seams,
  every future change negotiates with the whole codebase, and a later split becomes
  a rewrite instead of an extraction.
- **Modular monolith: one NestJS deployable, explicit module seams** — boundaries are
  real (module imports are the contract) without distribution costs — requires
  discipline to keep modules from reaching into each other.

## Decision

Modular monolith. One `apps/api` NestJS application with modules `feedback`,
`taxonomy`, `settings`, `users`, each owning its routes, services and DB access.
Identity is already a separate service by virtue of Keycloak (ADR-0002) — so the
system is honestly "two services": the app and the IdP.

The monorepo (pnpm workspaces + Turborepo) holds the Angular app, the API and shared
packages so types flow across the API boundary without publishing.

## Consequences

- The list view can join requests, votes, comments and taxonomy in one query instead
  of aggregating across services — simpler and faster.
- A future split falls along module lines: each module already owns its tables and
  exposes a narrow surface. The seam most likely to split first (notifications, being
  async by nature) is kept free of imports from other modules' internals.
- We accept that "modular" is enforced by convention and review, not by the compiler;
  module boundaries are documented in AGENTS.md and checked in code review.
