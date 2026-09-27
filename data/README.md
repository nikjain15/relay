# Relay client data

The single source of every client, advisor, product and document in Relay. The prototype's screens,
the constraint and ranking engines, evidence retrieval, the draft composer and the walkthrough mockup
all read from here. **Edit these files; never edit numbers in code.** Firm policy (caps, weights, thresholds,
routing rules) and app settings (what is featured) are data too, so nothing a person might want to change
lives in code. `tests/invariants/no-client-data-in-code.test.ts` fails if a client name or data id
appears in `app/`, `components/` or `lib/`.

All clients and advisors are **cited composites** (see `docs/PERSONAS.md`): invented names and figures
inside situations UBS and public sources describe. No real client or advisor data belongs here.

## Files

One file per record. Add a file, run `npm run data:build`, and it is in the app: nothing else changes.

| Path | What it holds |
|---|---|
| `clients/<id>.json` | Everything about one client: profile, people (with ages), holdings, goals, the family's rules, contact history, team notes, tasks, paperwork, `supervisory` (what the firm's CRM and custodian say: trusted contact, complaint, disbursement and third-party flags), `valuationHistory` (the custodian's prior valuations of the largest single name at day -90, -60, -30; day 0 is never stored), `messages` (every captured message in either direction, with the connector it came through), `preferences` (client-layer settings), flagged opportunities, sources (`groundedIn`), and for four clients a `walkthrough` story |
| `advisors/<id>.json` | One advisor: role, book, sources, `profile` (the advisor layer of the settings resolver), `obaOnFile`, `connections` (per source: status, last ingest, records), `attestations` (which channels they say they use), `prospects`, and their day (`walkthrough.meetings`) |
| `documents/<id>.json` | One document the evidence layer may quote: desk, publication day on the corpus clock, review cycle, status (current, superseded, withdrawn) with both ends of any supersession chain, and passages as `{ id, text, claims? }`. Relative dates only |
| `compliance/rules.json` | The rule set: authority and citation, scope, severity, whether mandatory, the condition tree, editable parameters, evidence keys, the drafted finding and remediation, the connectors required, and `actions` (what the agent prepares when it fires) |
| `compliance/agents.json` | The agent bundles: rules watched, scope, cadence, last run |
| `compliance/edits.json` | The seeded change log |
| `compliance/history.json` | Findings raised over the past 90 days with the facts each rule read and the principal's disposition; read by the proposer and the replay |
| `policy.json` | Firm policy the engines read: dismiss reasons; the Liquidity sleeve; the core model; the disclosure document; retrieval (corpus day, floor, boosts); prospect warmth and size bands; servicing routing rules. The FINRA 25-in-30-days threshold is regulation and stays in `lib/recipients/count.ts` |
| `app.json` | What is featured: the day label, the default advisor, the featured client, opportunity and product |
| `profiles/schema.json`, `firm.json`, `segments.json`, `learning.json` | Every personalizable setting with its bounds; firm defaults; the two segments; learning-loop thresholds |
| `events.json` | Synthetic behavior the learning loop reads |
| `shelf.json`, `book.json`, `communications.json`, `service-requests.json`, `funnel.json` | The approved products; other households for the batch demo; the note templates and prior sends; incoming requests; the measurement funnel |
| `generated/bundle.json` | **Generated. Do not edit.** Every client, advisor and document, built by `scripts/build-data.ts` |
| `generated/walkthrough.json` | **Generated. Do not edit.** The mockup's data, built by the real engines |

## Fetching a client

`getClientFile(id)` in `lib/data/index.ts` returns the grounding bundle for one client: the full record,
their advisor, their opportunities, the full text of every document those opportunities cite, their
paperwork and their open service requests.
Retrieval and any chat about a client should be grounded in that bundle and nothing else.

```ts
import { getClientFile } from "@/lib/data";
const f = getClientFile("hh-renner"); // client, advisor, opportunities, documents
```

## After editing

```
npm run data:build   # regenerate generated/walkthrough.json
npm run check        # validates every file, then typecheck, lint, invariants, data:check, tests
```

`npm run check` fails if a file is malformed or inconsistent: holdings that do not sum to the total, a
negative value, zero monthly spending, a Liquidity goal whose months disagree with the holdings, a
duplicate or malformed id, an unknown tier, role, trigger class, constraint kind, product type or prospect
path, materiality outside 0 to 100, an opportunity citing a document that does not exist (unless marked
`evidenceExpectedMissing` to exercise a refusal), an `outflowUsd` without an `outflowLabel`, a client with no
people or no sources, an unknown advisor or product, a walkthrough whose audience or left-over figure
disagrees with the engine, an event with an unknown type, section or channel, a money-movement rule that is
not first or has its callback off, a document with a one-sided supersession chain or a publication day after the
corpus day, a stored day 0 snapshot, a message or past finding pointing at an unknown client, connector or rule, or a
stale `generated/walkthrough.json`.

A funding opportunity may carry `inflowUsd` (new cash the event brings) and `outflowUsd` with
`outflowLabel` (a known payment the goal must also cover, such as `"capital call"`).

## Adding a client, an advisor or a document

Copy an existing file in the folder, name the file after its `id` (`hh-` for a client, `adv-` for an
advisor, `doc-` for a document), keep holdings summing to `totalUsd`, give Liquidity months that match
unearmarked Liquidity-eligible holdings divided by `monthlySpendUsd` (the validator tells you the number
it computed), add at least one source to `groundedIn`, then run `npm run data:build`. There is no import
to add and no list to update; `data:check` fails if the bundle is stale.
