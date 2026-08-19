# Decisions

The decisions that shaped this codebase, in the order they were made. Each links to a
full ADR with context, options considered, and consequences. Format:
[MADR-style](https://adr.github.io/), kept deliberately short.

| #    | Decision                                                      | ADR                                                        |
| ---- | ------------------------------------------------------------- | ---------------------------------------------------------- |
| 0001 | Modular monolith API inside a pnpm/Turborepo monorepo         | [ADR-0001](docs/adr/0001-modular-monolith-monorepo.md)     |
| 0002 | Keycloak for identity; SaaS providers fail hard requirements  | [ADR-0002](docs/adr/0002-identity-keycloak.md)             |
| 0003 | PostgreSQL + Drizzle ORM                                      | [ADR-0003](docs/adr/0003-postgresql-drizzle.md)            |
| 0004 | Angular 22, standalone components, signals, Tailwind + CDK    | [ADR-0004](docs/adr/0004-angular-22-tailwind-cdk.md)       |
| 0005 | NestJS 11 + Fastify (v12 pre-release deliberately avoided)    | [ADR-0005](docs/adr/0005-nestjs-11-fastify.md)             |
| 0006 | REST + OpenAPI over GraphQL — right-sized for one client      | [ADR-0006](docs/adr/0006-rest-over-graphql.md)             |
| 0007 | Soft delete everywhere + transactional audit log              | [ADR-0007](docs/adr/0007-soft-delete-audit-log.md)         |
| 0008 | CASL abilities, defined once, enforced in API, mirrored in UI | [ADR-0008](docs/adr/0008-casl-authorization.md)            |
| 0009 | Config in DB by owner; one resolved bootstrap payload         | [ADR-0009](docs/adr/0009-settings-resolution-bootstrap.md) |

Highlights for a reviewer in a hurry:

- **Why one service, not several** — the domain is one bounded context with tight
  read-side coupling (list view joins requests, votes, comments, taxonomy). Seams are
  kept visible as NestJS modules so a future split is a deployment change, not a
  rewrite. Full argument in ADR-0001.
- **Why Keycloak** — managed SaaS identity fails two hard requirements (open-source,
  self-hostable in the local stack); among qualifying IdPs, Keycloak wins on maturity
  of its production k8s track record. ADR-0002.
- **Where configuration lives** — global defaults (DB, admin-editable) overlaid by
  user preferences (DB, user-editable), resolved server-side and delivered to the SPA
  in a single bootstrap payload — no blocking request chain. ADR-0009.
