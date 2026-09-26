# Relay decisions

Append-only. Check before relitigating anything.

Entries **D-49 to D-70** were recorded in the job-search OS repository that this work began in, and are
restated here in summary because they still bind. The numbering is kept so cross-references in
`PRD-relay.md`, `00-BRIEF.md` and `AUDIT-FINDINGS-2026-09-26.md` continue to resolve. **New Relay
decisions start at R-01** to avoid colliding with that sequence.

## Carried over, still binding

| # | Decision |
|---|---|
| **D-49** | Relay targets the step after the opportunity, not the opportunity itself. The insight engine is the hiring manager's product |
| **D-50** | Product name is Relay |
| **D-51** | Nine advisor-journey surfaces. Six built functional, three designed and visibly labelled as not built |
| **D-52** | Document search and chat are included, positioned as the evidence layer under the action, never as standalone features |
| **D-53** | The securities engine is bounded, never free-generating. Approved shelf only, IPS constraints enforced, rejected candidates shown with the failing constraint named |
| **D-54** | Do not clone any real firm's branding. Institutional-neutral treatment, accent exposed as a single swappable CSS token |
| **D-55** | Roadmap phases are sequenced by supervisory surface, not by engineering difficulty |
| **D-56** | Figures about the target firm are public reporting, cited, dated, and presented as correctable |
| **D-57** | **Never published at a public, indexed URL.** Local and screenshare only; a gated repository or zip on request. Any interview artifact about a named company is a sent artifact, never a published one |
| **D-58** | The thesis is derived from figures the company itself published, never from an asserted weakness in the interviewer's own product |
| **D-59** | Model what the interviewer's product actually does from public sources, at the level of the data model and not only the strategy |
| **D-60** | Regulatory claims are cited to rule and paragraph, dated, and checked for amendments before they are said out loud. The recipient-count threshold is a product design constraint, not a compliance footnote |
| **D-61** | A PRD written as an interview artifact carries a team and operating-model section whenever the JD asks for people leadership |
| **D-63** | A number that is the argument gets its arithmetic checked with a calculator, and stated in units that need the fewest assumptions |
| **D-64** | When a company publishes two figures for the same thing that disagree, print both as a range and name the conflict |
| **D-65** | Every regulatory citation carries its adoption status. A proposed rule is never stated as a current one |
| **D-67** | No em-dashes anywhere, in prose or code comments, except where the character is the machinery that enforces the rule or a literal string recording external text |
| **D-70** | Source-file separators are not what reaches a reader. Check the rendered output, not the source, before claiming a formatting risk |

## Relay decisions

| # | Decision | Notes |
|---|---|---|
| **R-01** | **Relay lives in its own private repository, separate from the job-search OS** | The job-search OS tracks the application: `jd.md`, `fit.md`, `outcome.md`, the sent kit. Relay is a product with a stack, tests and architecture invariants, and mixing the two made neither legible. The canonical documents **moved** here rather than being copied, because a second copy of a canonical file is the failure mode that matters: a later run reads the stale one confidently. The job-search OS keeps a pointer |
| **R-02** | **The stack mirrors `roleos-app`: Next.js, TypeScript strict, Tailwind, Vitest, dependency-cruiser, one `npm run check`** | Nik's own product already enforces "drafts, never sends" with dependency-cruiser plus a named invariant test wired into CI. Relay's PRD §5.3 asserts exactly that invariant. Mirroring the pattern makes the claim **runnable in the interview** instead of described, and makes the two repositories read as the work of one engineer. Demo beat 8 is a terminal running `npm run check` |
| **R-03** | **No database, no network, no runtime model calls** | Fixtures are the entire data layer and generated text is pre-computed beside the fixture that produced it. A prototype that cannot fail to connect to anything cannot fail during a screenshare, and a deterministic demo is the same every rehearsal. It also keeps the whole thing inspectable by a reviewer in one pass |
| **R-04** | **Deterministic modules may not import a model client, enforced by dependency-cruiser** | `lib/constraints`, `lib/ranking` and `lib/recipients` are plain TypeScript. PRD §5.3: the model composes language, it does not decide eligibility. This is what makes the system reviewable by a supervisor, so it is a structural rule rather than a convention |
| **R-05** | **Build the constraint engine and the recipient counter, with tests, before any screen** | Build order in BUILD-SPEC §10 puts them at step 2. A pretty screen over an engine that breaches an IPS is worse than no screen for this audience, and the 24/25/26 regime boundary is visible on screen during the demo's best minute, so an off-by-one there is not a silent bug |
| **R-06** | **Seven households, not six, and the seventh is a Wealth Advice Center case** | The audit found the $500K to $5M band is a regional-center tier while the Wealth Advice Center is a separate division serving smaller accounts. A seventh household at $180K makes the calibrated-supervision argument honest. Surnames are invented, varied in origin, and match no real executive |
| **R-07** | **The PRD stays at nine sections. Team and operating model is talk track, not a PRD chapter** | Nik's call: he will cover people leadership in conversation. The material was drafted as §10 after an audit found the JD asks for it twice and `fit.md` records it as the one partial gap, then pulled to `00-BRIEF.md` §12 so it is not lost. Defensible on its own terms too: a product audience does not expect a team chapter inside a PRD, and the nine sections now map one-to-one onto the JD clauses in Appendix 0. **The gap this leaves is deliberate and known:** no artifact carries people leadership, so the conversation has to |
| **R-08** | **Architecture is its own document with diagrams, and the diagrams are generated rather than drawn** | A PRD that also carries system design serves neither reader. `ARCHITECTURE.md` holds five diagrams as Mermaid: system context, the determinism boundary, the critical path, regime resolution as a state machine, and the data model. **Mermaid rather than a drawing tool** so the source is diffable, reviewable and cannot drift from the prose around it; GitHub renders it inline. Rendered SVGs in `docs/diagrams/` for full-screen display, generated from those same sources with `mmdc`, so regenerating is one command rather than a redraw. **All five were rendered and verified before commit**, because a broken Mermaid fence renders as an error block, which is a bad thing to discover on a screenshare |
