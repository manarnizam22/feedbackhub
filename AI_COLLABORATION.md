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

The method did change under deadline pressure, in two honest ways. Branching
moved from one-branch-per-ticket to one-branch-per-epic (user journeys;
settings+admin; delivery) with small per-ticket commits inside — the ceremony
shrank, the granular history stayed. And once, late on day two, the AI started
generating a feature before its plan existed; I stopped it and demanded the
plan and the branch first. The discipline held because I held it — which is,
I think, the honest answer to how plan-first survives contact with a deadline.

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

### 3. Session revocation — a bug I found, and a first fix that wasn't enough

While smoke-testing the shell I terminated my own active session from the
Keycloak admin console and noticed the app just kept working. I reported it to
the AI the way I'd file a ticket: actual behavior, expected behavior, and the
desired flow — _"Keycloak session terminated → application session invalidated
→ next protected request fails → frontend logs the user out → user is
redirected to login."_

The first response explained the mechanics honestly — stateless JWTs cannot be
revoked mid-flight, only outlived; the API validates signatures, it doesn't
phone Keycloak per request — and shipped a three-layer fix: the session-status
iframe for live detection, 401-handling in the HTTP interceptor, and
login-redirect on failed token refresh.

**I retested and it still failed my scenario** — logout only happened after a
page refresh. The iframe path depends on browser cookie policy, which is
exactly the kind of thing that works in a demo and dies in the field. The
second iteration added a session heartbeat: a forced token refresh every ten
seconds that round-trips to Keycloak, so a terminated session fails the very
next beat regardless of any cookie behavior — deterministic ≤10s revocation,
at the cost of one lightweight call per tab. That trade-off (versus per-request
introspection, which would make every API call stateful) is documented, and
the residual window — an already-issued access token stays valid until its
short expiry — is stated rather than hidden.

The gap between first output and shipped was closed by manual retesting, not
by more generation. If I had accepted the first plausible fix, the bug would
have survived to the reviewer's desk.

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

Plenty — logged the moment it happened, never reconstructed. The most
instructive cases:

**The rate limiter rate-limited its own test suite.** The daily-submission
limit worked so well that after a day of test runs, both the integration suite
and my own account hit the quota — tests failed with 429s that looked like
regressions. Worse, a failing run once left the tightened test limit stuck in
the shared dev database, so the _next_ run failed differently, and later my
manually saved admin settings were silently erased by a suite teardown. Three
rounds of this produced the durable rule: integration suites snapshot the
settings they touch and restore the snapshot — never seed values — and any
test data they create is tagged and hard-deleted. Cost: perhaps an hour across
the project; worth it for the lesson that a shared dev database makes tests
and humans coworkers who must clean up after themselves.

**CORS passed every test and failed in the browser.** Votes, edits and deletes
died with a CORS error while reads and creates worked — the CORS layer's
_default_ allowed-methods list (`GET,HEAD,POST`) was narrower than the API's
verbs, so exactly the PUT/PATCH/DELETE endpoints failed preflight. The
integration suite calls the API server-side and never preflights, so it was
structurally unable to catch this. Diagnosed by replaying the OPTIONS request
directly and reading the response headers. Lesson: browser-only failure modes
(CORS, cookies, redirects) need browser-level tests — the e2e suite now votes
through a real browser.

**Realtime introduced a race the e2e suite caught on its first serious run.**
With SSE refreshes live, a user action and its own server echo could trigger
two overlapping loads — and the older HTTP response sometimes resolved last,
overwriting fresh data (my new comment visibly vanished while sitting in the
database). Two fixes shipped: a sequence guard so stale responses can never
win, and echo suppression — events caused by your own user ID don't trigger
reloads, because the app already refreshed after its own mutation. A third
failure in the same test turned out to be the _test's_ bug (opening the editor
replaced the text its locator anchored on). One journey test, three distinct
root causes, each one real.

**Environment lies.** A "corrupt zip" during Node installation was actually a
full disk truncating downloads; a dead-looking dev server was a watcher that
died during a git branch switch; a crashed e2e run was Windows out of memory
under kind + Docker + dev servers. Each cost minutes-to-an-hour and taught the
same meta-lesson: when a tool's error message is implausible, check the
environment before debugging the tool.

**Version-era traps caught by policy, not luck.** `typescript@latest` is now
the 7.0 native compiler (Angular pins ~6.0, the backend ~5.9 — three majors,
one monorepo, all deliberate); TS 6 deprecated `baseUrl`; CASL v7's generics
needed the exact `InferSubjects` distribution shape while runtime behavior was
correct throughout. The standing rule — verify versions against live sources
before writing them down — exists because model memory ages; it fired usefully
several times.

## Attribution in the history

Every commit carries a trailer:

```
AI-Assisted: heavy | partial | none
```

`heavy` — the AI produced most of the diff and I reviewed and adjusted it;
`partial` — genuinely mixed; `none` — hand-written. Messages are always written
by me. The convention is also documented in the [README](README.md).
