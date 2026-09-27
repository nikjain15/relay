# Relay design system

**Version:** v1.0, 2026-09-26. Decision R-20.

**Intent:** a tool an advisor at a Swiss private bank would find calm and obvious on first use. It follows
the public design language of firms like UBS: restrained black and white, warm greys, generous space,
light large headings, square corners, and colour saved for what needs attention.

**Boundary:** inspired by that language, never branded. No UBS logo, keys symbol, wordmark, Frutiger
typeface, photography or brand red as a decorative colour. A pitch prototype that looks like a real UBS
product would be a counterfeit, not a design choice; one that clearly fits their world shows judgement.

---

## 1. Principles

1. **One thing per screen leads.** A light 28px title, one sentence of purpose, then the work.
2. **Black is the action colour.** Primary buttons are solid ink; secondary buttons are outlined ink. Links
   are ink and underlined. No blue.
3. **Colour means status, and text always says it.** Red is critical, green is eligible or done, amber is
   caution. Every coloured label also states its status in words (WCAG 2.2 AA: never colour alone).
4. **Space instead of boxes.** Sections are separated by whitespace and a hairline, not cards and shadows.
5. **Sentence case everywhere.** No uppercase labels; secondary labels are smaller and lighter instead.
6. **Numbers are tabular.** Money and percentages line up in columns.
7. **Where a value came from is always one glance away.** Provenance ("Firm default", "Client setting")
   is shown in the lighter text style next to the value it explains.

## 2. Tokens

The single source is `app/tokens.css`. Tailwind maps each token to a class (`text-ink-2`, `bg-subtle`,
`border-line`, `bg-critical-soft`); the walkthrough mockup declares the same variables.

| Token | Value | Use |
|---|---|---|
| `--ink` | #1a1a1a | Text, primary buttons, focus outline, active navigation bar |
| `--ink-2` | #5c5c5c | Secondary text, table headers |
| `--ink-3` | #686868 | Tertiary text: captions, navigation group labels, provenance |
| `--line` | #e4e2dd | Hairlines between rows and around cards |
| `--line-strong` | #bcb9b2 | Table header rule |
| `--surface` | #ffffff | Page |
| `--subtle` | #f6f5f2 | Navigation rail, callouts, neutral badges |
| `--selected` | #ecebe6 | Selected or highlighted state |
| `--critical`, `--critical-soft` | #b3121f, #fbecec | Blocked, escalated, overdue, refused |
| `--positive`, `--positive-soft` | #2d6a4f, #e9f2ed | Eligible, signed, done |
| `--caution`, `--caution-soft` | #7a5200, #faf3e1 | Guidance notes and warnings |
| `--font` | Helvetica Neue, Helvetica, Arial, system | All text; no web font is loaded |
| `--radius` | 2px | Every corner |

**Type scale:** 28px light (page title), 15px semibold (section), 14px regular (body), 13px (controls and
navigation), 12px (captions and badges).

**Space:** a 4px grid; pages have 40px padding, sections 40px apart, cards 20px inside.

### 2.1 Perspective colours

Three hues say whose line a row is, and nothing else does.

| Token | Hue | Means |
|---|---|---|
| `--agent`, `--agent-soft` | indigo | An agent read it, computed it or prepared it |
| `--advisor`, `--advisor-soft` | blue | The advisor decides, files, signs or sends it |
| `--client`, `--client-soft` | teal | The client said it, holds it or will receive it |

Status colours (positive, caution, critical) keep their job: state, never ownership. A perspective
colour never appears without its word (`Who`), a row carries it as a stripe plus the word, and every
screen that uses them shows the legend once (in the header at desktop width, under the title on a phone).
Each hue meets AA on the surface and on its soft background. Charts do not use perspective colours.

## 3. Components

All in `components/ui.tsx`. Screens compose these; they do not restyle them.

| Component | What it is |
|---|---|
| `Brief` | Under the title of every workflow screen: the agent speaks first, in a sentence with the figures in it, then the few things that matter, one next step, and a trace. `AgentBar` renders as one |
| `ActionPanel` | A prepared action opened beside the list: the draft or task, who acts, where it goes, the trace, and a decision that stays on screen as a recorded outcome |
| `Ask` | The drawer on every screen: a question in, an answer from the records with citations and links |
| `Mark` | A two-letter monogram for a vendor or a source; no logo or wordmark is ever shipped |
| `AgentBar` | Under the title of every workflow screen: which agent fed it, what it read, what it left for a person, a folded trace of how, and the step a model would own in production |
| `Trace` | How an agent got here, in four or five steps, each with the perspective that did it; folded under a finding or a bar |
| `Who`, `Legend` | The perspective word in its colour, and the three words once per screen |
| `PageTitle` | 28px light title and one line of purpose |
| `Section` | 15px semibold heading and its content, 40px below |
| `Stat` | A large light number and its label, for the one or two figures a screen leads with |
| `Pill` | Status badge: neutral, pass, fail, accent. Always words, never only colour |
| `btn`, `btnPrimary` | 32px buttons: outlined ink, solid ink |
| `Row`, `Card`, `CardGrid`, `StatRow`, `Banner`, `More` | The layout primitives of the agent-first rebuild (§7) |
| `Timeline` | A run of events, most recent first: time, icon, one line, one line of context |
| `StateDot` | One glance: a dot and the word for it (clear, needs you, blocking, off). Never the dot alone |
| `LiveRun` | Every agent over the book with a progress bar, a timeline of steps with real timings, and a summary. The only pacing is a yield to the screen between batches |
| `th`, `td` | Table cells: light headers, hairline rows, 12px vertical padding |

**Layout:** a 56px top bar (product name left, the prototype disclosure right), a 240px navigation rail
on a warm grey with the active item marked by a 2px ink bar, and content capped at 1200px.

## 4. Enforced, and seen failing

`tests/invariants/design-tokens.test.ts`:
- no raw Tailwind palette class (`text-red-700`, `bg-neutral-100`, and so on) and no hex colour in `app/`
  or `components/`. A planted `hover:text-red-700` and a planted `#e60000` both fail it;
- the walkthrough mockup declares every token in `app/tokens.css` with the same value, so the prototype and
  the mockup cannot drift. It failed while the mockup still carried its old palette.

**Contrast (R-21).** `--ink-3` was #8a8a8a, which failed AA for text on every background (3.45:1 on white,
2.89:1 on `--selected`). It is now #686868: 5.57:1 on white, 5.11:1 on `--subtle`, 4.67:1 on `--selected`.
Every other text pair was already above 4.5:1. `npm run e2e` checks the computed colour of every text
element against its real background at 1440, 1280 and 1024 px, and in the mockup.

**Keyboard.** A "Skip to content" link is the first Tab stop on every page and moves focus into `main`.

The token scan also fails on `rgb()`, `hsl()` and Tailwind arbitrary colours such as `text-[#e60000]`.

## 5. Changing the look

Change a value in `app/tokens.css`, copy the same line into the mockup's first `:root` block, run
`npm run check`. Nothing else changes, because nothing else holds a colour.

---

## 6. Icons

**Version:** added 2026-09-27, with the agent-first pass. Set lives in `components/icons.tsx`.

**Why drawn rather than installed.** The content security policy allows no outbound request, so an icon font
or a CDN sprite is not available. `currentColor` inherits the token the surrounding text already uses, so an
icon cannot introduce a colour the system has not approved. And a library ships hundreds of glyphs in a house
style that is not this one; a small set drawn to one grid reads as a system.

**The grid.** 24 units, 1.5 stroke, round caps and joins, no fills, geometry on whole or half units. Sizes are
16 (inline with 13px text), 20 (the default, and every navigation and row icon), 24 and 28 (leading a card).

**The boundary, which is the same boundary as the rest of this document.** The set is drawn in the restrained
institutional idiom that firms like UBS use publicly: geometric, even-weight, unfilled, no rounded-cartoon
shapes and no duotone. It is **not** any firm's proprietary icon set, and it contains no keys symbol, logo,
wordmark or brand mark. An icon set that tried to reproduce theirs would be a counterfeit for the same reason
a cloned palette would be.

**Meaning.** An icon never carries meaning alone (principle 3, and WCAG 2.2 AA). It sits beside text that
states the thing, or it takes a `label` and becomes the accessible name. Without a label it is `aria-hidden`,
because a decorative glyph announced by a screen reader is noise.

**Added 2026-09-27, with the retrieval and research pass:** `library`, `quote`, `conflict`, `hourglass`, `trend`,
`replay`, `briefing`, `question`, `flag` and `link`, on the same grid. Each names the thing a row is about (a citation,
a disagreement, a document past its review date, a rising series, a rule change proposed) beside the word for it.

**The one concession to convention.** `agent` is a four-point star. It is what this class of product now means
by "the system did this on its own", and an advisor meeting Relay after any other 2026 tool will read it
faster than anything invented here.

`tests/invariants/icons.test.ts` holds all of it: one grid, one stroke weight, `currentColor` only, no hex or
colour function, no fill but `none`, decorative unless labelled, every channel and navigation icon resolving,
and **no glyph that nothing references**. That last one was seen failing on a planted unreferenced glyph
before being recorded as enforced.

---

## 7. Density, and what agent-first means here

The prototype's first two builds were told the same thing by the person it was built for: too content heavy,
not agent first. Both were fair, and the diagnosis is worth writing down because it is a design rule rather
than a styling preference.

**What was wrong.** Screens explained themselves. Each one opened with a title, a sentence of purpose, then
two or three paragraphs arguing for the approach, then the work. That is how a document is organised, not a
tool. An advisor opening the overview at 8am was reading an essay about what the product believes.

**The rule.** A screen states what happened and what needs deciding. The argument that justifies it lives one
disclosure away, in a `More` block, because the argument genuinely matters to a reviewer and genuinely does
not matter at 8am.

**Agent-first, concretely, and not as a vibe:**

1. **The report comes before the menu.** The overview opens with what ran overnight, how many accounts and
   channels were swept, and what only a person can settle, ranked by the cost of being wrong. Navigation to
   the surfaces comes after that.
2. **The unit of density is a row, not a card.** An icon, what it is, what it needs, one line of context. A
   card is for something that needs its own internal structure, not for every item in a list.
3. **The agent's state is ambient.** The header carries what the agents are holding on every screen, and it
   reads "Agents clear" when it is clear, because a badge that only appears when something is wrong teaches
   people to stop seeing the space it occupies.
4. **The keyboard is a first-class route.** Command or control K opens a jump palette over surfaces, clients
   and rules. It is called "Jump to" and not "Ask" on purpose: this prototype makes no model calls, and a box
   that looked like a chat would claim something the product does not do.
5. **What is autonomous is said out loud.** Every agent surface states which steps ran without a person and
   which one cannot, rather than implying the system is either magic or a form.
6. **The agent's work arrives prepared, not described.** A finding carries the hold, the callback, the form,
   the task and the drafted note the rule calls for, each one an accept or a decline. The person's unit of
   work is a decision, not a to-do list they have to write themselves.
7. **Every row has an icon, and every state has a word.** A trigger class, a document kind, a service
   request kind and an agent each map to one glyph in `components/icons.tsx`, so a table can be scanned
   by shape before it is read. A state is a `StateDot`: a dot beside its word, never the dot alone.
8. **One sentence under a title, at most.** The subtitle says what the screen is for; the argument for
   the approach lives in a `More` at the bottom.


---

## 8. Charts

**Version:** added 2026-09-27. Set lives in `components/charts.tsx`.

Three forms and no more, each built from `data/` and drawn with the tokens: `Bars` for a distribution across
categories (label, thin bar, number), `Meter` for shares of one whole (one stacked bar with a 2px gap between
segments and a worded legend), and `Sparkline` for one series over time (2px line, end marker, an optional dashed
ceiling, the values printed under it). Rules that hold for all three:

- **Monochrome ink unless a segment carries a status**, in which case the status colour appears with the word that
  names it. No categorical palette exists in this system, so nothing is ever told apart by hue alone.
- **Every value is also printed as text.** The picture shows the shape; the text carries the numbers; the two cannot
  disagree, and a screen reader gets the numbers.
- **One axis.** A sparkline shows one series. Two measures of different scale are two sparklines.
- **Thin marks, recessive scaffolding.** 1.5px bars, 2px lines, a 3.5px end marker, hairline track.
- **Where they appear:** the overview (findings by agent, channels by coverage, briefing and corpus figures), the
  evidence screen (what the query matched), the document library (freshness, by desk), briefings (assembled from,
  claims by kind, what is most often missing), the supervision console (a concentration series against its
  ceiling on a drift finding) and the replay screen (findings by rule).
