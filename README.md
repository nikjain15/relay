# Relay

An advisor advice-to-action layer. Relay closes the step between a generated client opportunity and an
executed, supervised client action, and measures itself on conversion rather than on volume.

**Private repository.** Built as an interview artifact. All client data is synthetic. No employer
information of any kind is used. Not deployed, and never to be: see `docs/DECISIONS.md` D-57.

## Status

| | |
|---|---|
| PRD | `docs/PRD-relay.md` **v1.0**. Nine sections, five appendices, twice fact-audited |
| Architecture | `docs/ARCHITECTURE.md` v1.0, five diagrams, rendered SVGs in `docs/diagrams/` |
| Build spec | `docs/BUILD-SPEC.md` v1.0, ready to build against |
| Prototype | **Not started.** Build order in BUILD-SPEC §10 |
| Surfaces | 9 specified. 6 to be built deep, 3 designed and labelled |

## Start here

1. `docs/ARCHITECTURE.md` if you want the system design. Five diagrams: system context, the
   determinism boundary, the critical path, regime resolution as a state machine, and the data model.
2. `docs/BUILD-SPEC.md` if you are writing code. It has the screens, the data model, the fixtures, the
   design tokens, the demo click path and the build order.
3. `docs/PRD-relay.md` if you want the argument and the evidence. Every figure is in its Appendix D
   with source, date and confidence.
4. `docs/00-BRIEF.md` for the reasoning behind each decision and the demo running order.
5. `docs/AUDIT-FINDINGS-2026-09-26.md` for what two audit passes found and fixed.

## The thesis, in three lines

One large US wealth manager publishes that its opportunity engine generated more than 20 million
AI-identified client opportunities in a year, up about 50%, used by nearly 90% of advisor teams. It also
publishes the meeting-preparation time saved. Divide: roughly **11 to 22 seconds of returned time per
opportunity generated**.

Volume is the published growth metric. Preparation time is the published outcome metric. **Conversion
is not published.** Relay is the layer between the opportunity and the client, and its interface is a
queue of decisions rather than a conversation.

## The invariant

Relay never sends anything to a client. It drafts; a principal dispositions; a human acts. Enforced,
not documented:

```bash
npm run invariant:imports   # no module may reach an outbound transport
npm run test                # no send verb, no undispositioned release
npm run check               # typecheck, lint, both of the above
```

Run checks sequentially, never concurrently.

## Setup

Requires Node 20 or newer.

```bash
npm install
npm run dev     # http://localhost:3000
```

Contributor and agent guidance: `AGENTS.md`.
