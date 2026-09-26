# Relay

An advisor advice-to-action layer. Relay closes the step between a generated client opportunity and an
executed, supervised client action, and measures itself on conversion rather than on volume.

Built as an interview artifact for a Product Manager, Digital Solutions & AI role in wealth management.
**All client data is synthetic. No employer information of any kind is used.**

## Project overview

A wealth platform can generate opportunities faster than advisors can act on them. Dividing the two
figures one large US wealth manager publishes, over 20 million AI-identified client opportunities in a
year and the meeting-preparation time saved, gives roughly 11 to 22 seconds of returned time per
opportunity generated. Volume is the published growth metric and preparation time the published
outcome metric; conversion is not published at all.

Relay is the layer between the opportunity and the client. Its interface is a **queue of decisions**,
not a conversation, because a decision queue has a bounded output space and is reviewable where a
conversation is neither. The rate-limiting step is the supervisory record, not the model.

Full argument in `docs/PRD-relay.md`. What to build, and in what order, is in `docs/BUILD-SPEC.md`.

## The invariant that shapes the architecture

**Relay never sends anything to a client.** It drafts; a supervisory principal dispositions; a human
acts. There is no dispatch route and no outbound transport anywhere in the dependency graph, and that
is enforced rather than documented:

```bash
npm run invariant:imports   # dependency-cruiser: no module may reach a transport
npm run test                # tests/invariants: no send verb, no undispositioned release
```

A second invariant matters as much: **the model composes language, it does not decide eligibility.**
Constraint evaluation, ranking, recipient counting and policy checks are deterministic code in
`lib/constraints`, `lib/ranking` and `lib/recipients`, and dependency-cruiser forbids those modules
from importing any model client. This is what makes the system reviewable by a supervisor.

## Tech stack

- Next.js (App Router) with React and TypeScript in strict mode.
- Tailwind CSS for layout, with the design tokens fixed in `docs/BUILD-SPEC.md` §7.
- Vitest for unit and invariant tests; dependency-cruiser for architecture invariants; ESLint.
- **No database and no network calls.** Fixtures in `fixtures/` are the entire data layer, loaded at
  build time. A prototype that cannot fail to connect to anything cannot fail during a screenshare.
- **No model API calls at runtime.** Generated text in the prototype is pre-computed and stored beside
  the fixture that produced it, so the demo is deterministic and the same every rehearsal.

The stack mirrors `roleos-app` deliberately, including the invariant pattern, so the two read as the
work of one engineer.

## Setup

Requires Node 20 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
```

## Checks

```bash
npm run check      # typecheck, lint, invariant:imports, test. Run before every commit.
```

Run them sequentially, never concurrently.

## Project structure

```
app/                  Next.js routes, one per surface (see BUILD-SPEC §2)
components/           Presentational components. No business logic.
lib/
  constraints/        Deterministic constraint evaluation. No model imports.
  ranking/            Deterministic ranking and the per-advisor cap. No model imports.
  recipients/         Rolling 30-day recipient counter and regime resolution. No model imports.
  graph/              Entity graph traversal and reason-path construction.
fixtures/             Synthetic households, holdings, IPS constraints, documents, pre-computed text
evals/                Golden set and the release gate
tests/invariants/     The architectural invariants, enforced
docs/                 PRD, build spec, brief, audit record, decisions
```

## Conventions

- **No em-dashes**, in prose or code comments. Colons, commas, semicolons.
- **Every UBS figure is provenanced** in `docs/PRD-relay.md` Appendix D. Three are marked load-bearing
  and unconfirmed. Do not add, round or restate one without updating that table.
- **Synthetic data is labelled as such on every screen.** Illustrative documents carry relative,
  non-calendar dates and no investment view is attributed to any real firm's Chief Investment Office.
- **Refusal is a feature.** When evidence is insufficient or a constraint is breached, the product says
  so and shows why. Never soften a refusal into a warning.
- **Show the rejected options.** A rejected proposal is displayed with the failing constraint named.

## PR rules

- `npm run check` passes before a PR opens.
- A PR that touches `lib/constraints`, `lib/recipients` or `lib/ranking` states in its body why the
  change stays deterministic.
- A PR that adds a dependency states why it is not an outbound transport.
- This repository is **private and stays private**. No hosting target, no public deploy. See
  `docs/DECISIONS.md` D-57.
