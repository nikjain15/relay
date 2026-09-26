# CLAUDE.md

This repository's contributor and agent guidance lives in [AGENTS.md](AGENTS.md).

## Notes for Claude Code

Run checks sequentially (`npm run check`), never concurrently. Never add an outbound send path; the
human-gated-outward invariant is enforced by dependency-cruiser (`npm run invariant:imports`) and by
`tests/invariants`. A guard is cited as enforced only after it has been seen failing on a deliberate
violation.
