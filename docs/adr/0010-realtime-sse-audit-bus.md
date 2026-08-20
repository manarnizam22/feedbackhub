# ADR-0010: Realtime over SSE, fed by the audit event bus

- **Date:** 2026-08-20
- **Status:** accepted

## Context

A feedback board is a shared surface: votes and comments land while others are
looking at the same list, and request authors want to know when their idea gets
traction. Two needs, one event source — every mutation in the system already
passes through the single audited-transaction path (ADR-0007), which commits
the change and its audit row atomically.

## Options considered

- **WebSockets (socket.io)** — bidirectional, room semantics — bidirectionality
  buys nothing here (clients never push over the socket), and it adds a
  stateful protocol, a client library, and sticky-session concerns.
- **Short polling** — trivial — N clients × poll interval of redundant queries,
  and "realtime" that is only as fresh as the interval.
- **Server-Sent Events** — one-directional push over plain HTTP, native
  `EventSource` in every browser, auto-reconnect built in — fits a broadcast-
  and-notify model exactly; costs: no request headers on `EventSource` (auth
  must ride the URL) and fan-out lives in process memory.

## Decision

SSE. The emit point is the audited-transaction wrapper: after commit, the
mutation's event (action, entity, actor) goes onto an in-process event bus; the
SSE gateway broadcasts change events to all connected clients (which refetch
what they're showing) and routes notification events to the affected user only.
Notification rows are written inside the same transaction as the mutation and
pushed only after commit: request authors are notified on votes and comments
(honoring the `notifyOnComment` preference), every user except the author is
notified when a new request lands, and one's own actions never notify oneself.
The bell reads `GET /me/notifications`.

Because `EventSource` cannot send an Authorization header, the SSE route
accepts the access token as a query parameter — scoped to that route only and
documented in security.md.

## Consequences

- Realtime can never announce a rolled-back mutation — events exist only for
  committed transactions, by construction.
- The in-process bus means fan-out works within one API replica; the k8s
  manifests pin the API to a single replica and note Redis pub/sub as the
  scale-out path.
- Clients treat events as invalidation hints (refetch), not as state — no
  payload merging, no ordering concerns, at the cost of one extra GET per
  change seen.
- Token-in-URL for SSE is a documented trade-off: short token lifetime bounds
  the exposure, and access logs on the dev/k8s stack are local.
