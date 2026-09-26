# UBS interview prototype: working brief

**Role:** UBS, Product Manager, Digital Solutions & AI (Wealth Management)
**Stage:** Interview with hiring manager
**Product name:** Relay
**Created:** 2026-09-26
**Revised:** 2026-09-26, twice. Second full fact re-audit applied. See `AUDIT-FINDINGS-2026-09-26.md`
**Status:** Strategy and PRD **v0.3** complete, twice fact-audited. Prototype not yet built.

This file exists because most of the decisions below were made in conversation, and a decision that
lives only in a chat is not state. Everything here is auditable and was settled with Nik explicitly.

---

## 1. The team and its product

**Redacted from this repository's history on 2026-09-27.** This section held a role-by-role career table
for one real person, read off a LinkedIn profile. The name was withheld, which was not enough: a named
employer plus a distinctive role title identifies one individual. It was removed from the working tree and
then purged from every commit, because a private individual's career history is not ours to publish.

What preparation needs is the team and its product, which are public record: what STAAT expands to, the
2026 Celent Model Wealth Manager Award for Data, Analytics and AI, the published adoption and opportunity
figures, and the vocabulary the team works in. See the current revision of this file.

---

## 2. The thesis

Rebuilt on UBS's own published numbers, which is what makes it safe to say out loud. Sharpened in the
second audit to remove a headcount assumption it did not need.

> UBS publishes that STAAT Insights generated **more than 20 million AI-identified client opportunities
> in 2025, up about 50% year over year** (against 13 million in 2024), used by **nearly 90% of advisor
> teams**. It also publishes the preparation time saved: **1,200 hours per week** on the STAAT page, or
> **10,000 hours per month** as the Chief Data and Analytics Officer has been quoted, conservatively.
> Divide one by the other: 20 million a year is about 385,000 opportunities a week, so the saved
> preparation time works out at **roughly 11 to 22 seconds per opportunity generated.** The division's
> published growth metric is volume; its published outcome metric is preparation time, an input measure.
> **The unclosed link is opportunity to executed, supervised action**, and the number nobody publishes is
> conversion. North star is **opportunity-to-action conversion**, never volume. The rate-limiting step is
> the supervisory record, not the model.

**Why the seconds figure is the right one to say.** It needs no advisor headcount and no assumption about
team size. Both inputs are firm-wide totals, so if opportunities are counted per household rather than per
advisor, or hours per team rather than per advisor, numerator and denominator scale together and the
answer does not move. The earlier version divided by ~5,600 advisors to get "69 opportunities against 13
minutes," which imported an assumption it did not need **and carried an arithmetic error**: that pair is a
ratio of about 5, not "three orders of magnitude" as the v0.2 PRD claimed.

**The hours conflict is stated, not hidden.** 1,200 per week is about 5,200 per month, so the two
published figures differ by roughly two times. They may be different scopes or different periods. Both go
on the slide as a range, and reconciling them is a week-one question. Being the candidate who noticed the
firm's own two numbers disagree is a better position than being the one who quoted whichever was handier.

**The second audit's strategic addition.** **FINRA Regulatory Notice 26-14** (9 July 2026, comments closed
11 Sept 2026) proposes replacing blanket principal pre-use approval for retail communications with a
**risk-based framework** in which the firm's written procedures decide what needs pre-approval, and it
addresses AI-generated communications directly. It is only a proposal. But it changes what Relay is for:
under a risk-based regime the firm must *evidence* each communication's risk tier, and that evidence is
exactly what Relay's recipient counter, rationale records, policy checks and audit trail produce. Relay
stops being a tool that complies with pre-approval and becomes the evidence base that lets UBS reduce
pre-approval load at all. Nik should raise this as a question, never as a prediction.

Full argument, scope and evidence in `PRD-relay.md`. Every figure is in PRD Appendix D with its source,
date, confidence, and, where relevant, the conflict.

---

## 3. Product name

Locked: **Relay**, chosen by Nik on 2026-09-26 from a shortlist.

Names considered and rejected: Baton, Warrant, Waypoint, Basis, Bridge, Throughline, Principal,
Countersign, Cadence, Daybook, Fieldcraft, Corroborant, Consequent. (D-50 in `DECISIONS.md` recorded
eleven of these; the full list of thirteen is here and the two files now agree.)

Rationale for the house style: UBS's own AI assistant is named **Red** and its research unit
**Evidence Lab**. Short, concrete, slightly oblique names fit. A descriptive name such as "AI Advisor
Assistant Platform" would read wrong in that building.

---

## 4. Prototype scope, as agreed

**Nine surfaces across the whole advisor journey. Six built functional, three designed and visibly
labelled as not built.** Labelling them is deliberate: claiming everything is real and then hitting a
dead click costs more than the honesty does.

| # | Surface | JD capability type | Build state |
|---|---|---|---|
| 1 | Pipeline and prospecting | Insights and analytics | Designed |
| 2 | Onboarding and re-papering | Advisor workflow | Designed |
| 3 | Household advice state (Wealth Way) | Advisor workflow | Build |
| 4 | Evidence and explain | Chat and assistive | Build |
| 5 | Action proposals, bounded | Agentic | Build |
| 6 | Book triage, opportunity to household | Insights and analytics | Build |
| 7 | Client communications and review packs | Productivity | Build |
| 8 | Servicing and operations triage | Agentic | Designed |
| 9 | Supervision and control console | Control plane | Build |

**Decisions inside that scope:**

- Document search and chat are **in**, at Nik's instruction, but positioned as the **evidence layer
  under the action** rather than as standalone features. This keeps the "I did not rebuild Red"
  argument intact while giving the product visual completeness.
- The securities engine is **in**, but **bounded**: it may only select from an approved product shelf
  and must satisfy the household's IPS constraints. It never free-generates a recommendation.
  Rejected candidates are shown with the failing constraint named, as a feature.
- The supervisory console is a **product surface**, not a footnote.
- Measurement is the **second** thing shown in the demo, not the last, because of who the audience is.
- **New, from the audit.** Surface 6 triages opportunities across **five trigger classes**, with life
  events and external events such as property transactions and late-stage business funding as the
  primary classes, and market or house-view triggers as only one class among them. The first draft
  built the entire signal model on publication-driven market triggers, which is not what STAAT Insights
  publicly does. This was the single worst error in the first draft and it is fixed in PRD §5.1.
- **New, from the audit.** The **rolling 30-day recipient counter** is a first-class product surface,
  visible to the advisor and to the principal, because it is what determines which supervisory regime a
  communication falls under. See §10 below.

---

## 5. Personas

All personas and households are **fictional**. Instruments, tax mechanics and regulatory constraints
are real, so the constraint logic is genuinely exercised. Every screen carries an illustrative-prototype
mark.

### Advisor A, the demo persona

Senior FA, four-person team, New York. 19 years in the industry, 3 at the firm. 183 households,
roughly $820M, skewed above $5M with four relationships above $50M. Sits in the **above $5M
regional-center tier**. Team is FA, junior FA, client associate, shared wealth strategist.

### Advisor B, segment coverage

Licensed advisor in the **Wealth Advice Center**, pooled remote coverage, no dedicated relationships.
Appears for about thirty seconds in the demo, to show awareness that UBS has said it will add up to 500
advisors there and that its product economics differ.

**Corrected from the first draft.** The first draft put Advisor B in the "$500K to $5M" band. That band
is one of the **four regional advisor centers**. The Wealth Advice Center is a separate **sixth**
division serving mass-affluent clients through hubs in Weehawken, Charlotte and Dallas. Getting the
firm's own coverage model wrong in front of the division's AI product lead would have been an expensive
thirty seconds. The household set now carries a seventh archetype at $180K to be the genuine WAC case.

### Seven households

| # | Archetype | Assets | Coverage | The hard part |
|---|---|---|---|---|
| 1 | Pre-liquidity founder | $62.4M | $50M+ | Single position at 71% of investable assets, 10b5-1 running, Legacy unfunded |
| 2 | Retired couple in drawdown | $8.4M | $5M+ | Liquidity funded 11 of 36 target months, sequence-of-returns risk, RMDs starting |
| 3 | Cross-border executive | $14.2M | $5M+ | US and UK tax, unvested deferred comp, PFIC exposure |
| 4 | Multigenerational family trust | $31.6M | $5M+ | Grantor is 79, next generation unengaged. Asset-retention archetype |
| 5 | Core affluent accumulator | $1.2M | $500K to $5M regional tier | Pending 401k rollover, first advisory relationship |
| 6 | Business owner | $23.1M | $5M+ | Illiquid operating stake, near-term liquidity need |
| 7 | Mass-affluent | $180K | Wealth Advice Center | Pooled coverage, contact-rate constrained, calibrated-supervision case |

Each carries a full record: balance sheet mapped to Liquidity, Longevity and Legacy; holdings with
cost basis and tax lots; an IPS with stated constraints; KYC and suitability profile; dated life
events; contact history and open tasks.

### Document corpus for the evidence layer

Roughly 40 to 60 documents, written fresh, structurally faithful: research notes, product shelf
one-pagers, a structured note term sheet, a model portfolio fact sheet, a sample IPS, a disclosure, a
supervisory procedure extract. **Nothing copied from UBS.**

**New hard rule, from the audit.** Every illustrative document carries a **relative, non-calendar date**
("prototype corpus, day 1"), and **no investment view is ever attributed to the UBS Chief Investment
Office.** The first draft's flagship example read "CIO Daily 2026-09-24 asserts reduce single-name AI
concentration," which invents a UBS house view and dates it to a real day. Anyone in that room may know
what the CIO actually said that day.

---

## 6. Visual treatment

**Institutional neutral, accent as a single CSS token.** Agreed constraint: do not clone UBS
branding, do not use their logo or brand mark, do not build something that could be mistaken for a
real UBS internal tool if it circulates beyond the interview.

What we do instead: match the **information density, table conventions, disclosure patterns and
vocabulary** of a wirehouse advisor workstation, in a restrained neutral palette. The accent colour
is exposed as one CSS variable so Nik can change it locally for his own screenshare if he chooses.
That stays his decision, not something published.

Nik was asked not to send screenshots of the real advisor workstation, and to describe layout
conventions in words instead.

### Where the prototype may and may not live

The audit caught that no file had ever decided this, while the audit prompt itself said the prototype
might be "shown or possibly hosted." Decided now, and recorded as **D-57**:

- **Allowed:** run locally, screenshare it, and hand over a repository or a zip if asked.
- **Not allowed:** any public, indexed URL.

Reason: an indexed page under Nik's name that analyses UBS's attrition and margin position, names its
platform programmes, and contains illustrative documents styled as wealth-management research is a
permanent artifact. It collides with the published-versus-sent rule in `CLAUDE.md` §2, and with §8's
rule against anything that signals he is looking, while he is quiet-searching and employed. A gated
link on request is fine. An indexed one is not.

---

## 7. Demo structure, twelve minutes

Re-ordered after the audit. The first draft opened on UBS's attrition numbers. Opening on a division's
worst public quarter is a weaker move than opening on the thing his team just won.

1. **Two minutes, their own numbers and the thesis.** Open on the Celent award and STAAT Insights: 20
   million opportunities in 2025 against 13 million in 2024, 90% of teams. Then the division: 385,000
   opportunities a week against the published preparation time saved, which is **11 to 22 seconds per
   opportunity**, and say why it is a range. Then the question: what does the firm know about what
   happened to the rest? The capacity picture is the second beat: **Americas client assets up about 11%
   year over year to roughly $2.4 trillion while advisor headcount fell about 2.2% to 5,644**, so assets
   per advisor are rising about 13% a year.
2. **Four minutes, the advisor flow** across the four capability types the JD names, opening on a
   **life-event or property-transaction trigger** and its graph path, not on a market-view card.
3. **One minute, the gate refusing something.** Deliberately trigger a constraint breach or an
   evidence refusal in front of them. Still the highest-value sixty seconds in the demo.
4. **One minute, the recipient counter flipping the regime.** Batch the same note across 26 households
   and let the product change the supervisory path in front of them. This is the moment that proves he
   understands the rule rather than having read about it. **Then one sentence, as a question not a
   prediction:** "Reg Notice 26-14 would move this to a risk-based framework, which as I read it makes
   per-artifact risk evidence the thing a firm has to produce. Is that how you are reading it?" 
5. **Two minutes, the measurement surface.** Eval harness, regression gate, conversion funnel.
6. **Two minutes, the roadmap** sequenced by supervisory surface.

**Closing line, agreed:** "I built this with synthetic data, so treat the model quality as a sketch.
What I want your reaction to is the sequencing and the control map, because that is what I would be
bringing to your team in week one."

**Opening adjusted for this manager:** open on the graph path and the citation trail, not on a
polished card. Reason codes in the prototype come from traversal of an entity graph, which is a
deliberate nod to his knowledge-representation work.

**One question to ask him, now that we know the Evidence Lab detail:** what transferred from designing
alerting for research analysts to designing it for advisors, and what did not. That is a peer question
and it is the kind he is unlikely to have been asked.

---

## 8. What we are deliberately not building, and will say so

Opportunity and signal generation (his award-winning engine exists). Document search and retrieval (Red
exists). General-purpose advisor chat (Red exists). Advisor workstation shell (Broadridge programme in
flight). Unbounded securities recommendation (cannot pass Reg BI review). Portfolio construction.
Client-facing surfaces.

Saying this out loud is part of the pitch. A PM who proposes rebuilding what the team already shipped,
or improving a metric the team already wins on, costs a quarter.

---

## 9. Constraints carried from CLAUDE.md

- No employer content anywhere in the prototype or the PRD. None used.
- No em-dashes in any output.
- Numbers about UBS are public reporting, cited in PRD Appendix D with source, date and confidence, and
  presented as correctable by anyone with internal figures.
- Nik must not claim a UX metric he has never measured. His fit map records UX outcomes as his one
  real gap. The PRD states targets and measurement methods for a future product, which is a different
  claim from a past achievement, and the distinction must survive into how he talks about it. The audit
  confirmed the PRD respects this.
- Not one claim about Nik's own experience appears in the PRD, so nothing here touches
  `claims/claims-audit.md`.

---

## 10. Soft spots: status after the audit

The first version of this section listed five soft spots honestly. All five were audited. Here is where
each one landed, plus what the audit found that this section had missed.

| # | Soft spot as recorded | Audit verdict | Status |
|---|---|---|---|
| 1 | SEC marketing rule citation under the Advisers Act | **Partially correct, and this section overcorrected.** UBS Financial Services Inc. is a dual registrant, so 206(4)-1 governs advisory-capacity communications and FINRA 2210 governs brokerage; both apply firm-wide and the stricter standard governs each artifact | **Fixed and upgraded.** PRD §7.1 now states the dual-registrant framing, which is a credential rather than a weakness |
| 2 | "Highest assets per advisor in the wirehouse segment" | **Not sourceable.** UBS is reported to be the last wirehouse still disclosing headcount, so the ratio cannot be computed from public data, and historical commentary has put Merrill ahead | **Cut entirely.** The capacity argument now rests on declining headcount against unchanged targets, which is sourced |
| 3 | "Precision at the inbox is the failure mode" | **Unsupported, and 90% published adoption argues against the strong form** | **Demoted to an explicit week-one hypothesis** in PRD §1.5. The thesis no longer depends on it |
| 4 | Advisor headcount reported at both ~5,500 and ~5,700 | **Both stale.** 5,644 and down 2.2% YoY is the current reporting | **Fixed** to "roughly 5,600 and declining," which is also the stronger version of the argument |
| 5 | People leadership least addressed by a prototype; "PRD covers squad operating model only lightly" | **This was wrong.** The PRD covered it **not at all**: zero mentions of hiring, coaching, squads or PM structure | **Fixed.** New PRD §10, team and operating model, covering pod structure, how it is run, and hiring, coaching and performance management |

**What this section had missed, and the audit found:**

| Finding | Status |
|---|---|
| The signal model was built on publication-driven market triggers; STAAT Insights publicly surfaces life events, property transactions and late-stage business funding | **Fixed.** Five trigger classes, PRD §5.1, life-event path as the primary worked example. This was the worst error in the body of work |
| "An AI-drafted client note is a retail communication" is wrong. Under FINRA 2210(a) a note to 25 or fewer retail investors in 30 days is **correspondence**, reviewed under 3110(b), with no principal pre-approval required | **Fixed and turned into a feature.** PRD §7.2 and FR-16. The batch feature is where the regime flips, and the product now shows it |
| Wealth Advice Center stated as "about 400 staff, tripling in three years" | **Fixed.** 330+ staff, up to 500 advisors added over three years |
| WAC conflated with the $500K to $5M regional tier | **Fixed.** Six divisions, seventh household archetype added |
| "Write-once storage" given as the 17a-4 requirement | **Fixed.** The 2022 amendments added an audit-trail alternative; WORM was retained as an option, not the requirement |
| Reg BI stated loosely, and only the Care obligation cited | **Fixed.** All four obligations, "reasonably available alternatives," costs, and the fact that the rule itself does not mandate documenting the alternatives analysis |
| A fabricated CIO view attributed to a real date | **Fixed.** Relative dates, no CIO attribution |
| Regulatory map missing FINRA 24-09, SR 26-2, Reg S-P, 2111, 4511, 17a-3(a)(35), 3120/3130, vendor risk | **Fixed.** All added. **SR 26-2 (April 2026) replaced SR 11-7 and expressly puts generative and agentic AI outside its scope**, which is the strongest single item in the section |
| Karofsky quote presented as current | **Fixed.** Dated to the December 2024 restructuring, and his title corrected to President of UBS Americas and co-President of GWM |
| "Six CIO publications in a normal week" unsourced and internally inconsistent | **Cut** |
| PRD header cited an Appendix D that did not exist | **Fixed.** Appendix D is now the figures-and-provenance table |
| Hosting question never decided | **Decided.** §6 above, and D-57 |
| `outcome.md` not updated to Interview (HM) | **Fixed** |

### Second audit pass, same day: what a full re-audit found in v0.2

| Finding | Severity | Status |
|---|---|---|
| **"The two figures are three orders of magnitude apart"** was arithmetically wrong. 69 opportunities against 13 minutes is a ratio of about 5.3, and it compared counts to minutes | **Would have been caught instantly by a numerate audience.** The worst kind of error in a document whose whole argument is a division | **Fixed.** Replaced with seconds per opportunity, which is dimensionally sound |
| The per-advisor framing imported a headcount assumption it did not need | Medium. Invited a correction that would have derailed the opening | **Fixed.** Both published figures are firm-wide totals, so dividing them directly is headcount-independent and immune to the team-size objection |
| **The two published hours figures conflict by about 2x**: 1,200 per week on the STAAT page versus 10,000 per month from the Chief Data and Analytics Officer. v0.2 used one and never noticed | High. Quoting one as settled invites "that is not our number" | **Fixed.** Printed as a range with the conflict named, and made a week-one question |
| **FINRA Regulatory Notice 26-14 was missing entirely.** Proposes replacing blanket pre-use approval with a risk-based framework, addresses AI-generated communications, comments closed 11 Sept 2026 | High, as a missed opportunity. The roadmap was designed against a rule under active proposed reform | **Fixed and turned into the strategic upside.** PRD §7.1, §7.2 consequence 4, and the V3 rationale |
| The projections proposal was cited without status or date | Low | **Fixed.** SR-FINRA-2026-004, Federal Register 25 Feb 2026, still proposed, plus the 2024 approve-then-stay history. Both proposals now flagged in Appendix D as PROPOSED, never to be stated as current rules |
| Missing the strongest available capacity fact | Medium | **Added.** Americas client assets about $2.4T, up ~11% YoY, against headcount down ~2.2% to 5,644 from 5,722 the prior quarter |
| Missing the 2024 baseline that corroborates the 50% growth claim | Low | **Added.** 13 million in 2024; times 1.5 is 19.5 million, consistent with "more than 20 million" |
| Held-away assets and wallet share absent from the signal taxonomy | Low | **Added** to the external-event trigger class |

**Remaining known risk, stated plainly.** The three STAAT figures that now carry the thesis (20 million
opportunities, 1,200 hours, the signal taxonomy) come from UBS-owned pages and a Celent citation that
could not be read first-hand from the machine used for the audit, because those domains were
unreachable. They are consistent across independent search results, and they are flagged in PRD
Appendix D as load-bearing. **Nik should open those two pages himself and confirm all three before the
interview.** It is a five-minute job and it is the last open item in the fact base. A second attempt to
read `ubs.com` and `celent.com` directly was made during the re-audit and was blocked again by the
container's network policy, so this cannot be closed from here. The figures are now corroborated across
UBS's own page, the Celent award citation and Financial Planning's coverage, which is as far as search
alone can take it.

---

## 11. Next steps

1. **Nik confirms the three load-bearing STAAT figures** on the UBS STAAT page and the Celent award
   page. Five minutes, and it closes the fact base.
2. Nik reviews `PRD-relay.md` v0.2 and this brief.
3. Build the low-fidelity working prototype against the PRD. The fact base and the strategy are now
   settled, which was the precondition.
4. Rehearse the twelve-minute demo once the interview date is known, including the recipient-counter
   beat, which is new.
5. Do the four GenAI number drills in `claims/drills/2026-08-08-genai-four-numbers.md` before the
   interview. They matter more for this manager than for any other, since his team builds the same
   systems and will ask how the numbers were measured.


---

## 12. Talk track: team, operating model, hiring and coaching

**Not in the PRD, by Nik's decision.** The JD asks for hiring, coaching and performance-managing PMs and
POs, and `fit.md` records people leadership as the one partial gap. It was drafted as a PRD section and
then pulled, because Nik will cover it in conversation rather than on paper. A PRD that carries a team
chapter also reads slightly oddly to a product audience, so the choice is defensible on its own terms.

Kept here as talking points so the material is not lost.


The JD asks for someone who hires, coaches and performance-manages PMs and POs, and who runs
cross-functional squads. A PRD that says nothing about the team is an incomplete answer to the role, so
this is stated rather than left to the conversation.

###  Shape of the team

Relay is three problems with different rhythms, so it wants three pods behind one roadmap rather than
one undifferentiated squad:

| Pod | Owns | Staffing |
|---|---|---|
| **Advice path** | Triage, advice state, evidence, proposals | Senior PM, design, 4 to 6 engineers, data science partner |
| **Control plane** | Rationale records, supervisory queue, recipient counter, audit and retention | PM or senior PO with LRC fluency, 3 to 4 engineers |
| **Measurement and evals** | Funnel instrumentation, eval harness, release gates, experiment design | PM or TPM, 2 engineers, data science |

The control plane gets its own PM deliberately. In regulated field products it is the surface that
decides whether anything ships, and it loses every prioritisation argument when it is somebody's
side responsibility.

###  How I would run it

- **Ownership at the outcome, not the feature.** Each pod owns a funnel stage and reports its own
  conversion number. Nobody's OKR is a count of things built.
- **Written decisions.** Decisions recorded with the evidence that justified them and the falsifier
  that would reverse them, in the repository next to the code, so a new joiner can reconstruct why.
- **Evidence over seniority in reviews.** The eval suite and the funnel are the arbiter.
- **Design and LRC in the room from discovery**, not consulted at the end. The control plane PM's
  first relationship is with Legal, Risk and Compliance, and that is by design.

###  Hiring, coaching and performance

- **Hiring bar for PMs on this team:** can they state what would falsify their own plan, and can they
  read a metric they did not choose? I screen for both directly, with a written exercise on a real
  decision rather than a hypothetical.
- **Coaching cadence:** weekly one-to-ones focused on one skill at a time, not status; a quarterly
  written growth plan owned by the PM and reviewed by me; a rotating "run the review" slot so PMs
  practise defending decisions to stakeholders before they have to do it for real.
- **Performance management:** expectations written down at the start of a cycle, feedback in the week
  it happens rather than at review time, and underperformance addressed with a specific, dated,
  written plan. The failure mode I have seen most is a manager who lets a gap run for two quarters
  because the conversation is uncomfortable.
- **What I would want from my own manager in the first 90 days:** the conversion number if it exists,
  air cover with LRC, and one named advisor council slot.

---

