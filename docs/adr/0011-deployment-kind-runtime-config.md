# ADR-0011: Deployment — kind, runtime-configured images, NodePorts

- **Date:** 2026-08-20
- **Status:** accepted

## Context

The system (SPA, API, Keycloak, Postgres) must come up on a local Kubernetes
distribution from documented commands, with environment-driven configuration
and no rebuild per environment. Two constraints shape everything: the SPA runs
in browsers (it cannot read env vars), and OIDC tokens carry the issuer URL the
_browser_ used — which is not resolvable from inside the cluster.

## Options considered

- **Ingress controller (nginx-ingress) with host routing** — production-shaped
  URLs — an extra cluster add-on and DNS/hosts fiddling on every reviewer
  machine; more moving parts than the assessment of manifests needs.
- **NodePorts + kind extraPortMappings** — three fixed localhost ports
  (web 30080, api 30081, keycloak 30082), zero add-ons, works identically on
  any machine with Docker — port numbers are uglier than hostnames.
- **Per-environment image builds** (baking URLs into the SPA bundle) —
  simplest wiring — violates environment-driven configuration outright.

## Decision

NodePorts on a kind cluster with pinned port mappings. One image per app for
every environment:

- **Web**: nginx serves the built SPA; the container entrypoint writes
  `env.js` from `WEB_API_URL` / `WEB_KEYCLOAK_URL` at startup — the runtime
  config hook the SPA has had since the shell (`window.__env`).
- **API**: plain env vars. The OIDC issuer problem is solved by a deliberate
  split: `KC_HOSTNAME` pins Keycloak's issued-token issuer to the browser URL
  (`localhost:30082`), while the API fetches JWKS via the cluster-internal
  service URL (`KEYCLOAK_INTERNAL_URL`) and still validates the public issuer
  string. One verification code path, two URLs, no hosts-file hacks.
- **Migrations + seed** run as a Job using the API image's build stage (the
  full workspace with drizzle-kit) — the runtime image stays minimal.
- **API replicas: 1, annotated** — SSE fan-out is in-process (ADR-0010);
  scaling out is a documented Redis pub/sub step, not a YAML edit.
- **Secrets** ship as a dev-valued Secret manifest so `kubectl apply -k` works
  immediately; any real environment overrides them from a secret manager.

## Consequences

- `kind create cluster … && docker build … && kind load … && kubectl apply -k`
  is the complete story — four documented commands, no add-ons.
- The same images run in compose, kind, or a managed cluster; only env values
  change.
- NodePort URLs (`localhost:3008x`) are dev-grade; a real deployment would put
  an ingress with TLS in front — a bounded, documented next step.
