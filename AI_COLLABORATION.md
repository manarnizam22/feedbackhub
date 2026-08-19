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

*(This section fills in as the non-trivial parts get built — each entry shows the
actual prompt, what came back, and what changed before it shipped. The raw logs
are kept as I go, so the prompts here are real, lightly trimmed dictation and
all.)*

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

*(Logged the moment it happens, with what it cost and what changed afterwards.
Nothing worth reporting yet.)*

## Attribution in the history

Every commit carries a trailer:

```
AI-Assisted: heavy | partial | none
```

`heavy` — the AI produced most of the diff and I reviewed and adjusted it;
`partial` — genuinely mixed; `none` — hand-written. Messages are always written
by me. The convention is also documented in the [README](README.md).
