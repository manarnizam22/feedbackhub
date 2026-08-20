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

- Node 22+ (24 LTS recommended, `.nvmrc`), pnpm 10
- Docker

### Local development

```bash
pnpm install
pnpm docker:up     # Postgres :5432 + Keycloak :8080, realm auto-imported
pnpm db:migrate    # apply SQL migrations
pnpm db:seed       # deterministic demo data (idempotent — safe to re-run)
pnpm --filter @feedbackhub/api dev   # API on :3000, OpenAPI at /docs
pnpm --filter web dev                # Angular SPA on :4200
```

- Keycloak admin console: [http://localhost:8080](http://localhost:8080) — `admin` / `admin`
- Dev users (realm `feedbackhub`): `alice@dev.local` / `alice-dev` (user),
  `admin@dev.local` / `admin-dev` (admin)
- Google sign-in is wired in the realm; supply your own OAuth client via
  `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` in `.env` (see `.env.example`).
  Without real credentials the button renders but Google rejects the flow.

### Tests

```bash
pnpm verify        # format check, lint, typecheck, unit + integration — definition of done
pnpm --filter e2e run e2e:install   # once: Playwright chromium
pnpm e2e           # Playwright: user + admin journeys + keyboard-only pass
```

`pnpm verify` needs the compose stack up (integration tests use real Keycloak
tokens and real Postgres — no mocked auth anywhere). `pnpm e2e` additionally
needs both dev servers running.

### Kubernetes (kind)

One built image per app serves every environment — runtime config comes from
env vars (`env.js` for the SPA, plain env for the API).

```bash
kind create cluster --name feedbackhub --config infra/k8s/kind-config.yaml --image kindest/node:v1.31.9
docker build -f infra/docker/api.Dockerfile --target build -t feedbackhub-tools:dev .
docker build -f infra/docker/api.Dockerfile -t feedbackhub-api:dev .
docker build -f infra/docker/web.Dockerfile -t feedbackhub-web:dev .
kind load docker-image --name feedbackhub feedbackhub-api:dev feedbackhub-web:dev feedbackhub-tools:dev
kubectl apply -k infra
kubectl -n feedbackhub wait --for=condition=ready pod -l app=keycloak --timeout=300s
```

Then open [http://localhost:30080](http://localhost:30080) (web); the API is on
:30081, Keycloak on :30082. Migrations + seed run as a Job; the API runs a
single replica by design (in-process SSE fan-out — ADR-0010; Redis pub/sub is
the documented scale-out path). Secrets ship with dev values in
`infra/k8s/secrets.yaml` — override them anywhere real.

## Status

_(kept current as features merge: what is working, what is partial, what is absent —
see [SCOPE.md](SCOPE.md) for the reasoning behind the edges)_

- ✅ Compose stack: Postgres + Keycloak, realm auto-imported, dev users log in;
  rebuilt-from-scratch verified
- ✅ Database: schema (10 tables, soft-delete + audit model), SQL migrations,
  idempotent seed; vote-uniqueness and single-default-status enforced by
  constraints (probed, not assumed)
- ✅ API skeleton: global JWT guard (Keycloak JWKS — signature, issuer,
  audience), CASL policy package with the full matrix unit-tested, shadow-user
  upsert, `GET /bootstrap` single-payload startup, problem-details errors,
  OpenAPI at `/docs`; integration-tested with real tokens
- ✅ Feedback API: requests (list/search/sort/paginate, CRUD), idempotent
  votes, comments incl. approval setting, admin triage (status/pin), daily
  submission rate limit, audit trail — authorization matrix integration-tested
  end to end
- ✅ Web shell: Keycloak login (PKCE, login-required), themed IdP login page,
  token interceptor, single-bootstrap signal store with visible theme
  preference, accessible UI primitives (CDK dialog/menu), lazy routes
- ✅ User journeys: request list (search/filter/sort/paginate, inline optimistic
  voting), detail with discussion (comment CRUD, moderation), submit/edit with
  field-level validation, delete with confirm
- ✅ Settings & admin: profile + preferences (theme applies live), account
  deactivation; admin moderation queue, taxonomy management, app settings,
  `compactList` feature flag; triage (status/pin) on the detail page
- ✅ Realtime: SSE change stream (lists/detail refresh live) + in-app
  notifications with unread bell — events emitted only for committed
  transactions, integration-tested
- ✅ Kubernetes: images built and cluster-verified on kind (issuer/JWKS split
  proven — in-cluster token accepted by in-cluster API); migrations as a Job
- ✅ E2E: 7 Playwright journey tests (+3 auth/data setup steps) — user journey,
  admin triage, keyboard-only pass — rerun-deterministic
- ✅ Registration policy enforced at the API gate: domain-restricted rejects
  foreign email domains, invite-only admits only existing users; admins always
  pass — integration-tested
- ⚠️ Known limits (deliberate, reasoned in [SCOPE.md](SCOPE.md)): no email
  delivery, single API replica for SSE, audit log write-only, English only

## Git workflow and commit convention

`main` plus `feat/<name>` feature branches, merged into `main` with merge commits —
never squashed, so the history keeps its story.

Conventional Commits (`feat(api): ...`, `fix(web): ...`, `docs: ...`) with an
AI-attribution trailer marking how the change was authored (a handful of
mid-crunch commits missed the trailer — treat untrailed feature commits as
`heavy`):

```
AI-Assisted: heavy | partial | none
```

- **heavy** — the AI produced most of the diff; I reviewed, adjusted and take
  responsibility for it
- **partial** — genuinely mixed authorship
- **none** — hand-written

All commit messages are written and committed by me personally; the AI assistant
never commits, branches, merges or pushes (see [AGENTS.md](AGENTS.md),
"Division of labor").
