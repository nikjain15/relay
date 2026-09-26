# Re-audit prompt

Paste the block below into a **fresh session**. It is written so the auditor finds sources and runs
commands itself rather than trusting anything the producing sessions wrote, including the previous audit
records. Update the artifact list and the confirmed-defect list whenever this repo changes.

---

```
You are auditing and then FIXING work done in previous sessions. Be adversarial. Your job is to find
what is wrong, not to confirm what is right. Assume the previous sessions were confident and wrong.

Two audit passes already ran on this work. The second pass found four errors the first pass had
CREATED, including an arithmetic error of roughly 190x in the document's headline claim. So:
DO NOT TRUST `docs/AUDIT-FINDINGS-2026-09-26.md`. It is a record of what previous sessions believed,
not evidence. Re-verify from primary sources and by running commands.

## CONTEXT

Nik Jain has an interview with the hiring manager for UBS, Product Manager, Digital Solutions & AI
(Wealth Management), New York, on-site. Team: STAAT Field Solutions, within Data, Analytics &
Foundational Platforms. The hiring manager leads STAAT AI Product and previously built the STAAT
Insights knowledge-representation graph, and before that automated alerting at UBS Evidence Lab.

The work is an interview artifact: a product called Relay, an advisor advice-to-action layer. A PRD,
an architecture document and a build spec exist. The prototype is NOT built.

## WHERE THE WORK IS

Two repositories.

1. `nikjain15/relay` (private). Holds all Relay documents and the repo scaffold.
   docs/PRD-relay.md              v1.0, nine sections plus five appendices
   docs/ARCHITECTURE.md           v1.0, five Mermaid diagrams
   docs/BUILD-SPEC.md             v1.0, the implementation spec
   docs/00-BRIEF.md               reasoning, demo running order, talk track
   docs/AUDIT-FINDINGS-2026-09-26.md   both previous passes. TREAT AS UNVERIFIED
   docs/DECISIONS.md              D-49 to D-70 carried over, R-01 to R-08 local
   docs/diagrams/*.svg            five rendered diagrams
   AGENTS.md, CLAUDE.md, README.md, package.json, tsconfig.json,
   .dependency-cruiser.cjs, tests/invariants/no-outbound-path.test.ts

   IF THIS REPO IS NOT IN YOUR SESSION: it may not have been pushed. A previous session could not
   push it because the session's authorised repository set is fixed at session start. Check whether
   the remote exists and is current. If it is missing, ask Nik for the repo or for the git bundle he
   was sent, and say so plainly rather than auditing from this prompt's description.

2. `nikjain15/nik-jain-jobos` (private), branch `claude/audit-prompt-execution-i2s5ce`, draft PR #2.
   Holds the application state and the house rules. Read `CLAUDE.md` at its root FIRST and follow it
   throughout, including the close-out block and the no-em-dash rule.
   roles/ubs-pm-digital-solutions-ai-wm/  jd.md, fit.md, outcome.md, kit/, relay/README.md (a pointer)
   DECISIONS.md    D-49 to D-73, append-only
   roles/STATE.md  six close-out entries for 2026-09-26
   playbook/signals-log.md  S-038 to S-042

3. `nikjain15/roleos-app` (public) is Nik's own product. Previous work claims it already enforces the
   same human-gated-outward invariant Relay's PRD asserts. Verify that claim by reading the code.

## GROUND RULES

1. State up front which domains your container can and cannot reach, and which commands you could and
   could not run. Never present a web-search summary as a first-hand read of a primary source.
2. Recompute every number with a calculator. Do not eyeball a ratio or accept one.
3. For every regulatory citation, establish rule, paragraph, and ADOPTION STATUS. A proposed rule
   stated as current is a serious error.
4. Run commands rather than reasoning about them. `npm run check`, the pipeline generator, the gate
   checker, the Mermaid renderer. A claim that something is enforced is false until you have seen it
   run and fail on a deliberate violation.
5. Reach your own verdict on every item. Where this prompt describes a concern, that description is
   not evidence and may itself be wrong.
6. Do not edit `~/Nik Job/AI PM Resume/`, and do not read from it. It holds pre-correction facts.

## TRAPS. Previous sessions hit these. Read before changing anything.

- `OS.md`'s pipeline table is GENERATED from `roles/*/outcome.md` between PIPELINE markers. Never
  hand-edit it. Fix the source and run `node resume/scripts/pipeline.mjs --write`. `--check` fails if
  it is stale.
- `resume/scripts/pipeline.mjs` derives the company name by splitting each role title on a delimiter.
  Changing title punctuation without changing the script breaks the staleness report.
- Em-dashes appear in seven files AS THE MACHINERY THAT ENFORCES the no-em-dash rule:
  `check-kit.mjs` detector regex and entity normaliser, `presence.ts`, `audit_voice.py`, `report.py`,
  `guard_2026_08_14.py`, `fitmap.py`, `screen.py` salary parser. Removing those disables the rule.
  Verify they are intact and still working.
- `check-kit.mjs` carries an exemption for one resume heading separator. A previous session removed the
  string it exempted, making the exemption inert. Confirm that, and confirm nothing else slipped
  through as a result.
- Legal titles are fixed by `CLAUDE.md` rule 3 and must match exactly. Verify them character by
  character in `resume/master.md`.

## ONE CONFIRMED DEFECT. Verify it, then fix it.

`nikjain15/relay`'s `package.json` declares NO dependencies and NO devDependencies, and the repo has no
`next.config.ts`, `vitest.config.ts`, `eslint.config.mjs`, `tailwind` config, or `app/` entry point.
Therefore `npm run check` cannot run: `depcruise: not found`, and typecheck, lint and test fail the same
way. Consequences to confirm and repair:
  a. `AGENTS.md`, `CLAUDE.md` and `README.md` all instruct the reader to run `npm run check`.
  b. `docs/BUILD-SPEC.md` §8 makes running `npm run check` live in the interview demo beat 8.
  c. `docs/ARCHITECTURE.md` and the PRD claim the human gate is "enforced in code and in test", and
     `docs/DECISIONS.md` R-02 and D-72 claim the invariant is runnable rather than described.
Currently none of that executes. Pin the dependencies, add the missing configs and a minimal app entry,
then PROVE it: run `npm run check` and show it passing, and separately show `invariant:imports` FAILING
when you add a deliberate forbidden import, then passing again once removed. A guard that has never
been seen to fail is not a guard.

## AUDIT AREAS

A. FACTS. Every UBS figure in PRD Appendix D. Verdict per row: CONFIRMED / WRONG / UNVERIFIABLE /
   STALE, with source URL and source date. Three are flagged load-bearing and never read first-hand:
   the opportunity volume, the meeting-preparation hours saved, and the signal taxonomy that the whole
   §5.1 data model and BUILD-SPEC §4 depend on. Establish each independently. Also check whether any
   figure has moved since 2026-09-26, since headcount and attrition are reported quarterly.

B. ARITHMETIC. Recompute every derived number and check its UNITS. The headline is a division of two
   published figures presented as a range. Verify the division, verify the claim that it is
   independent of advisor headcount and team size, and verify that the range's two endpoints follow
   from the two source figures. One previous version of this claim was wrong by about 190x.

C. REGULATORY. Every citation in PRD §7 and ARCHITECTURE.md §4. In particular: the recipient-count
   threshold that the entire product control rests on; whether that threshold is current; the
   adoption status of both 2026 FINRA Rule 2210 workstreams; the Reg BI obligations and their exact
   wording; the SEC 17a-4(f) condition; model risk guidance and whether generative AI is in or out of
   its scope; and the dual-registrant framing of the marketing rule. Name anything a wealth-management
   compliance officer would expect and cannot find.

D. INTERNAL AND CROSS-DOCUMENT CONSISTENCY. The PRD, ARCHITECTURE.md, BUILD-SPEC.md, 00-BRIEF.md and
   README all restate the same figures, the same surface list and the same trigger taxonomy. Find every
   place they disagree. Check that the five diagrams match the prose they sit in, that every FR in the
   traceability appendix exists in §5.2, that every surface in BUILD-SPEC §1 matches PRD §4.1, and that
   cross-references resolve. The PRD and the architecture document were written by the same session and
   may have drifted from each other.

E. DIAGRAMS. Render every Mermaid block and confirm it parses. Confirm each rendered SVG in
   `docs/diagrams/` matches its current source rather than an older one. Then judge them as an engineer:
   does each show a mechanism, are arrows labelled, does the system-context diagram genuinely contain no
   path from the product to a client, and is the state machine's transition logic correct at the
   boundary.

F. BUILDABILITY. Could a competent engineer build from BUILD-SPEC.md without inventing decisions? Find
   every place it defers, contradicts the PRD, or leaves a screen underspecified. Check the build order
   is genuinely dependency-ordered. Check the seven households, the trigger classes and the constraint
   rules are specified concretely enough to write as data.

G. HOUSE RULES, per `nik-jain-jobos/CLAUDE.md`. Em-dash count per file across BOTH repos, excluding the
   enforcement machinery. No employer content anywhere. No unsourced number. Published-versus-sent
   applied to every artifact. Synthetic data never presented as real, no investment view attributed to a
   real firm's CIO, illustrative documents carrying relative dates. Close-out completeness for every
   session entry. Decision numbering against a fresh read, with no collisions across D- and R- sequences.

H. STRATEGY AND JUDGEMENT. Independently of the above. Is the thesis still the strongest available
   argument? Does anything read as generic, overclaimed, or likely to invite a correction in the room?
   What would this specific hiring manager, who built the upstream engine, push back on hardest? What
   would a wealth-management compliance officer notice is missing? Name the three weakest points in the
   body of work and what would strengthen each. Note that people leadership is deliberately absent from
   the PRD by Nik's decision (R-07) and lives in 00-BRIEF.md §12 as talk track; do not re-add it, but do
   say if its absence creates a problem.

## OUTPUT AND FIX

1. Report first: every finding, ordered by how badly it would damage Nik in the interview if said out
   loud. Include a verification table with claim, verdict, source URL, source date.
2. Then FIX everything you found, in both repos, smallest defensible change per finding.
3. Prove the fixes: show `npm run check` passing, the invariant failing on a deliberate violation,
   `pipeline.mjs --check` current, the gate checker clean, and every Mermaid block rendering.
4. Do the full close-out per `CLAUDE.md` §4: append to the relevant STATE.md, update OS.md through its
   generator, log any signal to `playbook/signals-log.md` BEFORE acting on it, number new decisions
   against a fresh read, and state in chat what was written where.
5. Commit and push both repos. Open or update a draft PR.
6. End with one paragraph: if Nik could change only ONE thing before the interview, what is it.

Do not report a fix as done until you have run the command that proves it.
```
