# Scope

Where the edges of this project are, and why. Kept up to date as the work happens.

## What's in

_(updated as features merge — each line added when the thing actually works)_

- **Local infrastructure** — one command brings up Postgres and Keycloak with the
  realm imported from a file: clients, roles, two dev users, Google sign-in wired
  (bring-your-own OAuth credentials). Verified reproducible from a wiped volume.
- **Data model** — 9 tables with the soft-delete + audit model (ADR-0007), SQL
  migrations, deterministic idempotent seed. The invariants live in the database:
  one vote per user per request (composite PK), at most one default status
  (partial unique index) — both probed against the live schema.
- **API foundation** — authenticated-by-default NestJS API: JWT verified against
  Keycloak's JWKS on every request, CASL policy defined once and unit-tested
  against the full matrix, shadow users upserted from verified tokens,
  problem-details errors, OpenAPI served at /docs, and the single `GET
/bootstrap` payload (ADR-0009). Integration-tested with real tokens — no
  mocked auth anywhere.
- **Web shell** — Angular 22 (zoneless, signals) with authentication fully
  delegated: keycloak-js redirect flow with PKCE, no anonymous state, tokens
  attached per-request with refresh. One bootstrap request feeds a signal store
  (ADR-0009); the theme preference applies visibly. The Keycloak login page
  carries a custom theme matching the app. Accessible primitives (native-button
  styling, CDK focus-trapped dialogs, keyboard menus) underpin every screen.
- **Feedback API** — the product core: request CRUD with one joined list query
  (filter, search, sort, paginate, pinned-first, vote/comment counts, my-vote),
  idempotent votes, comments with the approval setting honored, admin triage
  (status, pin), per-day submission rate limit, soft deletes with audit rows on
  every mutation. The authorization matrix runs as an integration suite with
  real tokens — anonymous/non-owner/owner/admin per mutating endpoint, with 404
  where 403 would leak existence.

- **Settings & admin** — user settings (profile, theme with immediate visible
  effect, language, default sort/filters, notification preference, account
  deletion-as-deactivation) and the admin area: moderation queue with
  approve/reject, category/status management with retire and default-status
  swap, application settings (registration policy, approval toggle, rate
  limit), and the `compactList` feature flag that visibly changes the list.
- **Realtime & notifications** — SSE stream fed by the audit event bus (events
  exist only for committed transactions): lists and detail refresh live;
  in-app notifications (votes and comments to the request author, new requests
  to everyone else) with bell, unread badge and mark-read. Single-replica
  fan-out by design; Redis pub/sub is the documented scale-out (ADR-0010).

## What's out, on purpose

Decided up front, with the reasoning:

- **Sending email.** The notification _preference_ is real end-to-end — stored,
  editable, resolved with the rest of the settings, respected by the backend — but
  no email leaves the system. Wiring delivery means an SMTP path and a mail-catcher
  container for local runs; that buys a demo of infrastructure, not of judgment.
  The seam where a sender would plug in is the notifications module.
- **Avatar upload.** Initials-based avatars only. File upload drags in object
  storage, size/type validation and image processing — a lot of surface for an
  internal tool where initials do the job.
- **Translations.** The language preference exists and resolves like every other
  setting, but only English strings ship. Adding a second language is extraction
  work, not design work, so it proves little.
- **Denormalized vote/comment counters.** Counts are computed with joins. At this
  data volume that is the honest default; the counter-column escape hatch is noted
  in ADR-0003 for the day measurements demand it.

## Ambiguities, and how I read them

- **Section 7 of the assignment PDF ends mid-thought** — "Two things worth stating
  plainly:" is followed by nothing, and the write-up section jumps from 6.5 to 6.7.
  I flagged it to the team by email and continued; nothing else depends on it.
- **"Email notification preferences"** — I read this as the preference being the
  requirement, not a mail pipeline; asked in the same email whether a local
  mail-catcher was expected. See "What's out" above either way.
- **Registration policy (open / invite-only / domain-restricted)** — read as
  admin configuration that drives the identity provider's realm behavior, not as
  custom registration code. Authentication stays entirely delegated (ADR-0002).
- **"Retiring" a category** — read as deactivation, not deletion: existing requests
  keep their category; the retired one stops being offered for new submissions.

## Assumptions

- Single tenant, single region, one deployment.
- Employees are a semi-trusted user base: rate limits and moderation exist, but no
  CAPTCHA or anti-abuse hardening beyond that.
- Everything soft-deletes with `deleted_at`/`deleted_by`, and every mutation
  writes an audit entry (ADR-0007). Account deletion is deactivation: the row
  tombstones, personal data is retained (internal-tool semantics — documented
  deliberately, no anonymization). Deletion rights are narrow: own votes and
  comments (admins may moderate comments), own requests (admins decline via
  status instead of deleting), own account.
- The audit log is write-only in v1: captured from day one, no admin UI over it yet.

## With another week

_(written honestly at the end — candidates so far: real notification delivery with
digest batching; a lint-enforced module boundary instead of a convention; profiling
the list query under realistic volume before deciding on counter columns)_
