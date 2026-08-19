# FeedbackHub

Internal product feedback board: employees submit feature requests, browse, upvote and
discuss them; admins triage (status, pinning, moderation) and configure taxonomy and
application settings. Built as a technical assignment for digitalfuture — see
`docs/assignment/` for the brief.

This file is the entry point for any coding agent working in this repo. Agent-specific
files (`CLAUDE.md`, and any future equivalent) are thin pointers to this one.

## Stack

pnpm workspaces + Turborepo | Angular 22 (standalone, signals, Tailwind + CDK) |
NestJS 11 + Fastify | PostgreSQL 17 + Drizzle ORM | Keycloak 26 (OIDC) |
Docker Compose (dev) + Kubernetes manifests (kind) | Vitest + Playwright

Version choices are justified in `docs/adr/`. Never bump a major version without an ADR.

## Architecture

```
apps/web          → Angular 22 SPA
apps/api          → NestJS 11 + Fastify modular monolith (REST + OpenAPI)
packages/db       → Drizzle schemas, migrations, seed
packages/types    → Shared TypeScript types (API contracts)
packages/config   → Shared ESLint / Prettier / tsconfig
infra/            → Dockerfiles, docker-compose, k8s manifests, Keycloak realm export
docs/             → ADRs, rules, assignment brief
.notes/           → untracked working space: feature plans, raw AI logs (never committed)
```

The API is a modular monolith with explicit module seams (feedback, taxonomy,
settings, users); the reasoning is ADR-0001. Identity is delegated entirely to
Keycloak (ADR-0002) — this repo must never implement auth primitives.

## Division of labor (Manar ⇄ AI assistant)

This is the working contract for this project. It is followed literally, not
aspirationally.

1. **Plan first.** Every feature starts with a plan in `.notes/<name>/plan.md`.
   The agent proposes; Manar approves before implementation starts.
2. **Git belongs to Manar — exclusively.** The agent never runs `git` commands of any
   kind (not commit, not add, not init). When a piece of work is ready, the agent
   explicitly pings Manar: what changed, which files, and that it is a commit
   boundary. Manar reviews the diff, writes the message, commits and pushes.
3. **Feature-branch flow.** Work happens on `feat/<name>` branches created and merged
   by Manar into `main` — merged, never squashed; the history stays real.
   Docs-only changes may go straight to `main` at Manar's discretion.
4. **Decisions become ADRs.** Any choice with alternatives worth naming goes in
   `docs/adr/` (template: `.notes/templates/adr.md`) and gets one line in `DECISIONS.md`.
5. **AI work is logged as it happens.** Each feature's `.notes/<name>/ai-log.md`
   records the actual prompts used, what came back, and what was changed before it
   shipped. These notes are private working material (untracked); curated examples
   land in `AI_COLLABORATION.md`. Entries are written during the work, never
   reconstructed afterwards.
6. **No version claims from memory.** Library/tool versions are verified against
   current sources (web search, registry) before being written into code or docs.
7. **Authorization lives on the server.** Route guards in Angular are UX only. Every
   API endpoint enforces authentication and ownership/role checks itself; tests prove it.
8. **Fail loud.** "Done" means `pnpm verify` passes with nothing skipped. Skipped
   tests, stubbed checks and known gaps are stated explicitly, and land in `SCOPE.md`
   if they stay.

## Turn protocol

Work alternates in explicit turns. The agent ends every work block with one of:

- **🟢 WORKING** — no action needed from Manar; the agent continues.
- **📌 YOUR TURN** — a numbered checklist of exactly what Manar does now
  (review files, run commands, make a named decision, commit). Manar replies
  "go" (plus decisions) to hand the turn back.

Commit boundaries are always a 📌. The agent never assumes approval from silence.

## Working principles

- **Simplicity first.** Minimum code that solves the problem; nothing speculative.
  Would a senior engineer call it overcomplicated? Then simplify.
- **Surgical changes.** Touch only what the task requires. Match existing style
  (`docs/rules/style-guide.md`). No drive-by refactors.
- **Read before writing.** Check exports, callers and shared utilities before adding
  anything new.
- **Tests verify intent.** A test that cannot fail when business logic changes is
  wrong (`docs/rules/testing.md`).
- **Surface conflicts, don't average them.** When two patterns contradict, pick one,
  say why, flag the other.

## Verification

```bash
pnpm verify
```

Format check, lint, typecheck, unit + integration tests. This is the definition of
done; nothing is reported complete without it passing. E2E (`pnpm e2e`) runs against
the compose stack and is required before calling a user journey finished.

## References

- [README.md](README.md) — how to run everything, commit convention
- [DECISIONS.md](DECISIONS.md) — ADR index
- [SCOPE.md](SCOPE.md) — built / cut / assumptions
- [AI_COLLABORATION.md](AI_COLLABORATION.md) — assignment deliverable, grows from ai-logs
- [docs/rules/](docs/rules/) — style, testing, security, API patterns
- `.notes/` — untracked per-feature plans and AI logs (private working space)
