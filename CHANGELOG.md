# Changelog

Notable changes, by pull request. Decisions behind each are numbered in the build spec.

## Unreleased
- An Onboarding agent joins the roster: every morning it finds the forms still waiting for a signature, escalates past each household's threshold and drafts the reminder a person sends. Nineteen agents now, counted once.
- The day on screen comes from the browser clock: the Overview, Briefings and Meetings name today's weekday, date and time, and the header shows the date and time on every screen, refreshed each minute. The data stays on its relative clock.
- Every compliance rule carries its status in law, with dates, and links to its primary source; validate() fails on a rule without them. FINRA Rule 3290, approved September 15, 2026 to replace Rules 3270 and 3280, is shown as not yet in force.
- Desk pages show each rule as a card: the trigger in plain words, settings and bounds, what it prepares, the source it needs, status in law, source links and what it raised today. Rule conditions read in words, not field names.
- Every agent says how it decides and what it is built on; the agents that are not desks name the regulation behind them, or say they are arithmetic.
- Creating an agent previews what it would flag on the advisor's book as the setting changes, with a count on every quick pick, and lists what it found once created. Findings name the household. Template defaults now find something on the default book.
- Households: a card per household with what needs the advisor first and the one next step; search, filters and sorts.
- Sources: the firm's workstation first among CRMs, then the market leaders in each kind; search and filters replace "show every channel".
- One search, filter and sort control on Households, Sources, Agents and Supervision.
- The personas are described as cited composites without naming a firm; source links are unchanged.
- The stress run renders every page inside the advisor view again, and checks the empty state by signing in as an advisor with no households.

## #15: One design system, one name per page, and the advisor persona on every page
- One type scale and radius scale as tokens, used by every screen and the mockup; one control set for buttons, fields and chips.
- Each page carries one name, the same in the navigation, the heading and the browser tab.
- The header labels the advisor as an advisor, and a persona line says who they are and which of their households are in the prototype.

## #14: One source of data per advisor; agents explained, editable and creatable
- One computed view of the signed-in advisor's book feeds the header, every page and Ask.
- Every agent explained on one card; desks, custom agents and the rest of the roster can be edited, switched off or deleted, and new agents created from templates; loosening a desk waits for a principal.

## #13: Audit: an advisor's morning, walked and fixed
- The audit report of an advisor's morning in nine steps, with Ask tested against the records.
- Why this client shows the rank and the score arithmetic; ranking tuned per advisor; Ask answers many more real questions; every link works under the Pages base path; the layout holds from phone to desktop.

## #12: Agent-first workflow
- Every workflow screen opens with the agent speaking first: a Brief with the figures in the sentence, what matters, one next step, and a trace.
- The overview as a morning inbox: decide now, review what the agents prepared by household, what else ran. A prepared action opens in a panel with the draft, the reasoning and where it goes, and a decision stays on screen as a recorded outcome; declining asks for a reason.
- A page per review desk: rules, findings, sources, a tune panel, and a policy reader that turns a written procedure into candidate rules cited to their sentences, which a person adds to the desk through the change log.
- Sources: one page for the book, the tools and channels, and documents and policies; 13 new read-only connectors (CRM, custodian, portfolio, planning) with what each unlocks; a connected custodian or CRM stands in for the generic source a rule names.
- Options: after-tax income, cost over the horizon, access, rate risk and the morning after on every row; the economics and consequences of the selected option.
- Ask, on every screen: a plain question answered from the book, the findings, the rules and the sources, each answer cited.
- Navigation in six areas in the order of the advisor's day; an icon on every page; advisors carry invented full names; the header reads for an advisor.
- About pages share a sub-navigation and a three-point summary each.

## #11: About pages and root documents
- How it works, Features, Impact and Architecture pages; root ARCHITECTURE, CONTRIBUTING, SECURITY and CHANGELOG documents.

## #10: Perspective colours and an agent bar on every workflow screen
- Three colours say whose line a row is, agent, advisor or client, always with the word.
- Meetings, service requests, prospects, paperwork, follow-ups and communications open with the agent that fed them, what it read, what it left, and a trace of how.

## #9: Agent-first surfaces
- The overview as the system's own report with a reasoning trace under every prepared action; navigation grouped around the agents.
- Before you act: every option for a proposal run through every engine on a copy of the household.
- Households: connect the advisor's own list inline; a dossier per household from five sources including a public record.
- Eight compliance review desks mirroring a legal, risk and compliance function, resolved per advisor under the tighten-only invariant.

## #8: Evaluation corpus
- The 300-household sample scored by an expected side that imports nothing from the engines; a golden file enforced in the check suite.

## #7: Connect data and the discovery agent
- Drop a .csv, .xlsx, .json, .md or .txt in the browser; every agent runs over it live with real timings.
- Discovery reads what clients said and proposes, cited to the sentence.

## #6: The agent layer
- Retrieval with a reason per score and a refusal that names what is missing; research briefings; prepared actions on every finding; an agents surface; one file per record.

## #5: Icons, an agent-first rebuild, the public repository
- A drawn icon set on one grid; screens organised around what the agents did; the repository split into public and private.

## #4: Connectors and a configurable compliance layer
- Read-only connectors with a coverage model; rules as data with a tighten-only layered policy and an append-only change log; five agents.

## #3: Published on GitHub Pages
- Static export with a content security policy in the page.

## #2: Audit and stress test
- 51 findings, every major fixed; the browser suite and the stress run.

## #1: The prototype
- The whole advisor journey on synthetic data, personalization with a learning loop, one design system.
