# CLAUDE.md

This repository's contributor and agent guidance lives in [AGENTS.md](AGENTS.md).
Read it for setup, testing, conventions, project structure, and PR rules.

## Notes for Claude Code

Run checks sequentially (`npm run check`), never concurrently.

**Never add an outbound send path.** Relay drafts client communications and a human sends them. The
human-gated-outward invariant is enforced by dependency-cruiser (`npm run invariant:imports`) and by
`tests/invariants/`. A failure in either is never fixed by relaxing the rule.

**Read `docs/BUILD-SPEC.md` before writing any screen.** It is the only place layout, fixtures,
constraint rules and the demo click path are specified. The PRD says what the product is for; the
build spec says what to build. Inventing detail that belongs in the spec is the failure mode four
audits of this work kept catching.

**Facts about UBS are load-bearing and provenanced.** Every figure lives in `docs/PRD-relay.md`
Appendix D with its source, date and confidence. Three are marked load-bearing and unconfirmed. Do
not add, round or restate a UBS figure without updating that table.

**This repository is private and stays private.** It carries analysis of a named company written for
an interview. Never publish it, never deploy it to a public URL, never add a hosting target. See
`docs/DECISIONS.md` D-57.

**House style:** no em-dashes anywhere, in prose or code comments. Colons, commas, semicolons. All
client data is synthetic; illustrative documents carry relative, non-calendar dates and no investment
view is ever attributed to a real firm's Chief Investment Office.
