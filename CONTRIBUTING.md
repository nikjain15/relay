# Contributing

Relay is a source-available prototype (see `LICENSE`). Contributions are welcome as issues and pull
requests against `main`. The working rules below are the ones the codebase is held to.

## Before you start

- Read [`AGENTS.md`](AGENTS.md): the invariants, the data rules and the checks. It is short and it is
  binding.
- Read [`ARCHITECTURE.md`](ARCHITECTURE.md) for the shape of the thing.

## Working rules

1. **One branch per change.** Open a draft pull request from the template in `.github/`.
2. **Run the checks sequentially, never in parallel:** `npm run check`, then `npx next build && npm run e2e`,
   then `npm run stress`. Paste the tail of each into the pull request.
3. **Everything a person might change is data.** Add a client, an advisor, a document, a rule or a desk as
   a file under `data/`, then run `npm run data:build`. Do not put a record, an id or a threshold in code.
4. **A guard counts as enforced only after it has been seen failing.** If you add a rule to
   `.dependency-cruiser.cjs` or a test under `tests/invariants/`, plant a violation, watch it fail, then
   remove the violation and say so in the pull request.
5. **Read the output before you trust the test.** Screenshot every screen you touch at desktop and phone
   width and look at it. Recompute any headline figure from the data files by hand.
6. **No outbound path, ever.** Do not add an email, SMS, HTTP-send or socket transport, a `fetch` to another
   host, or a send verb. Do not add a model client. If a step needs a model in production, build the
   deterministic version and say on the screen which step a model would own.
7. **Design tokens only.** No hex colour or palette class under `app/` or `components/`; `app/tokens.css` is
   the single source and the walkthrough mockup carries the same block.
8. **Synthetic data only.** No real client, no real employer content, no firm's brand mark. Illustrative
   documents carry relative dates.
9. **No em-dashes** in any document or UI string.
10. **Commits and pull requests carry no tooling attribution.** Author them as yourself.

## Pull request template

`.github/PULL_REQUEST_TEMPLATE.md` asks for a summary, the changes, which invariants the change touches
and which guard was seen failing, data changes, screenshots, and the tail of each check. Fill it in.
