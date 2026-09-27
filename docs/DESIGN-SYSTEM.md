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

## 3. Components

All in `components/ui.tsx`. Screens compose these; they do not restyle them.

| Component | What it is |
|---|---|
| `PageTitle` | 28px light title and one line of purpose |
| `Section` | 15px semibold heading and its content, 40px below |
| `Stat` | A large light number and its label, for the one or two figures a screen leads with |
| `Pill` | Status badge: neutral, pass, fail, accent. Always words, never only colour |
| `btn`, `btnPrimary` | 32px buttons: outlined ink, solid ink |
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

