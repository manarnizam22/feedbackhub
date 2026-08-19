# ADR-0008: CASL for authorization

- **Date:** 2026-08-19
- **Status:** accepted

## Context

The authorization rules are condition-shaped, not just role-shaped: "users update
_their own_ comments, admins delete _any_ comment, nobody deletes _someone
else's_ account." Those rules must be enforced in the API and mirrored in the
Angular UI (buttons that can't succeed shouldn't render) — two consumers of the
same policy.

## Options considered

- **Hand-rolled checks in route guards/services** — no dependency, fully explicit
  — the policy ends up scattered across controllers and duplicated by hand in
  the frontend; drift between the two is invisible until it's a bug or a hole.
- **CASL** — the policy is one pure `defineAbilityFor(user)` function with
  ownership conditions (`{ authorId: user.id }`); isomorphic, so the API
  enforces and the SPA mirrors from the same definition; `ForbiddenError.from()`
  gives uniform denial handling — one more dependency, and ability definitions
  must stay pure (no I/O) to remain shareable.

## Decision

CASL, defined once in `packages/auth` as pure functions over the authenticated
user (id + roles from the verified JWT). The API is the enforcement point: it
loads the target entity, then checks the ability against the real record —
ownership is never trusted from the request payload. The Angular app consumes
the same abilities for visibility only.

The full action × subject × role matrix lives in `docs/rules/security.md` and is
mirrored 1:1 by the API integration test suite — the matrix is the test plan.

## Consequences

- Policy drift between UI and API becomes structurally impossible; both read the
  same definition.
- Authorization tests enumerate the matrix mechanically: for each mutating
  endpoint — anonymous, non-owner, owner, admin.
- Ability functions stay synchronous and pure; anything needing data (rate
  limits, approval settings) is a service-level rule, deliberately outside CASL.
