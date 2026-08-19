# ADR-0004: Angular 22, standalone components, signals, Tailwind + CDK

- **Date:** 2026-08-19
- **Status:** accepted

## Context

The frontend is Angular; the decisions to make are version, state management,
styling and component approach.

## Options considered

**Version** (verified against angular.dev / endoflife.date on 2026-08-19):

- **Angular 22.1 (current stable, released 2026, supported to mid-2028)** — signals
  are the settled reactivity model, standalone components are the default, zoneless
  change detection is stable — newest surface, but it is the *stable* line, not a
  preview.
- **Angular 20 LTS** — longer track record — deliberately choosing an older major for
  a greenfield 2-day project signals caution with nothing to be cautious about.

**State management:**

- **Signals + injectable stores (plain services)** — right-sized: the app's state is
  server data plus a handful of UI concerns — no dev-tools time-travel.
- **NgRx (full)** — established — ceremony designed for state complexity this app
  does not have; an unjustifiable dependency at this size.

**Styling / components:**

- **Tailwind + Angular CDK** — full design control; CDK provides behavior (overlay,
  focus trap, a11y) without imposing looks — accessibility must be assembled
  deliberately rather than inherited.
- **Angular Material** — accessible components out of the box — themed-Material look
  is recognizable, and overriding it costs the time it claims to save.

## Decision

Angular 22.1, standalone components, signal-based state in injectable stores,
`httpResource`/fetch-based data access, Tailwind for styling with Angular CDK for
behavioral primitives (dialogs, menus, focus management).

CDK provides behavior, not finished accessible components — so a small set of
accessible primitives (button, dialog, form field with wired error messages, menu)
is built first and reused everywhere, and the Playwright suite includes a
keyboard-only pass of the core journey to keep that promise honest.

## Consequences

- Version choice is current, supported, and defensible in one sentence.
- State stays inspectable (signals in services) without a state-management framework
  to justify.
- We own the accessibility of every interactive element; the e2e keyboard pass is the
  enforcement mechanism, not good intentions.
