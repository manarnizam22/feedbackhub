# API patterns

REST, JSON, OpenAPI generated from the Nest controllers (`@nestjs/swagger`) — the
spec is a build artifact, never edited by hand.

## Shape

- Resource routes: `GET/POST /requests`, `GET/PATCH/DELETE /requests/:id`,
  `PUT/DELETE /requests/:id/vote`, `POST /requests/:id/comments`,
  `PATCH/DELETE /comments/:id`. Admin config under `/admin/*`
  (categories, statuses, settings). User-scoped under `/me/*` (profile, preferences).
- Votes are idempotent: `PUT` to vote, `DELETE` to withdraw; repeating either is a
  no-op success. No vote-toggle POST.
- List endpoints take `page`/`pageSize`/`sort`/`status`/`category`/`q` and return
  `{ items, total, page, pageSize }`. Pinned requests sort first regardless of sort.

## Contracts

- One zod schema per request/response in `packages/types`, used by the API pipe for
  validation and by the Angular client for types. The contract exists exactly once.
- Timestamps are ISO-8601 UTC strings. IDs are opaque strings to clients.

## Errors

Problem-details-style JSON on every error:

```json
{ "status": 422, "code": "validation_failed", "message": "…", "details": [ … ] }
```

- `code` is stable and machine-readable; `message` is human-actionable; validation
  errors carry per-field `details` the frontend can attach to inputs.
- Expected failures (validation, not-found, forbidden, conflict, rate-limited) are
  typed exceptions mapped by one exception filter. Unexpected errors log with a
  correlation id and return an opaque 500.

## Settings delivery

The SPA gets one bootstrap payload — `GET /bootstrap` — containing resolved settings
(global defaults overlaid with the caller's preferences), taxonomy, feature flags and
the caller's profile. One request, no startup chain. Details in the settings ADR.
