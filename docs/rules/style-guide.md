# Style guide

The point is consistency: a codebase where the same problem is always solved the
same way. When in doubt, match the nearest existing code; when two patterns
conflict, pick one and flag the other.

## Naming

- Files: kebab-case (`feedback-list.store.ts`, `votes.service.ts`).
- Angular: standalone components, `*.component.ts` / `*.store.ts` / `*.routes.ts`
  suffixes; selectors prefixed `fh-`.
- Nest: **a module is a domain (bounded context), never a wrapper per
  entity/table/operation.** One module per domain — `feedback/`, `taxonomy/`,
  `settings/`, `users/` — each holding as many controllers/services as the
  domain needs (e.g. requests, votes and comments are three services inside the
  one feedback module). Adding an entity to an existing domain never creates a
  module. Inside a domain folder, once it holds more than one controller or
  service they group into `controllers/` and `services/` subfolders; small
  domains stay flat until they grow. Controllers thin, services own logic, DB
  access stays inside the owning module.
- DB: snake_case tables and columns; singular table names avoided (`feedback_requests`,
  `votes`, `comments`).
- Shared contracts: zod schemas in `packages/types`, named `XRequestSchema` /
  `XResponseSchema`, with inferred types `XRequest` / `XResponse`.

## TypeScript

- `strict` everywhere; no `any` outside test fixtures, no non-null assertions where a
  guard is possible.
- Types flow from zod schemas or Drizzle — do not hand-write a type that can be
  inferred.

## Comments

Comment only what the code cannot say: a constraint, an invariant, a deliberate
oddity. No JSDoc on internal code, no narration of the obvious, no ticket references.
**Never inside function bodies** — a comment worth keeping goes in a block above
the function or declaration it explains.

## Tests

All test files live in `__tests__` folders colocated with the code under test
(`src/<module>/__tests__/*.test.ts`); integration tests in the app-level
`__tests__/` folder (`*.int.test.ts`).

## Errors

- API: every thrown error maps to a typed problem response (see
  `api-patterns.md`); no raw 500s from expected failures.
- Web: every async surface renders loading, empty and error states — a component
  without all three applicable states is unfinished.

## Formatting

Prettier owns formatting; it is checked in `pnpm verify` and never argued with.
