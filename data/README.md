# Relay client data

The single source of every client, advisor, product and document in Relay. The prototype's screens,
the constraint and ranking engines, evidence retrieval, the draft composer and the walkthrough mockup
all read from here. **Edit these files; never edit numbers in code.**

All clients and advisors are **cited composites** (see `docs/PERSONAS.md`): invented names and figures
inside situations UBS and public sources describe. No real client or advisor data belongs here.

## Files

| File | What it holds |
|---|---|
| `clients/<id>.json` | One complete client record: profile, people (with ages), holdings, goals, the family's rules, contact history, team notes, open tasks, flagged opportunities, sources (`groundedIn`), and for four clients a `walkthrough` story |
| `advisors.json` | Advisor A and Advisor B, with sources and their day for the walkthrough |
| `shelf.json` | The approved products, with plain-English names used in client notes |
| `documents.json` | The illustrative research notes, one-pagers and procedures that evidence cites. Relative dates only |
| `book.json` | Other households in Advisor A's book, for the batch-send demo |
| `communications.json` | The prototype's fixed "today" and earlier sends of the demo note by a second advisor |
| `funnel.json` | Synthetic conversion funnel for the measurement page |
| `generated/walkthrough.json` | **Generated. Do not edit.** Built from the files above by the real engines |

## Fetching a client

`getClientFile(id)` in `lib/data/index.ts` returns the grounding bundle for one client: the full record,
their advisor, their opportunities, and the full text of every document those opportunities cite.
Retrieval and any chat about a client should be grounded in that bundle and nothing else.

```ts
import { getClientFile } from "@/lib/data";
const f = getClientFile("renner"); // client, advisor, opportunities, documents
```

## After editing

```
npm run data:build   # regenerate generated/walkthrough.json
npm run check        # validates every file, then typecheck, lint, invariants, data:check, tests
```

`npm run check` fails if a file is malformed or inconsistent: holdings that do not sum to the total, a
duplicate id, an opportunity citing a document that does not exist (unless marked
`evidenceExpectedMissing` to exercise a refusal), a client with no sources, an unknown advisor or
product, or a stale `generated/walkthrough.json`.

## Adding a client

Copy an existing file in `clients/`, give it a new `id` (prefix `hh-`), keep holdings summing to
`totalUsd`, give Liquidity months that match unearmarked cash divided by `monthlySpendUsd`, add at least
one source to `groundedIn`, then add its import to `lib/data/index.ts`.
