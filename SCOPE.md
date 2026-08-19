# Scope

Where the edges of this project are, and why. Kept up to date as the work happens.

## What's in

*(updated as features merge — each line added when the thing actually works)*

## What's out, on purpose

Decided up front, with the reasoning:

- **Sending email.** The notification *preference* is real end-to-end — stored,
  editable, resolved with the rest of the settings, respected by the backend — but
  no email leaves the system. Wiring delivery means an SMTP path and a mail-catcher
  container for local runs; that buys a demo of infrastructure, not of judgment.
  The seam where a sender would plug in is the notifications module.
- **Avatar upload.** Initials-based avatars only. File upload drags in object
  storage, size/type validation and image processing — a lot of surface for an
  internal tool where initials do the job.
- **Translations.** The language preference exists and resolves like every other
  setting, but only English strings ship. Adding a second language is extraction
  work, not design work, so it proves little.
- **Denormalized vote/comment counters.** Counts are computed with joins. At this
  data volume that is the honest default; the counter-column escape hatch is noted
  in ADR-0003 for the day measurements demand it.

## Ambiguities, and how I read them

- **Section 7 of the assignment PDF ends mid-thought** — "Two things worth stating
  plainly:" is followed by nothing, and the write-up section jumps from 6.5 to 6.7.
  I flagged it to the team by email and continued; nothing else depends on it.
- **"Email notification preferences"** — I read this as the preference being the
  requirement, not a mail pipeline; asked in the same email whether a local
  mail-catcher was expected. See "What's out" above either way.
- **Registration policy (open / invite-only / domain-restricted)** — read as
  admin configuration that drives the identity provider's realm behavior, not as
  custom registration code. Authentication stays entirely delegated (ADR-0002).
- **"Retiring" a category** — read as deactivation, not deletion: existing requests
  keep their category; the retired one stops being offered for new submissions.

## Assumptions

- Single tenant, single region, one deployment.
- Employees are a semi-trusted user base: rate limits and moderation exist, but no
  CAPTCHA or anti-abuse hardening beyond that.
- Content referenced by others (a request with comments) is soft-deleted so
  discussions don't dangle; unreferenced content deletes hard.

## With another week

*(written honestly at the end — candidates so far: real notification delivery with
digest batching; a lint-enforced module boundary instead of a convention; profiling
the list query under realistic volume before deciding on counter columns)*
