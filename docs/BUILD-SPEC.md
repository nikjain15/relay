# Relay: build spec

**Version:** v2.6, 2026-09-26 (v2.6 adds channel connectors, the configurable FINRA and SEC rule set, the compliance agents and the standing sweep, and rebuilds the shell and every screen for phone width; design in `ARCHITECTURE-compliance.md`; v2.5 applies the R-21 audit: exact funding need with known outflows, the call-first rule enforced, money movement widened, guards made transitive, AA contrast, see the R-21 audit record; v2.4 applies one design system to the prototype and the mockup, R-20; v2.3 adds four-layer personalization and the learning loop, R-19, design in `ARCHITECTURE-personalization.md`; v2.0 built the six core surfaces; v2.1 builds the remaining three and deepens every screen, R-17; v2.2 completes the journey with clients, meetings, review packs and follow-ups, and moves policy and settings into data, R-18). **Status: built.** Every surface in §2 exists and the §7 path was driven in a browser. Written fresh from PRD v0.4 (the lost v1.0 is not reconstructed; R-09).
**Rule (D-73):** the PRD states intent, this file states implementation, code follows this
file. A decision not written here is not made; an engineer who has to invent one adds it here first.

---

## 1. Scope of the prototype

All nine surfaces built and working against the client data in `data/`, plus a journey home page and a measurement page (the three that were designed-only in v2.0 are built in v2.1)
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
| 9 | Supervision console | `/supervision` | **Build** | Queue items with draft, links to the rationale and evidence, recipient count and regime (counted when submitted), the settings version, per-check pass or fail including the client's call-first rule; approve (disabled on any failing check), return, block. Dispositions last for the session; the immutable supervisory record is design (PRD FR-14) |
| - | Measurement | `/measurement` | **Build** | Conversion funnel (synthetic), zero-tolerance gate list computed live over every eligible proposal at both note lengths with the test suite's functions; two gates hold by construction and are labelled so |
| 1 | Pipeline and prospecting | `/pipeline` | **Build** | Prospects ranked by warmth of the path in, fit to the advisor's practice and size; the signal behind each (held-away assets, expected liquidity, rollover); a drafted introduction request the advisor sends |
| 2 | Onboarding and re-papering | `/onboarding` | **Build** | Every open form per client with status computed by rule: signed, due, or **escalated when unsigned for more than 14 days** (7 at the Wealth Advice Center; a client may shorten it); a drafted reminder |
| 8 | Servicing and operations triage | `/servicing` | **Build** | Incoming requests classified by rule, routed to the right person with a response-time target, overdue shown; **money movement is flagged for a callback to a number on file**, checked first and never switchable off (`validate()`); gating the release itself is design, as the prototype has no release step; a drafted reply the team sends |
| - | Advisor journey | `/` | **Build** | The whole journey on one page, before, during and after the daily work, each stage with a live count and a link |
| - | My clients | `/clients` | **Build** (v2.2) | The book per advisor: tier, assets, cash cushion against target, flagged items, open forms (escalated shown), requests, last contact, today's meeting |
| - | Today's meetings | `/meetings` | **Build** (v2.2) | Each advisor's day from `advisors.json`; client meetings link to a review pack, prospect meetings to the pipeline |
| - | Review pack | `/meetings/[id]` | **Build** (v2.2) | Built only from the client file: what changed, goals with a gap, decisions (allowed and blocked counts; refused opportunities excluded), open items and tasks, talking points, documents |
| - | Settings | `/profiles` | **Build** (v2.3) | Every setting through firm, segment, advisor and client, with the value at each layer, the effective value, its source, and the version recorded on rationale records |
| - | Suggestions | `/learning` | **Build** (v2.3) | What the learning loop proposes, with evidence and a success measure; Accept, Not now, Undo; held-back items; what is never learned |
| - | Follow-ups | `/follow-ups` | **Build** (v2.2) | Tasks by owner, overdue first; approved notes the advisor marks as sent from their own email; a call log. Relay never sends |
| 10 | Connected channels | `/connectors` | **Build** (v2.6) | Ten sources across twelve channel kinds; gaps first with the regulation named; connect or disconnect recomputes coverage for the agents too; the rules that need each source, derived from the rules themselves. A degraded source counts as uncaptured |
| 11 | Rules and agents | `/compliance` | **Build** (v2.6) | Twelve FINRA and SEC rules as editable data: severity, thresholds and whether each is in force, with provenance per field and the condition explained in words. A change needs a reason, is refused on screen if it would loosen the rule, and is live on the next evaluation. Five agents with their cadence and rule bundle; a live sample runs the current configuration against the advisor's real coverage; warns when a mandatory rule is watched by no enabled agent |
| 12 | Change log | `/compliance/log` | **Build** (v2.6) | Every change with actor, layer, field, old and new value and the reason; refused changes marked; replay to any past moment reconstructs the rule set as it stood |

`/` is the journey page. A left navigation lists every surface grouped by journey phase. (v2.0: the three designed ones were visibly
marked. Every page carries the banner "Illustrative prototype. Synthetic data. No model calls."

**Layout, all Build surfaces (v2.4):** the design system in `docs/DESIGN-SYSTEM.md`. Tokens in `app/tokens.css` only (enforced by `tests/invariants/design-tokens.test.ts`); black actions, warm greys, colour only for status and always with words; light 28px titles, 14px body, tabular numerals; 2px corners, no shadows; a top bar, a navigation rail, content capped at 1200px. WCAG 2.2 AA: every interactive control is a real `button` or link with a visible focus outline, a skip link is the first Tab stop, every text colour meets 4.5:1 on its background (checked in the browser run, `npm run e2e`), and state is never conveyed by colour alone.

### 2.1 Depth added in v2.1

| Surface | Added |
|---|---|
| Triage | Advisor switcher (A or B); the advisor's day (meetings, overnight alerts); last contact per row |
| Household | People with ages; contact history; team notes; open tasks; paperwork status; service requests; the grounding bundle of documents |
| Evidence | The client's contact history and team notes beside the reason path |
| Proposals | The amount arithmetic in one sentence (`lib/need-text.ts`, shared with the mockup): target months times monthly spending, less Liquidity holdings, plus any known outflow; new cash caps what moves and the rest is shown as still to fund |
| Communications | Talking points for the call before the note |

## 3. Data model

Types live in `lib/types.ts`. The ones that carry decisions:

- **Household** has `persons: Person[]`. Retail-investor counting uses persons (R-12).
- **Goal** is `{ strategy: "Liquidity" | "Longevity" | "Legacy", funded, target, unit, assumption }`.
- **Constraint** is a discriminated union, so each rule is data, not prose:
  `maxSingleName { pct }`, `minLiquidityMonths { months }`, `maxRiskLevel { level }`,
  `noShortTermGains { }`, `excludedProductTypes { types }`.
- **Opportunity** has `triggerClass` (one of five, below), `materiality` 0 to 100, `observedDay`
  (relative), `reasonPath: ReasonNode[]`, `evidenceDocIds: string[]`, and for a funding action
  `inflowUsd` (new cash the event brings) and `outflowUsd` with `outflowLabel` (a known payment the goal must
  also cover, such as a capital call).
- **ReasonNode** is `{ kind, label }` where kind is a graph node type from PRD §5.1. The reason path is
  a **typed array, not a sentence**, so what is shown is what was decided on.
- **Product** (shelf) has `type`, `riskLevel` 1 to 5, `liquidityDays`, `costBps`, and plain-English names.
  A holding counts toward Liquidity when its product meets the Liquidity sleeve limits in `policy.json`.
- **Distribution** is the recipient-counter record from `lib/recipients/count.ts`.
- **Candidate** is `{ productId, action, source, amountUsd }`. The **funding source** (`new_cash`,
  `rebalance_from_core`, `sell_long_term_lots`, `sell_all_lots`, `contribute_in_kind`) is part of the
  output space, because the PRD's worked example rejects a candidate for its tax-lot holding period,
  which depends on which lots are sold, not on the product. Added while building; the output space is
  shelf products crossed with the sources the action allows, plus "sell all lots" into the core model.
- **Refusal propagates.** An opportunity whose evidence is refused cannot be proposed on, from triage, the
  proposal surface or the review pack. A citation that does not resolve is named even when others do.
- **RationaleRecord** carries `settingsVersion`, the resolved settings in force.

## 4. Trigger classes

Exactly five, from PRD §5.1, as the `TriggerClass` union: `life_event`, `external_event`,
`household_threshold`, `plan_service_event`, `market_view`. Market view is one class of five and never
the flagship. **The flagship demo row is an external event**: a recorded property sale for the Renner
household. On screen the classes read, in plain words (`lib/labels.ts`, shared with the mockup): Life event,
Outside event, Over a limit, Plan or service, Market view.

## 5. Fixtures

All in `data/` as JSON (one file per client; see `data/README.md`), loaded and validated by `lib/data`. `lib/fixtures/` modules are thin views over it. Cited composites, surnames invented and matching no real executive.

| File | Contents |
|---|---|
| `households.ts` | The seven archetypes of PRD Appendix A, with persons, goals, holdings, constraints, tier |
| `book.ts` | 18 light book records (id, name, persons) for the batch demo, so a cohort can exceed 25 persons |
| `opportunities.ts` | 12 opportunities covering all five trigger classes; at least one with no supporting evidence, to exercise refusal |
| `shelf.ts` | 8 products; for Renner, at least one fails on exclusion, risk, liquidity minimum and holding period; concentration fails only on a trim too small, which the tests plant |
| `corpus.ts` | 8 illustrative documents with **relative, non-calendar dates** ("prototype corpus, day 3") and passages; no view attributed to any real firm's CIO |
| `distributions.ts` | Prior sends of the demo note by a second advisor, so the firm-wide count is visible |
| `funnel.ts` | Synthetic funnel stage counts for the measurement surface, labelled synthetic on screen |

**Numbers that must hold** (tests assert them):
- Renner: $62.4M, 2 persons, single position 71% against a 25% cap, Liquidity 0 of 36 months, Legacy
  unfunded.
- Retired couple: $8.4M, Liquidity 11 of 36 months.
- The batch demo cohort reaches exactly 26 persons from 13 two-person households with the second
  advisor's prior sends excluded, and exceeds 25 earlier when they are included.

### 5.2 Data separation (v2.2)

Nothing a person might change lives in code.

| File | Read by |
|---|---|
| `data/policy.json` | Triage (dismiss reasons), constraints (cash product, sleeve limits, lock-up, core model), compose (disclosure document), prospecting (warmth, size bands, largest first), servicing (routing rules; money movement first, callback required). The cap, class weights and escalation days live in `profiles/firm.json` (v2.3) |
| `data/communications.json` | Prototype today, the note template per strategy and action (the counter counts per template), prior sends |
| `data/app.json` | Navigation, journey page, communications and the walkthrough (day label, default advisor, featured client, opportunity and product, review-pack client, default talking points) |
| `advisors.json` `meetings` | `{time, title, kind, clientId?, prospectId?, purpose}` |
| client `tasks` | `{text, owner, dueDay}`; negative is overdue |

The FINRA 25-in-30-days threshold stays in `lib/recipients/count.ts`: it is regulation, not firm policy.
`validate()` checks shapes, ranges, enums, ids, cross-references, that a Liquidity goal agrees with holdings, that the walkthrough's audience and left-over figures match the engine, and the money-movement rule (R-21). `tests/invariants/no-client-data-in-code.test.ts`
fails on any client or prospect name, or any data id, in `app/`, `components/` or `lib/` (except the
loader `lib/data/index.ts`).

### 5.3 Personalization (v2.3)

`data/profiles/schema.json` (settings, kind, bounds, allowed layers), `firm.json`, `segments.json`,
`advisors/<id>.json`, and a `preferences` block in each client file. `resolveProfile({ advisorId, clientId },
overlay)` in `lib/profile` returns values, provenance, ignored values and a version. Preferences resolve
most-specific-wins; rules most-restrictive-wins. Triage size and weights, option order, review-pack order,
note length, channel and escalation days are wired. The triage cap, class weights and escalation days moved
from `policy.json` to `profiles/firm.json`. The rationale record shows the settings version.

### 5.4 Learning loop (v2.3)

`data/events.json` (synthetic behavior), `data/profiles/learning.json` (window, minimum events, agreement
threshold, step, cooling-off, check period). `suggest()` in `lib/learning/learn.ts` runs six deterministic
learners; `guard()` rejects rules, out-of-bounds values and disallowed layers. Accepted suggestions are a
session overlay passed to `resolveProfile()`. Full design: `docs/ARCHITECTURE-personalization.md`.

### 5.1 Data added in v2.1

- `data/prospects.json`: prospects for each advisor with the signal, path in, estimated assets and a source.
- `paperwork` in each client file: form, requested day, signed day if signed.
- `data/service-requests.json`: request text, client, received day.

## 6. Deterministic modules

| Module | Responsibility | May import a model client |
|---|---|---|
| `lib/constraints/evaluate.ts` | `evaluate(candidate, product, household, strategy) -> { pass, failures[], annualCostUsd }`, one failure per breached constraint, with the rule name and a numeric detail; an unknown constraint kind fails every candidate; a rebalance cannot exceed the core holding | No (enforced) |
| `lib/household-math.ts` | Investable, single-name, Liquidity holdings and months, `fundingNeed()` in exact dollars with outflows | No (enforced, R-21) |
| `lib/ranking/rank.ts` | `rank(opps, dismissed, cap, weights)`: score = materiality x class weight (firm weight if a class is missing), ties broken by id; excludes dismissed; caps at the resolved list size (firm 12) | No (enforced) |
| `lib/recipients/count.ts` | Persons, firm-wide, 30 calendar days, regime (R-12) | No (enforced) |
| `lib/policy/checks.ts` | Zero-tolerance checks on a draft: no performance projection language, every figure in the draft appears in its source set, at least one citation, regime recorded matches counter, disclosure present, and the call-first rule when the client requires it | No (enforced) |
| `lib/evidence/retrieve.ts` | Passages for an opportunity's `evidenceDocIds` with any `missing`; returns `{ refused: true, missing }` when none resolve | No (enforced, R-21) |
| `lib/prospecting/rank.ts` | Score = warmth of path (existing relationship 3, referral 3, event 2, signal only 1) + fit to the practice (0 to 2) + size band (0 to 2); drafted introduction request | n/a |
| `lib/onboarding/status.ts` | Signed, due, or escalated when unsigned for more than the resolved days (firm 14; day 14 is due, day 15 escalated); counts open items per client | No (enforced, R-21) |
| `lib/servicing/classify.ts` | Keyword rules to a class, first match wins, money movement first and erring toward flagging; route and response-time target per class; overdue flag; callback verification | No (enforced, R-21) |
| `lib/profile/index.ts` | `resolveProfile()` (every value checked against the schema before it counts), `checkValue()`, provenance labels | No (enforced) |
| `lib/learning/learn.ts` | `suggest()`, `guard()`: six learners, preferences only, the 30 days ending today, the latest decline sets the cooling-off; a suggestion the guard stops is reported, never applied and never a crash | No (enforced) |
| `lib/meetings/prep.ts` | Today's meetings per advisor; `reviewPack(id)` from the client file only | n/a |
| `lib/followups.ts` | All tasks with client and advisor, overdue first | n/a |
| `lib/drafting/compose.ts` | Composes the client note **only** from the approved proposal, the household's figures and the cited passage, using fixed fragments | n/a in prototype |
| `lib/connectors/coverage.ts` | `coverageFor(advisor, states, attestations)`: per channel `covered`, `partial`, `gap` or `unused` against the advisor's own attestation, with the exposure named; a degraded source counts as uncaptured; completeness and a single defensible flag | No (enforced, v2.6) |
| `lib/compliance/dsl.ts` | A total expression language over a flat fact bag: an unknown fact is false, never an exception; thresholds read from named params; `explain()` renders a condition in words for the console | No (enforced, v2.6) |
| `lib/compliance/policy.ts` | `resolvePolicy(layers)`: firm, segment, advisor, client. Tighten-only; a refused change is recorded in `rejected`, never dropped; `setBy` provenance per field | No (enforced, v2.6) |
| `lib/compliance/engine.ts` | `evaluateRule` and `runPolicy`: `cannot_evaluate` when a required connector is missing, never a clear; confidence is the weakest among the facts **this rule** read; `requiresHuman` when it fired or sits under the rule's floor | No (enforced, v2.6) |
| `lib/compliance/facts.ts` | Adapters from records to a fact bag. A fact the records do not support is left undefined; an inferred fact carries a confidence below one | No (enforced, v2.6) |
| `lib/compliance/agents.ts` | Five agents as data, each a rule bundle, scope and cadence; cases carry the citation, the remediation and exactly the facts the rule read; `uncoveredMandatoryRules()` | No (enforced, v2.6) |
| `lib/compliance/sweep.ts` | The standing sweep across an advisor's whole book: record completeness plus every client account | No (enforced, v2.6) |
| `lib/compliance/store.ts` | The change log is the state: `policyFrom(edits, scope, asOf)` folds it onto the baseline, so a change is live with no release and a replay to a timestamp reproduces the past rule set | No (enforced, v2.6) |
| `lib/compliance/sources.ts` | Which rules need a source, derived from the rules' own `requires`; `unservedRules()` | No (enforced, v2.6) |

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

`npm run check` must pass. `npm run e2e` (after `npx next build`) drives every page and the mockup in
Chromium at 1440, 1280, 1024, 768 and 390 (v2.6 added the last two, and they found eight pages that
still scrolled sideways and two dead fragment links): errors, horizontal scroll, links, buttons, accessible names, contrast of
every text element, keyboard and skip link, the demo flows, the recomputed amounts, CSP and noindex.
`npm run stress` times the engines and page renders on 1,000 clients, 50 advisors and 20,000 events, and
exercises malformed data and empty states. `tests/unit/audit-r21.test.ts` holds one test per R-21 finding. Beyond the invariants and recipient tests already present:
constraints (each rule fails on the Renner fixture for the right product; a compliant product passes),
ranking (cap, dismissal, determinism), policy (each check fails on a planted draft and passes on a
composed one), compose (output passes every policy check for every approved proposal in the fixtures),
fixtures (the numbers in §5).

## 9. Build order

Dependency-ordered; each step's tests pass before the next starts.

1. `lib/types.ts`, then fixtures, with the fixture tests.
2. Constraint engine and ranking, with tests.
3. Evidence, policy checks, compose, with tests.
4. Layout and navigation (v2.1: journey page, grouped navigation).
5. Triage, evidence, household, proposal.
6. Communications with the counter, supervision, measurement.

## 10. Out of scope for the prototype

Model calls, persistence, auth, CRM write-back, the retrieval service, the 250 to 400 case golden set
(PRD §8.3; the zero-tolerance checks exist as code and tests instead), mobile layout.
