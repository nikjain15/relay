# Advisor walk, 27 September 2026

Relay walked the way Margaret Ellison (adv-a) works a morning, on `main` at `3badfea`, then fixed on branch `audit/2026-09-27-advisor-walk`. Screenshots are in `docs/audit/2026-09-27-advisor-walk/` (1440px, and 390px for steps 1 to 3).

## Verdict

1. The product works end to end: every flow the brief names runs, from Overview through Options, the drafted note, Supervision, the dossier, a connected spreadsheet, a policy read into rules and a connector, and nothing sends. Every figure I recomputed from `data/` matched.
2. The advisor's flow broke in four places. On the live site, 41 links and buttons (including "Open the first desk" and "Start with") pointed outside the `/relay/` base path and returned 404. The Overview contradicted itself (12 meetings against a calendar of 4). The score on Today's list had no explanation, and the page claimed a waiting-time factor the code does not use. On a phone, the two decision tables scrolled sideways past their key figures.
3. Ask is grounded: every answer it gives cites a record, and every answer I checked was right. But on `main` it failed 14 of 35 ordinary questions (hyphenated names, possessives, plurals, "what changed since we last spoke", and one of its own suggested chips), and at 390px it was an unlabelled icon. On this branch it answers 44 of 44, and it says so when the data is not held rather than guessing.

## How it was run

- `npm ci && npm run data:build`, then the app from a production build (`next build && next start`). A static export under `/relay/` is served the way GitHub Pages serves it.
- `npm run check` (typecheck, lint, import invariants, data check, tests) and `npx next build && npm run e2e` were run sequentially. On `main`: 311 tests, 65 browser checks, all green. On this branch: 323 tests and 65 browser checks, all green.
- A click-every-control crawl over the `/relay/` export at 1440 and 390. It covered 45 pages, 291 buttons (each clicked on a fresh load and checked for a visible change) and every internal link fetched.
  - On `main`: 41 dead links.
  - On this branch: 0 dead links and 0 page errors at both widths. 26 clicks produced no visible change; every one is an already-selected toggle (the current advisor, the current tab, the selected row) or a native file picker.
- Horizontal overflow checked on 34 pages at 360, 390 and 1024: none.

## Every step

| # | Screen | What I did | What I saw (screenshot) | Figure recomputed | Verdict | One-line fix |
|---|---|---|---|---|---|---|
| 1 | Overview `/` | Read it for ten seconds; pressed Start with; Review, Accept, Escape; Review, Decline with a reason | The brief speaks first and "Start with" is one button. On `main` it said "12 meetings today" and "6 tasks overdue" (`01-overview-1440.png`). Accept shows "Recorded. Nothing was sent." and the row stays marked on the page after Escape (`01b-review-accepted-1440.png`). Decline asks for one line and records it. | Meetings: 4 in `adv-a.json#walkthrough.meetings`, screen said 12 (the whole firm's). Overdue tasks: 4 of Margaret's, screen said 6. Fixed. | works, after fix | Scoped to the advisor (done). The prepared actions show 19 rows across 4 households before "Show 2 more"; fold after the first group. |
| 1 | Overview, "Decide now" | Read the first row | "7 channels you use are not captured (calendar, meeting, voice, sms, chat, social, crm)" while Zoom and Salesforce are connected. Meeting and CRM are read with no retained copy, which is a different claim. | Coverage status for adv-a: gap on calendar, voice, sms, chat, social; partial on meeting, crm. | untrue, fixed | Now "5 not captured; meeting, crm read but not retained" (done). |
| 1 | Overview, blocking finding | Read the subject | "Captured email, outbound, renner, day -2" | `lib/compliance/facts.ts` label | confusing, fixed | Now "Renner: email sent 2 days ago" (done). |
| 2 | Ask | Asked 35 questions, then 9 more (table below) | Every answer cites a record. On `main` 14 of 35 were wrong or unanswered; at 390px Ask was an unlabelled icon (`02-ask-1440.png`, `02-ask-390.png`). | Renner after-tax, Thornbury options, cash cover, quiet clients: all recomputed, all match | broken on `main`, works now | Six fixes to `lib/ask/answer.ts`, plus a header field and a phone button (done). |
| 3 | Today's list `/triage` | Read the ranking; tried to work out the score | Scores 92, 83.6, 77 with no parts. The subtitle said "ranked by materiality and how long it has waited", but waiting is not in `lib/ranking/rank.ts`. The note said "a weighted sum you can see on each row", but it is a product and was not on the row (`03a-triage-1440.png`). | All 11 scores recomputed as materiality × class weight from `data/clients/*.json` and `data/profiles/firm.json`: all match (92 × 1.00 = 92; 88 × 0.95 = 83.6; 81 × 0.95 = 77). | untrue copy, fixed | Each row shows "92 × 1.00"; a Ranking desk tunes the weights per advisor (done). |
| 3 | Why this client `/evidence/opp-renner-property` | Opened it from the brief | Opened on four stat tiles with no rank, no score and the internal title (`03b-why-this-client-1440.png` is after the fix) | Relevance 0.40 = 0.05 + 0.03 + 0.03 + 0.04 + 0.25: matches. Passage 2 shows 0.34 with parts summing to 0.33 (the parts are rounded, the total is not). | confusing, fixed | Opens with "number 1 of 11: score 92 = materiality 92 × outside event weight 1.00 ... 3 passages from 2 documents; 1 disagrees" and See the options (done). |
| 3 | Options | Compared the rows | After-tax income, cost over 3 years, access, rate risk and the morning after are all there, in a sentence for the selected option (`03c-options-1440.png`). At 390px the table is 1,024px wide and the figures sit off screen. | Treasury ladder: need 36 × $85K = $3.06M, less $0 liquid (the $96K MMF is earmarked). Gross 3,060,000 × 4.1% = $125,460. Tax 37 + 3.8 = 40.8% (state exempt). After tax $74,272. Cost 10 bps × 3 = $9,180. Screen: $125K, $74K, 40.8%, $9K. Match. | works; phone broken, fixed | Stacks into cards below 768px (done). |
| 3 | Accept, draft, submit, Supervision | Accepted the treasury ladder, drafted the note, submitted it | "Accepted", then Client communications drafts from the accepted option and 3 cited passages, counts 2 retail recipients; "Submitted for supervision"; the note is on the queue (`03g-supervision-1440.png`) | Audience 2 within 30 days, correspondence regime | works | None. |
| 4 | Households `/clients` | Research on the first household; filed the note; opened the Briefing; connected `clients.csv` on Sources | Dossier cites five sources and marks the public record unverified; the note appears in the briefing as "Research agent noted" (`04c-briefing-1440.png`). The book grew from 12 to 312 households ("300 of them connected from your files this session"); the live run covers every agent. | 7 households, $160.4M for Margaret: matches. | works | The Households page opens on the whole firm (12), not Margaret's 7; default to the advisor. |
| 5 | Agents `/agents`, desk `/agents/client-protection` | Open the first desk; Use the sample procedure; added two candidate rules; opened the change log; next sweep | On the live site "Open the first desk" went to `nikjain15.github.io/agents/...` and 404'd (fixed). Two rules added, both in `/compliance/log` as addRule entries; the next sweep on Supervision carries findings from `policy-written-supervisory-procedures-s-1` and `-s-2`. Tune for the advisor is checked by the browser suite's desks check (advisor-layer tightening shown, loosening refused). | 3 addRule entries in the log (1 seeded + 2 added) | works, after fix | None beyond the link fix. |
| 6 | Sources `/sources` | Connected UBS advisor workstation, then Schwab Advisor Center | CRM moves from "Not retained" to captured (UBS workstation is a retained copy); the gaps header goes from 7 to 6 and completeness from 36% to 45%. Schwab changes nothing visible: the custodian channel was already captured by the custodian feed. On Overview exactly one sentence changes: "Meeting, crm are read but not retained" becomes "Meeting is read but not retained". Findings stay at 12 and "5 things need you" stays at 5, although each connector card says it "Unlocks 4 rules". | Completeness: 4 of 11 attested channels covered = 36%; 5 of 11 = 45%. Match. | confusing | Say on the card what connecting changed (rules now evaluable, findings added or cleared), and show it on Overview. |
| 6 | Sources, Calendar row | Read it | "Microsoft 365 mail and calendar" is connected and says it reads "your firm mailbox and calendar", yet Calendar shows "Not captured" and offers no connector. The catalogue entry covers the email channel only. | `lib/connectors/catalog`: one channel per connector | untrue | Let a connector cover more than one channel, or rename it "mail". |
| 7 | Meetings | Screenshot and brief | The agent speaks first. "I read 12 meetings across 3 calendars" and the page lists all three advisors (`07-meetings-1440.png`). No primary action. | 12 = 4 + 4 + 4 across adv-a, b, c: matches, but firm-wide | confusing | Default to the advisor's calendar; one next action: open the first review pack. |
| 7 | Service requests | Same | Brief true: 7 requests, 1 callback, 3 past target; the table is unfolded under it. Firm-wide. | 7 in `service-requests.json`: matches | works | Default to the advisor. |
| 7 | Paperwork | Same | 22 forms across 12 files, 8 escalated, 5 signed. A 23-row table, unfolded. | 22 forms, 5 signed: match | confusing | Fold the table; lead with the escalated ones. |
| 7 | Follow-ups | Same | "23 tasks across the book, 6 tasks overdue": firm-wide, while the Overview now says Margaret's 4, so the Overview's "Open" lands on a different number (`07-follow-ups-1440.png`) | 23 tasks, 6 overdue firm-wide: match | confusing | Default to the advisor, as the Overview now does. |
| 7 | Prospects | Same | 9 prospects across 3 books, ranked by path, fit and size; drafts for 7 | 9 prospects: matches | works | Default to the advisor. |
| 7 | Note and audience | Same | Speaks first; one primary action ("Load the featured proposal") | n/a | works | None. |
| 7 | Rules and desks | Same | The brief read "enabled false to true. undisclosed outside business..." and "was refused and stay on the record" | 12 rules, 8 desks: match | fixed | Sentences now read "turn it on" (done). |
| 7 | Change log | Same | No agent brief; the table is the page, which suits a record | 8 rows | works | None. |
| 7 | Replay | Same | No agent brief; a 17-row table with Replay per row | n/a | works | Add one line saying which finding it replays first. |
| 7 | Suggestions | Same | The brief's points read "Margaret Ellison: market_view", "Margaret Ellison: undefined" twice | n/a | broken, fixed | Now names the setting and the change (done). |
| 7 | Preferences | Same | Speaks first; the settings table is the page | n/a | works | Link to the new Ranking desk from the weights row. |
| 7 | Measurement | Same | "Of 4,200 opportunities surfaced in the pilot week, 88 became approved client actions", stated as synthetic | n/a | works | None. |
| 8 | How it works, Features, Impact, Architecture | Read as a stranger | Each is explainable in three sentences (below). The agent count disagrees: How it works computes 14, Features says "Fourteen" and then lists 16, and the Overview now counts 15 with Ranking. | 8 desks + 6 on Overview = 14; Features lists 8 + 8 = 16 | confusing | One roster in `lib/`, counted everywhere. |
| 9 | Phone, steps 1 to 3 | Repeated at 390px | Overview reads well once the Start with button stops overflowing its box (fixed). Ask was an unlabelled icon (fixed). Today's list and Options scrolled sideways (fixed, now cards: `03a-triage-390.png`, `03c-options-390.png`). | as above | works, after fix | Done. |

### The About pages in three sentences each

- **How it works.** Relay reads the tools a practice already runs, read only. Its agents detect, cite and prepare each step on a cadence. The advisor decides and sends from their own tools. I could say this back after one read.
- **Features.** Eight compliance desks mirror the firm's review teams, and an advisor can tighten any of them but loosen none. More agents do research, retrieval, discovery, options and consequences, and answer Ask. Everything is a data file and everything is cited. The count in the title is wrong (see step 8).
- **Impact.** The hours and the risk sit in the step after an insight (evidence, options, note, audience, disposition). On a synthetic 300-household book the agents raise every expected finding and brief every household. It fits over the existing tools. Clear, and it says the book is synthetic.
- **Architecture.** Five layers, with arrows only pointing up from read-only sources to the human gate. Anything a person might change is data with an attributed log. A model only phrases and reads at the edges. Clear.

## Ask, question by question

"Before" is `main`; "Now" is this branch. Every figure marked correct was checked against the file named.

| Question | Answer now (short) | Cited record | Correct (value in data/) | Link lands | Before |
|---|---|---|---|---|---|
| What should I do first today? | In order: 2 blocking findings; 5 channels not captured, 2 without a retained copy; 24 prepared; 4 meetings, first 9:30 | `rules.json#off-channel-gap`, `#sec-marketing-206-4-1` | yes | yes, Overview | Said 7 channels "not captured"; raw subject label |
| Who am I meeting today? | 4: 9:30 Renner call, 11:00 referral intro, 2:00 Alcott review, 4:30 huddle | `adv-a.json#walkthrough.meetings` | yes (4 entries) | yes, /meetings | same |
| How much cash cover does Renner have? | 0 months of $85K spending, 36-month target | `hh-renner.json#holdings`, `#goals[0]`, `#monthlySpendUsd` | yes (only cash is the $96K MMF, earmarked for tax) | yes | same |
| Any findings on Abernathy? | 3: concentration rising, drift, possible diminished capacity (low confidence) | `rules.json#finra-2111-drift`, `#finra-2111-suitability`, `#senior-investor-2165` | yes (sweep output; single name 38.0% against 30%) | yes | same |
| What did Brandvold say recently? | "Can we find time next week to talk through the pension transfer?..." (email, 4 days ago) | `hh-brandvold.json#messages[0]` | yes (day -4, inbound) | yes | same |
| Which channels are not captured? | 6 sources connected; 5 not captured (calendar, voice, sms, chat, social), 2 without a retained copy (meeting, crm) | `adv-a.json#connections` | yes | yes, /sources | Said 7, merging partial into gap |
| What does the marketing review desk watch? | The desk's scope, 1 rule, 1 open finding | `agents.json#marketing-review` | yes | yes, /agents/marketing-review | same |
| What are the options for Thornbury? | $1.2M capital call; on $2.1M, 3 of 8 pass: treasury $51K after tax, MMF $48K, muni $63K, with cost and access | `hh-thornbury.json#opportunities[0]`, `shelf.json`, `policy.json#proposals.taxAssumptions` | yes: need 24 × spend less liquid plus $1.2M outflow = $2.1M; treasury 86,100 × 0.592 = $50,971 | yes, Options | The household summary (`option\b` missed "options") |
| What changed for Okafor-Lind since we last spoke? | Since 60 days ago: beneficiary turns 25; KYC refresh; the service associate's note 3 days ago | `hh-okafor-lind.json#opportunities[0..1]`, `#notes[0]` | yes | yes, /evidence | "I could not match that" (hyphen) |
| Can you send the note to Renner? | Relay never sends; the draft is on the supervision queue | none needed | yes | yes, /supervision | same |
| When did I last speak to Pell? | 150 days ago by video | `hh-pell.json#contactHistory[0]` | yes (day -150) | yes | same |
| What is Abernathy's concentration? | 38% in one name, against the 30% rule | `hh-abernathy.json#holdings`, `#constraints` | yes (38.0%) | yes | Unmatched (possessive) |
| Which clients have I not spoken to in 90 days? | Abernathy, Alcott | `#contactHistory` of each (added) | yes (days -200, -120) | yes | Right, but no citation |
| What paperwork is open for Castellanos? | IPS update escalated, wire instructions due | `hh-castellanos.json#paperwork` | yes | yes | same |
| What are Renner's goals? | Liquidity 0 of 36 months; Longevity $18M of $22M; Legacy $0 of $10M | `hh-renner.json#goals[0..2]` | yes | yes | Unmatched (possessive) |
| What did the agents prepare? | 24 waiting: 9 tasks, 5 meetings to schedule, 4 drafted notes, 2 holds... | prepared actions | yes | yes | Unmatched: a chip Ask itself offers |
| Which findings are blocking? | 12 open, 2 blocking, by desk | rules | yes | yes | same |
| Is the treasury one-pager current? | Current, published 59 days ago, review in 306 days | `documents/doc-tsy-onepager.json` | yes | yes | Unmatched |
| Who is at risk of leaving? | No attrition model; not spoken to in 90 days: Abernathy, Alcott; no complaint logged | `#contactHistory`, `#supervisory.complaintLogged` | yes, and says what it lacks | yes | Unmatched |
| Which clients have an RMD this year? | On file: Alcott (the opportunity and today's meeting both say required withdrawals start); does not compute from ages | `hh-alcott.json#opportunities[0]` | yes, as far as the file goes | yes | The book summary (wrong answer) |
| What is Renner's tax bracket? | No tax return on file; Options uses the firm's illustrative rates 37/20/6/3.8 | `policy.json#proposals.taxAssumptions` | yes | n/a | Unmatched |
| What was the after-tax income on the treasury ladder for Renner? | On $3.06M: $125K gross, $74K after tax at 40.8%, $9K cost over 3 years, access 2 days, eligible | opportunity, shelf, tax | yes ($74,272) | yes, Options | The household summary |
| What did I promise Renner? | Estate attorney intro (advisor, 5 days); trading plan review (strategist, 20 days) | `hh-renner.json#tasks` | yes | yes | The household summary |
| Any follow-ups due? | 14 tasks, 4 overdue, listed | `#tasks` per client | yes (4 of Margaret's) | yes | Unmatched |
| Which households have cash sitting idle? / Who needs cash? | Short: Renner 0/36, Thornbury 6/24, Alcott 11/36, Vasquez-Hale 8/12, Brandvold 18/24; above: Abernathy 42/36, Okafor-Lind 60/24 | `#goals` per client | yes (all seven recomputed) | yes | The book summary |
| What is Renner's risk tolerance? | The household's rules: 25% cap, 24 months cash, risk at most 4, no short-term gains, no private credit | `hh-renner.json#constraints` | yes | yes | Unmatched |
| Prep me for my 10am / my 2pm | 10am: nothing, with the day listed; 2pm: Alcott review and the review pack | calendar | yes | yes, /meetings/hh-alcott | Unmatched |
| Which prospects should I call? | 5, warmest first, with score = warmth + fit + size | `adv-a.json#prospects` | yes | yes, /pipeline | Unmatched |
| Are there service requests open? | 6 for Margaret's clients, 3 past target, Thornbury needs a callback first | `service-requests.json#...` | yes | yes | Unmatched |
| How is Ng doing? / Tell me about Vasquez-Hale | The one-paragraph picture | client file | yes | yes | Unmatched (two-letter name; hyphen) |
| What changed for Renner since we last spoke? | Since 23 days ago: property sale, concentration, the renovation note | opportunities, note | yes | yes | The last-contact line (wrong intent) |
| How is the score worked out? / Why is Renner first? | Materiality × weight, with the three top items' arithmetic, and the advisor's weights and their source | `firm.json#triage.classWeights`, `#opportunities[i].materiality` | yes (all 11 recomputed) | yes, /triage#tune | Unmatched |
| How do I change the ranking? | Tune the ranking on Today's list, the bounds, and that it never touches eligibility | `schema.json#triage.classWeights` | yes | yes | Unmatched |
| What does Alcott's muni ladder pay after tax? | On $550K: $18K gross, $17K after tax at 6%, $4K cost over 3 years | opportunity, shelf, tax | yes: 36 × $22K less $242K = $550K; 17,600 × 0.94 = $16,544 | yes | Unmatched |
| Who holds Schwab accounts? | Answers with the coverage report | connections | no: it does not answer the question | n/a | same |

### What an advisor would still expect Ask to answer, and it cannot

This is the most useful list in the report. Each item needs data Relay does not hold, or an intent that would take more than a small fix.

1. **Where each account is custodied.** "Who holds Schwab accounts?" There is no custodian on a holding.
2. **Performance and fees.** "How is Renner's portfolio doing this year?", "What did we bill the Alcotts?" No returns or fee records exist.
3. **Embedded gains.** "What is Renner's unrealized gain on the stock?" Holdings carry short-term lot value but no cost basis.
4. **Anything after today.** "When am I next seeing the Thornburys?" Only today's calendar is on file.
5. **What was said in a meeting.** "What did we discuss at the Abernathy review?" Contact history holds a one-line summary, not the notes.
6. **Across the book by holding.** "Who else holds the inherited utility?" or "Who is over their concentration rule?" There is no cross-household holding query.
7. **Required withdrawals, computed.** "How much must Alcott withdraw?" There are no account types or ages to compute from, and Ask says so.
8. **Drafting.** "Draft a note to Renner about the sale." Drafting exists on Note and audience but is not reachable from Ask.
9. **Comparisons.** "Treasury ladder or muni ladder for Alcott?" Ask lists the options but does not set two side by side.
10. **Beneficiaries and family.** "Who are Okafor-Lind's beneficiaries?" Beneficiaries sit in notes and forms, not in structured fields.

## The ten changes that would most simplify an advisor's morning

1. **Scope every workflow screen to the signed-in advisor by default**, with the firm view one click away. Today Meetings, Follow-ups, Service requests, Paperwork, Prospects and Households show all three advisors, so the Overview's numbers do not match the screens they link to. Files: `app/meetings/page.tsx`, `app/follow-ups/page.tsx`, `app/servicing/page.tsx`, `app/onboarding/page.tsx`, `app/pipeline/page.tsx`, `components/clients-view.tsx`.
2. **Compute materiality from the facts, not by hand.** Every score is materiality × weight. The weight is now the advisor's, but materiality is a hand-set number in each client file for the shipped book (`data/clients/*.json#opportunities[].materiality`). A deterministic function of the dollars at stake, the gap to the goal and the days to a deadline would make "why 92" answerable all the way down. Files: `lib/ranking/rank.ts` (a new `materiality.ts` beside it), `lib/import/map.ts`, `data/clients/*.json`.
3. **Fold "Review what the agents prepared" after the first group.** Twenty-four rows sit open on the Overview under "Decide now"; show the worst group and a count. File: `components/overview.tsx`.
4. **Show what connecting a source changed.** Connecting the UBS workstation moves CRM to captured and completeness from 36% to 45%, but the card says only "Unlocks 4 rules" and the Overview changes one sentence. Say which findings were added or cleared. Files: `components/sources-view.tsx`, `components/overview.tsx`.
5. **Let a connector cover more than one channel.** "Microsoft 365 mail and calendar" is connected while Calendar reads "Not captured", which makes the top blocking finding look wrong. Files: `lib/connectors/catalog/*.ts`, `lib/connectors/coverage.ts`.
6. **Give Ask the missing data it is asked about most:** custodian per holding, cost basis, and upcoming meetings (items 1, 3 and 4 above). Files: `data/clients/*.json`, `lib/types.ts`, `lib/ask/answer.ts`.
7. **Let Ask hand off to drafting.** "Draft a note to Renner" should open Note and audience with the accepted option loaded, not say it cannot. Files: `lib/ask/answer.ts`, `components/communications.tsx`.
8. **One agent roster, counted everywhere.** The Overview counts 15 (with Ranking), How it works computes 14, and Features says fourteen and then lists 16. Files: a new `lib/agents/roster.ts`, `components/overview.tsx`, `app/how-it-works/page.tsx`, `app/features/page.tsx`, `components/about.tsx`, `README.md`.
9. **Persist the Ranking desk per advisor.** It is a session layer today; a versioned write to the advisor's profile, with the change in the change log, makes it a real preference. Files: `components/state.tsx`, `lib/profile/index.ts`, `data/advisors/*.json#profile`.
10. **Put the e2e suite on the base path.** The 41 dead links passed CI because the browser suite runs without `/relay/`. Run the link and CTA checks against the static export as well. File: `scripts/e2e.mjs` (and `.github/workflows`).

## Fixed on this branch

One commit per fix; each message quotes the audit line it came from.

- **Links and buttons through `next/link`, so they survive the base path.** 41 links were dead on the live site. A new invariant fails on a raw internal anchor, and was seen failing against `main`.
- **Overview meetings, overdue tasks and service requests scoped to the advisor.** It showed 12 meetings, not 4, and 6 overdue tasks, not 4.
- **"Not captured" and "captured without a retained copy" stated separately,** on the Overview and in Ask.
- **Ask finds households named with a hyphen, a possessive or two letters.**
- **Ask routes plurals, "what changed since we last spoke" and "prepare",** and writes feed days and action counts as English.
- **A flagged message is named "Renner: email sent 2 days ago".**
- **Ask answers the fourteen missed questions from the records,** with citations, and says what it does not hold.
- **Ask's options answer opens with the item,** not "For Sold a property...".
- **Ranking desk on Today's list (requested in review).** Per-advisor weights and list size within the firm's bounds, a live re-rank with what moved, the arithmetic on every row, and true copy. The same tuned weights reach the Overview, Ask and Why this client.
- **Ask is findable (requested in review):** a header field from 640px, and a labelled "Ask Relay" button on a phone.
- **Button labels wrap inside the button at phone width.**
- **"Meeting, crm" sentence starts with a capital.**
- **Suggestions brief says the change, not "undefined".**
- **Rules and desks brief in sentences.**
- **Why this client opens with the rank, the score's arithmetic and why it was flagged (requested in review).**
- **Today's list and Options stack into cards below 768px (requested in review).**

Left as proposals, because each is structural: items 1 to 10 above.
