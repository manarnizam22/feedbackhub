# FeedbackHub

Internal product feedback board. Employees submit feature requests and feedback,
browse and search what exists, upvote and discuss; admins triage (status, pinning,
moderation) and configure categories, statuses and application settings.

Built as the digitalfuture Senior Full Stack technical assignment.

**Companion documents:** [DECISIONS.md](DECISIONS.md) · [SCOPE.md](SCOPE.md) ·
[AI_COLLABORATION.md](AI_COLLABORATION.md)

## Stack

Angular 22 · NestJS 11 + Fastify · PostgreSQL 17 + Drizzle · Keycloak 26 (OIDC) ·
pnpm + Turborepo · Docker Compose (dev) · Kubernetes manifests (kind)

Why each of these: [DECISIONS.md](DECISIONS.md).

## Repository layout

```
apps/web          Angular SPA
apps/api          NestJS API (modular monolith — see ADR-0001)
packages/db       Drizzle schema, migrations, seed
packages/types    Shared request/response contracts (zod)
packages/config   Shared lint/format/tsconfig
infra/            Dockerfiles, compose, k8s manifests, Keycloak realm
docs/             ADRs, rules, assignment brief
```

## Running it

_(sections below are filled in as the corresponding pieces land; commands are only
documented once they work)_

### Prerequisites

- Node 24 LTS (`.nvmrc`), pnpm 10
- Docker

### Local development

```bash
pnpm install
pnpm docker:up     # Postgres + Keycloak (realm auto-imported)
pnpm db:migrate && pnpm db:seed
pnpm dev           # API + web
```

### Tests

```bash
pnpm verify        # format check, lint, typecheck, unit + integration — definition of done
pnpm e2e           # Playwright against the compose stack (includes keyboard-only pass)
```

### Kubernetes (kind)

_(documented with the deployment feature)_

## Status

*(kept current as features merge: what is working, what is partial, what is absent —
see [SCOPE.md](SCOPE.md) for the reasoning behind the edges)*

## Git workflow and commit convention

`main` plus `feat/<name>` feature branches, merged into `main` with merge commits —
never squashed, so the history keeps its story.

Conventional Commits (`feat(api): ...`, `fix(web): ...`, `docs: ...`), each with an
AI-attribution trailer marking how the change was authored:

```
AI-Assisted: heavy | partial | none
```

- **heavy** — the AI produced most of the diff; I reviewed, adjusted and take
  responsibility for it
- **partial** — genuinely mixed authorship
- **none** — hand-written

All commit messages are written and committed by me personally; the AI assistant has
no git access (see [AGENTS.md](AGENTS.md), "Division of labor").
