# ADR-0003: PostgreSQL + Drizzle ORM

- **Date:** 2026-08-19
- **Status:** accepted

## Context

The domain is relational to its core: a vote is a unique (user, request) pair; vote
and comment counts are derived; requests join taxonomy tables that admins edit; list
queries filter, search, sort and paginate over those joins. The data invariants —
one vote per user per request above all — are exactly the kind a database enforces
better than application code.

## Options considered

- **PostgreSQL** — enforces the invariants where they belong (unique constraint on
  votes, FKs on taxonomy), one `count(*)`-with-join query serves the list view,
  `tsvector`/`ILIKE` covers text search without new infrastructure — nothing notable
  against it at this scale.
- **MongoDB** — flexible documents — the flexibility solves no problem here, and the
  vote-uniqueness invariant and taxonomy joins would move into application code,
  which is where such rules go to break.
- **SQLite** — trivially simple locally — weaker story for the cloud-native
  deployment requirement and for concurrent writes.

ORM: **Drizzle** over Prisma — queries stay SQL-shaped and inspectable (what you
read is what runs), migrations are plain SQL files with no proprietary migration
engine, and there is no separate client-generation step in the dev loop. Prisma
would be defensible too; Drizzle keeps the data layer closer to the database in a
project where the list query's behavior under filters and joins is worth being able
to read directly.

## Decision

PostgreSQL 17 + Drizzle ORM in `packages/db`: schema, relations, SQL migrations and
seed script. Keycloak shares the Postgres instance in dev (separate database) to keep
the compose stack to two stateful containers.

## Consequences

- Vote uniqueness is a database constraint; the API can race without corrupting counts.
- Derived counts are computed with joins now; if lists ever slow down, the escape
  hatch is denormalized counter columns maintained in the same transaction — noted in
  SCOPE.md as deliberately not built.
- Migrations are ordered SQL files; the k8s deployment runs them as a job before
  rollout.
