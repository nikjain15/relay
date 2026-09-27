# Relay: document retrieval and the client research agent

**Version:** v1.1, 2026-09-27 (v1.1 adds the discovery agent, §2.4, and connecting data from files, §6; v1.0 the same day). Built in the prototype; the production mapping in §7 is design.

**In one line:** retrieval ranks passages against the record with a reason for every score, excludes what is
superseded, marks what is stale, shows two current documents that disagree as disagreeing, and refuses by naming
what is missing; the research agent assembles a briefing per household in which every claim cites a field,
observed is kept apart from inferred with a confidence on each inference, and what could not be established is
the last section and the reason the screen exists.

**The claims worth testing, and where to look:**

| Claim | Where it is true, not just stated |
|---|---|
| Every relevance score is the sum of its visible reasons | `lib/evidence/search.ts`; `tests/unit/retrieval.test.ts` adds the reasons back up for every opportunity |
| A missing citation is never rescued by a passage that merely matches the words | `lib/evidence/retrieve.ts`; the test plants a relevant, uncited passage and expects a refusal that names it |
| A superseded document is never evidence and always named | `lib/evidence/corpus.ts` `usable`; `excluded` on the result |
| Two current documents that disagree are shown, never merged | `conflictsAmong()`; the seeded corpus carries one real disagreement |
| Every briefing claim cites a record that exists in `data/` | `tests/unit/research.test.ts` resolves every citation to a value by reading the JSON, not the engine |
| No inference wears an observation's confidence | every inference carries a floor from `RESEARCH_CONFIDENCE` and the question that would confirm it |

---

## 1. Retrieval

### 1.1 The corpus is data with a state

A document carries its desk, its publication day on the corpus clock (`policy.json` `retrieval.corpusDay` is
today; every date is relative and none is a calendar date), how often its desk re-reviews it, its status
(`current`, `superseded`, `withdrawn`) and both ends of any supersession chain. Passages are objects with an id,
so a citation resolves to a passage and not just a title, and a passage may carry a structured claim
(`{ topic, value }`) so that two documents asserting different things on one topic can be found by code.

`docState()` turns that into age, days to review, a freshness (`current`, `review_due`, `stale`) and whether
the document may be evidence at all. `validate()` fails the build on a one-sided supersession chain, a
publication day after the corpus day, or a passage without an id.

### 1.2 Relevance with a reason

The query is the opportunity as the record states it: title, plain title, strategy, action and every reason-path
label, and nothing else. Terms are stemmed lightly (`sales` meets `sale`, `funded` meets `fund`). A passage's
score is the share of the query's weight it covers, where a term's weight is its inverse document frequency
across passages and **a term the corpus has never seen weighs as its rarest term**. Without that last rule a
query made mostly of words the corpus cannot speak to is "fully covered" by the one common word it shares with
everything, and a passage about account paperwork scored 0.8 against a trust distribution event. That was
found by reading the ranker's output, not by a test, and is now a test.

Then, in this order: `+ citedBoost` when the record cites the document, capped at 1, then `× stalePenalty` when
the document is past its review date. Each step is a `Reason` with a signed delta, and the screen prints
`Relevance 0.40 = "sold" +0.05, "liquidity" +0.03, ..., Cited by the opportunity record +0.25`. The
retrieval test adds the deltas back up for every passage of every opportunity and expects the score.

A cited document that shares no term with the opportunity is shown with the citation boost alone and marked
**"Cited, but shares no term with this opportunity"**. It is not dressed up. In the seeded data the Treasury
ladder one-pager is cited by the property-sale opportunity and reads exactly that way.

### 1.3 Related, excluded, conflicting, stale

- **Related** passages are those above the floor that the record does not cite. They are shown for the advisor
  and never used in a note, because the record does not cite them.
- **Excluded** passages are those in superseded or withdrawn documents that the record does cite. They are
  listed with the successor named, and they are not evidence.
- **Conflicts** are found against the whole corpus, not only against what ranked: a cited passage whose claim is
  disputed by another current document is disputed whether or not that document shares the opportunity's
  words. Each side is shown with its day and freshness; the newer non-stale side is marked as the one a reader
  would lean on, and nothing applies that lean. The seeded corpus carries one: the research desk's note says a
  trading plan schedules sales and the breach stands until they complete; a founder-desk memo 105 days old
  says the plan is the mitigation and nothing further is required.
- **Stale** documents stay retrievable with their score halved and the state printed on every passage. The
  library screen lists them soonest-review first, and nothing on it retires a document: the desk does.

### 1.4 The refusal

When no cited document is usable, the answer is a refusal, and it is not softened. It names the cited ids
that are not in the corpus, the query terms no current passage contains (with the count: "10 of 14 query terms
appear in no current passage, across 14 passages searched"), and the three nearest passages with their score
and the reason each is not enough: under the floor with the few terms it shares, or above the floor but
uncited, because **Relay does not substitute its own citation for the record's**. The refusal carries to today's
list, the options screen and the review pack, as before.

### 1.5 Where the model is, and where it is not

| Step | Deterministic code | Model |
|---|---|---|
| Rewrite the query, rerank the candidates | Lexical overlap today | Yes in production |
| Decide the floor | Yes | Never |
| Require a citation from the record | Yes | Never |
| Exclude a superseded document, halve a stale one | Yes | Never |
| Find two current documents that disagree | Yes, from structured claims | A model may propose claims; code compares them |
| Refuse, and name what is missing | Yes | Never |

The boundary is what makes a stronger ranker safe to add: it can change which cited passage comes first and
which related passages appear, and it cannot make a missing citation resolve, a superseded document count, or
a refusal turn into a narration.

## 2. The client research agent

### 2.1 The question

Not "what do we know about this household" but "what does the advisor not know that they should, before the
next conversation". So a briefing has four sections in a fixed order, because the order is the argument:

1. **Since you last spoke.** Every opportunity, note, service request and unsigned form dated after the last
   logged contact. Recomputed in the test from the file alone.
2. **What the file observes.** Goals with a gap, the household's own rules against its holdings, the
   contact preference, a person past the age at which required minimum distributions begin. Confidence 1,
   because each is read straight off a field.
3. **What Relay infers, least certain first.** A colleague's note read as intent ("This is a colleague's
   account, not the client's words", 70 percent), an earmark on a holding (85 percent), a flag on the firm's
   account record (70 percent), a disagreement in the evidence behind an opportunity (85 percent). Each carries
   the question that would turn it into an observation.
4. **What Relay could not establish.** No trusted contact on file; a beneficiary nobody has spoken to; a
   client information refresh still open; assets held elsewhere whose size is not in the file; a refused
   citation; channels the advisor uses that nothing captures ("anything the client said there is not in this
   briefing"); silence for more than 90 days. Each says why it matters and, where there is one, what to ask.

Then the questions, each traceable to an inference or an unknown, and "assembled from": which records were
read and how many claims each supports, so the provenance of the briefing is a number.

### 2.2 Probes, not prose

Twelve deterministic probes run over the client file, the service queue, the firm's account record, the
connected channels and the evidence corpus. A probe is a function that pushes findings and unknowns; the
briefing is their union. The prose is a template over a record, and in production a model would draft these
sentences and could read free text more capably. It would still not decide what is observed against inferred,
what is missing, or what may be asserted without a record behind it.

Every claim cites a record down to the field (`data/clients/renner.json#notes[0]`). The research test reads
the JSON files directly and resolves every citation in every briefing to a value; a citation to a field that
does not exist fails the build. That guard was seen failing on a planted `memos[0]` before it was recorded here.

### 2.3 What the probes will not do

- They never infer capacity or exploitation from age. The distribution age is stated as a rule; the specified
  adult rule lives in the compliance layer, where a person dispositions it.
- They never promote an inference to an observation. Only a conversation, logged in the file, does that.
- They never read a preference or the learning loop. A setting cannot change what the advisor is told is unknown
  (dependency-cruiser `personalization-cannot-widen` covers `lib/evidence`; `lib/research` imports neither).
- They never draft anything for the client, and nothing is sent. The advisor takes the briefing into the room.

Two defects found by reading the first output, before any screen existed, and now tests: off-platform sale
proceeds were being reported as unknown held-away assets, and a disagreement touching a related, uncited
passage was being asserted against a record that did not cite it.

### 2.4 The discovery agent

The insight engine upstream flags what the data feeds show. What it cannot see is what the client said:
"we've accepted an offer on the house", "my brother will handle the paperwork now", "retiring at the end of
next year". Those sentences sit in captured messages, team notes and contact summaries, and each is the
start of an opportunity or a risk. `lib/discovery/discover.ts` reads them with nine extractors (property,
retirement, relocation, inheritance, a company sale or vesting, a family change, someone new acting for
the client, cash the client wants working, school fees), each a pattern with a confidence and a corpus
query. Every candidate cites the sentence and the record it came from, is read at ten points less
confidence when it is a colleague's account rather than the client's words, is marked as a duplicate when
the list already carries that class for the household, and is matched to the corpus documents that would
support the conversation. A candidate with none arrives saying so; accepted, it lands on today's list
refused until a document exists. The agent never adds anything to the list: the advisor accepts or
declines each candidate on `/discovery`, and an accepted one becomes an opportunity for the session with
the sentence as its reason path.

Two false positives found by reading the first output and now tests: "the inherited holding" read as an
inheritance, and "grandchildren's education trust" read as a birth. And one defect found by reading the
connect screen: a message file dropped together with its book was matched against the book as the screen
last rendered it, so every message was rejected; a drop now works through one accumulator, households first.

### 2.5 The dossier agent

The briefing asks what the advisor does not know before the next conversation. The dossier asks what the
firm actually has on a household and whether it agrees with itself. `lib/research/dossier.ts` reads five
sources and cites every item to where it came from: the client file (people, holdings, goals, rules);
the CRM (contacts, team notes, paperwork, open requests); the captured corpus, on connected sources only,
naming the channel it could not read; the firm's documents, through the same retrieval the evidence
layer uses, with queries built from the archetype, the flagged opportunities and the unfunded goals; and
the public record.

The public record is what a person would web-search for: press, filings, directorships, registries,
court and charity records. The prototype has no outbound path, so it ships as `publicRecord` on the
client file and the screen says so; in production a read-only search connector fills it. Two disciplines
hold. A public item is never promoted to fact: it carries a confidence under 1 (0.55, or 0.85 when it
matches a field on file) and is labelled unverified until a person confirms it. And every item is checked
against the file: it corroborates a named field, or it is "not on file", with a one-line reading of what
that means (a directorship is a held-away interest and a possible conflict; a probate record is an
estate event the file does not carry; a move changes the cross-border tax picture). A household with
nothing found says "nothing found under this household's names", which the unknowns note is not the
same as nothing existing.

The agent drafts a CRM note; a person files it, for the session, and the briefing then reads it as a
team note. Defects found by reading the first output: a note truncated at an initial, "who is the
Legacy goal for" asked when the goal already said, and a public item marked not on file when the
archetype already reflected it.

### 2.6 The consequence agent

Every other agent reads what has happened. `lib/simulate/simulate.ts` reads what would happen. It
applies a proposed action to a copy of the household (new cash into the product; a rebalance drawn from
the core; a trim drawn from the single name, largest holding first, never below zero; no price movement
anywhere) and runs the same deterministic engines on the copy that run on the real one: the household
arithmetic, the constraint engine, every account rule in force through the same fact adapter the sweep
uses, retrieval for what the proposal can cite, and the recipient counter for the note that would
follow. The result, per option, is a before and after for each consequence, the rule verdicts that
change, second-order effects (a trim that unlocks options on another opportunity; a lock-up that leaves
the Liquidity picture; a realised gain the custodian's lot report will price), the questions a supervisor
will ask, and what stays a person's to do. A grade, clean, review or blocked, is the first thing read;
"blocked" needs a failing constraint, a worsening verdict or an evidence refusal.

The screen is a matrix: every option for a proposal, carried through, on one screen, so the person
choosing sees the second-order effects before the first-order one is taken. In production a model
might phrase the supervisor's questions; it would never decide what they are or grade an option.

## 3. Surfaces

| Route | What it shows |
|---|---|
| `/evidence/[oppId]` | The reason path; cited passages ranked with their score decomposed; sources that disagree; related uncited passages; what the query matched; or the refusal |
| `/documents` | Every document with age, review, status and what cites it; freshness distribution; open disagreements; documents nothing cites |
| `/documents/[docId]` | The document passage by passage, a citation landing on the passage; its state, its chain, its disagreements, what cites it |
| `/research` | Every briefing: today's meetings first, then the most unknown; claims by kind across the book; what is most often missing |
| `/research/[id]` | The briefing, four sections in order, questions, assembled-from, and what it cannot have seen |
| `/discovery` | Candidates waiting on the advisor, each cited to its sentence with its confidence and the documents it would cite; by kind and by source |
| `/data` | Connect a spreadsheet, a message export or a document in the browser; what was accepted and rejected per file; a live run of every agent over the book |

## 4. Enforced, and seen failing

| Guard | Planted violation that failed it |
|---|---|
| A stored trend can never carry a "today" that could disagree with the client file (`validate()`) | A day 0 snapshot |
| A supersession chain is stated on both ends (`validate()`) | `supersedes` removed from one side |
| Every briefing citation resolves to a value in `data/` (`tests/unit/research.test.ts`) | A probe citing `memos[0]` |
| A missing citation is never rescued by a related passage (`tests/unit/retrieval.test.ts`) | The refusal loosened to "only when nothing is above the floor" |
| The proposer's guard drops any loosening (`tests/unit/compliance-deeper.test.ts`) | The guard replaced with `return true` |

## 6. Connecting data, and proving it

A book of any size can be connected from a file: a `.csv` or `.xlsx` of households (one row each), a
`.csv` or `.xlsx` of messages naming the household, a `.md` or `.txt` document, or `.json` records. The
file is read in the browser (`lib/import/`): a forty-line CSV parser, and an `.xlsx` reader with no
dependency that walks the zip's central directory, inflates the parts with `DecompressionStream`, and
reads the shared strings and the first sheet's cells by pattern. Rows map to records through one
alias table, so "Monthly spend" and `monthlySpendUsd` both land, and Liquidity months, total assets and
the opportunities on today's list are computed from the record, never typed. Every record is then held to
exactly the checks a shipped file is held to (`clientErrors()` in `lib/data/validate.ts`): a row that
fails is named and is not in the book.

The connected records join the shipped book in session state (`book` in `components/state.tsx`), and
every engine reads the merged book: the sweep, the research agent, retrieval and discovery all take the
dataset as an argument. The live run on `/data` then runs each agent over the whole book with the
milliseconds each step took and the counts as they are produced; the loop yields to the screen between
batches and nothing is slowed down to look busy. A 1,000-household book generated in the browser runs
in about two seconds.

What it proves: that records arrive in the shape the engines need from a spreadsheet, that the validator
is the same one, and that every agent runs over a book of that size in a browser. What it does not prove:
a live connection to a CRM or a custodian, which is a connector with credentials and needs a server this
prototype does not have. The connector contract on `/connectors` is what such a connection would satisfy;
a file is the same records arriving by a different road. Nothing is uploaded, because there is nowhere
to upload to.

## 5. Production mapping

| Prototype | Production |
|---|---|
| `data/documents.json` with status and claims | The firm's document service with review dates and supersession as metadata; claims extracted by a typed model and reviewed by the desk |
| Lexical scoring in `lib/evidence/search.ts` | Query rewriting and reranking by a model, returning candidates into the same floor, citation and exclusion code |
| Probes over `data/` | The same probes over CRM, custody, the archive and the connector layer, on the nightly cadence, with the briefing queued per meeting |
| Template sentences | Model-drafted sentences over the same findings, with the kind, confidence and citation fixed before drafting |
