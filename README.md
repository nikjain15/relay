<p align="center">
  <a href="https://nikjain15.github.io/relay/"><img src="assets/hero.png" alt="Relay" width="820"></a>
</p>

<h1 align="center">Relay</h1>

<p align="center"><b>An advice-to-action layer for financial advisors. Relay drafts, a human sends, and a compliance agent never clears its own findings.</b></p>

<p align="center">
  <img src="https://img.shields.io/badge/tests-206%20passing-brightgreen" alt="Tests: 206 passing">
  <img src="https://img.shields.io/badge/browser%20checks-43%20passing-brightgreen" alt="Browser checks: 43 passing">
  <img src="https://img.shields.io/badge/WCAG-2.2%20AA-blue" alt="WCAG 2.2 AA">
  <img src="https://img.shields.io/badge/data-synthetic%20only-lightgrey" alt="Data: synthetic only">
  <img src="https://img.shields.io/badge/status-prototype-orange" alt="Status: prototype">
</p>

<p align="center">
  <a href="https://nikjain15.github.io/relay/"><b>Live at nikjain15.github.io/relay ↗</b></a> &nbsp;·&nbsp; walkthrough at <a href="https://nikjain15.github.io/relay/walkthrough/"><code>/walkthrough/</code></a>
</p>

---

**A working prototype of the step after an insight engine.** A wealth manager's AI can flag twenty
million client opportunities a year; what it cannot do is turn one into a documented, approved,
client-facing action. Relay is that path: evidence with citations, a proposal bounded to an approved
shelf, a drafted note whose audience decides its supervisory regime, and a principal's sign-off. Around
it sits a compliance layer that watches the advisor's whole book on a cadence and hands every decision
to a person.

**Every client, advisor and document here is invented.** Instruments, tax mechanics and regulatory
constraints are real, so the engines are genuinely exercised. Provenance for every composite is in
[`docs/PERSONAS.md`](docs/PERSONAS.md). No real client, advisor or firm record appears anywhere in this
repository.

## How the agent layer works

- **Connectors read; they never transmit.** Ten sources across twelve channel kinds (firm mail and
  calendar, video, compliant texting, chat, social, CRM, custodian, archive, e-signature). The
  `ReadCapability` union contains no send verb, so there is no name for an outbound call, and
  dependency-cruiser forbids `lib/connectors` from importing a transport or from importing
  `lib/compliance` at all: a connector carries records, it does not judge them.
- **Coverage is measured against what the advisor says they use**, not against what happens to be
  connected, because the channel nobody connected is exactly the one that goes unmeasured. A connected
  but degraded source counts as uncaptured, and each gap names the rule it exposes.
- **Rules are data, editable at runtime.** Twelve FINRA and SEC rules (2210, 3110, 2111, 2165, 4513,
  3270; Reg BI, 17a-4, 206(4)-1, Reg S-P, RN 24-09) live as JSON condition trees with named parameters.
  Change a threshold in the console and the next evaluation uses it, with no rebuild and no release.
- **Personalization can only tighten.** Rules resolve firm → segment → advisor → client. A lower layer
  may enable a rule the firm left off, raise a severity and move a threshold in the stricter direction.
  It may not disable a mandatory rule, lower a severity or loosen a threshold, and every refused attempt
  is recorded rather than dropped, because a layer that tried to loosen a rule is itself a signal.
- **The change log is the state.** Effective policy is the baseline with an append-only log folded onto
  it, so replaying the log to a timestamp reproduces the rule set exactly as it stood when a past
  disposition was made.
- **Five agents sweep the book, not the inbox.** Each is a rule bundle with a cadence. Detection,
  classification, evidence assembly and the drafted remediation are autonomous. A rule whose source is
  not connected reports that it **cannot be evaluated**, never that it is clear.
- **Uncertainty is separated from judgement.** An inferred fact carries a confidence below one and only
  reaches a person when flipping it would flip the verdict, so the queue holds findings a supervisor can
  act on rather than everything the system was unsure about.

## Three invariants, enforced rather than described

| Invariant | Enforced by |
|---|---|
| **Relay never sends.** No module in `app/`, `components/` or `lib/` can reach an outbound transport | `.dependency-cruiser.cjs`, `tests/invariants/no-outbound-path.test.ts`, and a `connect-src 'self'` policy at runtime |
| **The model never decides.** Eligibility, ranking, the recipient count, the supervisory regime and every rule verdict are deterministic code; the model composes language | `deterministic-no-model` and its transitive twin, which close the one-hop gap a helper module would otherwise open |
| **Nothing clears its own findings.** An agent detects and drafts; a principal dispositions | `lib/compliance/engine.ts` sets `requiresHuman`; no autonomous disposition path exists in the console |

Every guard here was **seen failing on a deliberate violation** before being recorded as enforced. That
rule is in [`AGENTS.md`](AGENTS.md) and it exists because an earlier audit found a guard that passed on
the very import it named.

## Stack

- **Next.js 15 (App Router)**, TypeScript strict, Tailwind with every colour as a design token
- **No runtime dependencies beyond React and Next.** No model client, no network client, nothing to send with
- **Vitest** for unit and invariant tests, **dependency-cruiser** for the architecture rules,
  **Playwright** driving Chromium for the browser suite
- **Static export** to GitHub Pages; the whole app runs from `data/`, with no server and no database

## The twelve surfaces

| | Surface | What it does |
|---|---|---|
| 1 | Overview | What the agents did overnight, and what only a person can settle |
| 2 | Today's list | Opportunities ranked and capped, each with its reason path |
| 3 | Why this client | The reason as a graph traversal, with cited passages, and a refusal when no passage supports it |
| 4 | Client picture | Advice state across Liquidity, Longevity and Legacy, holdings, constraints, history |
| 5 | Options | Every shelf candidate evaluated, with each rejection naming the constraint it failed |
| 6 | Note and audience | A drafted note, and a rolling 30-day recipient counter that decides the regime before anything moves |
| 7 | Supervision | Agent findings and drafts, each with its citation and the facts the rule read |
| 8 | Connected channels | What the advisor uses that nothing is capturing, with the exposure named |
| 9 | Rules and agents | The rule set, editable, with provenance per field and a live sample |
| 10 | Change log | Who changed which rule, when, at which layer and why; replayable |
| 11 | Meetings, follow-ups, servicing, paperwork, prospecting | The rest of the advisor's day |
| 12 | Measurement and preferences | Conversion rather than volume, and four-layer personalization with a learning loop |

## Run it

```bash
npm install
npm run check                    # typecheck, lint, import invariants, data check, 206 tests
npm run dev                      # http://localhost:3000
npx next build && npm run e2e    # 43 browser checks at 1440, 1280, 1024, 768 and 390
npm run stress                   # 1,000 clients, 50 advisors, 20,000 events, in memory
```

Checks run **sequentially**, never in parallel.

## Documents

| File | What |
|---|---|
| [`docs/ARCHITECTURE-compliance.md`](docs/ARCHITECTURE-compliance.md) | Connectors, the configurable rule set, the agents and the change log: what is autonomous, what is not, and where each invariant is enforced |
| [`docs/ARCHITECTURE-personalization.md`](docs/ARCHITECTURE-personalization.md) | The four layers, the single read path, and the learning loop that proposes and never decides |
| [`docs/BUILD-SPEC.md`](docs/BUILD-SPEC.md) | Surfaces, data model, fixtures, engine responsibilities, demo path, tests, build order |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | Principles, tokens, components, the icon set and its boundary, and what agent-first means as a rule |
| [`docs/PERSONAS.md`](docs/PERSONAS.md) | Every composite, with the kind and public source of each detail |
| [`data/`](data/README.md) | All client, advisor, policy and reference data. One JSON file per client |

## Licence and scope

A prototype built to explore a product thesis, not a product. Synthetic data only, `noindex` on every
page, and no affiliation with or endorsement by any firm named in its public-source citations.
