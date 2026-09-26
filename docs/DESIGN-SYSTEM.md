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
| `--ink-3` | #8a8a8a | Tertiary text: captions, navigation group labels, provenance |
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

## 5. Changing the look

Change a value in `app/tokens.css`, copy the same line into the mockup's first `:root` block, run
`npm run check`. Nothing else changes, because nothing else holds a colour.
