# Relay

Advisor advice-to-action layer. An interview artifact, private, with synthetic data only. Never host it
at a public, indexed URL (job-search D-57).

**Status:** PRD v0.4, build spec v2.0, prototype **built** to the spec: six working surfaces, a
measurement page and three designed-not-built pages, on synthetic fixtures with no model calls. The v1.0
documents from an earlier session were lost and are not reconstructed; see `docs/DECISIONS.md` R-09.

**Demo path:** `/triage` then the Renner property sale's evidence, household and proposals; the Pell
refusal; `/communications` for the recipient counter; `/supervision`; `/measurement`. Details in
`docs/BUILD-SPEC.md` §7.

## Run it

```
npm install
npm run check    # typecheck, lint, invariant:imports, tests. Run sequentially.
npm run dev
```

## Documents

| File | What |
|---|---|
| `docs/PRD-relay.md` | The PRD, v0.4 |
| `docs/00-BRIEF.md` | Reasoning, demo running order, talk track, people-leadership material (§12) |
| `docs/AUDIT-2026-09-26-pass3.md` | Third audit: findings, verification table, recomputed arithmetic |
| `docs/AUDIT-FINDINGS-2026-09-26.md` | First and second audit passes, as recorded then. Treat as history |
| `docs/AUDIT-PROMPT.md` | The audit prompt used for the earlier passes |
| `docs/BUILD-SPEC.md` | Build spec v2.0: surfaces, data model, fixtures, engines, demo path, build order |
| `docs/mockups/relay-wireframes.html` | Low-fidelity mockup: a six-step guided walkthrough of one advisor and one client, plus the three planned screens (private artifact link, not an indexed page) |
| `docs/DECISIONS.md` | R-09 onward |

Not present, and deliberately not reconstructed: the lost `ARCHITECTURE.md` and its diagrams.

## The invariant

Relay drafts; a human sends. There is no path from this code to a client. `.dependency-cruiser.cjs`
forbids outbound transports in `app/` and `lib/`, and forbids `lib/constraints`, `lib/ranking` and
`lib/recipients` from importing a model client. `tests/invariants/no-outbound-path.test.ts` catches
globals the import guard cannot see and any send verb in the action vocabulary.
