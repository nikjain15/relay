# Relay: Product Requirements Document

**Product:** Relay, advisor advice-to-action layer
**Author:** Nik Jain
**Date:** 2026-09-26 (v0.4, third audit applied; see `docs/AUDIT-2026-09-26-pass3.md`)
**Status:** Draft, written as an interview artifact
**Audience:** Head of STAAT AI Product, UBS Wealth Management USA

> **Illustrative document.** Written only from publicly available sources about UBS and from general
> wealth-management practice. No employer information of any kind is used. All client data,
> households and advisors are synthetic. Any document shown in the prototype that resembles a UBS
> publication is written fresh and labelled illustrative; nothing is copied from UBS and no
> investment view is attributed to the UBS Chief Investment Office.
> **Every figure attributed to UBS is public reporting, listed with its source and date in
> Appendix D, and should be corrected by anyone with internal numbers.**

**In one line:** UBS publishes two measures of STAAT Insights, **volume** (more than 20 million client
opportunities in 2025, up about 50%) and **preparation time saved** (an input measure). It does not
publish the one in between: how many opportunities became a documented, approved client action. Relay
closes that step, from a generated opportunity to an executed, supervised client action, and it
measures itself on conversion rather than on volume.

---

## 1. Context, user and problem

### 1.1 The division's economics

UBS Wealth Management USA runs roughly **5,600 financial advisors** and the number has been falling:
Americas headcount was reported at **5,644 at the end of Q2 2026, down from 5,722 the prior quarter**
and about **2.2% lower year over year**. Over the same period **Americas client assets rose about 11%
year over year to roughly $2.4 trillion**.

**That divergence is the whole capacity argument, and it needs no inference:** assets up roughly 11%,
advisors down roughly 2.2%, so assets per advisor are rising about 13% a year. On the reported figures
that is roughly **$425M of client assets per advisor** (my arithmetic on two reported numbers, not a
UBS-published ratio, and worth correcting against internal figures).
Advisor attrition has been elevated since the 2025 compensation grid changes. At least **54 teams
managing $51.8B** left in 2025, against roughly 20 teams and $12B in all of 2024, and at least
**27 teams managing $28B** left in the first half of 2026. UBS has responded with retention economics
twice, releasing the 2026 plan early and then holding the grid steady while sweetening retention in
the 2027 plan.

The growth plan reorganised US coverage into six divisions: **four regional advisor centers** serving
three wealth tiers (above $50M, above $5M, and $500K to $5M), a fifth unit for international clients,
and a sixth, the **Wealth Advice Center**, serving mass-affluent clients through hubs in Weehawken,
Charlotte and now Dallas. The WAC currently holds **330+ advisors, relationship managers and client
service associates**, and UBS has said it expects to add **up to 500 advisors** there over a
three-year expansion.

The strategic consequence is direct and it does not need an embellished ratio to make it:
**advisor headcount is declining while the asset and growth targets are not, so growth has to come
from capacity per advisor.** Leadership has said as much publicly. Rob Karofsky, President of UBS
Americas and co-President of Global Wealth Management, framed it around the December 2024
restructuring: "We can't shrink the business to profitability. We have to invest in growth."

So every dollar spent on advisor-facing AI has to defend itself on two axes at once: **hours returned
to the advisor**, and **whether the platform is a reason to stay**.

### 1.2 The user

Primary user is the **US Financial Advisor**. Relay is a field product, not a client product. The
secondary user is the **supervisory principal** who approves what leaves the building, and the
tertiary user is the **client associate** who does most of the follow-through.

Advisor A, the persona Relay is designed for, is specified fully in Appendix A. In summary: senior FA
on a four-person team, 183 households, roughly $820M, skewed to the $5M+ tier with four relationships
above $50M. Synthetic.

### 1.3 The constraint, in UBS's own published numbers

This section relies on no assumption about UBS's internals, because UBS has published what it measures.

**What UBS publishes:**

- **Volume.** STAAT Insights generated **more than 20 million AI-identified client opportunities in
  2025, up about 50% year over year**, for more than 5,000 US advisors. The separately reported 2024
  figure, **13 million AI-generated insights delivered to US advisors**, is consistent with that growth
  (13 million times 1.5 is 19.5 million), though it names a slightly different metric.
- **Adoption.** **Nearly 90% of advisor teams** actively use the platform.
- **Time saved.** **1,200 hours of meeting preparation per week**, from pre-meeting briefings, on the
  STAAT page. UBS's Chief Data and Analytics Officer has separately been quoted at **10,000 hours per
  month** saved by US advisors using AI to prepare for client meetings, described as conservative. These
  differ by about 1.9x (1,200 per week is about 5,200 per month), most likely because the second covers
  all AI tooling rather than STAAT alone. Reconciling them is a week-one question.

**What is not published is the step in between.** Volume is an output of the engine. Preparation time is
an input to the advisor's day. Neither says what share of opportunities became a documented, approved,
client-facing action. The two figures are deliberately **not divided into each other**: the hours come
from meeting briefings and are not a per-opportunity benefit, so a ratio of the two would measure
nothing about conversion.

**The read.** Adoption is not the problem: nearly 90% of teams use it. The division's published
*growth* metric is **volume**, up 50% year over year, and its published *outcome* metric is
**preparation time**, an input rather than a client outcome. Generating 50% more opportunities does not
on its own produce a single additional funded goal, documented recommendation or retained household.

**The question this PRD exists to answer:** of those 20 million opportunities, how many became a
documented, approved, client-facing action? If that number is known and healthy, Relay is not needed and
this document is wrong. If it is not known, that is the gap.

---

### 1.4 What already exists, and must not be rebuilt

| Layer | What UBS already has, publicly | Implication for Relay |
|---|---|---|
| Signal generation | **STAAT Insights**, the platform that won UBS Financial Services the **2026 Celent Model Wealth Manager Award for Data, Analytics and AI**. Combines advanced analytics and machine learning to surface client opportunities before the advisor looks for them: life events, property transactions, late-stage business funding activity and thousands of other internal and external signals, including **assets held away at other firms** for wallet-share growth. 20M+ opportunities in 2025, against 13M in 2024 | **This is the hiring manager's product and it works.** Relay consumes its output. It does not build, rank or replace the engine, and it does not propose improving its recall |
| Retrieval | **UBS Red**, two domain-specific assistants built on Azure OpenAI Service and Azure AI Search, synthesising **60,000 documents** to support Client Advisors. Its success drove a wider Azure OpenAI rollout reaching **roughly 30,000 employees** globally, including Switzerland, Hong Kong and Singapore | Relay consumes retrieval as a service. It does not build search. **Open question for week one: what is actually deployed to US FAs, since the public material describes Client Advisors and a global rollout** |
| Advisor desktop | Multi-year **Broadridge** programme, UBS WM USA as anchor client since 2018, rebuilding the advisor workstation | Relay is designed to be embedded, not to be a competing destination. The programme has a public history of timetable slips, which is a dependency risk named in §7.3 rather than ignored |
| Planning framework | **UBS Wealth Way**: Liquidity, Longevity, Legacy, where Liquidity covers the next 2 to 5 years of expenditure | Relay reasons in this framework rather than inventing a parallel one |
| Content | **CIO House View** and the CIO's research output | Relay treats publications as one trigger class among several, and as citable evidence |

### 1.5 Problem statement

> An opportunity that is generated but not acted on has negative value. It consumed compute, it
> consumed a slot in the advisor's attention, and it trained the advisor to discount the next one.

The bottleneck is not generation. Generation is solved, award-winning, and growing 50% a year. The
bottleneck is the distance between a surfaced opportunity and a documented, approved, client-facing
action. Three specific frictions create that distance:

1. **No evidence at the point of decision.** The advisor cannot tell in five seconds why this
   household, why today, and what the basis is. So they defer.
2. **The action has to be assembled by hand.** Rationale, suitability record, client language, and
   follow-up task are four separate pieces of work in four separate systems.
3. **The supervisory step is outside the workflow.** Approval happens later, elsewhere, with context
   lost, which is where advisor-facing AI programmes stall in regulated wealth.

**Stated as a hypothesis, not a finding.** A fourth friction is plausible and I want it tested rather
than asserted: that at this volume, precision at the point of receipt matters more than recall in the
engine, and that improving recall without improving conversion makes the advisor's triage problem
worse. This is how alerting systems generally behave. It is **not** a claim about STAAT Insights,
whose precision I have no visibility into, and the published 90% adoption figure is evidence against
the strong form of it. It belongs in week one's telemetry review, not in a slide.

### 1.6 What we believe versus what we need to verify

| Stated as | Claim | How we would verify in week one |
|---|---|---|
| **Public fact** | Opportunity volume is large and growing 50% YoY | Published: 20M+ in 2025 |
| **Public fact** | Adoption is high and prep time is being saved | Published: ~90% of teams, 1,200 hrs/week |
| **Unknown, and the crux** | What share of surfaced opportunities becomes a documented, approved client action | Existing STAAT telemetry, joined to supervisory and CRM records. If this is already instrumented, the answer exists today |
| Assumption | Documentation and approval are the slowest steps in acting | Time-and-motion with 6 to 8 advisors, plus supervisory queue timings |
| Assumption | Advisors discount unexplained recommendations | Qualitative research, 10 to 12 advisors across tiers |

**Kill criterion.** If insight-to-action conversion is already measured and already healthy, the
constraint is elsewhere and this PRD is wrong. That is cheap to test and it is the first thing I would
ask for.

---

## 2. Strategy and thesis

### 2.1 Thesis

**Codifying investment advice is a conversion and control problem, not a generation problem.**

The portfolio should be organised around moving a candidate opportunity all the way through to a
documented, approved client action. The rate-limiting step is the supervisory record, not the model.
Therefore the highest-return investment is not a better model and not more opportunities. It is
**narrowing what the system is permitted to propose**, and **making the approval step disappear into
the workflow**.

### 2.2 Why now

Three things are true simultaneously, which is unusual. The retrieval layer is built and in
production. The signal layer is built, adopted by nearly 90% of advisor teams, and externally
recognised. And the division has a declining advisor count against unchanged growth targets, which
makes advisor capacity and advisor retention board-level topics. Relay is the piece that turns the
first two investments into a number the business recognises.

### 2.3 The bet, and what would falsify it

**Bet:** if we constrain the proposal space and fold supervision into the flow, opportunity-to-action
conversion rises materially, and the advisor's trust in the opportunity stream rises with it.

**Falsifiers:**
- Conversion is already measured and already high. Then invest in the engine, not in Relay.
- Approval is not actually slow. Then the constraint is elsewhere, probably content quality.
- Constrained proposals are rejected as too generic in the $50M+ tier. Then Relay is a core-affluent
  and Wealth Advice Center product, and the UHNW tier needs a different design.

### 2.4 Positioning

Relay is **not** an assistant, a chatbot, a search tool, or a second opportunity engine. Those exist.
Relay is **the layer between the opportunity and the client**, and its interface is a queue of
decisions rather than a conversation. This distinction matters for build cost and for LRC exposure: a
decision queue has a bounded output space and is reviewable. A conversation does not and is not.

### 2.5 Principles

1. **Evidence before recommendation.** No proposal is shown without the path and the citation that
   produced it.
2. **Bounded output space.** The system selects from an approved shelf under stated constraints. It
   never free-generates a security recommendation.
3. **Refusal is a feature.** When evidence is insufficient or a constraint is breached, the system
   says so and shows why. This is the behaviour that earns supervisory trust.
4. **Supervision is in the flow.** Approval is a step in the product, not a process outside it.
5. **Measured on conversion.** Volume of opportunity is not a success metric anywhere in this product.

---

## 3. Scope

### 3.1 In scope

The path from a candidate opportunity to an approved client action, and the measurement loop around
it: household advice state, evidence assembly and citation, bounded action proposal, client
communication drafting, supervisory approval and audit, and the feedback loop from advisor edits.

### 3.2 Out of scope, with the reason

| Not building | Why |
|---|---|
| Opportunity and signal generation | **STAAT Insights exists, is adopted by ~90% of advisor teams, and won Celent 2026.** Relay consumes its output |
| Document search and retrieval | UBS Red exists with 60,000 documents synthesised. Relay calls it |
| General-purpose advisor chat | Same. Relay's chat surface is scoped to "explain this proposal" |
| Advisor workstation shell and navigation | Broadridge programme in flight. Relay embeds |
| Unbounded securities recommendation | Cannot pass Reg BI review as designed, and would cost the team its LRC credibility in the first quarter |
| Portfolio construction and optimisation | Owned elsewhere. Relay proposes actions against existing models and shelf |
| Client-facing surfaces | Field product. Client experience is a separate portfolio |

Saying these out loud is part of the strategy. A new PM who proposes rebuilding what the team already
shipped, or improving a metric the team already wins on, costs a quarter.

### 3.3 Dependencies

- Opportunity feed from STAAT Insights, with stable identifiers, signal type and a materiality score.
- Retrieval endpoint into the indexed document corpus, with citation metadata returned.
- Household, holdings, plan and KYC data, at rest and reconciled.
- Product shelf and model portfolio definitions, with constraint attributes.
- Supervisory queue and books-and-records retention systems.
- CRM write-back for tasks and contact history.
- An embedding surface in the advisor workstation, which is a Broadridge-programme dependency.

---

## 4. Capabilities and user stories

### 4.1 Surface map

Nine surfaces span the advisor journey. Six are specified for build; three are specified but not built
in the prototype, and are labelled as such in the product.

| # | Surface | JD capability type | Build state |
|---|---|---|---|
| 1 | Pipeline and prospecting | Insights and analytics | Designed |
| 2 | Onboarding and re-papering | Advisor workflow | Designed |
| 3 | Household advice state (Wealth Way) | Advisor workflow | **Build** |
| 4 | Evidence and explain | Chat and assistive | **Build** |
| 5 | Action proposals, bounded | Agentic | **Build** |
| 6 | Book triage, opportunity to household | Insights and analytics | **Build** |
| 7 | Client communications and review packs | Productivity | **Build** |
| 8 | Servicing and operations triage | Agentic | Designed |
| 9 | Supervision and control console | Control plane | **Build** |

### 4.2 Coverage against the JD's four named types

- **Productivity tools:** surface 7, batch handling across households, review pack generation.
- **Advisor workflows:** surfaces 3 and 5, advice state and the proposal-to-approval path.
- **Insights and analytics:** surface 6, plus the measurement console.
- **Chat and assistive:** surface 4, scoped explanation grounded in cited evidence.

### 4.3 User stories with acceptance criteria

**S6.1 Ranked book triage**
As an advisor, I want to see which of my households changed today and why, so that I can decide where
to spend my morning.
- Ranked list, materiality score visible, at most N per day per advisor (N configurable, default 12).
- Every row names the trigger: the signal type, the household attribute, the Wealth Way strategy
  affected, and the evidence behind it.
- Rows are dismissible with a reason, and the reason is captured as training signal and returned to
  the upstream engine.
- Acceptance: an advisor can decide to act or dismiss in under 10 seconds per row, measured.

**S6.2 Suppression and fatigue control**
As an advisor, I want to stop seeing opportunity types I have repeatedly dismissed.
- A dismissed signal type for a household is suppressed for a configurable window.
- Suppression is visible and reversible, never silent.
- Acceptance: repeat-dismissal rate declines week over week in the pilot cohort.

**S3.1 Advice state**
As an advisor, I want to see a household's position against Liquidity, Longevity and Legacy with the
gap quantified.
- Each strategy shows funded amount, target, and months or years of coverage where applicable.
- Unfunded or underfunded strategies are visually distinct and carry the driving assumption.
- Acceptance: the gap figure is traceable to the underlying holdings and plan inputs on click.

**S4.1 Explain this**
As an advisor, I want to ask why an opportunity fired and get an answer I can repeat to a client.
- Answers cite source documents with title, date and passage.
- Where the corpus does not support an answer, the system refuses and states what is missing.
- No answer contains an unsourced quantitative claim.
- Acceptance: on the golden question set, unsourced-claim rate is zero and refusal precision is above
  target (see §8).

**S5.1 Bounded proposal**
As an advisor, I want candidate actions that already respect this household's constraints.
- Candidates drawn only from the approved shelf and model set.
- Each candidate evaluated against IPS constraints, concentration policy, liquidity horizon, tax
  posture and suitability profile.
- **Rejected candidates are shown with the failing constraint named.** This is a feature, not debug
  output.
- Acceptance: zero proposals that breach a stated IPS constraint, verified on the full test set.

**S5.2 Rationale record**
As a supervisory principal, I want the care-obligation rationale captured as structured fields.
- Rationale is generated as structured data, not free prose, covering the basis, the **reasonably
  available alternatives** considered, the costs compared, and why this recommendation suits this
  client.
- Record is immutable once submitted and carries a retention stamp.

**S7.1 Client communication draft**
As an advisor, I want a client-ready note I can edit.
- Draft is generated from the approved proposal and its evidence only.
- Edits are captured as a diff against the draft.
- **The draft carries its own distribution counter (see §7.2), because the recipient count determines
  which supervisory regime applies.**
- Acceptance: median draft-to-approved edit distance declines version over version.

**S9.1 Supervisory queue**
As a principal, I want to review AI-assisted communications with their evidence attached.
- Queue shows the draft, the proposal, the rationale record, the evidence, the distribution count and
  regime, and the automated policy checks with pass or fail per check.
- Approve, return with comment, or block, each writing to an immutable audit record.
- Acceptance: median time to disposition below target; zero items leaving without disposition.

---

## 5. Requirements

### 5.1 Data model: an entity graph over a signal taxonomy

Relay reasons over a graph, deliberately, because reason codes should come from traversal rather than
from a prompt. The explanation shown to the advisor is then the same object the system used to decide,
not a post-hoc narration.

**The signal taxonomy matters more than the graph, and it is set upstream.** STAAT Insights publicly
describes surfacing opportunities from life events, property transactions, late-stage business funding
activity, upcoming maturities, cash-flow events and thousands of other internal and external signals. Relay therefore models **five trigger
classes**, and market-view publications are one of them rather than the centre of gravity:

| Trigger class | Example | Typical Wealth Way strategy touched |
|---|---|---|
| **Life event** | Liquidity event, marriage, death in family, retirement date set, child reaching majority | Legacy, Longevity |
| **External asset or transaction** | Property purchase or sale, late-stage business funding round, registered filing, **assets identified as held away at another firm** | Liquidity, Legacy |
| **Household threshold** | Concentration breach, cash drift, Liquidity strategy underfunded, RMD beginning, upcoming bond or CD maturity, large expected cash-flow event | Liquidity, Longevity |
| **Plan or service event** | Review overdue, unsigned document, lapsed beneficiary, KYC refresh due | All |
| **Market or house view** | A published theme affecting an instrument the household holds | Longevity |

**Nodes:** Household, Person, Account, Holding, Goal (Liquidity | Longevity | Legacy), LifeEvent,
ExternalEvent, Publication, Theme, Product, Constraint, Signal, Proposal, Communication, Approval.

**Edges:** `Household -holds-> Holding`, `Holding -instance_of-> Product`, `Household -pursues-> Goal`,
`Goal -funded_by-> Account`, `Signal -triggered_by-> (LifeEvent | ExternalEvent | Threshold | ServiceEvent | Publication)`,
`Publication -asserts-> Theme`, `Theme -affects-> Product`, `Signal -concerns-> Household`,
`Proposal -addresses-> Signal`, `Proposal -selects-> Product`, `Proposal -constrained_by-> Constraint`,
`Communication -derives_from-> Proposal`, `Approval -dispositions-> Communication`.

A reason code is a **named path** through this graph. The primary worked example is an external-event
path, a recorded property sale, because property transactions are among the signal types UBS names
publicly and it is not a market view:

> **ExternalEvent** *property sale recorded, 2026-09-18, $4.1M* → concerns *Renner household* →
> household holds *Liquidity strategy funded 0 of 36 target months* → and carries
> *single-name concentration at 71% of investable assets, policy threshold 25%* →
> two candidate actions on the approved shelf, one rejected for *tax-lot holding period*.

A market-view path is supported and shown as a secondary example, using a clearly illustrative
internal publication, never an invented view attributed to the UBS CIO:

> *Illustrative research note, prototype corpus, day 1* asserts *reduce single-name concentration in
> one sector* → affects *a held instrument* → held by *Renner household at 71% of investable assets*
> → breaches *concentration policy threshold 25%*.

### 5.2 Functional requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Ingest candidate opportunities with stable id, **signal class**, materiality score, and trigger reference | Must |
| FR-02 | Rank and cap opportunities per advisor per period, with configurable cap | Must |
| FR-03 | Render the reason path for every opportunity, from graph traversal | Must |
| FR-04 | Compute Wealth Way advice state per household with traceable inputs | Must |
| FR-05 | Retrieve and cite supporting passages for any opportunity or proposal | Must |
| FR-06 | Refuse and explain when retrieval confidence is below threshold | Must |
| FR-07 | Generate candidate actions restricted to approved shelf and models | Must |
| FR-08 | Evaluate every candidate against the household constraint set | Must |
| FR-09 | Surface rejected candidates with the failing constraint named | Must |
| FR-10 | Emit structured care-obligation rationale per proposal, including reasonably available alternatives and costs | Must |
| FR-11 | Draft client communication from approved proposal and evidence only | Must |
| FR-12 | Route every client-facing artifact to supervisory queue before release | Must |
| FR-13 | Run automated policy checks and display results per check | Must |
| FR-14 | Write immutable audit records with retention metadata | Must |
| FR-15 | Capture dismissals and edits as labelled feedback, and return dismissal reasons upstream | Must |
| FR-16 | **Count distinct retail investors per communication: persons, not households; firm-wide, across every advisor who uses it; institutional investors excluded; over the 30 calendar days ending on each send. Escalate the supervisory regime above 25 (see §7.2)** | **Must** |
| FR-17 | Suppress repeatedly dismissed signal classes per household | Should |
| FR-18 | Batch actions across households for a single signal class, **gated by FR-16** | Should |
| FR-19 | Write tasks and contact history back to CRM | Should |
| FR-20 | Generate a review pack for a scheduled meeting | Should |
| FR-21 | Advisor-configurable thresholds within policy bounds | Could |

### 5.3 Technical requirements

- **Grounding.** Every generated sentence in advisor-visible or client-visible output must be
  attributable to a retrieved passage, a computed value from the graph, or an approved template
  fragment. Unattributable output is blocked, not flagged.
- **Determinism where it matters.** Constraint evaluation, ranking, recipient counting and policy
  checks are deterministic code, not model calls. The model composes language and extracts structure;
  it does not decide eligibility. This is what makes the system reviewable.
- **Bounded generation.** The proposal engine's output space is the cartesian product of the approved
  shelf and the action verbs, filtered by constraints. Deterministic code ranks within that space; the
  model explains the ranked result and never reorders it.
- **Latency.** Triage list render under 1.5s p95. Explanation under 4s p95. Proposal generation under
  8s p95. Anything slower than a phone call is a feature nobody uses.
- **Auditability.** Every advisor-visible artifact carries: model and prompt version, retrieval
  snapshot id, graph version, constraint set version, and timestamp. Reconstruction of any past
  decision must be possible without replaying a model.
- **Records and retention.** Client data stays inside the existing perimeter. Records retained per
  books-and-records requirements. Storage satisfies SEC Rule 17a-4(f) by **either** the write-once
  (WORM) condition **or** the audit-trail alternative added by the 2022 amendments; the audit-trail
  route is the default assumption because it lets the team use the firm's existing systems. See §7.1.
- **Prompts and model outputs are records.** Prompt versions, retrieved context and generated drafts
  that inform a recommendation or a client communication are retained as part of the record set, not
  treated as ephemeral application logs.
- **Human gate.** No path exists from the system to a client. Outbound is a human act, always. This is
  an architectural invariant, enforced in code and in test, not a policy statement.

### 5.4 Model requirements

- Composition and extraction only. No eligibility decisions.
- Must emit a refusal token path when grounding is insufficient.
- Must not produce quantitative claims not present in a cited source or computed by the graph.
- Versioned, with every version gated by the eval suite in §8 before release.
- Cost per surfaced opportunity tracked and budgeted, with the drafting step identified as the
  dominant cost.
- Third-party model and vendor dependencies inventoried and governed, since the underlying service is
  a vendor relationship and FINRA has been explicit that its rules apply whether a firm builds the
  tool or consumes a third party's.

### 5.5 Non-functional

Availability 99.5% during market hours. Graceful degradation: if the proposal engine is unavailable,
opportunities and evidence still render. Accessibility to WCAG 2.2 AA, which is not optional in a
workforce product of this size.

---

## 6. UX principles and measurable UX outcomes

### 6.1 Principles

1. **One decision per row.** The triage list is a decision queue. Act, defer, or dismiss with a
   reason. Nothing else.
2. **Evidence one click away, never zero and never three.** Zero clutters the scan. Three means nobody
   looks.
3. **Show the rejected options.** Advisors trust a system that visibly declined things more than one
   that only ever agrees.
4. **Approval looks like the workflow, not like compliance.** The principal sees the same objects the
   advisor saw, in the same shapes.
5. **Never fake certainty.** Ranges, assumptions and refusals are shown as such.
6. **Density is respect.** This user reads statements and portfolio reports all day. An airy
   consumer-app layout wastes their screen and signals that we do not know their job.

### 6.2 Measurable UX outcomes

The JD asks for measurable UX impact. These are **targets with a measurement method for a product not
yet built**, which is a different claim from a past achievement, and it is stated that way
deliberately. Baselines to be established in week one; every target below is a placeholder until the
baseline exists.

| Outcome | Measure | Method |
|---|---|---|
| Faster triage | Median seconds per decision | Instrumented, per row |
| Higher follow-through | Approved actions per surfaced opportunity | Funnel, weekly cohort |
| Less rework | Draft-to-approved edit distance, median | Diff capture |
| Faster supervision | Median minutes to disposition in queue | Queue instrumentation |
| Trust | Repeat-dismissal rate, and self-reported confidence | Telemetry plus 5-point in-product pulse |
| Task success | First-try completion of the end-to-end path | Moderated usability, 8 advisors per round |

### 6.3 Research plan

Discovery: 10 to 12 advisors across the three tiers plus 3 Wealth Advice Center advisors and 3
supervisory principals. Concept test at low fidelity before build. Two moderated usability rounds
during build. Pilot with a single region, instrumented, before any wider release. Design partner pair
from the advisor council, named, with standing time.

---

## 7. Risk, LRC and the control map

### 7.1 The regulatory surface

UBS Financial Services Inc. is a **dual registrant**, a FINRA member broker-dealer and an SEC
registered investment adviser, and a UBS FA acts in a brokerage or an advisory capacity depending on
the account. **Both regimes apply across the firm and the stricter standard governs each artifact.**
Designing as though only one applied is the most common error in this space.

| Obligation | Citation | What it means for Relay |
|---|---|---|
| **Communications with the public** | FINRA Rule 2210 | Approval, filing and retention obligations turn on **how many retail investors receive the communication**, not on whether AI drafted it. See §7.2, which is the single most important control in this document |
| **Recordkeeping of communications** | FINRA Rule 2210(b)(4), FINRA Rule 4511 | Copy of the communication, first and last use dates, approving principal and date, and the source of any statistic, table or chart used. Relay emits all of these as structured fields rather than leaving them to be reconstructed |
| **Reg BI, all four obligations** | SEC Rule 15l-1 | Not only Care. **Disclosure**, **Care**, **Conflict of Interest** and **Compliance**. Relay's rationale record is Care evidence; conflict and disclosure obligations constrain what the proposal engine may prefer and are why the shelf and its economics are an input to ranking, not an afterthought |
| **Reg BI care obligation, precisely** | SEC Rule 15l-1(a)(2)(ii)(A) to (C) | The rule text: (A) understand the potential risks, rewards and **costs**, with a reasonable basis that the recommendation could be in the best interest of at least some retail customers; (B) a reasonable basis that it is in **this** customer's best interest, based on the investment profile, and **does not place the firm's interest ahead** of the customer's; (C) a series of recommended transactions is not excessive. **"Reasonably available alternatives"** is the SEC's gloss in the 2019 adopting release (Release 34-86031), not rule text, and the rule does **not** mandate documenting the alternatives analysis; documentation is the supervisory and examination expectation. Relay produces it because it is the evidence |
| **Reg BI records** | SEC Rule 17a-3(a)(35) | A record of **all information collected from and provided to the retail customer** under Rule 15l-1, and the associated person responsible for the account. It does **not** require a record of the basis for each recommendation. Relay's structured rationale **supports** the firm's Reg BI records; it does not by itself satisfy this rule |
| **Advisory-capacity recommendations** | Advisers Act fiduciary duty (SEC Commission Interpretation, 2019); Rule 204-2 | Reg BI does not reach advisory accounts. There, the duty of care and loyalty applies, and advisory books and records sit under 204-2. The constraint engine applies the stricter test in both capacities |
| **Relationship disclosure** | Form CRS | The client relationship summary frames what a recommendation in each capacity means; client-facing drafts must not contradict it |
| **Supervision** | FINRA Rule 3110(a) and (b) | A supervisory system and written supervisory procedures must cover the tool. Correspondence review sits here, under 3110(b) and 3110.06 through .09. Procedures updated before pilot, not after |
| **Supervisory certification** | FINRA Rules 3120 and 3130 | The annual testing and CEO certification cycle has to be able to see this system. Relay's audit records are built to be sampled by that process |
| **Books and records retention** | SEC Rule 17a-4, incl. 17a-4(f) | Retention and reconstructability. Since the **October 2022 amendments** the electronic recordkeeping condition may be met by WORM **or** by the **audit-trail alternative**, which permits recreating an original record that was modified or deleted. WORM was retained as an option, not as the requirement. Saying "write-once, because 17a-4" is out of date |
| **Investment adviser marketing** | SEC Rule 206(4)-1 (Advisers Act) | Applies to communications made in an **advisory** capacity, including performance and testimonial content. Brokerage-capacity communications sit under 2210 instead. Most **one-on-one** communications are excluded from the rule's definition of advertisement, except where they present hypothetical performance, which strengthens the correspondence path in §7.2 on the advisory side. Relay blocks performance projection in all client-facing drafts through V2, which satisfies today's FINRA prohibition on projections in **2210(d)(1)(F)** and the stricter of the two regimes without resolving capacity per artifact. FINRA's pending proposal to permit projections and targeted returns (SR-FINRA-2026-004, Federal Register 25 Feb 2026, comments closed 18 Mar 2026) is **still proposed, not adopted**, does not fully align with the marketing rule's hypothetical-performance framework, and has history: a similar 2023 proposal was approved on a delegated basis in July 2024 and stayed a week later. A single firm-wide block is therefore the conservative design and does not need revisiting until something is actually adopted |
| **AI-specific supervisory expectations** | FINRA Regulatory Notice 24-09 (June 2024), and the GenAI section of FINRA's 2026 Annual Regulatory Oversight Report | Existing rules apply to AI tools. Where GenAI sits in or near a supervisory system, procedures must address technology governance, model risk, data privacy and integrity, and the reliability and accuracy of the model. Applies equally to firm-built and third-party or embedded tools |
| **Pre-approval regime under active reform** | **FINRA Regulatory Notice 26-14** (9 July 2026), comments closed 11 Sept 2026 | FINRA has proposed replacing the blanket principal pre-use approval requirement for retail communications with a **risk-based supervisory framework**, under which a firm adopts written procedures tailored to its business to decide which communications need pre-use approval. The notice expressly addresses **AI-generated communications**. **Still a proposal.** Its significance for Relay is in §7.2 and §9.1: it changes what the product is for |
| **Model risk governance** | Interagency guidance **SR 26-2** (Fed, OCC, FDIC, 17 April 2026), which replaced SR 11-7 | Bank supervisory guidance: it reaches UBS's US banking entities and intermediate holding company, not the broker-dealer as such. **SR 26-2 places generative and agentic AI outside its scope** and directs firms to govern such systems through their **existing** risk management and governance practices; the agencies have said an RFI on AI will follow. So the model inventory is necessary and not sufficient, and the eval suite in §8 is offered as the monitoring evidence for that governance |
| **Research distribution** | FINRA Rule 2241 | If Relay cites or redistributes CIO research to clients, research-distribution rules apply. The prototype uses illustrative, internally authored notes only |
| **Predictive analytics conflicts** | SEC proposal of July 2023, **withdrawn June 2025** | Not a rule. Named because it will be asked about: the conflict controls in §7.3 do not depend on it |
| **Customer data protection** | Reg S-P, as amended 2024 | Incident response and customer notification obligations reach the data moving through an AI pipeline and its vendors |
| **Suitability, where it still bites** | FINRA Rule 2111 | Reg BI covers retail customers; 2111 continues to apply outside that perimeter. The constraint engine is written against the stricter test rather than branching |

### 7.2 The control that actually shapes the product: who receives it, and how many

This is the correction that changes a design, and it is the opposite of the usual claim that an
AI-drafted note is automatically a retail communication.

Under FINRA Rule 2210(a), the classification turns on recipient count in a rolling window:

- **Correspondence:** a written communication distributed or made available to **25 or fewer retail
  investors within any 30 calendar-day period.** Supervised and reviewed under Rule 3110(b) and
  3110.06 through .09. **Principal pre-approval under 2210(b)(1) is not required.**
- **Retail communication:** **more than 25 retail investors in any 30 calendar-day period.** Principal
  approval before first use, retention under 2210(b)(4), and filing obligations where applicable.
- **Institutional communication:** a separate and lighter regime.
- Certain retail communications are also excepted from pre-use approval, including those that make no
  financial or investment recommendation and do not otherwise promote a product or service.

**Three consequences for Relay, in order of importance:**

1. **A personalised note to one household is correspondence, not a retail communication.** So the
   default path is review, not mandatory principal pre-approval. Relay's V2 still routes every
   client-facing artifact through a principal because that is the right way to earn the approval to go
   faster later, but the product must not pretend the stricter regime is legally required where it is
   not. Telling a supervisory audience that everything is a retail communication is both wrong and
   expensive.
2. **Batch handling is where the regime flips.** The moment one communication reaches a 26th retail
   investor inside 30 days, counted as **persons across every advisor using it**, not households and not
   per advisor (a household of two is two retail investors), the same text becomes a retail communication and needs principal approval
   before use. Batch across households (FR-18) is exactly the feature that crosses that line, which is
   why FR-16 makes the rolling recipient count a first-class, deterministic, product-visible counter
   rather than a compliance afterthought. **The advisor sees the counter and sees the regime change
   before they send.**
3. **Personalisation is a compliance asset, not just a quality one.** A genuinely per-household note
   stays in the lighter regime. A near-identical template dressed as personalisation does not, and
   should not.
4. **The regime itself is being rewritten, in Relay's direction.** FINRA Regulatory Notice 26-14
   (9 July 2026, comments closed 11 Sept 2026) proposes replacing blanket principal pre-use approval
   with a **risk-based framework** in which the firm's own written procedures decide what needs
   pre-approval, and it addresses AI-generated communications directly. **It is a proposal and may
   change or fail.** But it reframes what this product is for: under a risk-based regime a firm has to
   be able to *evidence* the risk tier of each communication, which is precisely what Relay's
   deterministic recipient counter, structured rationale records, policy-check results and immutable
   audit trail produce. Relay stops being a tool that complies with pre-approval and becomes **the
   evidence base that would let UBS adopt a risk-based framework and reduce pre-approval load at all.**
   That is the strategic upside, and it is the reason §9.1 sequences by supervisory surface rather than
   waiting for the rule to land.

### 7.3 Control map

| Capability | Risk | Control | Owner | Evidence produced |
|---|---|---|---|---|
| Opportunity triage | Biased or unfair surfacing across client segments | Segment-level fairness monitoring on surfacing and conversion rates | Product and Data Science | Monthly distribution report |
| Evidence and explain | Hallucinated or unsourced claim | Hard grounding gate, unattributable output blocked | Engineering | Blocked-output log, eval scores |
| Proposal engine | Unsuitable recommendation | Deterministic constraint evaluation, bounded shelf, costs and alternatives compared | Product and LRC | Constraint test suite, zero-breach report |
| Proposal engine | Conflicted preference toward higher-economics products | Shelf economics as an explicit ranking input, monitored and reported | LRC and Product | Preference distribution report |
| Rationale record | Insufficient Reg BI evidence | Structured fields, mandatory completion, reasonably available alternatives and costs captured | LRC | Immutable rationale records supporting 17a-3(a)(35) |
| Client communication | Wrong supervisory regime applied | **Deterministic rolling 30-day recipient counter, regime shown in product and in queue** | Supervision and Engineering | Per-artifact regime record and count |
| Client communication | Unapproved communication released | No outbound path in system; human send only | Supervision | Approval audit trail |
| Audit and retention | Non-reconstructable decision | Versioned snapshots of model, prompt, graph, constraints; 17a-4(f) compliant storage | Engineering | Reconstruction test, quarterly |
| Model and vendor | Ungoverned GenAI outside SR 26-2 scope | GenAI governed under existing risk practices as SR 26-2 directs, eval suite as monitoring evidence, vendor inventory | Model Risk and Product | Eval reports, model and vendor inventory |
| Client data | Unauthorised access or leakage through the pipeline | Perimeter controls, Reg S-P aligned incident response | Security and Privacy | Access logs, tested IR runbook |
| Feedback loop | Training on unreviewed advisor edits | Human review before any edit enters an eval set | Data Science | Labelling provenance log |

### 7.4 Risk register, top five

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Conversion is already measured and healthy, so the premise is wrong | Low to Medium | High | Ask for the funnel in week one. Cheapest possible test, and it is the first question in Appendix B |
| Advisors experience Relay as another queue on top of an existing queue | High | High | Relay replaces the triage surface rather than adding to it; hard cap per advisor per day; conversion, not volume, as the release gate |
| LRC blocks client-facing drafting | Medium | High | V0 ships read-only with no client-facing output, earning the approval path with evidence |
| Broadridge workstation dependency slips, so there is nowhere to embed | Medium | Medium to High | Contract-first integration, prototype against fixtures, and a standalone fallback surface for the pilot cohort. The programme's public timetable history makes this a named risk rather than an assumption |
| Advisor perception of deskilling or surveillance | Medium | High | Advisor council from week one, transparent metrics, explicit commitment that Relay telemetry is never used for advisor performance management |

### 7.5 What I would take to LRC in week one

Not a demo. A one-page note that says: here are the artifacts the system produces, here is which
obligation each one satisfies, here is what the system is structurally incapable of doing, here is the
recipient-count rule and how the product enforces it, and here is the phase at which we would ask you
to approve client-facing output. The goal of the first LRC meeting is to establish that the team
understands the obligations before asking for anything.

---

## 8. Metrics, evals and continuous improvement

### 8.1 Metric tree

**North star:** approved client actions per surfaced opportunity, per advisor, per week.

**Drivers:** decision rate per surfaced opportunity; time to decide; proposal acceptance rate;
time to supervisory disposition; draft-to-approved edit distance.

**Adoption and satisfaction** (the JD's named measures): weekly active advisors as a share of the
pilot cohort; opportunities engaged per active advisor; advisor CSAT and confidence pulse.

**Guardrails:** zero constraint breaches; zero unsourced quantitative claims in released output; zero
items leaving the queue without disposition; **zero artifacts released under the wrong supervisory
regime**; cost per surfaced opportunity within budget; no degradation in supervisory disposition time
as volume scales.

**Explicitly not a success metric anywhere:** count of opportunities generated or surfaced. The
division already publishes that number and it already grows. Relay's job is the ratio, not the
numerator.

**Lagging, and honestly out of reach in year one:** whether codified actions improve client outcomes,
and whether platform quality measurably affects advisor retention. Both stated in the roadmap as
questions with an instrumentation plan rather than claimed as benefits.

### 8.2 The conversion funnel

Candidate opportunities generated → surfaced after ranking and cap → opened → decided → proposal
generated → proposal accepted → communication drafted → submitted for review or approval → dispositioned
→ client contacted → outcome recorded.

Every stage instrumented. **Conversion, not volume, is reported to stakeholders.** Generated-opportunity
count does not appear on the leadership dashboard.

### 8.3 Eval design

- **Golden set**: 250 to 400 cases spanning the intent taxonomy and **all five trigger classes**, built
  with advisors and principals, versioned in the repository, never auto-generated wholesale.
- **Intents**: explain an opportunity; quantify a gap; propose an action; refuse for insufficient
  evidence; refuse for constraint breach; draft a client note; extract a rationale field.
- **Scored**: precision, recall and F1 per intent. Refusal precision and refusal recall tracked
  separately, because a system that refuses too much is as useless as one that hallucinates.
- **Zero-tolerance checks** run as assertions rather than scores: constraint breach, unsourced
  quantitative claim, performance projection in client-facing text, missing citation, **recipient count
  and regime mismatch**.
- **Human review** on a sampled basis for language quality and client-appropriateness. An automated
  judge is used for triage, never as the release gate on client-facing text.
- **Release gate:** any regression against the previous version on a zero-tolerance check blocks
  release outright. A regression beyond tolerance on an intent F1 blocks release pending review.
- Evals run in CI on every prompt, model, retrieval or constraint change. Changing a prompt is a code
  change and is treated as one.
- The eval suite is also offered as the monitoring evidence for GenAI governance, which SR 26-2 leaves
  to the firm's existing risk practices rather than covering itself.

### 8.4 Continuous improvement loop

Advisor dismissals with reasons, and the diffs between drafted and approved text, are the two richest
signals in the product. Both are captured, both are human-reviewed before entering an eval set, and
both feed a scheduled review where the team decides what changed and why. **Dismissal reasons are
returned to STAAT Insights**, because the upstream engine is the only place a precision problem can
actually be fixed, and because a downstream product that hoards its feedback is a bad partner.

### 8.5 Experiment design

Pilot is a holdout by advisor, not by household, to avoid contaminating a single book. Primary
endpoint is the north star metric. Minimum detectable effect and duration set before launch. A
pre-registered analysis plan, because a product that measures its own success cannot also choose its
own endpoint after the fact.

---

## 9. Roadmap, release readiness and business change

### 9.1 Sequenced by supervisory surface, not by engineering difficulty

This is the most important design decision in the document. Each phase earns the right to the next by
producing evidence, not by finishing a backlog.

**V0, read-only triage.** Opportunities with reason paths and evidence, across all five trigger
classes. No generated client-facing text. No proposals. Supervisory exposure close to zero, so it
ships fast and produces the baseline funnel that validates or kills the thesis. Exit criteria: baseline
conversion established for the first time; advisors report the reason path is sufficient to decide.

**V1, proposals with rationale.** Bounded proposal engine and structured rationale records. Still no
client-facing generated text. Exit criteria: zero constraint breaches on the full test set; proposal
acceptance rate above threshold; LRC signs the rationale record as sufficient Reg BI evidence and
confirms it supports the firm's Reg BI records, including 17a-3(a)(35).

**V2, client communications under supervision.** Drafting, the recipient counter, and the supervisory
queue. First phase with regulatory weight, and it ships only with V1's evidence in hand. Every artifact
routed to a principal in this phase regardless of regime, deliberately, to build the evidence base.
Exit criteria: disposition time within target; zero releases without disposition; zero regime
mismatches; edit distance trending down.

**V3, calibrated supervision and scale.** Batch handling under the FR-16 gate, review packs, CRM
write-back, and aligning the review path to the regime each artifact actually falls under, if and only
if the evidence supports it. The Wealth Advice Center is the natural first home, because the
supervisory surface is smallest and the capacity constraint is largest.

**Why V3 is worth more than it looks.** If FINRA Regulatory Notice 26-14 is adopted in something like
its proposed form, the binding constraint stops being "every retail communication needs a principal"
and becomes "the firm must justify, in written procedures, which communications need one." A firm that
can produce per-artifact risk evidence at that moment can move faster than one that cannot. V0 to V2
build exactly that evidence as a by-product of shipping. **This phase is therefore designed to be
valuable whether or not the rule changes:** under today's rule it reduces disposition time, and under a
risk-based rule it is the substantiation the framework requires. What it never does is assume the
proposal passes.

**Parked with a reason, not forgotten:** pipeline and prospecting, onboarding and re-papering, and
servicing triage. All three are specified. None is the constraint on conversion, which is why they are
not in the first four phases.

### 9.2 Release readiness checklist

Evals green including zero-tolerance assertions. Supervisory procedures updated and approved. Model
inventory entry and validation complete, plus the GenAI governance framework entry. Vendor and
third-party risk review complete. Retention configuration verified against 17a-4(f) on the chosen
route. Rollback tested and timed. Support and escalation path named. Telemetry verified end to end
before launch, not after. Pilot cohort selected and briefed. A named decision date for go or no-go,
with the criteria written down beforehand.

### 9.3 Business change: training, comms, enablement

The JD names this explicitly and it is where field products usually fail. Advisors do not adopt a tool
because it exists.

- **Advisor council** from week one. Two design partners per tier, named, with standing time. They see
  it before it is good.
- **Field enablement**: a five-minute walkthrough tied to a real household in the advisor's own book,
  delivered by branch leadership rather than by a central team. Adoption follows local credibility.
- **Supervisory training** ahead of V2, on the new artifacts, the recipient-count rule, and what
  principals are expected to check.
- **Comms sequencing**: what it does, what it does not do, and explicitly what it will never do. The
  last one matters most in a workforce that has just been through two compensation cycles and reads new
  tooling as a threat.
- **Feedback channel** with visible responses, so the loop in §8.4 is something advisors can see
  working.
- **Explicit commitment** that Relay telemetry is not used for advisor performance management. Without
  this, adoption stalls and the data is worthless anyway.

---

## Appendix A: Personas

All personas and households are **synthetic**. Instruments, tax mechanics and regulatory constraints
are real, so the constraint logic is genuinely exercised.

### Advisor A, primary

Senior FA, four-person team, New York. 19 years in the industry, 3 at the firm. **183 households,
roughly $820M**, skewed above $5M, with four relationships above $50M. Team: FA, junior FA, client
associate, shared wealth strategist. Sits in the **above $5M regional-center tier**. Measures their own
week in client meetings held.

### Advisor B, segment coverage

Licensed advisor in the **Wealth Advice Center**, which serves mass-affluent clients through the
Weehawken, Charlotte and Dallas hubs. Pooled, remote coverage across roughly 900 households, no
dedicated relationships. Different economics entirely: the constraint is contacts per day, not depth
per relationship. Included because this is the unit UBS has said it will grow by up to 500 advisors,
and because it is where calibrated supervision lands first.

Note on tiering, corrected from v0.1: the **$500K to $5M core-affluent band is a regional-center
tier**, while the Wealth Advice Center is a separate sixth division serving smaller accounts. Advisor
B is a WAC advisor and is not a stand-in for the core-affluent tier.

### Households, seven archetypes

| # | Household | Assets | Coverage | The thing that makes it hard |
|---|---|---|---|---|
| 1 | Pre-liquidity founder | $62.4M | $50M+ tier | Single position at 71% of investable assets, 10b5-1 running, Legacy strategy unfunded |
| 2 | Retired couple in drawdown | $8.4M | $5M+ tier | Liquidity funded 11 of 36 target months, sequence-of-returns exposure, RMDs beginning |
| 3 | Cross-border executive | $14.2M | $5M+ tier | US and UK tax, unvested deferred comp, PFIC exposure in legacy holdings |
| 4 | Multigenerational family trust | $31.6M | $5M+ tier | Grantor is 79, next generation unengaged. The asset-retention archetype |
| 5 | Core affluent accumulator | $1.2M | **$500K to $5M regional tier** | Pending 401k rollover, first advisory relationship |
| 6 | Business owner | $23.1M | $5M+ tier | Illiquid operating stake, near-term liquidity need against marketable assets |
| 7 | Mass-affluent, WAC | $180K | **Wealth Advice Center** | Pooled coverage, contact-rate constrained, the calibrated-supervision test case |

Each carries a full record: balance sheet mapped to Liquidity, Longevity and Legacy; holdings with
cost basis and tax lots; an IPS with stated constraints; KYC and suitability profile; dated life
events; contact history and open tasks.

### Document corpus for the evidence layer

Roughly 40 to 60 documents, written fresh, structurally faithful, and **every one marked illustrative
with a non-calendar relative date**: research notes, product shelf one-pagers, a structured note term
sheet, a model portfolio fact sheet, a sample IPS, a disclosure, a supervisory procedure extract.
**Nothing is copied from UBS, and no investment view is attributed to the UBS Chief Investment Office
on a real date.**

---

## Appendix B: Open questions I would bring to week one

1. **What is the opportunity-to-action conversion rate, and is it measured at all?** This is the first
   question and the whole PRD turns on the answer.
2. Of the 20 million opportunities generated in 2025, what was the dismissal rate and the distribution
   across signal classes?
3. **Which hours figure is right?** The STAAT page says 1,200 hours per week; the Chief Data and
   Analytics Officer has been quoted at 10,000 hours per month, which is roughly double. Same scope or
   different? Measured how, and against what baseline?
4. Where does supervisory review actually sit in the advisor's day, and how long does it take?
5. Is the materiality score calibrated against advisor action, or against content salience? These are
   very different things and the answer changes the roadmap.
6. What share of the cost per opportunity is drafting?
7. Which of the tiers is the intended beachhead, and is that a product decision or a political one?
8. What is actually deployed to US FAs from the UBS Red and Azure work, given the public material
   describes Client Advisors and a global rollout?
9. Where does the Broadridge workstation timeline actually stand, and what is the realistic embedding
   surface for a pilot in the next two quarters?
10. What has already been tried here that did not work, and why? This is the question I most want
    answered, and the one least likely to be in any document.

---

## Appendix C: Sources

Public sources only, retrieved 2026-09-26. Note: several UBS-owned pages were not directly reachable
from the machine used to compile this, so figures sourced to UBS pages are recorded as reported by
search results and secondary coverage and are flagged accordingly in Appendix D.

**UBS and its platform**
- Celent, Model Wealth Manager 2026 award winners (UBS Financial Services Inc., STAAT Insights, Data,
  Analytics and AI category): https://www.celent.com/en/insights/announcing-the-celent-model-wealth-manager-2026-award-winners
- UBS, STAAT, grow your practice with data and smart technology:
  https://www.ubs.com/us/en/wealth-management/financial-advisor-experience/articles/data-and-smart-technology.html
- UBS, AI for Financial Advisors:
  https://www.ubs.com/us/en/wealth-management/financial-advisor-experience/articles/ai-for-financial-advisors.html
- UBS, Innovation and AI: https://www.ubs.com/global/en/our-firm/what-we-do/technology/innovation-and-ai.html
- Microsoft, UBS and Microsoft unite, Azure AI customer story (UBS Red, 60,000 documents, ~30,000
  employees): https://www.microsoft.com/en/customers/story/19796-ubs-azure
- UBS, Wealth Advice Center: https://www.ubs.com/us/en/wealth-advice-center.html
- UBS, Wealth Way, Liquidity Longevity Legacy:
  https://www.ubs.com/global/en/wealthmanagement/what-we-offer/wealth-way.html
- Broadridge, Broadridge and UBS Americas to redefine WM technology (2018):
  https://www.broadridge.com/press-release/2018/broadridge-and-ubs-americas-to-redefine-wm-technology
- UBS Group Annual Report 2024 (13 million AI-generated insights delivered to US advisors):
  https://www.ubs.com/content/dam/assets/cc/investor-relations/annual-report/2024/annual-report-ubs-group-2024.pdf
- Financial Planning, behind UBS' AI strategy to win wallet share and client leads (10,000 hours per
  month quote from the Chief Data and Analytics Officer; 13 million insights in 2024; held-away assets):
  https://www.financial-planning.com/news/ubs-turns-to-ai-to-gain-wallet-share-find-new-clients
- Financial Planning, UBS advisor headcount falls (5,644 at Q2 2026 from 5,722; Americas client assets
  ~$2.4T, up ~11% YoY): https://www.financial-planning.com/list/ubs-advisor-headcount-falls

**Advisor headcount, attrition and strategy**
- InvestmentNews, UBS sees 2.2% decline in advisor headcount during the past 12 months:
  https://www.investmentnews.com/wirehouses/ubs-sees-22-decline-in-advisor-headcount-during-the-past-12-months/267602
- InvestmentNews, UBS rethinks US wealth division in latest profitability push (tiers, centers,
  Karofsky quote): https://www.investmentnews.com/wirehouses/ubs-rethinks-us-wealth-division-in-latest-profitability-push/258554
- AdvisorHub, advisors managing nearly $52B combined left UBS in 2025:
  https://www.advisorhub.com/by-the-numbers-advisors-managing-nearly-52-billion-combined-left-ubs-in-2025/
- AdvisorHub, advisors managing $28B left UBS in first half of 2026:
  https://www.advisorhub.com/by-the-numbers-advisors-managing-28b-left-ubs-in-first-half-of-2026/
- AdvisorHub, 2026 comp, UBS rolls out advisor-friendly plan amid rise in defections:
  https://www.advisorhub.com/2026-comp-ubs-rolls-out-advisor-friendly-plan-amid-rise-in-defections/
- AdvisorHub, 2027 comp, UBS keeps grid steady, sweetens retention program:
  https://www.advisorhub.com/2027-comp-ubs-keeps-grid-steady-sweetens-retention-program/
- AdvisorHub, another year, another timetable for UBS-Broadridge's promised wealth platform:
  https://www.advisorhub.com/another-year-another-timetable-for-ubs-broadridges-promised-wealth-platform/

**Regulatory**
- FINRA Rule 2210, Communications with the Public: https://www.finra.org/rules-guidance/rulebooks/finra-rules/2210
- FINRA Regulatory Notice 26-14, proposed risk-based framework for retail communications, incl. AI
  (9 July 2026, comments closed 11 Sept 2026): https://www.finra.org/rules-guidance/notices/26-14
- SR-FINRA-2026-004, proposal to permit projections and targeted returns (still proposed):
  https://www.finra.org/rules-guidance/rule-filings/sr-finra-2026-004
- FINRA Rule 3110, Supervision: https://www.finra.org/rules-guidance/rulebooks/finra-rules/3110
- FINRA Regulatory Notice 24-09, generative AI and large language models:
  https://www.finra.org/rules-guidance/notices/24-09
- FINRA 2026 Annual Regulatory Oversight Report, GenAI section:
  https://www.finra.org/rules-guidance/guidance/reports/2026-finra-annual-regulatory-oversight-report/gen-ai
- SEC, Regulation Best Interest, Rule 15l-1, and SIFMA's summary of the final rules:
  https://www.sifma.org/resources/guides-playbooks/regulation-best-interest-preliminary-summary-of-final-rules-and-guidance
- SEC, Amendments to Electronic Recordkeeping Requirements for Broker-Dealers (Rule 17a-4(f), 2022):
  https://www.sec.gov/investment/amendments-electronic-recordkeeping-requirements-broker-dealers
- SEC Rule 206(4)-1, Investment adviser marketing:
  https://www.law.cornell.edu/cfr/text/17/275.206(4)-1
- Federal Reserve, Supervisory Letter SR 26-2, Revised Guidance on Model Risk Management, April 17
  2026: https://www.federalreserve.gov/supervisionreg/srletters/SR2602.htm

---

## Appendix D: Figures and provenance

Every UBS figure used in this document, with its source, its date and its confidence. **Anyone with
internal numbers should correct these.** Figures marked "reported" were not read first-hand from the
UBS-owned page because that page was unreachable from the machine used to compile this document.

| Figure used | Value as stated here | Source | Date | Confidence |
|---|---|---|---|---|
| US advisor headcount | roughly 5,600, declining. 5,644 at end Q2 2026, from 5,722 the prior quarter, down ~2.2% YoY | InvestmentNews, Financial Planning | Q2 2026 | Reported, two independent outlets |
| Americas client assets | roughly $2.4 trillion, up ~11% YoY | Financial Planning | Q2 2026 | Reported. **Not re-confirmed by the third audit's search; confirm by eye** |
| Client assets per advisor | roughly $425M, rising ~13%/yr | **My arithmetic on the two rows above**, not a UBS-published ratio | Q2 2026 | Derived. Labelled as derived wherever it is used |
| Teams and assets lost, 2025 | 54 teams, 132 advisors, $51.8B, vs ~20 teams and $12B in 2024 | AdvisorHub tally | 2026 | Reported |
| Teams and assets lost, H1 2026 | 27 teams, $28B | AdvisorHub tally | 2026 | Reported |
| Compensation response | 2026 plan released early; 2027 plan holds grid steady and sweetens retention | AdvisorHub | 2026 | Reported |
| Karofsky quote | "We can't shrink the business to profitability. We have to invest in growth." | InvestmentNews, around the December 2024 US restructuring | Dec 2024 | Quoted verbatim, **dated deliberately** |
| Coverage structure | Four regional centers over three tiers, plus an international unit and the Wealth Advice Center | InvestmentNews | Dec 2024 | Reported |
| Wealth Advice Center scale | 330+ advisors, RMs and CSAs; up to 500 advisors to be added over three years; hubs in Weehawken, Charlotte, Dallas | UBS page and press coverage | 2026 | Reported. The 330+ and the three hubs re-confirmed by the third audit; the "up to 500" was not. **Corrected from "about 400, tripling" in v0.1, which was not supported** |
| STAAT Insights recognition | 2026 Celent Model Wealth Manager Award, Data, Analytics and AI, to UBS Financial Services Inc. for STAAT Insights | Celent | 2026 | Reported, strong |
| STAAT opportunity volume | more than 20 million AI-identified client opportunities in 2025, up ~50% YoY | UBS | 2026 | Reported, and **consistent with** the separately reported 13 million for 2024 (times 1.5 is 19.5 million), though that figure names "insights delivered" rather than "opportunities". **Load-bearing; confirm by eye** |
| STAAT 2024 baseline | 13 million AI-generated insights delivered to US advisors in 2024 | UBS Annual Report 2024; Financial Planning | 2025 to 2026 | Reported. Corroborates the 50% growth figure |
| STAAT adoption | nearly 90% of advisor teams actively using | UBS | 2026 | Reported. **Load-bearing; confirm by eye** |
| Time saved, figure A | 1,200 hours of meeting preparation per week | UBS STAAT page | 2026 | Reported. **Conflicts with figure B by ~2x, see below** |
| Time saved, figure B | 10,000 hours per month, described as a conservative estimate, attributed to UBS's Chief Data and Analytics Officer | Financial Planning | 2026 | Reported. **Conflicts with figure A** |
| ~~Seconds of saved prep per opportunity~~ | **Withdrawn in v0.4.** The arithmetic was right (at most 11.2 and 21.6 seconds) but the hours come from meeting briefings, not from opportunities, so the ratio measured nothing about conversion | Third audit | 2026-09-26 | **Do not quote** |
| STAAT signal types | life events, property transactions, late-stage business funding activity, upcoming maturities, cash-flow events, assets held away at other firms, thousands of internal and external signals | Celent, UBS, Financial Planning | 2026 | Reported, three sources. **Drives the §5.1 taxonomy; confirm by eye** |
| UBS Red | two domain-specific assistants on Azure OpenAI Service and Azure AI Search, synthesising 60,000 documents, supporting Client Advisors | Microsoft customer story | 2025 | Strong. Note: says 60,000, not "over 60,000" |
| Azure OpenAI reach | roughly 30,000 employees, globally, including Switzerland, Hong Kong, Singapore | Microsoft customer story | 2025 | Strong. **Not a US-FA-specific figure** |
| Broadridge programme | UBS WM USA anchor client since 2018, multi-year advisor workstation rebuild, public history of timetable slips | Broadridge, AdvisorHub | 2018 to 2026 | Strong |
| Wealth Way | Liquidity, Longevity, Legacy; Liquidity covers next 2 to 5 years of expenditure | UBS | current | Strong |

**Known conflict in the source material, carried openly rather than resolved by picking a side:**

| | Figure A | Figure B |
|---|---|---|
| Value | 1,200 hours per week | 10,000 hours per month |
| Per month | about 5,200 | 10,000 |
| Source | UBS STAAT page | Chief Data and Analytics Officer, quoted in trade press |
| Scope, most likely | STAAT pre-meeting briefings | All AI used for meeting preparation |

They differ by roughly a factor of two. Possible explanations include different scopes (STAAT only versus
all AI tooling) or different periods. **The argument in §1.3 does not depend on either**, because v0.4
no longer divides by them. Do not quote one without the other.

**Regulatory items that are PROPOSED, not adopted. Never state these as current rules:**

| Item | Status as of 2026-09-26 |
|---|---|
| FINRA Regulatory Notice 26-14, risk-based framework replacing blanket pre-use approval, addresses AI | Proposed. Published 9 July 2026, comments closed 11 Sept 2026 |
| SR-FINRA-2026-004, permit projections and targeted returns | Proposed. Federal Register 25 Feb 2026, comments closed 18 Mar 2026. A similar 2023 proposal was approved on a delegated basis in July 2024 and stayed a week later |

**Cut from v0.1 and deliberately not used:**

| Claim | Why it was cut |
|---|---|
| "Highest assets per advisor in the wirehouse segment," argued from ~15,000 advisors each at Merrill and Morgan Stanley | **Stays cut.** Not sourceable as a competitive ranking: UBS is reported to be the last wirehouse still disclosing headcount, so the comparison cannot be computed from current public data, and historical commentary has put Merrill ahead. Note the difference from the row above: UBS's **own** assets-per-advisor trajectory is computable from two reported UBS figures and is used, labelled as derived. The **cross-firm ranking** is not and is not used |
| "Roughly 11 to 22 seconds of saved preparation per opportunity" (v0.3, one-liner and §1.3) | **Withdrawn.** Dimensionally sound, semantically empty: it divided a meeting-briefing saving by an opportunity count, and to the engine's builder it read as a verdict on the engine. Both endpoints were also ceilings, since the source says more than 20 million |
| "The two figures are three orders of magnitude apart" (v0.2, §1.3) | **Wrong, and cut.** 69 opportunities against 13 minutes is a ratio of about 5.3, not 1,000, and it compared counts to minutes, which are different units. Replaced by the seconds-per-opportunity calculation, itself withdrawn in v0.4 |
| "Six CIO publications land in a normal week" | Unsourced and internally inconsistent, since a monthly letter does not land weekly |
| "Over 60,000 documents" | Source says 60,000 |
| A dated CIO Daily asserting a specific investment view | Would attribute a fabricated recommendation to the UBS Chief Investment Office on a real date |
