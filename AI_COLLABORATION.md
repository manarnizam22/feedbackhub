# AI Collaboration

How this project was actually built with an AI assistant. I wrote this during the
work, not after it — some sections grow as the project does.

## Tools, and who does what

I used Claude Code (Anthropic's CLI agent) as the only AI tool, driven
interactively inside my editor, plus its web search for verifying anything
version- or fact-shaped before it entered the codebase — model memory lags
reality, and I didn't want a stale Angular or Keycloak claim in an ADR.

The split was fixed in [AGENTS.md](AGENTS.md) before any code existed, and it is
enforced, not aspirational:

- **The AI** proposes plans, generates code against approved plans, writes tests,
  drafts documents.
- **I** make the decisions, review every diff, and own git completely. Every
  commit in this history — message and execution — is mine; the agent is barred
  from running git at all. It signals "this is a commit boundary," I decide what
  actually gets committed and how.

I kept three things strictly for myself: architecture and scope decisions
(I have to stand behind them), the git history (it's my account of the work), and
final review of anything security-sensitive — the auth guard and ownership checks
get read line by line no matter who wrote them.

## How we worked

Plan first, feature by feature. Each ticket starts as a short plan; nothing gets
generated until I approve it. Work happens on a feature branch, gets reviewed,
must pass `pnpm verify`, and merges without squashing. The agent and I alternate
in explicit turns — it ends every block of work either with "continuing" or with
a checklist of exactly what I need to review and decide.

The context the model works from: the requirements document, and the repo's own
docs — AGENTS.md, the ADRs, the rules in `docs/rules/` — which are loaded into
every session. So the longer the project ran, the more the repo itself became
the prompt.

Proposals got tested against hard requirements before being accepted, in both
directions. Early on I suggested Clerk for identity, because I reached for a
managed service by instinct. The agent pushed back: closed-source, can't
self-host, fails two hard requirements. It was right, and that exchange became
ADR-0002. Direction stayed with me; verification ran both ways.

## Worked examples

The prompts here are real — I dictate by voice, so they're conversational and
imperfect; that's what directing an AI actually looks like. Lightly trimmed for
readability only.

### 1. Delete semantics for the data model

Before the schema existed I asked, verbatim: _"We need to define who can delete what"_ The AI's answer distinguished the two — soft delete
preserves the content graph, anonymization keeps the "delete my account" promise
by overwriting personal fields — and it framed the wider question as a
per-entity deletion matrix: votes hard-deleted (they're a toggle), comments
hard-deleted by author or admin (flat threads, nothing references them),
requests soft-deleted by owner only, accounts anonymized then soft-deleted. It
also argued two product positions — admins shouldn't delete requests (declining
via status is the honest moderation tool), and no "removed by moderator"
tombstones.

I overrode half of it, in two messages: _"We need to add an audit log to track everything, and I prefer to use soft delete everywhere"_, then _"We need deleted_by as well — no anonymization."_ The audit-log requirement genuinely changed
the trade-off: once every mutation is recorded transactionally, uniform soft
delete with `deleted_at`/`deleted_by` on every table is the more coherent model,
and anonymization went from "keeping the deletion promise" to unnecessary — in
an internal tool, account deletion is deactivation.

What survived from the first output: the narrow deletion-authorization rules
(admins still don't delete requests) and the argument for them. What shipped is
neither the AI's first matrix nor my first instinct — the disagreement itself is
recorded in ADR-0007, with the rejected option intact. The AI flagged the
consequence of dropping anonymization once (deleted users keep rendering with
name and email), I accepted it knowingly, and it went into SCOPE.md as a
documented semantic rather than an accident.

### 2. Centralizing the audit trail

The first version of the feedback endpoints audited correctly but repetitively:
every service method opened a transaction and called `audit.write(tx, …)`
inside it. Tests passed — the rows were written, rollbacks erased them. I
rejected the shape anyway: _"I don't want to see `audit.write` repeated in
every service and every function. Audit logging should be handled globally,
ideally as part of the transaction — if the transaction fails, there's no need
to log anything."_

What came back was a single `audit.transaction(entry, fn)` wrapper that _is_
the mutation path: it owns the transaction, runs the mutation, writes the audit
row last inside the same transaction, and commits both together. A failed
mutation leaves no trail; idempotent no-ops (voting twice) skip the entry via a
null-returning derive function. No bare `db.transaction` remains in any
mutating service.

Two things about the exchange worth recording. First, the tests couldn't have
caught this — they verify that audit rows exist, not that the next developer
can't forget to write one; it took reading the diff to see the structural
weakness. Second, the AI pushed back on going further: I might have wanted
audit fully invisible to services (route decorators + an interceptor), and it
argued that an interceptor runs outside the database transaction — which would
break my own "no trail for failed transactions" requirement. The per-mutation
_declaration_ (action name, entity, payload) stays visible in the service, and
that visibility is what makes the trail reviewable. I accepted that boundary.

_(further examples added as the corresponding parts get built)_

## What I replaced even though it worked

Two cases on day one, both about the same instinct:

**The agent scaffolded template files into the repo** — empty plan/ADR/log
skeletons under `docs/`. Nothing was broken; I removed them anyway. Empty
templates in a repository someone else will read are process decoration. The
working material (plans, boards, raw AI logs) moved to an untracked notes folder;
the repo keeps only real content.

**The first versions of the ADRs justified decisions by pointing at the
requirements document** — "the requirements prefer X, so we chose X." Structurally
fine, and I had all six rewritten. A decision record should convince an engineer
who has never read the requirements: PostgreSQL because a vote is a unique
(user, request) pair and that invariant belongs in the database — not because
somebody asked me to justify my database.

## What went wrong

_(Logged the moment it happens, with what it cost and what changed afterwards.
Nothing worth reporting yet.)_

## Attribution in the history

Every commit carries a trailer:

```
AI-Assisted: heavy | partial | none
```

`heavy` — the AI produced most of the diff and I reviewed and adjusted it;
`partial` — genuinely mixed; `none` — hand-written. Messages are always written
by me. The convention is also documented in the [README](README.md).
