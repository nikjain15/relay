# Architecture

Relay is an agent layer for financial advisors: it reads the advisor's whole book on a cadence, cites
every claim, prepares every action short of the human gate, and hands each decision to a person. This
document is the overview; the three documents under `docs/` carry the detail.

## Layers

```
  The human gate      accept or decline a prepared action; disposition a finding; file a note; send from your own tools
        ^
  Agents              eight compliance desks, research, dossier, retrieval, discovery, consequences, the proposer
        ^
  Engines             constraints, ranking, recipients, the rule engine, retrieval, household arithmetic, the simulator
        ^
  Data                one file per client, advisor, document, rule, desk; firm policy; an append-only change log
        ^
  Sources (read only) CRM, custodian feed, archive of captured channels, e-sign, documents, a dropped spreadsheet
```

Every arrow points up. Nothing points down or out: no module under `app/`, `components/` or `lib/`
can reach an outbound transport, and the page's content security policy blocks any request to another
host. Both are enforced by tooling, not convention.

## Principles

1. **The spec comes before the code.** `docs/BUILD-SPEC.md` names every surface, the data model, each
   engine's responsibility, the demo path and the tests. Decisions made while building are written back.
2. **Everything a person might change is data.** A client is a file under `data/clients/`. A rule is JSON
   with a serializable condition tree the console edits at runtime. A compliance desk is an entry in
   `data/compliance/agents.json`. `scripts/build-data.ts` bundles by folder; the validator fails the build
   on anything inconsistent; a test fails on a client id appearing in code.
3. **The engines are deterministic; the model sits at the edges.** The same facts always produce the same
   verdict, which is what lets a past disposition be replayed against the rules as they stood. Where a
   model would compose language or read free text, the deterministic version is built and each screen
   says which step a model would own in production. The prototype makes no model calls.
4. **The invariants are enforced, and each guard was seen failing first.** Never sends; the model never
   decides; nothing clears its own findings; design tokens only; no client data in code. Each is a
   dependency-cruiser rule or a test, and each was recorded as enforced only after a planted violation
   made it fail.
5. **Tighten only, at every layer.** Firm, segment, advisor, client. Preferences resolve most-specific-wins;
   rules and desks resolve strictest-wins; the learning loop and the rule-change proposer suggest and never
   apply; every refusal is recorded in the change log.
6. **Evaluate against an expected side that shares no code.** A 300-household corpus, an expected side with
   its own CSV reader and arithmetic, hand-reviewed labels per sentence, precision and recall per rule and
   per discovery kind, and a golden file the check suite enforces. See `evals/README.md`.

## Where things live

| Path | Holds |
|---|---|
| `app/` | One folder per route; pages are thin and hand off to a component |
| `components/` | The shell, the drawn icon set, the chart forms, the UI kit (`ui.tsx`), one view per console |
| `lib/compliance/` | The rule DSL and engine, tighten-only policy and desk resolution, the sweep, prepared actions, the proposer, replay, the change log |
| `lib/evidence/` | Corpus state, lexical search with a reason per score, retrieval and the refusal |
| `lib/research/` | The research agent's probes and briefing; the dossier agent |
| `lib/discovery/` | The discovery agent's extractors |
| `lib/simulate/` | The consequence agent |
| `lib/import/` | CSV and XLSX readers, the row mapper, the sample book generator |
| `lib/connectors/` | The read-only connector catalog and the coverage model |
| `lib/constraints/`, `lib/ranking/`, `lib/recipients/`, `lib/policy/` | The deterministic engines behind proposals, today's list, the audience count and the draft checks |
| `lib/profile/`, `lib/learning/` | Four-layer personalization and the learning loop |
| `data/` | Every record, one file each; firm policy; the rule set; the generated bundle |
| `evals/` | The evaluation corpus harness, labels, golden counts and the current report |
| `tests/` | Unit tests, the invariant suite, the corpus eval |
| `scripts/` | The data bundler, the sample builder, the walkthrough builder, the browser suite, the stress run |

## Detailed documents

- [`docs/ARCHITECTURE-compliance.md`](docs/ARCHITECTURE-compliance.md): connectors, the rule set, the review desks, prepared actions, the proposer, replay and the change log
- [`docs/ARCHITECTURE-research-and-retrieval.md`](docs/ARCHITECTURE-research-and-retrieval.md): retrieval, the research agent, discovery, the dossier and the consequence agent
- [`docs/ARCHITECTURE-personalization.md`](docs/ARCHITECTURE-personalization.md): the four layers, the single read path and the learning loop
- [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md): principles, tokens, perspective colours, components, icons, charts
- [`docs/BUILD-SPEC.md`](docs/BUILD-SPEC.md): surfaces, data model, engine responsibilities, demo path, tests
