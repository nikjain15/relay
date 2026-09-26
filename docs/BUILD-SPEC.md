# Relay: build spec

**Version:** 1.0, 2026-09-26
**Status:** ready to build against
**Companion to:** `PRD-relay.md` v0.3. The PRD says what the product is for and why. **This says what
to build.** Where they disagree, the PRD wins on intent and this wins on implementation.

> **Why this document exists.** Four audits of the Relay work caught the same class of error: detail
> invented silently because it was never specified. The PRD has 996 lines and seven incidental mentions
> of layout. Building from it directly means inventing the stack, every screen, every fixture value and
> every interaction, and then defending them as if they were decisions. This file makes them decisions.

---

## 1. What is being built, and what it is not

**Being built:** a local, deterministic, synthetic-data prototype that demonstrates the
opportunity-to-action path end to end, in a twelve-minute screenshare, to the hiring manager who leads
the team that generates the opportunities.

**Not being built:** a product. No database, no auth, no network, no model calls at runtime, no
multi-user state, no deploy target. The PRD's V0 to V3 is the real product roadmap and this prototype
is not phase V0 of it.

**Success test for the build.** Nik can run `npm run dev`, screenshare, and hit every beat of the demo
click path in §8 without a dead click, a loading state, a console error, or a sentence he has to
apologise for. Anything that does not serve that is out of scope.

### Build states, as agreed (D-51)

Nine surfaces. **Six built deep and functional. Three designed and visibly labelled as not built.**
Labelling is deliberate: a dead click costs more than the admission does.

| # | Surface | Route | JD capability type | State |
|---|---|---|---|---|
| 1 | Pipeline and prospecting | `/pipeline` | Insights and analytics | **Designed**, labelled |
| 2 | Onboarding and re-papering | `/onboarding` | Advisor workflow | **Designed**, labelled |
| 3 | Household advice state | `/household/[id]` | Advisor workflow | **Build deep** |
| 4 | Evidence and explain | `/household/[id]/evidence` | Chat and assistive | **Build deep** |
| 5 | Action proposals, bounded | `/household/[id]/propose` | Agentic | **Build deep** |
| 6 | Book triage | `/` (the landing surface) | Insights and analytics | **Build deep** |
| 7 | Client communications | `/household/[id]/draft` | Productivity | **Build deep** |
| 8 | Servicing and operations triage | `/servicing` | Agentic | **Designed**, labelled |
| 9 | Supervision and control console | `/supervision` | Control plane | **Build deep** |

A "Designed" surface renders a real static layout with a persistent banner reading
`Designed, not built. The point of this prototype is the advice path.` It is never a blank page and
never a dead link.

---

## 2. Screen specifications

Conventions used below: `[ ]` is a control, `{ }` is fixture-driven content, `>` is a nested region.
Widths are in a 12-column grid at 1440px, the width Nik will screenshare.

### 2.1 Surface 6, Book triage. Route `/`. The opening screen.

The first thing the hiring manager sees. It must read as a decision queue, not a dashboard.

```
┌─ header, 56px ────────────────────────────────────────────────────────────┐
│ Relay   {advisor name}  ·  {183 households}  ·  {$820M}      [Synthetic]  │
├─ subheader, 40px ─────────────────────────────────────────────────────────┤
│ Today  {12 of 47 surfaced}   Cap 12/day [i]      Conversion {this week}    │
├─ queue, remaining height, scrolls ────────────────────────────────────────┤
│ ┌ row, 72px, cols: 1 materiality | 4 household+trigger | 4 reason | 3 act┐│
│ │ {88}  {Renner Family}          {Property sale recorded, $4.1M}          ││
│ │       {$62.4M · $50M+ tier}    {Liquidity 0 of 36 mo · concentration    ││
│ │                                 71% vs 25% policy}                      ││
│ │                                          [Act] [Defer] [Dismiss ▾]      ││
│ └─────────────────────────────────────────────────────────────────────────┘│
│ ... 11 more rows                                                          │
├─ footer ──────────────────────────────────────────────────────────────────┤
│ {35 opportunities suppressed} [why]   {6 dismissed this week} [review]     │
└───────────────────────────────────────────────────────────────────────────┘
```

**Behaviour**
- Exactly 12 rows render. The cap is visible and the `[i]` explains it: "A cap is a product decision,
  not a limitation. Precision at the point of receipt is the constraint."
- Every row names its **trigger class** (§4) and its **reason path** in one line, built by traversal
  from the fixture, never authored as a string.
- `[Dismiss ▾]` opens a reason menu: `Not material` / `Already actioned` / `Client would decline` /
  `Wrong household` / `Bad timing`. Selecting one removes the row and increments the footer counter.
  **The reason is the point**, so no dismiss without one.
- `[Act]` navigates to surface 5 for that household.
- Materiality is a number 0 to 100, right-aligned, monospace. Rows sort by it descending.
- Suppression footer is clickable and shows which signal classes are suppressed for which households.

**Acceptance:** an advisor can decide on a row in under 10 seconds. Verify by reading one row aloud:
household, why, what changed, what it affects. If that takes longer than a breath, the row is too busy.

### 2.2 Surface 3, Household advice state. Route `/household/[id]`.

```
┌─ household header ────────────────────────────────────────────────────────┐
│ {Renner Family}  {$62.4M}  {$50M+ tier}  {Review due in 14 days} [Synthetic]│
├─ three Wealth Way columns, 4 cols each ───────────────────────────────────┤
│ ┌ LIQUIDITY ──────┐ ┌ LONGEVITY ──────┐ ┌ LEGACY ─────────┐              │
│ │ {0} of {36} mo   │ │ {funded}         │ │ {UNFUNDED}      │              │
│ │ ▓░░░░░░░░░ 0%    │ │ ▓▓▓▓▓▓▓▓░░ 81%   │ │ ░░░░░░░░░░ 0%   │              │
│ │ target {$2.1M}   │ │ target {$38M}    │ │ target {$12M}   │              │
│ │ Assumption:      │ │ Assumption:      │ │ Assumption:     │              │
│ │ {2 to 5 yr spend}│ │ {4.1% real}      │ │ {est. transfer} │              │
│ │ [trace inputs]   │ │ [trace inputs]   │ │ [trace inputs]  │              │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘              │
├─ balance sheet, collapsible ──────────────────────────────────────────────┤
│ {holdings table: instrument, value, % of investable, cost basis, lots}    │
│ ⚠ {NVDA 71% of investable assets, concentration policy threshold 25%}     │
├─ constraints in force, from the IPS ──────────────────────────────────────┤
│ {max single-name 25%} {min liquidity 24mo} {no leveraged products}  ...   │
└───────────────────────────────────────────────────────────────────────────┘
```

**Behaviour**
- Underfunded strategies are visually distinct: a left border in the warning token, never colour alone,
  and the word `UNFUNDED` in text, because colour alone fails WCAG 2.2 AA.
- `[trace inputs]` expands to show the arithmetic: which accounts fund the strategy, the target
  calculation, and the assumption. **Every number on this screen must be traceable in one click.**
  A number with no trace is a bug.
- Liquidity is expressed in **months of coverage**, target 36, because the framework's Liquidity
  strategy covers the next 2 to 5 years of expenditure.

### 2.3 Surface 4, Evidence and explain. Route `/household/[id]/evidence`.

Scoped explanation, not a chatbot. The input is a **fixed list of questions**, not a free text box.

```
┌─ question list, 4 cols ──────┬─ answer pane, 8 cols ──────────────────────┐
│ [Why did this fire?]         │ {answer, 3 to 5 sentences}                 │
│ [What is the gap?]           │                                            │
│ [What does policy say?]      │ Evidence                                   │
│ [What are the alternatives?] │ ┌ {doc title} · {illustrative, day 1} ───┐ │
│ [What is the tax effect?]    │ │ "{quoted passage}"          [open]     │ │
│ [Ask something else]         │ └────────────────────────────────────────┘ │
│                              │ ┌ {second citation}                      ┐ │
│                              │ └────────────────────────────────────────┘ │
│                              │ Reason path                                │
│                              │ {ExternalEvent → Household → Goal → ...}  │
└──────────────────────────────┴────────────────────────────────────────────┘
```

**Behaviour**
- Answers are **pre-computed** and stored in the fixture beside the question id. No runtime model call.
- Every answer cites at least one document with title, relative date and the quoted passage.
- **`[Ask something else]` is the most important control on this screen.** It returns a refusal:
  `Not answerable from the indexed corpus. Relay refuses rather than guesses. What is missing: {x}.`
  This is deliberate and it is a scripted demo beat.
- No answer contains a quantitative claim that is not either in a cited passage or computed from the
  graph. The eval in §9 asserts this.

### 2.4 Surface 5, Action proposals. Route `/household/[id]/propose`.

The screen that carries the thesis. **Rejected candidates are shown, with the failing constraint.**

```
┌─ context strip ───────────────────────────────────────────────────────────┐
│ {Renner Family} · {trigger: property sale $4.1M} · {shelf: 34 eligible}   │
├─ PROPOSED, 1 to 2 cards ──────────────────────────────────────────────────┤
│ ┌───────────────────────────────────────────────────────────────────────┐ │
│ │ {Fund Liquidity strategy from sale proceeds}                          │ │
│ │ Satisfies: {liquidity min 24mo} {no single-name add} {tax lot > 1yr}  │ │
│ │ Rationale, structured:                                                │ │
│ │   Basis            {...}                                              │ │
│ │   Alternatives considered  {3, see below}                             │ │
│ │   Costs compared   {...}                                              │ │
│ │   Why this client  {...}                                              │ │
│ │                          [Accept and draft] [Reject with reason]      │ │
│ └───────────────────────────────────────────────────────────────────────┘ │
├─ NOT PROPOSED, and why. This is a feature. ───────────────────────────────┤
│ ✕ {Structured note, 3yr}   FAILS {IPS: no leveraged or structured}       │
│ ✕ {Add to NVDA}            FAILS {concentration 71% vs 25% policy}       │
│ ✕ {Municipal ladder}       FAILS {tax posture: no benefit at this rate}  │
│ ✕ {Managed futures sleeve} FAILS {suitability profile: complexity}       │
└───────────────────────────────────────────────────────────────────────────┘
```

**Behaviour**
- Candidates come from `fixtures/shelf.ts` and are filtered by `lib/constraints`, which is
  **deterministic code with no model import**, enforced by dependency-cruiser.
- The rejected list is **longer than the proposed list on purpose**. Four rejections to one proposal.
- Each rejection names the rule id and the rule text, not a generic "not suitable".
- `[Accept and draft]` goes to surface 7 carrying the proposal id.
- **Zero proposals may breach a stated IPS constraint.** The eval in §9 asserts this across all
  households and all shelf items, and it is a release gate, not a score.

### 2.5 Surface 7, Client communication draft. Route `/household/[id]/draft`.

```
┌─ draft, 8 cols ──────────────────────┬─ regime panel, 4 cols ────────────┐
│ {client-ready note, editable}        │ SUPERVISORY REGIME                │
│                                      │ Recipients, rolling 30 days       │
│ Derived only from:                   │   {1} of 25                       │
│  · the accepted proposal             │   ▓░░░░░░░░░░░░░░░░░░░░░          │
│  · its cited evidence                │ Current: {CORRESPONDENCE}         │
│  · approved template fragments       │ Review under supervisory          │
│                                      │ procedures. No principal          │
│ [Edit]  diff captured                │ pre-approval required.            │
│                                      │                                   │
│                                      │ [Add to batch ▾]                  │
│                                      │ ⚠ At 26 recipients this becomes a │
│                                      │ RETAIL COMMUNICATION and requires │
│                                      │ principal approval before use.    │
│                                      │                                   │
│                                      │ [Submit for review]               │
└──────────────────────────────────────┴───────────────────────────────────┘
```

**Behaviour, and this is the most valuable minute of the demo**
- The recipient counter is **deterministic code** in `lib/recipients`, driven by fixture contact history.
- `[Add to batch ▾]` lets the advisor add this note to N similar households. As the count crosses 25,
  the panel **changes state live**: regime flips to `RETAIL COMMUNICATION`, the bar turns to the
  warning token, and `[Submit for review]` relabels to `[Submit for principal approval]`.
- **There is no send control anywhere on this screen.** The terminal action is submission for review.
  That absence is the architecture, and it is enforced by `tests/invariants/`.
- Edits are captured as a diff against the generated draft and shown in the supervision console.

### 2.6 Surface 9, Supervision console. Route `/supervision`.

The screen that says Nik understands who actually blocks AI in regulated wealth.

```
┌─ queue, 5 cols ──────────┬─ item detail, 7 cols ──────────────────────────┐
│ {4 awaiting}             │ {household} · {advisor} · {submitted 2h ago}   │
│ ▸ {Renner} CORRESP       │ REGIME {CORRESPONDENCE} · {1 recipient}        │
│ ▸ {Osei}   RETAIL ⚠      │ ┌ Draft ──────────────────────────────────────┐│
│ ▸ {Lindqvist} CORRESP    │ │ {text, with advisor edits highlighted}      ││
│ ▸ {Batra}  RETAIL ⚠      │ └─────────────────────────────────────────────┘│
│                          │ ┌ Proposal + rationale record ────────────────┐│
│ {2 dispositioned today}  │ │ basis / alternatives / costs / suitability   ││
│ Median time {6.2 min}    │ └─────────────────────────────────────────────┘│
│                          │ ┌ Evidence, 2 citations ──────────────────────┐│
│                          │ └─────────────────────────────────────────────┘│
│                          │ ┌ Automated policy checks ────────────────────┐│
│                          │ │ ✓ grounding: all claims attributable        ││
│                          │ │ ✓ no performance projection                 ││
│                          │ │ ✓ constraints: 0 breaches                   ││
│                          │ │ ✓ regime: correspondence, count 1 of 25     ││
│                          │ │ ✓ retention: audit record written           ││
│                          │ └─────────────────────────────────────────────┘│
│                          │   [Approve] [Return with comment] [Block]      │
└──────────────────────────┴────────────────────────────────────────────────┘
```

**Behaviour**
- The principal sees **the same objects the advisor saw, in the same shapes**. Not a compliance form.
- Every disposition writes an immutable audit record, displayed in an `Audit` tab with model version,
  prompt version, retrieval snapshot id, graph version, constraint set version and timestamp.
- Policy checks render pass or fail **per check**, never as a single aggregate score.
- Zero items may leave the queue without a disposition. Asserted in the eval set.

### 2.7 The three Designed surfaces

`/pipeline`, `/onboarding`, `/servicing`. Each renders a real static layout at the same density as the
built surfaces, populated from fixtures, with the persistent banner from §1. Roughly 60 lines of JSX
each. They exist so the product reads as a whole journey and so the honest answer is available:
"designed, not built, because the point was the advice path."

---

## 3. Data model

TypeScript types live in `lib/graph/types.ts`. The graph is real: reason codes come from **traversal**,
not from a string template, because the explanation shown to the advisor must be the same object the
system used to decide.

```ts
type TriggerClass = "life_event" | "external_event" | "threshold" | "service_event" | "market_view";
type Strategy = "liquidity" | "longevity" | "legacy";
type Regime = "correspondence" | "retail_communication" | "institutional";

interface Household { id; name; investableAssets; tier; coverage; reviewDueDays; persons; accounts; goals; ips; suitability; contactHistory }
interface Holding { id; householdId; instrument; value; pctInvestable; costBasis; lots: TaxLot[] }
interface Goal { strategy: Strategy; target; funded; monthsCovered?; monthsTarget?; assumption; fundedByAccountIds }
interface Constraint { id; text; kind: "concentration"|"liquidity"|"product"|"tax"|"suitability"; evaluate(ctx): boolean }
interface Signal { id; householdId; triggerClass: TriggerClass; materiality; triggerRef; reasonPath: PathNode[] }
interface Proposal { id; signalId; productId; satisfied: string[]; rationale: RationaleRecord; status }
interface RejectedCandidate { productId; failedConstraintId; failedConstraintText }
interface RationaleRecord { basis; alternativesConsidered; costsCompared; whyThisClient }
interface Communication { id; proposalId; body; edits: Diff[]; recipientCount30d; regime: Regime }
interface Approval { communicationId; disposition: "approved"|"returned"|"blocked"; principal; at; auditRef }
```

**The reason path is a typed array, not a sentence.** Rendering it is a component's job:

```ts
type PathNode =
  | { kind: "trigger"; class: TriggerClass; label: string; date: string }
  | { kind: "household"; id: string; label: string }
  | { kind: "holding"; label: string; pct: number }
  | { kind: "constraint"; id: string; text: string; breached: boolean }
  | { kind: "goal"; strategy: Strategy; funded: number; target: number };
```

---

## 4. The five trigger classes

Set upstream by the opportunity engine, mirrored here. Market view is **one class among five**, not the
centre of gravity. Getting this wrong was the worst finding of the audits.

| Class | Fixture examples needed | Households |
|---|---|---|
| `life_event` | Retirement date set; death in family; child reaching majority | 2, 4 |
| `external_event` | **Property sale $4.1M**; late-stage funding round; assets identified held away | 1, 6, 7 |
| `threshold` | Concentration breach 71% vs 25%; Liquidity underfunded; RMD beginning | 1, 2 |
| `service_event` | Review overdue; unsigned document; lapsed beneficiary; KYC refresh | 3, 5 |
| `market_view` | An illustrative research note affecting a held instrument | 2 |

**The flagship demo row is an `external_event`**, not a market view: a recorded property sale on the
pre-liquidity founder household.

---

## 5. Fixtures

`fixtures/` is the entire data layer. Every value is synthetic. This is the largest single piece of
work in the build and every screen is blocked on it, so it is built first.

| File | Contents | Size |
|---|---|---|
| `households.ts` | 7 households, full records per PRD Appendix A | ~700 lines |
| `holdings.ts` | Holdings per household with cost basis and tax lots | ~400 lines |
| `ips.ts` | Constraint sets per household, as evaluable rules | ~200 lines |
| `signals.ts` | 47 signals across 7 households, all five classes, with materiality and reason paths | ~500 lines |
| `shelf.ts` | 34 approved products with constraint attributes | ~300 lines |
| `documents.ts` | 44 illustrative documents with passages | ~600 lines |
| `answers.ts` | Pre-computed answers per question id per signal, with citations | ~400 lines |
| `drafts.ts` | Pre-computed client note drafts per proposal | ~200 lines |
| `contacts.ts` | Contact history driving the rolling 30-day recipient counts | ~150 lines |

### The seven households

Exactly as PRD Appendix A, restated here with the values the build uses.

| # | Name (invented) | Assets | Coverage | The hard part |
|---|---|---|---|---|
| 1 | Renner Family | $62.4M | $50M+ | Single position 71% of investable, 10b5-1 running, Legacy unfunded |
| 2 | Osei | $8.4M | $5M+ | Liquidity funded 11 of 36 months, sequence risk, RMDs beginning |
| 3 | Lindqvist | $14.2M | $5M+ | US and UK tax, unvested deferred comp, PFIC exposure |
| 4 | Batra Family Trust | $31.6M | $5M+ | Grantor 79, next generation unengaged, asset-retention archetype |
| 5 | Okonkwo | $1.2M | $500K to $5M regional | Pending 401k rollover, first advisory relationship |
| 6 | Ferreira | $23.1M | $5M+ | Illiquid operating stake, near-term liquidity need |
| 7 | Nakamura | $180K | Wealth Advice Center | Pooled coverage, contact-rate constrained |

**Naming rule:** invented surnames, deliberately varied in origin, no real client resemblance, no
surname matching any UBS executive or the hiring manager.

### Document corpus rules

44 documents. Each carries: a title, a **relative non-calendar date** (`prototype corpus, day 1`), a
type, and 2 to 5 quotable passages with ids.

**Hard rule:** no investment view is attributed to any real firm's Chief Investment Office, and no
document is copied from any real firm. Types: illustrative research notes (12), product one-pagers
(10), a structured note term sheet, model portfolio fact sheets (4), sample IPS documents (7), a
disclosure, supervisory procedure extracts (3), tax reference notes (6).

---

## 6. Deterministic modules

These carry the credibility of the whole prototype. They are plain TypeScript, unit tested, and
forbidden by dependency-cruiser from importing a model client.

| Module | Responsibility | Tests |
|---|---|---|
| `lib/constraints/evaluate.ts` | Given household + candidate product, return pass or the failing constraint | Every household by every shelf item, assert zero breaches in proposals |
| `lib/ranking/rank.ts` | Sort signals by materiality, apply the per-advisor cap, apply suppression | Cap respected, suppression respected, stable sort |
| `lib/recipients/regime.ts` | Rolling 30-day distinct-recipient count to regime | Boundary tests at 24, 25, 26, and across the 30-day edge |
| `lib/graph/traverse.ts` | Build the reason path from fixture graph | Path is well-formed and every node resolves |

**The regime boundary test is the one to write first**, because §2.5's live regime flip is the demo's
best minute and an off-by-one there is visible on screen.

---

## 7. Design tokens

Institutional neutral. **Do not clone any real firm's branding**, logo, brand mark, or a palette that
would let the page pass as a real internal tool if it circulates (D-54).

```css
:root {
  --bg: #fbfbfa;  --surface: #ffffff;  --border: #e3e3e0;
  --text: #1a1a18; --text-dim: #6b6b66; --text-faint: #9a9a94;
  --accent: #2d4f6b;          /* the single swappable token, D-54 */
  --warn-bg: #fdf6ec; --warn-border: #c98a2b; --warn-text: #7a5215;
  --fail-bg: #fdf0ef; --fail-border: #b4483c; --fail-text: #7d2d24;
  --ok-border: #3f7a52;
  --mono: ui-monospace, "SF Mono", Menlo, monospace;
  --sans: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}
```

**Density rules, because this user reads statements all day**
- Body 13px, line-height 1.45. Table rows 32px. Section gaps 16px, never 48px.
- All numbers monospace, tabular, right-aligned. Currency abbreviated: `$62.4M`, `$180K`.
- Borders over shadows. One accent colour. No gradients, no illustrations, no rounded cards beyond 4px.
- **Never colour alone.** Every warning and failure carries a text label and a left border.
- Accessibility to WCAG 2.2 AA: contrast, focus rings on every control, full keyboard path through the
  queue, and the demo click path must be completable by keyboard.
- Every screen carries a persistent `Synthetic data, illustrative prototype` marker.

---

## 8. The demo click path

Twelve minutes. Build so that this exact sequence works with no dead click. Rehearse against it.

| Beat | Time | Route | Action | The line |
|---|---|---|---|---|
| 1 | 0:00 | `/` | Open on the queue. Point at the cap. | "20 million opportunities a year, 385,000 a week, and the published prep time saved works out at 11 to 22 seconds each. So this is a queue of 12, not a feed of 69." |
| 2 | 2:00 | `/household/1` | Renner. Liquidity 0 of 36, concentration 71%. `[trace inputs]`. | "Every number traces in one click. A number that does not is a bug." |
| 3 | 3:30 | `.../evidence` | `[Why did this fire?]` then the reason path. | "The reason code is a traversal, not a prompt. It is the same object the system decided with." |
| 4 | 5:00 | `.../evidence` | **`[Ask something else]`. Show the refusal.** | "Refusal is a feature. This is what earns you the supervisory conversation." |
| 5 | 6:00 | `.../propose` | One proposal, four rejections with named constraints. | "Constrained is more impressive than unconstrained, because constrained is what ships." |
| 6 | 7:30 | `.../draft` | **`[Add to batch]`, cross 25, watch the regime flip.** | "25 or fewer retail investors in 30 days is correspondence. At 26 the same text is a retail communication and needs a principal. Batch is where the regime changes, so the counter is a product surface." |
| 7 | 9:00 | `/supervision` | Same objects, per-check results, disposition. | "The principal sees what the advisor saw, in the same shapes." |
| 8 | 10:00 | terminal | `npm run check` in a terminal. | "No outbound path exists. Not policy, enforced: dependency-cruiser plus an invariant test, same pattern as my own product's CI." |
| 9 | 11:00 | | Roadmap and the 26-14 question. | "Reg Notice 26-14 would move this to a risk-based framework. As I read it that makes per-artifact risk evidence the thing a firm has to produce. Is that how you read it?" |

Beat 8 is why the stack mirrors `roleos-app`. The invariant is real and runnable, not described.

---

## 9. Evals and the release gate

`evals/` holds a golden set. Not 250 to 400 cases for a prototype: **40 cases**, chosen to cover every
intent and every trigger class, versioned in the repo.

**Zero-tolerance assertions. These are gates, not scores, and they run in `npm run check`.**

| Assertion | Scope |
|---|---|
| No proposal breaches a stated IPS constraint | All 7 households by all 34 shelf items |
| No answer contains an unsourced quantitative claim | All 40 golden cases |
| No client-facing text contains a performance projection | All drafts |
| Every answer cites at least one document | All 40 |
| Recipient count and regime always agree | Boundary cases 24, 25, 26, 30-day edge |
| No communication reaches a released state without a disposition | All |
| Refusal fires when the corpus does not support the question | The refusal cases |

---

## 10. Build order

Dependency-ordered. Each step ends with `npm run check` passing.

| Step | What | Why here |
|---|---|---|
| 0 | Next.js app, Tailwind, Vitest, ESLint, dependency-cruiser wired into `npm run check` | The invariant must exist before the code it constrains |
| 1 | `lib/graph/types.ts` and `fixtures/households.ts`, `holdings.ts`, `ips.ts` | Everything is blocked on the data |
| 2 | `lib/constraints` + `lib/recipients` + tests, **including the 24/25/26 boundary** | The two modules that carry credibility. Test before UI |
| 3 | Design tokens, shell, header, the `Synthetic` marker, the Designed banner | One layout pass, then never again |
| 4 | Surface 6, triage, with `fixtures/signals.ts` | The opening screen and the reason-path renderer |
| 5 | Surface 3, household advice state, with traces | Reuses the graph |
| 6 | Surface 4, evidence, with `documents.ts` + `answers.ts` + **the refusal** | Demo beat 4 |
| 7 | Surface 5, proposals, with `shelf.ts` and the rejected list | Demo beat 5, the thesis |
| 8 | Surface 7, draft, with the live regime flip | Demo beat 6, the best minute |
| 9 | Surface 9, supervision, with audit records | Demo beat 7 |
| 10 | The three Designed surfaces | Cheap, and they complete the journey |
| 11 | `evals/` golden set wired into `npm run check` | Demo beat 8 |
| 12 | Keyboard path, focus rings, contrast audit, full click-path rehearsal | The thing that gets skipped and shows |

**Do not build surfaces before step 2 passes.** A pretty screen over a constraint engine that breaches
an IPS is worse than no screen, for this audience especially.

---

## 11. Out of scope, recorded so it is not relitigated

No auth, no database, no network, no runtime model calls, no multi-user state, no deploy target, no
mobile layout (it is screenshared at 1440px), no dark mode, no i18n, no real market data, no PDF export.
No search over the corpus beyond the fixed question list, because Relay does not rebuild retrieval.
