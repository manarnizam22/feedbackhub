# ADR-0002: Keycloak for identity

- **Date:** 2026-08-19
- **Status:** accepted

## Context

Hard requirements for identity: an open-source provider, email/password sign-in plus
at least one social provider, and no authentication primitives implemented in the
application itself. The whole system must come up locally in containers with
documented commands — so the IdP has to run inside our compose/k8s stack,
reproducibly.

## Options considered

- **Managed SaaS identity (Clerk, Auth0)** — polished DX and fast integration —
  disqualified outright: closed-source and not self-hostable, failing both the
  open-source requirement and the local-stack requirement.
- **Keycloak 26** — the industry-standard open-source IdP; OIDC, social login and
  email/password are configuration, not code; official container image and
  well-trodden k8s deployment — heavyweight (JVM) and an admin UI nobody calls pretty.
- **Logto** — modern, light container, pleasant admin UI — younger project, less
  enterprise recognition, fewer battle-tested k8s references.
- **Zitadel** — Go-based middle ground — no standout advantage over Keycloak for
  this scope.

## Decision

Keycloak 26.7 (current release, verified 2026-08-19), running as a container in both
compose and k8s. Realm configuration (clients, roles, Google as the social provider)
is exported to `infra/keycloak/` and imported on startup so the stack is reproducible.
The API validates Keycloak-issued JWTs; the `admin` role is a Keycloak realm role.

Among the qualifying options, Keycloak wins on maturity: for the component that owns
authentication — where a configuration mistake is a security hole — a decade of
production k8s deployments beats a nicer admin UI.

## Consequences

- Zero auth primitives in this codebase; login, registration, password reset and
  social flows are Keycloak's problem, not ours to get wrong.
- Registration policy (open / invite-only / domain-restricted) maps to Keycloak realm
  settings driven by our admin configuration, rather than custom code.
- We accept the JVM container's startup weight in dev, and mitigate with realm
  import so no one clicks through the admin UI to reproduce the environment.
- The integration surface is plain OIDC (redirect flow, server-side JWT validation),
  so swapping the IdP later would touch configuration, not application code.
