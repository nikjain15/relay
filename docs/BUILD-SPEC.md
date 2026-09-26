# Relay: build spec

**Version:** v2.0, 2026-09-26. **Status: built.** Every surface in §2 exists and the §7 path was driven in a browser. Written fresh from PRD v0.4 (the lost v1.0 is not reconstructed; R-09).
**Rule (job-search D-73):** the PRD states intent, this file states implementation, code follows this
file. A decision not written here is not made; an engineer who has to invent one adds it here first.

---

## 1. Scope of the prototype

Six surfaces built and working against fixtures, three designed and visibly labelled as not built
(PRD §4.1). One measurement surface. **No model calls anywhere.** Where the PRD says "the model composes
language," the prototype composes from approved template fragments deterministically, and every screen
says so. This keeps the demo reproducible and keeps the claim honest: the prototype shows the control
and data model, not model quality.

Everything runs locally. No network, no database, no auth. State that the user changes (dismissals,
proposal acceptance, batch selection, supervisory disposition) lives in React state for the session and
resets on reload, which is what a demo wants.

## 2. Surfaces and routes

| # | Surface (PRD §4.1) | Route | State | What it shows |
|---|---|---|---|---|
| 6 | Book triage | `/triage` | **Build** | Ranked opportunities, capped at 12, each with trigger class, household, materiality, reason path, dismiss with reason |
| 4 | Evidence and explain | `/evidence/[oppId]` | **Build** | The reason path as nodes, cited passages with title, relative date and passage; a **refusal** when no passage supports the opportunity |
| 3 | Household advice state | `/household/[id]` | **Build** | Liquidity, Longevity, Legacy: funded vs target, gap, driving assumption; holdings with weights; IPS constraints; persons in household |
| 5 | Action proposals, bounded | `/household/[id]/proposal` | **Build** | Every shelf candidate for the opportunity, each evaluated; passing ones selectable; **rejected ones shown with the failing constraint named**; structured rationale record |
| 7 | Client communications | `/communications` | **Build** | Draft composed from an approved proposal; batch selector across the book; **recipient counter in persons, firm-wide, with the regime shown before submit** |
| 9 | Supervision console | `/supervision` | **Build** | Queue items with draft, rationale, evidence, recipient count and regime, per-check pass or fail; approve, return, block |
| - | Measurement | `/measurement` | **Build** | Conversion funnel (synthetic), zero-tolerance gate list with live pass or fail from the test suite's same functions |
| 1 | Pipeline and prospecting | `/designed/pipeline` | Designed | One-paragraph description, labelled "Designed, not built" |
| 2 | Onboarding and re-papering | `/designed/onboarding` | Designed | Same |
| 8 | Servicing and operations triage | `/designed/servicing` | Designed | Same |

`/` redirects to `/triage`. A left navigation lists all ten, with the three designed ones visibly
marked. Every page carries the banner "Illustrative prototype. Synthetic data. No model calls."

**Layout, all Build surfaces:** dense tables, 13px base, tabular numerals for money and percentages,
one accent colour from `--accent`, no cards-with-shadows. Evidence is one click from any row (PRD §6.1
principle 2). WCAG 2.2 AA: every interactive control is a real `button` or link with a visible focus
ring, and state is never conveyed by colour alone (pass and fail carry text).

## 3. Data model

Types live in `lib/types.ts`. The ones that carry decisions:

- **Household** has `persons: Person[]`. Retail-investor counting uses persons (R-12).
- **Goal** is `{ strategy: "Liquidity" | "Longevity" | "Legacy", funded, target, unit, assumption }`.
- **Constraint** is a discriminated union, so each rule is data, not prose:
  `maxSingleName { pct }`, `minLiquidityMonths { months }`, `maxRiskLevel { level }`,
  `noShortTermGains { }`, `excludedProductTypes { types }`.
- **Opportunity** has `triggerClass` (one of five, below), `materiality` 0 to 100, `observedDay`
  (relative), `reasonPath: ReasonNode[]`, `evidenceDocIds: string[]`.
- **ReasonNode** is `{ kind, label }` where kind is a graph node type from PRD §5.1. The reason path is
  a **typed array, not a sentence**, so what is shown is what was decided on.
- **Product** (shelf) has `type`, `riskLevel` 1 to 5, `liquidityDays`, `costBps`, `realizesGainOn?`.
- **Distribution** is the recipient-counter record from `lib/recipients/count.ts`.
- **Candidate** is `{ productId, action, source, amountUsd }`. The **funding source** (`new_cash`,
  `rebalance_from_core`, `sell_long_term_lots`, `sell_all_lots`, `contribute_in_kind`) is part of the
  output space, because the PRD's worked example rejects a candidate for its tax-lot holding period,
  which depends on which lots are sold, not on the product. Added while building; the output space is
  shelf products crossed with the sources the action allows, plus "sell all lots" into the core model.
- **Refusal propagates.** An opportunity whose evidence is refused cannot be proposed on, from triage or
  from the proposal surface.

## 4. Trigger classes

Exactly five, from PRD §5.1, as the `TriggerClass` union: `life_event`, `external_event`,
`household_threshold`, `plan_service_event`, `market_view`. Market view is one class of five and never
the flagship. **The flagship demo row is an external event**: a recorded property sale for the Renner
household.

## 5. Fixtures

All in `lib/fixtures/`, typed, synthetic, surnames invented and matching no real executive.

| File | Contents |
|---|---|
| `households.ts` | The seven archetypes of PRD Appendix A, with persons, goals, holdings, constraints, tier |
| `book.ts` | 18 light book records (id, name, persons) for the batch demo, so a cohort can exceed 25 persons |
| `opportunities.ts` | 11 opportunities covering all five trigger classes; at least one with no supporting evidence, to exercise refusal |
| `shelf.ts` | 8 products, including at least one that fails each constraint type for the Renner household |
| `corpus.ts` | 8 illustrative documents with **relative, non-calendar dates** ("prototype corpus, day 3") and passages; no view attributed to any real firm's CIO |
| `distributions.ts` | Prior sends of the demo note by a second advisor, so the firm-wide count is visible |
| `funnel.ts` | Synthetic funnel stage counts for the measurement surface, labelled synthetic on screen |

**Numbers that must hold** (tests assert them):
- Renner: $62.4M, 2 persons, single position 71% against a 25% cap, Liquidity 0 of 36 months, Legacy
  unfunded.
- Retired couple: $8.4M, Liquidity 11 of 36 months.
- The batch demo cohort reaches exactly 26 persons from 13 two-person households with the second
  advisor's prior sends excluded, and exceeds 25 earlier when they are included.

## 6. Deterministic modules

| Module | Responsibility | May import a model client |
|---|---|---|
| `lib/constraints/evaluate.ts` | `evaluate(product, action, household) -> { pass, failures[] }`, one failure per breached constraint, with the rule name and a numeric detail | No (enforced) |
| `lib/ranking/rank.ts` | `rank(opps, dismissed, cap)`: score = materiality x class weight, ties broken by id; excludes dismissed; caps at 12 | No (enforced) |
| `lib/recipients/count.ts` | Persons, firm-wide, 30 calendar days, regime (R-12) | No (enforced) |
| `lib/policy/checks.ts` | Zero-tolerance checks on a draft: no performance projection language, every figure in the draft appears in its source set, at least one citation, regime recorded matches counter | No (enforced) |
| `lib/evidence/retrieve.ts` | Passages for an opportunity's `evidenceDocIds`; returns `{ refused: true, missing }` when none resolve | n/a |
| `lib/drafting/compose.ts` | Composes the client note **only** from the approved proposal, the household's figures and the cited passage, using fixed fragments | n/a in prototype |

## 7. Demo click path

Aligned to `00-BRIEF.md` §7, twelve minutes.

| Beat | Minutes | Where | What happens | The line |
|---|---|---|---|---|
| 1 | 2 | (talk) | Celent award, 20M+ opportunities, 90% of teams, preparation time saved. No ratio | "What share of those became a documented, approved client action?" |
| 2 | 4 | `/triage` then `/evidence/opp-renner-property` then `/household/hh-renner` then `.../proposal` | External-event row, reason path, cited passage, advice state gaps, bounded candidates | "The explanation is the object the system decided with." |
| 3 | 1 | `.../proposal` and `/evidence/opp-pell-market` | A rejected candidate with the failing constraint named; an evidence refusal | "Refusal is a feature." |
| 4 | 1 | `/communications` | The draft's own household (Renner, 2 persons) plus "Select 12 two-person households": 13 households, 26 persons, the regime flips; toggling the second advisor's sends adds 6 in-window persons and ignores 3 older ones | "It counts people, firm-wide, not households." |
| 5 | 2 | `/measurement`, then optionally a terminal | Funnel and gates; `npm run check`, then a planted violation failing | "A guard nobody has seen fail is not a guard." |
| 6 | 2 | (talk) | Roadmap by supervisory surface, PRD §9.1 | Closing line from the brief |

## 8. Tests

`npm run check` must pass. Beyond the invariants and recipient tests already present:
constraints (each rule fails on the Renner fixture for the right product; a compliant product passes),
ranking (cap, dismissal, determinism), policy (each check fails on a planted draft and passes on a
composed one), compose (output passes every policy check for every approved proposal in the fixtures),
fixtures (the numbers in §5).

## 9. Build order

Dependency-ordered; each step's tests pass before the next starts.

1. `lib/types.ts`, then fixtures, with the fixture tests.
2. Constraint engine and ranking, with tests.
3. Evidence, policy checks, compose, with tests.
4. Layout and navigation, designed-not-built pages.
5. Triage, evidence, household, proposal.
6. Communications with the counter, supervision, measurement.

## 10. Out of scope for the prototype

Model calls, persistence, auth, CRM write-back, the retrieval service, the 250 to 400 case golden set
(PRD §8.3; the zero-tolerance checks exist as code and tests instead), mobile layout.
