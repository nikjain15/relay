# Relay

Advisor advice-to-action layer. An interview artifact, private, with synthetic data only. Never host it
at a public, indexed URL (job-search D-57).

**Live demo:** https://nikjain15.github.io/relay/ (walkthrough: `/relay/walkthrough/`). Published on GitHub Pages by `.github/workflows/pages.yml` on every push to `main` (R-22). Public but noindex.

**Status:** PRD v0.4, build spec v2.5, prototype **built** to the spec: all nine surfaces across the
advisor journey plus My clients, meetings with review packs, follow-ups, per-advisor and per-client personalization with a learning loop (`/profiles`, `/learning`), a journey home page and a measurement page, on the data in `data/` (clients, advisors, firm policy and app settings), with no
model calls. The v1.0
documents from an earlier session were lost and are not reconstructed; see `docs/DECISIONS.md` R-09.

**Demo path:** start at `/` (the advisor journey), then `/triage`, then the Renner property sale's evidence, household and proposals; the Pell
refusal; `/communications` for the recipient counter; `/supervision`; `/follow-ups`; `/meetings/hh-alcott` for a review pack; `/measurement`. Details in
`docs/BUILD-SPEC.md` §7.

## Run it

```
npm install
npm run check    # typecheck, lint, invariant:imports, data:check, tests. Run sequentially.
npm run dev
npx next build && npm run e2e   # every page and the mockup in Chromium, three widths
npm run stress                  # 1,000 clients, 50 advisors, 20,000 events, in memory
```

## Documents

| File | What |
|---|---|
| `docs/PRD-relay.md` | The PRD, v0.4 |
| `docs/00-BRIEF.md` | Reasoning, demo running order, talk track, people-leadership material (§12) |
| `docs/AUDIT-2026-09-26-r21.md` | Fourth audit (R-21): stress test, every guard re-proved, every figure recomputed, browser run; 51 findings and their fixes |
| `docs/AUDIT-2026-09-26-pass3.md` | Third audit: findings, verification table, recomputed arithmetic |
| `docs/AUDIT-FINDINGS-2026-09-26.md` | First and second audit passes, as recorded then. Treat as history |
| `docs/AUDIT-PROMPT.md` | The audit prompt used for the earlier passes |
| `docs/DESIGN-SYSTEM.md` | Principles, tokens, components and the branding boundary; one system for the prototype and the mockup |
| `docs/ARCHITECTURE-compliance.md` | Connectors, the configurable rule set, the agents and the change log: what is autonomous, what is not, and where each invariant is enforced |
| `docs/ARCHITECTURE-personalization.md` | Personalization layers, the one read path, and the learning loop, with guardrails and the production mapping |
| `docs/BUILD-SPEC.md` | Build spec v2.5: surfaces, data model, fixtures, engines, demo path, tests, build order |
| `docs/mockups/relay-wireframes.html` | Low-fidelity mockup: four client stories through the six daily steps, and six journey chapters (prospects, paperwork, meetings, review pack, service, follow-ups), all generated from `data/` (private artifact link, not an indexed page) |
| `data/` | **All client, advisor, policy and reference data.** One JSON file per client; see `data/README.md` |
| `docs/PERSONAS.md` | Cited composite personas: every detail with its kind and public source |
| `docs/DECISIONS.md` | R-09 onward |

Not present, and deliberately not reconstructed: the lost `ARCHITECTURE.md` and its diagrams.

## The invariant

Relay drafts; a human sends. There is no path from this code to a client. `.dependency-cruiser.cjs`
forbids outbound transports in `app/`, `components/` and `lib/`, and forbids the deterministic modules
(constraints, ranking, recipients, policy, evidence, servicing, onboarding, profile, learning) from reaching a
model client by any import path. `tests/invariants/no-outbound-path.test.ts` catches globals the import guard
cannot see and any send verb in the action vocabulary. At runtime the browser may only talk to this origin
(`connect-src` and `form-action 'self'` in `next.config.ts`), and every response says noindex.
