# ADR-0009: Where configuration lives, and the single bootstrap payload

- **Date:** 2026-08-19
- **Status:** accepted

## Context

Configuration exists at three levels with different owners: application settings
(admin-owned: registration policy, approval toggle, rate limits, feature flags),
taxonomy (admin-owned: categories, statuses), and user preferences (user-owned:
theme, language, default sort/filters, notifications). The SPA needs all of it
before first render — and how it obtains it decides whether startup is one
round-trip or a waterfall of blocking requests.

## Options considered

- **Client-side assembly** — the SPA calls /profile, /preferences, /taxonomy,
  /flags on startup — three-plus sequential or racing requests before first
  meaningful paint; every new config source adds another call.
- **Config baked into the SPA at build time** — no requests at all — admin
  changes require redeploys, which contradicts admin-editable settings.
- **One resolved bootstrap payload** — `GET /bootstrap` returns profile,
  preferences, taxonomy and feature flags in a single authenticated response;
  the server resolves precedence — one round-trip, one place where resolution
  logic lives; the payload must stay small enough to be cheap on every session
  start.

## Decision

One bootstrap payload. Storage: `app_settings` (key/jsonb rows, admin-edited),
`categories`/`statuses` tables, `user_preferences` (one row per user).
Resolution happens server-side in one place: global defaults overlaid with the
user's stored overrides; unknown or invalid stored values degrade to defaults
rather than breaking the client. The SPA makes exactly one authenticated call at
startup and holds the result in a signal store; nothing else blocks first render.

Admin-only configuration that the client never needs (rate limits, registration
policy) deliberately stays out of the payload — it is enforced server-side and
delivered to the admin UI on demand, not shipped to every user on every start.

## Consequences

- Startup cost is one request; adding a config source extends the payload, not
  the number of round-trips.
- Resolution rules are testable as a pure function, and are.
- Settings changed mid-session (by an admin, or by the user in another tab)
  appear on next bootstrap — acceptable staleness for an internal tool, noted
  in SCOPE.md.
