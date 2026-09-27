# Changelog

Notable changes, by pull request. Decisions behind each are numbered in the build spec.

## Unreleased
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
