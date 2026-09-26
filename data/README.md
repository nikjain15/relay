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

| File | What it holds |
|---|---|
| `clients/<id>.json` | One complete client record: profile, people (with ages), holdings, goals, the family's rules, contact history, team notes, tasks (`{text, owner, dueDay}`, negative days are overdue), `preferences` (client-layer settings, see `profiles/schema.json`), paperwork, flagged opportunities, sources (`groundedIn`), and for four clients a `walkthrough` story |
| `advisors.json` | Advisor A and Advisor B, with sources and their day: `meetings` are `{time, title, kind, clientId?, prospectId?, purpose}`, where kind is call, review, prospect, internal or queue. A client meeting gets a review pack |
| `policy.json` | Firm policy the engines read: dismiss reasons; the cash product, sleeve limits and lock-up for Liquidity (a holding counts toward Liquidity when its product meets the sleeve limits); the core model; the disclosure document; prospect warmth and size bands (largest first); servicing routing rules (money movement first, callback required). The list size, class weights and escalation days are in `profiles/firm.json`. The FINRA 25-in-30-days threshold is regulation and stays in `lib/recipients/count.ts` |
| `app.json` | App settings: the day label, the default advisor, the featured client, opportunity and product for the menu and demo, the client whose review pack the walkthrough shows, and default talking points |
| `profiles/schema.json` | Every personalizable setting: kind (preference or rule), type, bounds, which layers may set it |
| `profiles/firm.json` | Firm defaults for every setting; the floor for rules |
| `profiles/segments.json` | Segment layer: private wealth; Wealth Advice Center (larger list, brief notes, video, 7-day escalation) |
| `profiles/advisors/<id>.json` | One file per advisor: segment, learning on or off, advisor-level settings |
| `profiles/learning.json` | Learning-loop thresholds: window, minimum events, agreement, step, cooling-off, check period |
| `events.json` | Synthetic behavior the learning loop reads: triage decisions, list completion, options chosen, draft edits, review-pack use, client responses by channel, declined suggestions |
| `shelf.json` | The approved products, with plain-English names used in client notes |
| `documents.json` | The illustrative research notes, one-pagers and procedures that evidence cites. Relative dates only |
| `book.json` | Other households in Advisor A's book, for the batch-send demo |
| `communications.json` | The prototype's fixed "today", the note template for each kind of proposal (`"Liquidity:fund"`; the counter counts per template), and earlier sends of the demo note by a second advisor |
| `prospects.json` | Prospects per advisor: signal, path in, estimated assets, fit, sources |
| `service-requests.json` | Incoming client requests: text, channel, hours since received |
| `funnel.json` | Synthetic conversion funnel for the measurement page |
| `generated/walkthrough.json` | **Generated. Do not edit.** Built from the files above by the real engines |

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
not first or has its callback off, or a stale `generated/walkthrough.json`.

A funding opportunity may carry `inflowUsd` (new cash the event brings) and `outflowUsd` with
`outflowLabel` (a known payment the goal must also cover, such as `"capital call"`).

## Adding a client

Copy an existing file in `clients/`, give it a new `id` (prefix `hh-`), keep holdings summing to
`totalUsd`, give Liquidity months that match unearmarked cash divided by `monthlySpendUsd`, add at least
one source to `groundedIn`, then add its import to `lib/data/index.ts`.
