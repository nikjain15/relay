# Relay: personalization and the learning loop

**Version:** v1.0, 2026-09-26. Decision R-19. Built in the prototype; the production mapping in §7 is design.

**In one line:** every screen asks one resolver what applies to this advisor and this client, and a
learning loop proposes changes to those settings from observed behavior. People accept each change.
Nothing personalized can change what is allowed.

---

## 1. Three kinds of data, kept apart

| Kind | Examples | System of record | Personalized? |
|---|---|---|---|
| **Facts** | Holdings, goals, people, the client's investment rules, history | CRM and custody (prototype: `data/clients/`) | Never. Read only |
| **Rules** | Escalation deadline for unsigned forms, "speak to the client before any written note", FINRA 25-in-30-days, disclosure, callback before money moves | Firm and compliance (`policy.json`, `profiles/firm.json`, code for regulation) | Only tighter, never looser |
| **Preferences** | List size, signal weights, order of options, review-pack order, note length, channel, best time | Firm, then segment, then advisor, then client (`data/profiles/`, client `preferences`) | Yes: this is the personalization layer |

The most common design error is to mix these. A client's "no alternatives" rule is a fact and a
constraint, not a preference an advisor can switch off.

## 2. Four layers, two resolution directions

```
firm defaults ─▶ segment ─▶ advisor ─▶ client
profiles/        profiles/     profiles/advisors/   preferences block in
firm.json        segments.json <id>.json            clients/<id>.json
                                 + accepted           + accepted
                                   suggestions          suggestions
```

- **Preferences: the most specific layer wins.** The client's channel beats the segment's.
- **Rules: the strictest layer wins.** The Wealth Advice Center segment shortens escalation from 14 to 7
  days; a client may shorten it further; nobody can lengthen it. A looser value is ignored and reported.
- **Who may set what** is data: `data/profiles/schema.json` lists, per setting, its kind, type, bounds
  and allowed layers. `validate()` enforces it inside `npm run check`, so a bad edit fails the build
  instead of taking effect, and `resolveProfile()` checks every value again as it resolves, so an
  out-of-bounds or malformed value from any layer or overlay is ignored and reported (R-21).
- **A rule is enforced where it bites.** "Speak to the client before any written note" adds a failing
  `call-first` check to the draft until the advisor confirms the call, so supervision cannot approve it
  (R-21; before that it was displayed only). The escalation deadline drives the paperwork status.

## 3. One read path

```ts
resolveProfile({ advisorId, clientId }, overlay?) -> {
  values,       // the effective settings
  provenance,   // who set each: "firm", "segment:wealth-advice-center", "client:hh-alcott (learned)"
  ignored,      // values dropped because they would loosen a rule or the layer may not set them
  version,      // "firm@1 segment:private-wealth@1 advisor:adv-a@1+learned client:hh-renner@1"
}
```

- Screens call `resolveProfile()`; **engines receive values as arguments** (`rank(opps, dismissed, cap,
  weights)`, `compose(..., { length })`, `paperStatus(w, today, after)`). No engine reads a profile file,
  so engines stay pure and testable, and the store behind the resolver can change without touching them.
- **Provenance is shown on screen** ("list of 12, Wealth Advice Center segment") so an advisor or a
  supervisor can see why the system behaves as it does.
- **The version is written on every rationale record** (`RationaleRecord.settingsVersion`) and on the
  supervision queue item, so any recommendation can be reproduced with the exact settings in force. In the
  prototype these records last for the session; the retained record is the production mapping (§7).

## 4. Where personalization applies, and where it never does

| Surface | Personalized | Never personalized |
|---|---|---|
| Today's list | Size, signal weights | Whether an item is flagged; dismissals need a reason |
| Options | Order: lowest risk, lowest cost or fastest access first | Which options pass the client's constraints |
| Review pack | Section order | The facts in it |
| Client note | Length (brief keeps figures, citation and disclosure), channel, best time | Disclosure, citations, the policy checks |
| Paperwork | Escalation deadline, tighter only | Escalation itself |
| Counter, callback, shelf | Nothing | Everything |

**Enforced, and seen failing:** dependency-cruiser rule `personalization-cannot-widen` forbids
`lib/constraints`, `lib/policy`, `lib/recipients` and `lib/evidence` from importing `lib/profile`,
`lib/learning`, `data/profiles/` or `data/events.json`, directly or by any path (`-transitive`, R-21: the
direct rule alone let a planted import in `lib/household-math` through). Planted imports, direct and one or
two hops away, fail it.
`tests/invariants/personalization-cannot-widen.test.ts` also shows every brief draft still passes every
policy check, and extreme weights never re-add a dismissed item or exceed the cap.

## 5. The learning loop

```
 capture ─▶ learn ─▶ propose ─▶ advisor decides ─▶ apply ─▶ measure ─▶ keep or undo
   │          │         │            │               │          │
 events.json  learners  suggestion   Accept /        new        outcome named
 (behavior)   (rules    + evidence   Not now         settings   on the suggestion,
              of thumb, + measure    (decline =      version    checked after
              no model)              cooling-off)               14 days
```

**Capture.** Relay records what people do, not what they say: triage decisions with the reason, how
much of the list was worked, which option was chosen, whether a draft was shortened before sending,
which review-pack section was opened first, and which channel the client answered on. Prototype:
`data/events.json`, synthetic, relative days.

**Learn.** Six deterministic learners, thresholds in `data/profiles/learning.json` (the 30 days ending
today, events dated later ignored; at least 5 events for every learner; 70% agreement):

| Signal | Proposes | Scope |
|---|---|---|
| A kind of item dismissed at least 70% of the time | Lower that signal's weight by 0.1, within bounds | Advisor |
| List never worked past N | List size N plus 1 | Advisor |
| Lowest-cost option chosen at least 70% of the time | Order options by cost | Advisor |
| Same review-pack section opened first | Put it first | Advisor |
| Drafts shortened before sending | Brief notes | Client |
| Client answers on one channel | That channel | Client |

**Propose.** Each suggestion carries the evidence (events, share, window), a plain sentence ("You
chose the lowest-cost eligible option 6 of 7 times"), and the outcome that will show whether it helped.

**Decide.** The advisor accepts or declines. A declined suggestion is held back for 14 days from the
most recent decline, then asked again only if the pattern persists. This is the same principle as the product: Relay drafts, a person
decides.

**Apply.** An accepted suggestion becomes a value at the advisor or client layer, tagged "learned",
with a new version. Undo removes it. In the prototype it lives in session state; in production it is a
versioned write to the settings service.

**Measure.** Each suggestion names its success measure (dismiss share falls; share of the list worked
rises; drafts sent without edits rise; client response rate rises). **Built:** the measure is named on each suggestion and Undo is one click. **Design, not built:** after
the check period, a change whose measure did not improve is proposed for undo through the same
accept-or-decline step.

**Guardrails, enforced in code and tests:**
- The loop proposes **preferences only**. `guard()` throws on a rule, an out-of-bounds value or a layer
  not allowed to set the key; `suggest()` drops such a suggestion and reports it ("Stopped by the guard"),
  so a malformed event can never apply a change or take a page down. Tests plant each case.
- **No model** in `lib/learning` or `lib/profile` (dependency-cruiser `deterministic-no-model`).
- **Minimum evidence and a window**: too few events or events older than the window propose nothing.
- **One step at a time**: weights move by 0.1, within schema bounds, so the loop cannot run away.
- **Per-advisor switch**: `learning: false` in an advisor profile turns the loop off for that advisor.
- **Fairness check** (production): learned weights are reviewed by segment, so a pattern learned from
  one book never quietly deprioritizes a whole client group.

## 6. Why this scales

- **Lookups, not computation.** Resolution is at most four lookups per setting. A Wealth Advice Center
  advisor has about 1,000 households; resolving all of them is trivial, and profiles can be precomputed
  with the nightly triage run and cached per session.
- **One file or row per scope.** Adding an advisor is one profile file; adding a client preference is one
  field in that client's file. No code change, and `npm run check` validates it.
- **Learners are independent.** A new learner is one function that emits suggestions through `guard()`.
  It cannot bypass bounds, layers or the rule/preference split.
- **Swappable store.** Everything reads through `resolveProfile()` and `getClientFile()`. Replacing JSON
  with a service changes one module.

## 7. Production mapping (design, not built)

| Prototype | Production |
|---|---|
| `data/profiles/*.json`, client `preferences` | Settings service: a versioned table keyed by (scope, scope id, setting), with effective date, author and approver |
| `data/events.json` | Event stream from the advisor workstation and client channels, retained under the firm's records policy |
| Session overlay for accepted suggestions | Versioned write to the settings service; the rationale record keeps the version |
| `suggest()` on page load | Scheduled job alongside the nightly triage run; suggestions queued per advisor |
| Firm and segment edits in JSON | Change request approved by the business owner; rule changes also by compliance |
| `data/clients/` | CRM and custody, read only through an adapter behind `getClientFile()` |

## 8. What is deliberately not personalized or learned

Client constraints and the investment policy statement; the approved product shelf; eligibility; the
policy checks on a draft; citations and the disclosure; the FINRA recipient count and its threshold;
callback verification before money moves; the supervision queue. These are either facts or rules, and
the architecture keeps them out of reach of both the settings layers and the loop.
