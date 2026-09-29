<p align="center">
  <a href="https://nikjain15.github.io/relay/"><img src="assets/hero.png" alt="Relay" width="820"></a>
</p>

<h1 align="center">Relay</h1>

<p align="center"><b>An agent layer for financial advisors. Relay reads the book, drafts and prepares; a person decides and sends.</b></p>

<p align="center">
  <a href="https://github.com/nikjain15/relay/actions/workflows/ci.yml"><img src="https://github.com/nikjain15/relay/actions/workflows/ci.yml/badge.svg?branch=main" alt="CI"></a>
  <img src="https://img.shields.io/badge/tests-344%20passing-brightgreen" alt="Tests: 344 passing">
  <img src="https://img.shields.io/badge/browser%20checks-67%20passing-brightgreen" alt="Browser checks: 67 passing">
  <img src="https://img.shields.io/badge/WCAG-2.2%20AA-blue" alt="WCAG 2.2 AA">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-view--only-blue" alt="License: view-only"></a>
  <img src="https://img.shields.io/badge/data-synthetic%20only-lightgrey" alt="Data: synthetic only">
</p>

<p align="center">
  <a href="https://nikjain15.github.io/relay/"><b>Live at nikjain15.github.io/relay ↗</b></a> &nbsp;·&nbsp; <a href="https://nikjain15.github.io/relay/how-it-works/">How it works</a> &nbsp;·&nbsp; <a href="https://nikjain15.github.io/relay/features/">Features</a> &nbsp;·&nbsp; <a href="https://nikjain15.github.io/relay/impact/">Impact</a> &nbsp;·&nbsp; <a href="https://nikjain15.github.io/relay/architecture/">Architecture</a> &nbsp;·&nbsp; <a href="https://nikjain15.github.io/relay/walkthrough/">Walkthrough</a>
</p>

---

**A working prototype of the step after an insight engine.** A wealth manager's AI can flag twenty
million client opportunities a year; what it cannot do is turn one into a documented, approved,
client-facing action. Relay is that path, and the agent layer around it: nineteen agents that read the
advisor's whole book on a cadence, cite every claim, prepare every action short of the human gate,
and hand each decision to a person.

**Every client, advisor, document and message here is invented.** Instruments, tax mechanics and
regulatory constraints are real, so the engines are genuinely exercised. Provenance for every
composite is in [`docs/PERSONAS.md`](docs/PERSONAS.md).

## What the agents do

| Agent | Reads | Leaves for a person |
|---|---|---|
| **Communications review** | Every draft and every captured message, both directions | Holds, review queue entries, a drafted correction |
| **Marketing review** | Client-facing text, for performance, projection and testimonial content | A hold and a rewrite through review |
| **Complaints** | Every inbound message, for grievance language nobody logged | The log entry and the callback |
| **Books and records** | What the advisor attests to using against what is captured | The sources to connect, each gap with its regulation named |
| **Reg BI review** | Each proposal as it is released | A hold until the care-obligation record is complete |
| **Sales practice** | Every account against its own profile, at a point and over 90 days | The concentration conversation, prepared before the ceiling |
| **Vulnerable client protection** | Every specified adult's account, for the indicators the rule names | Holds, callbacks on the number on file, forms to request |
| **Conduct** | The captured corpus, for outside business activity | A disclosure form to request |
| **Research** | The client file, the service queue, the firm's record, the channels, the corpus | A briefing: what changed, what is observed, what is inferred, what could not be established |
| **Dossier** | The client file, the CRM, the captured corpus, the firm's documents, the public record | Every claim cited, the sources checked against each other, and a CRM note a person files |
| **Retrieval** | The document corpus, on every opportunity | Cited passages with a reason per score, or a refusal that names what is missing |
| **Rule-change proposer** | Ninety days of findings | Tighten-only rule changes, with the findings behind each |
| **Discovery** | What clients said, in messages, notes and contact summaries | Candidate opportunities cited to the sentence, with a confidence and the documents each would cite |
| **Options and consequences** | Every shelf product against the household's own rules, applied to a copy of the household | After-tax income, cost over the horizon, access, rate risk, and the morning after, graded |
| **Meeting prep** | Today's calendar and the client file behind each meeting | A review pack and a briefing for every client meeting |
| **Ranking** | Every opportunity on the advisor's book | Today's list: materiality times the advisor's own weight for each kind of signal, capped at the advisor's list size |
| **Policy reader** | A written supervisory procedure | Candidate rules in the engine's own shape, each cited to its sentence, for a person to add to a desk |
| **Ask** | The book, the findings, the rules, the sources, today's calendar | An answer to a plain question, with the records it read |

Every workflow screen opens with the agent speaking first: what it read, in a sentence with the
figures in it, the few things that matter, one thing to do next, and a trace of how. The morning
opens as an inbox in the order a person works: decide now, review what the agents prepared (each
opening beside the list with the draft and the reasoning, and staying on screen as a recorded
outcome), then what else ran. Three colours say whose line each row is, agent, advisor or client,
always with the word. Ask, on every screen, answers a plain question from the same records and cites them.

**One source per advisor.** Switch the advisor in the header and every screen, count and answer follows:
the header, the persona line, the page and Ask all read one computed view of that advisor's book
(`lib/view/advisor-view.ts`), so no two places on screen can disagree.

**Agents you can read and change.** Each agent says in one card what it is for, what it reads, what it
checks, what it prepares and what it never does. An advisor can rename, retune or switch off an agent,
and create a new one from a template; a change that would loosen a compliance desk, or delete or switch
one off, waits for a principal's approval. Ranking is an agent too: each advisor sets their own weight per
kind of signal and list size, inside the firm's bounds, and every score on screen shows its arithmetic.

**Grounded, and checkable.** Every compliance rule carries where it stands in law, with dates (in force,
guidance, or approved and not yet effective, never stated as current), and links to the primary text it is
built on; `validate()` fails the build on a rule without them. Each desk page shows every rule's trigger in
plain words, its settings and bounds, what it prepares, the source it needs and what it raised today. The
agents that are not desks state their method, and the regulation behind them where there is one.

**Create an agent in front of someone.** Pick a template (cash cover below a floor, no contact for too
long, one stock above a level, words in what clients write), set the number or the words, and the panel
runs the draft over the advisor's real book before anything is created, with a count on every quick pick.
Create it and it joins the same sweep as the desks; its findings name the household and go to Supervision.
Households, Sources, Agents and Supervision share one search, filter and sort.

The eight compliance agents are **review desks**: one per team a legal, risk and compliance function
runs, each carrying the team it mirrors, the authorities it applies, its rules and its cadence, all as
data. Each desk has its own page: its rules, its findings, the sources it needs, a tune panel (an
advisor's layer can switch a desk on, run it more often or give it another rule of its scope, never the
reverse, and every refusal is shown with the attempt), and a policy reader that turns a written
procedure into candidate rules a person adds.

**Sources.** Relay reads the tools a practice already runs and replaces none of them: a catalogue of
23 read-only connectors across CRM (Salesforce, Redtail, Wealthbox, Dynamics, HubSpot, a wirehouse
workstation), custodian (Schwab, Fidelity, Pershing), portfolio (Orion, Tamarac, Black Diamond),
planning (eMoney, MoneyGuidePro), archive, e-signature and every channel, each saying which rules it
unlocks. Vendor names are for demonstration of the integration surface and imply no affiliation. Or
drop a `.csv` or `.xlsx` of households, a message export or a document; it is read in the browser with
no upload, every row is held to the same validator as a shipped file, and every agent runs over it live.

Every one of them detects, assembles, drafts and prepares on its own. None of them sends, schedules,
writes to a system of record, clears a finding, or loosens a rule.

## Three invariants, enforced rather than described

| Invariant | Enforced by |
|---|---|
| **Relay never sends.** No module in `app/`, `components/` or `lib/` can reach an outbound transport | `.dependency-cruiser.cjs`, `tests/invariants/no-outbound-path.test.ts`, a `connect-src 'self'` policy at runtime |
| **The model never decides.** Eligibility, ranking, the recipient count, the supervisory regime, every rule verdict, the retrieval floor and the refusal are deterministic code | `deterministic-no-model` and its transitive twin |
| **Nothing clears its own findings.** An agent detects and prepares; a principal dispositions; a person accepts each prepared action | `requiresHuman` in `lib/compliance/engine.ts`; no autonomous disposition or acceptance path exists |

Every guard was **seen failing on a deliberate violation** before being recorded as enforced. That
rule is in [`AGENTS.md`](AGENTS.md).

## Everything is data

| Add | By |
|---|---|
| A client, with holdings, goals, rules, history, notes, paperwork, the firm's supervisory record, the custodian's valuation history and every captured message | One file in `data/clients/` |
| An advisor, with their connected sources, attestations, prospects, settings profile and calendar | One file in `data/advisors/` |
| A document, with its desk, review cycle, status, supersession chain and structured claims | One file in `data/documents/` |
| A compliance rule, with its citation, condition, parameters, evidence keys and the actions its agent prepares | One entry in `data/compliance/rules.json` |
| An agent | One entry in `data/compliance/agents.json` |

Then `npm run data:build`. `validate()` fails the build on anything inconsistent: holdings that do not
sum, a Liquidity figure that disagrees with the holdings, a citation to a document that does not exist,
a one-sided supersession chain, a stored valuation for today, a message on an unknown connector. See
[`data/README.md`](data/README.md).

## Evals

The 300-household book under `public/samples/` is also the evaluation corpus. `npm run check` runs every
agent over it and fails on any finding missed or wrongly raised, any number the engines get differently
from the eval's own arithmetic, and any record that is incoherent as data. The expected side in
[`evals/expected.ts`](evals/expected.ts) imports nothing from the engines: it reads the CSV files with
its own reader and works out what each agent should find from the rule parameters, the advisor files
and the hand-reviewed sentence labels in [`evals/labels.json`](evals/labels.json). The current report,
per rule and per discovery kind with every disagreement named, is [`evals/REPORT.md`](evals/REPORT.md);
what the eval has caught so far is in [`evals/README.md`](evals/README.md).

## Stack

- **Next.js 15 (App Router)**, TypeScript strict, Tailwind with every colour as a design token
- **No runtime dependencies beyond React and Next.** No model client, no network client, nothing to send with
- **Vitest** for unit and invariant tests, **dependency-cruiser** for the architecture rules, **Playwright** driving Chromium for the browser suite
- **Static export** to GitHub Pages; the whole app runs from `data/`, with no server and no database

## Repository layout

| Dir | Role |
|---|---|
| `app/` | Next.js routes, one folder per surface |
| `components/` | React UI: the shell, the drawn icon set, the chart forms, one view per console |
| `lib/compliance/` | Rule DSL, tighten-only policy resolution, the engine, agents, the sweep, prepared actions, the proposer, the policy reader, replay, the change log |
| `lib/evidence/` | Corpus state, lexical search with a reason per score, retrieval and the refusal |
| `lib/research/` | The research agent's probes and the briefing they assemble; the dossier agent |
| `lib/simulate/` | The consequence agent: a proposed action applied to a copy of the household and run through every engine |
| `lib/discovery/` | The discovery agent: extractors over what clients said |
| `lib/import/` | CSV and XLSX readers, the row mapper, the sample book generator |
| `lib/connectors/` | Read-only connector catalog (23 connectors across 13 channel kinds) and the coverage model |
| `lib/proposals/` | Option economics: after-tax income, cost over the horizon, access, rate sensitivity |
| `lib/ask/` | The Ask engine: intent by words, every figure from the engines, every answer cited |
| `lib/constraints/`, `lib/ranking/`, `lib/recipients/`, `lib/policy/` | The deterministic engines behind proposals, today's list, the audience count and the draft checks |
| `lib/profile/`, `lib/learning/` | Four-layer personalization and the learning loop that proposes and never decides |
| `data/` | Every record, one file each, plus firm policy, the rule set and the generated bundle |
| `tests/` | Unit tests and the invariant suite |
| `scripts/` | The data bundler, the sample-file builder, the walkthrough builder, the browser suite and the stress run |
| `public/samples/` | The 300-household evaluation corpus, also the sample files to connect: a book, a message export, a document |
| `evals/` | The eval harness: expected side, labels, runner, golden counts and the current report |
| `docs/` | Architecture, build spec, design system, personas, the walkthrough mockup |

## Run it

```bash
npm ci
npm run check                    # typecheck, lint, import invariants, data check, 344 tests
npm run eval                     # every agent over the 300-household corpus, against evals/golden.json
npm run dev                      # http://localhost:3000
npx next build && npm run e2e    # 67 browser checks at 1440, 1280, 1024, 768 and 390
npm run stress                   # 1,000 clients, 50 advisors, 2,000 messages, 20,000 events, in memory
```

Checks run **sequentially**, never in parallel. CI runs the check and the browser suite on every pull
request; the Pages deploy runs on `main` behind a green check.

## Documents

| File | What |
|---|---|
| [`docs/ARCHITECTURE-compliance.md`](docs/ARCHITECTURE-compliance.md) | Connectors, the rule set, the agents, prepared actions, the proposer, replay and the change log |
| [`docs/ARCHITECTURE-research-and-retrieval.md`](docs/ARCHITECTURE-research-and-retrieval.md) | Retrieval with a reason per score, conflicts, staleness, the refusal; the research agent's probes and citations |
| [`docs/ARCHITECTURE-personalization.md`](docs/ARCHITECTURE-personalization.md) | The four layers, the single read path, and the learning loop |
| [`docs/BUILD-SPEC.md`](docs/BUILD-SPEC.md) | Surfaces, data model, engine responsibilities, demo path, tests |
| [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) | Principles, tokens, components, icons, charts, and what agent-first means as a rule |
| [`docs/PERSONAS.md`](docs/PERSONAS.md) | Every composite, with the kind and public source of each detail |
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | The layers, the principles, and where things live |
| [`CONTRIBUTING.md`](CONTRIBUTING.md) | The working rules the codebase is held to |
| [`CHANGELOG.md`](CHANGELOG.md) | Notable changes, by pull request |
| [`data/README.md`](data/README.md) | Every data file, what it holds, and what `validate()` checks |
| [`evals/README.md`](evals/README.md) | The evaluation corpus, how the expected side is built without the engines, what the eval has caught |

## Licence and scope

Source-available for viewing and evaluation ([`LICENSE`](LICENSE)). A prototype built to explore a
product thesis. Synthetic data only, `noindex` on every page, and no affiliation with or endorsement by
any firm named in its public-source citations.
