# ADR-0007: Soft delete everywhere, plus an audit log

- **Date:** 2026-08-19
- **Status:** accepted

## Context

"Delete" is not one operation — a withdrawn vote, a removed comment, a deleted
request and a closed account have different actors and different blast radii.
The semantics had to be pinned down before the schema existed, because they
decide which tables carry tombstone columns and what the authorization matrix
for DELETE endpoints looks like.

## Options considered

- **Mixed semantics** — hard-delete what nothing references (votes, flat
  comments), soft-delete what other content points at (requests, users) —
  smallest storage and no tombstone filtering on half the tables, but two mental
  models in one codebase, and moderation actions leave no trace.
- **Soft delete everywhere + audit log** — every entity carries `deleted_at` and
  `deleted_by`; every mutation writes an audit entry (actor, action, entity,
  payload) in the same transaction — uniform model, recoverable mistakes,
  moderation accountable; the cost is that every read must filter tombstones,
  forever. Anonymizing personal fields on account deletion was considered and
  not taken: this is an internal tool where "account deletion" reads as
  deactivation, and the audit trail is more valuable intact.

## Decision

Soft delete everywhere — `deleted_at` plus `deleted_by` (the acting user) on
users, requests, votes and comments — with an `audit_log` table written
transactionally on every mutation. Deletion authorization stays narrow: votes
and comments by their owner (comments also by admins as moderation), requests by
their owner only — admins handle unwanted requests through the status workflow
(Declined), because a feedback tool that silently deletes ideas teaches people
to stop submitting them. Accounts delete themselves only: plain tombstone, no
anonymization — deactivation semantics, personal data retained.

The tombstone-filtering cost is contained in one place: the query layer exposes
scoped helpers that apply `deleted_at IS NULL` by default, and raw access is the
exception that has to justify itself.

## Consequences

- Moderation and triage actions are reconstructable from the audit log; "who
  deleted this and when" is a query, not an argument.
- Re-voting is an un-tombstone update, not an insert — the one-vote-per-user
  primary key keeps holding.
- The audit log is write-only in v1 — no admin UI reads it yet (SCOPE.md); the
  data is captured from day one so the UI can come later without a gap.
- No retention/pruning policy yet; an internal tool can afford that deferral,
  a public one could not.
