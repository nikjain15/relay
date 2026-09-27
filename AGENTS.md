# AGENTS.md

## Project

Relay, an advisor advice-to-action layer. A working prototype on synthetic data only. Next.js
15, React 19, TypeScript strict, Tailwind 3, Vitest, dependency-cruiser. Mirrors `nikjain15/roleos-app`.

This file is the contributor and agent guidance for the repository. Any coding assistant working here
reads it first; there is no other instruction file.

## Setup and checks

- `npm install`, then `npm run check` before every push. It runs typecheck, lint, `invariant:imports`,
  `data:check` and tests **sequentially**; never run them concurrently.
- After editing anything under `data/`, run `npm run data:build`. It rebuilds `data/generated/bundle.json`
  (every record file, discovered by folder) and the walkthrough; `data:check` fails when either is stale.
- A guard is cited as enforced only after it has been seen failing on a deliberate violation.
- Dependencies are pinned exactly. Change a version deliberately, not with a caret.

## Rules

- **Never add an outbound send path.** No email, SMS, HTTP-send or socket transport in `app/` or `lib/`,
  no `fetch` to an external host, no send verb in `lib/actions.ts`. The guard is
  `.dependency-cruiser.cjs` plus `tests/invariants/`.
- **Deterministic modules stay deterministic.** `lib/constraints`, `lib/ranking` and `lib/recipients`
  never import a model client. The model composes language; it never decides eligibility, rank or regime.
- **Synthetic data only.** No real client, no real employer content, no investment view attributed to a
  real firm's CIO. Illustrative documents carry relative, non-calendar dates.
- **No em-dashes** in any document or UI string.
- **Design tokens only.** No hex colour or palette class in `app/` or `components/`; `app/tokens.css` is the
  single source. No firm's logo, wordmark or brand mark anywhere.
- **Commits and pull requests carry no tooling attribution.** Author them as the person merging them.
- Regulatory citations carry rule, paragraph and adoption status. A proposed rule is never stated as
  current.
- Product decisions are recorded in an append-only log kept outside this repository, numbered against a fresh read. A decision that lives only in a conversation is not a decision.

## PRs

Branch per change, draft PR from `.github/PULL_REQUEST_TEMPLATE.md`, `npm run check` and `npm run e2e`
output in the description. CI runs both on every pull request; the Pages deploy runs on `main` only.
