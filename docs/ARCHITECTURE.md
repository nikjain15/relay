# Relay: architecture

**Version:** 1.0, 2026-09-26
**Companion to:** `PRD-relay.md` v1.0 (§5 requirements) and `BUILD-SPEC.md` v1.0 (implementation)
**Status:** design, for discussion

**Diagrams render inline below on GitHub.** Standalone SVGs for full-screen display are in
`docs/diagrams/`, generated from the same Mermaid sources in this file, so the two cannot drift:
`01-system-context.svg`, `02-determinism-boundary.svg`, `03-critical-path.svg`,
`04-regime-state-machine.svg`, `05-data-model.svg`.

Three architectural claims carry this design. Everything else follows from them.

1. **Relay consumes the existing signal and retrieval layers and rebuilds neither.** It is a consumer,
   not a competitor, of the opportunity engine.
2. **The model composes language. It never decides eligibility.** Eligibility, ranking, recipient
   counting and policy checks are deterministic code. This is what makes the system reviewable by a
   supervisory principal, which is the difference between a demo and something that ships in wealth.
3. **No path exists from the system to a client.** Not a policy, a property of the dependency graph,
   enforced in CI.

---

## 1. System context

*Full-screen: [`docs/diagrams/01-system-context.svg`](diagrams/01-system-context.svg)*

What Relay owns, what it consumes, and what it deliberately does not build.

```mermaid
graph LR
    FA["Financial Advisor"]
    PR["Supervisory Principal"]
    CL(("Client"))

    subgraph existing["Already exists. Relay consumes, does not rebuild."]
        STAAT["STAAT Insights<br/>opportunity engine<br/>20M+ per year"]
        RED["UBS Red<br/>retrieval over<br/>60,000 documents"]
        WS["Advisor workstation<br/>Broadridge programme"]
    end

    subgraph relay["RELAY"]
        CORE["Advice-to-action layer"]
    end

    subgraph systems["Systems of record"]
        HOLD["Household, holdings,<br/>plan, KYC"]
        SHELF["Product shelf,<br/>model portfolios"]
        SUP["Supervisory queue"]
        BR["Books and records"]
        CRM["CRM"]
    end

    STAAT -->|"candidate opportunities<br/>id, class, materiality"| CORE
    CORE -->|"dismissal reasons<br/>as feedback"| STAAT
    RED -->|"passages with<br/>citation metadata"| CORE
    HOLD -->|"read"| CORE
    SHELF -->|"read, with constraint attributes"| CORE
    CORE -->|"embedded in"| WS
    CORE -->|"decision queue"| FA
    FA -->|"act, defer, dismiss with reason"| CORE
    CORE -->|"artifact plus evidence<br/>plus regime"| SUP
    SUP --> PR
    PR -->|"approve, return, block"| CORE
    CORE -->|"immutable audit records"| BR
    CORE -->|"tasks, contact history"| CRM
    PR ==>|"a human acts.<br/>NO system path exists"| CL

    classDef gate stroke-width:3px
    class CL gate
```

**Read the last edge carefully.** It starts at a person, not at Relay. There is no arrow from `CORE` to
`Client` anywhere in this diagram, and there is none in the dependency graph either. That absence is the
architecture.

**What Relay does not build, and says so out loud:** opportunity generation (STAAT Insights exists and
won Celent 2026), document retrieval and general advisor chat (UBS Red exists), the workstation shell
(Broadridge programme in flight), portfolio construction, and any client-facing surface.

---

## 2. The determinism boundary

*Full-screen: [`docs/diagrams/02-determinism-boundary.svg`](diagrams/02-determinism-boundary.svg)*

The most important line in the system. Everything left of it is inspectable, replayable code.
Everything right of it is a language model, and it is confined to composition and extraction.

```mermaid
graph TB
    subgraph det["DETERMINISTIC. No model client importable. Enforced by dependency-cruiser."]
        direction LR
        GRAPH["lib/graph<br/>traversal, reason paths"]
        RANK["lib/ranking<br/>materiality sort, per-advisor cap, suppression"]
        CONS["lib/constraints<br/>IPS, concentration, liquidity, tax, suitability"]
        RECIP["lib/recipients<br/>rolling 30-day count, regime resolution"]
        POL["lib/policy<br/>grounding gate, projection block"]
    end

    subgraph mdl["MODEL. Composition and extraction only."]
        COMP["compose client-facing language<br/>from approved proposal plus evidence"]
        EXTR["extract structured fields<br/>for the rationale record"]
        REF["emit refusal when<br/>grounding is insufficient"]
    end

    subgraph out["OUTPUT, always gated"]
        DRAFT["draft plus regime"]
        AUDIT["audit record with<br/>model, prompt, retrieval,<br/>graph, constraint versions"]
    end

    GRAPH --> RANK --> CONS --> RECIP
    CONS -->|"eligible candidates only"| COMP
    GRAPH -->|"computed values only"| COMP
    COMP --> POL
    EXTR --> POL
    REF --> POL
    POL -->|"pass"| DRAFT
    POL -->|"blocked, not flagged"| AUDIT
    RECIP -->|"regime"| DRAFT
    DRAFT --> AUDIT

```

**Why this shape.** A supervisor can be asked to trust a rule; they cannot be asked to trust a
generation. So eligibility is a rule, and the model is only allowed to say in English what the rules
already decided. Two consequences worth stating in an interview:

- **Unattributable output is blocked, not flagged.** A warning is a thing people click past.
- **The proposal engine's output space is finite**: the approved shelf crossed with the action verbs,
  filtered by constraints. The model ranks and explains inside that set. It cannot invent a product.

The forbidden edges are machine-checked:

```
lib/constraints, lib/ranking, lib/recipients  ──✗──▶  any model client
lib, components, app                          ──✗──▶  any outbound transport
```

---

## 3. The critical path

*Full-screen: [`docs/diagrams/03-critical-path.svg`](diagrams/03-critical-path.svg)*

One opportunity, from arrival to a client action. The path the demo walks.

```mermaid
sequenceDiagram
    participant S as STAAT Insights
    participant R as Relay core
    participant A as Advisor
    participant M as Model
    participant P as Principal
    participant B as Books and records

    S->>R: opportunity (id, class, materiality, trigger ref)
    R->>R: traverse graph, build reason path
    R->>R: rank, apply per-advisor cap and suppression
    R->>A: 12 rows, each with its reason path
    A->>R: act on one
    R->>R: evaluate shelf against household constraints
    Note over R: deterministic. rejected candidates kept,<br/>with the failing constraint named
    R->>A: 1 proposal, 4 rejections shown
    A->>R: accept
    R->>M: compose draft from proposal plus cited evidence
    M->>R: draft plus extracted rationale fields
    R->>R: grounding gate, projection block
    R->>R: count distinct recipients, 30-day window
    Note over R: 25 or fewer, correspondence.<br/>26 or more, retail communication
    R->>A: draft plus regime, editable
    A->>R: submit
    R->>P: draft, proposal, rationale, evidence, per-check results
    P->>R: disposition
    R->>B: immutable audit record plus retention stamp
    Note over P: the principal acts outside the system.<br/>Relay has no send path.
```

**The measured funnel is this sequence.** Generated, surfaced, opened, decided, proposal generated,
proposal accepted, drafted, submitted, dispositioned, client contacted. Conversion, not volume, is what
gets reported.

---

## 4. Regime resolution

*Full-screen: [`docs/diagrams/04-regime-state-machine.svg`](diagrams/04-regime-state-machine.svg)*

The control that shapes the product, as a state machine. Recipient count is the only input.

```mermaid
stateDiagram-v2
    [*] --> Drafted
    Drafted --> Correspondence: 25 or fewer recipients<br/>in rolling 30 days
    Drafted --> Retail: more than 25 recipients<br/>in rolling 30 days
    Correspondence --> Retail: batch adds a 26th recipient
    Retail --> Correspondence: window rolls,<br/>count falls to 25 or fewer
    Correspondence --> Review: supervisory review<br/>FINRA 3110(b), 3110.06-.09
    Retail --> PreApproval: principal approval<br/>required before use<br/>FINRA 2210(b)(1)
    Review --> Dispositioned
    PreApproval --> Dispositioned
    Dispositioned --> [*]: a human acts
```

**Three consequences, and the second one is the design insight.**

1. A personalised note to one household is **correspondence**, not a retail communication. The common
   claim that an AI-drafted client note is automatically a retail communication is wrong.
2. **Batch handling is where the regime flips.** Adding the 26th recipient converts the same text into a
   retail communication. So the counter is a first-class product surface that the advisor sees *before*
   they send, and batch is gated on it. A feature that silently crossed that line would create an
   unapproved retail communication at scale.
3. **Personalisation is a compliance asset**, not only a quality one. A genuinely per-household note
   stays in the lighter regime; a near-identical template dressed as personalisation does not.

**Forward-looking, and stated as a question rather than a plan.** FINRA Regulatory Notice 26-14 (9 July
2026, comments closed 11 September 2026) proposes replacing blanket principal pre-use approval with a
risk-based framework in which a firm's own written procedures decide what needs pre-approval, and it
addresses AI-generated communications directly. **It is a proposal and may change or fail.** If adopted,
the binding question becomes "can the firm evidence each communication's risk tier?", which is exactly
what this state machine plus the audit record already produce.

---

## 5. Data model

*Full-screen: [`docs/diagrams/05-data-model.svg`](diagrams/05-data-model.svg)*

The graph is real. Reason codes come from traversal, so the explanation shown to the advisor is the same
object the system decided with, not a narration written afterwards.

```mermaid
erDiagram
    HOUSEHOLD ||--o{ ACCOUNT : holds
    HOUSEHOLD ||--o{ PERSON : contains
    HOUSEHOLD ||--|| IPS : "governed by"
    HOUSEHOLD ||--o{ GOAL : pursues
    ACCOUNT ||--o{ HOLDING : contains
    HOLDING }o--|| PRODUCT : instance_of
    HOLDING ||--o{ TAXLOT : has
    GOAL }o--o{ ACCOUNT : funded_by
    IPS ||--o{ CONSTRAINT : states
    SIGNAL }o--|| HOUSEHOLD : concerns
    SIGNAL }o--|| TRIGGER : triggered_by
    PROPOSAL }o--|| SIGNAL : addresses
    PROPOSAL }o--|| PRODUCT : selects
    PROPOSAL }o--o{ CONSTRAINT : "evaluated against"
    PROPOSAL ||--|| RATIONALE : produces
    COMMUNICATION }o--|| PROPOSAL : derives_from
    COMMUNICATION ||--|| APPROVAL : dispositioned_by
    PUBLICATION ||--o{ THEME : asserts
    THEME }o--o{ PRODUCT : affects
```

**Reason path as a typed object, not a string.** A path is an ordered array of nodes, each carrying what
it contributed, so the renderer displays the decision rather than describing it:

```
ExternalEvent(property sale, $4.1M)
  → Household(Renner)
    → Goal(liquidity, funded 0 of 36 months)
    → Holding(single name, 71% of investable)
      → Constraint(concentration max 25%, breached)
```

Every advisor-visible artifact carries a **reconstruction header**: model version, prompt version,
retrieval snapshot id, graph version, constraint set version, timestamp. Any past decision can be
rebuilt without replaying a model, which is what makes the audit trail worth having.

---

## 6. Trust boundaries and data flow

| Boundary | What crosses | What never crosses |
|---|---|---|
| STAAT Insights to Relay | Opportunity ids, class, materiality, trigger references | Nothing written back except dismissal reasons as labelled feedback |
| Retrieval to Relay | Passages with citation metadata | No client data leaves the perimeter to obtain them |
| Relay to model | Approved proposals, computed values, cited passages | Raw client identifiers; eligibility decisions |
| Relay to supervisory queue | Draft, proposal, rationale, evidence, per-check results, regime | Nothing that bypasses the queue |
| Relay to client | **Nothing. There is no boundary here.** | Everything |

Client data stays inside the existing perimeter. Prompts, retrieved context and generated drafts that
inform a recommendation or a client communication are **retained as records**, not treated as ephemeral
application logs.

---

## 7. Failure modes and degradation

| If this fails | Behaviour | Why |
|---|---|---|
| Proposal engine unavailable | Opportunities and evidence still render; proposals unavailable and labelled | Triage has standalone value; it is V0 |
| Retrieval unavailable | Signals render with reason paths; explanation refuses and says why | A refusal is correct behaviour, not an error state |
| Model unavailable | Everything except drafting works | Drafting is the only model-dependent surface |
| Graph version mismatch | Artifact refuses to render rather than showing a stale reason path | A wrong explanation is worse than none |
| Recipient count unavailable | Drafting blocked | Unknown regime is never assumed to be the lighter one |

That last row is the one to defend in a compliance conversation: **when the regime cannot be determined,
the product stops.** It does not guess, and it does not default to the cheaper path.

---

## 8. What I would want to change after week one

Stated because a design with no open questions is a design nobody has pressure-tested.

- **Materiality is upstream and I do not control it.** If it is calibrated against content salience
  rather than advisor action, ranking inherits that and the cap makes it worse. First thing to measure.
- **The graph may be redundant.** If the upstream engine already emits a usable causal chain, Relay
  should render theirs rather than rebuild traversal. Cheaper, and a better partnership.
- **Correspondence versus retail may already be solved somewhere in the firm.** If a supervisory system
  already counts recipients, Relay should call it rather than own it.
- **The eval harness is the piece most likely to outlive the product.** It may be worth building as a
  shared service from the start rather than inside Relay.
