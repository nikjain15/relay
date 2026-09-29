// The held-away agent: money the household has that is not on the platform.
//
// Wallet share is the share of a household's wealth the advisor manages. The
// custodian feed shows only what is here; what is elsewhere shows up in what
// the client said, in a colleague's note, and in the reason path of an
// opportunity the insight engine raised. This agent reads those, names each
// signal, cites the record it came from, reads the amount when one is stated,
// and computes the wallet share the file supports. A figure it did not read is
// never invented: an unstated amount is shown as unstated.
//
// Deterministic: fixed patterns over the household's own records. In
// production a typed extraction model would do the reading; this file would
// still decide what counts, what is cited and that a person acts.
// No model client may be imported here.
import type { ClientFile } from "@/lib/types";

export type HeldAwayKind = "retirement-plan" | "pension" | "outside-account" | "proceeds" | "equity-comp";

export interface HeldAwayPattern {
  kind: HeldAwayKind;
  label: string;
  /** Why it matters to wallet share, in one line. */
  why: string;
  pattern: RegExp;
  /** The conversation it opens, in the advisor's words. */
  conversation: string;
}

export const HELD_AWAY_PATTERNS: HeldAwayPattern[] = [
  { kind: "retirement-plan", label: "Retirement plan at an employer", why: "A plan at a former employer is the largest held-away balance most households have, and a rollover is a documented recommendation.", conversation: "Walk through what the plan holds and costs against what a rollover would, on paper, before the client decides.", pattern: /\b(401\(k\)|403\(b\)|457\(b\)|employer'?s plan|held at the employer|rollover)\b/i },
  { kind: "pension", label: "Pension or transfer value", why: "A pension election or transfer value is a one-time decision that sets the Longevity number.", conversation: "Model the options side by side and bring the comparison to the next meeting.", pattern: /\b(pension|transfer value|lump sum)\b/i },
  { kind: "outside-account", label: "Account at another firm", why: "An account elsewhere is wealth the plan cannot see and a relationship someone else holds.", conversation: "Ask what the other account is for, and offer to show the whole picture in one plan.", pattern: /\b(held away|at another (firm|bank|adviser|advisor|broker|brokerage|custodian)|other (advisor|adviser|firm|brokerage)|outside (account|manager|brokerage)|held at (?!the employer))\b/i },
  { kind: "proceeds", label: "Proceeds not yet on the platform", why: "Sale proceeds, an inheritance or a payout sit in a bank account until someone asks about them.", conversation: "Ask where the money is now and what it is for, then size the Liquidity sleeve around it.", pattern: /\b(not yet on the platform|proceeds|inheritance|windfall|payout|received (a|an) (inheritance|bonus))\b/i },
  { kind: "equity-comp", label: "Equity compensation or vesting", why: "Unvested stock and options are wealth on a schedule, with a tax bill on each date.", conversation: "Bring the vesting schedule and a staged plan for each date.", pattern: /\b(rsus?|stock options|shares vest|vest(s|ing) on|deferred comp(ensation)?)\b/i },
];

export interface HeldAwaySignal {
  kind: HeldAwayKind;
  label: string;
  why: string;
  conversation: string;
  /** Where it was read. */
  source: { kind: "opportunity" | "message" | "note" | "contact" | "file"; id: string; excerpt: string };
  /** The amount the record states, if it states one. */
  amountUsd?: number;
  /** The client's own words carry more than a colleague's account or a field. */
  confidence: number;
}

export interface HouseholdWallet {
  clientId: string;
  clientName: string;
  advisorId: string;
  onPlatformUsd: number;
  /** Sum of stated amounts; signals without an amount add nothing. */
  heldAwayStatedUsd: number;
  /** How many signals carry no amount, so the share reads as a floor. */
  unstated: number;
  /** On-platform over on-platform plus stated held-away, as a percentage. */
  walletSharePct: number;
  signals: HeldAwaySignal[];
}

/** "$900K", "$4.1M", "$1,200,000" to a number; undefined when the text states none. */
export function parseUsd(text: string): number | undefined {
  const m = text.match(/\$\s?(\d[\d,]*(?:\.\d+)?)\s*(k|m|bn|million|thousand|billion)?\b/i);
  if (!m) return undefined;
  const n = Number(m[1].replace(/,/g, ""));
  const unit = (m[2] ?? "").toLowerCase();
  const mult = unit === "k" || unit === "thousand" ? 1e3 : unit === "m" || unit === "million" ? 1e6 : unit === "bn" || unit === "billion" ? 1e9 : 1;
  return Math.round(n * mult);
}

function sentence(text: string, m: RegExpMatchArray): string {
  const i = m.index ?? 0;
  const start = Math.max(0, text.lastIndexOf(". ", i) + 1);
  const end = text.indexOf(". ", i);
  return text.slice(start, end < 0 ? undefined : end + 1).trim().slice(0, 200);
}

/** Every held-away signal in one household's records, one per kind, best-cited first. */
export function heldAwayFor(c: ClientFile): HouseholdWallet {
  const texts: { kind: HeldAwaySignal["source"]["kind"]; id: string; text: string; confidence: number }[] = [
    // The insight engine's own reason path, when it names a holding elsewhere.
    ...c.opportunities.flatMap((o) => [
      ...o.reasonPath.filter((n) => n.kind === "Holding").map((n) => ({ kind: "opportunity" as const, id: o.id, text: n.label, confidence: 0.9 })),
      { kind: "opportunity" as const, id: o.id, text: o.title, confidence: 0.85 },
    ]),
    ...(c.messages ?? []).filter((m) => m.direction === "inbound").map((m) => ({ kind: "message" as const, id: m.id, text: m.text, confidence: 0.8 })),
    ...c.notes.map((n, i) => ({ kind: "note" as const, id: `notes[${i}]`, text: n.text, confidence: 0.7 })),
    ...c.contactHistory.map((e, i) => ({ kind: "contact" as const, id: `contactHistory[${i}]`, text: e.summary, confidence: 0.7 })),
    { kind: "file" as const, id: "hardPart", text: c.hardPart, confidence: 0.6 },
  ];
  const best = new Map<HeldAwayKind, HeldAwaySignal>();
  for (const t of texts) {
    for (const p of HELD_AWAY_PATTERNS) {
      const m = t.text.match(p.pattern);
      if (!m) continue;
      const amount = parseUsd(t.text);
      const s: HeldAwaySignal = { kind: p.kind, label: p.label, why: p.why, conversation: p.conversation, source: { kind: t.kind, id: t.id, excerpt: sentence(t.text, m) }, amountUsd: amount, confidence: t.confidence };
      const prev = best.get(p.kind);
      // Prefer the record that states an amount, then the better-cited one.
      if (!prev || (amount !== undefined && prev.amountUsd === undefined) || (Boolean(amount) === Boolean(prev.amountUsd) && s.confidence > prev.confidence)) best.set(p.kind, s);
    }
  }
  const signals = [...best.values()].sort((a, b) => (b.amountUsd ?? 0) - (a.amountUsd ?? 0) || b.confidence - a.confidence);
  // The same balance is often named twice (a note and the opportunity it became); a stated amount counts once.
  const stated = [...new Set(signals.map((x) => x.amountUsd).filter((x): x is number => x !== undefined))].reduce((s, x) => s + x, 0);
  return {
    clientId: c.id,
    clientName: c.name,
    advisorId: c.advisorId,
    onPlatformUsd: c.totalUsd,
    heldAwayStatedUsd: stated,
    unstated: signals.filter((x) => x.amountUsd === undefined).length,
    walletSharePct: Math.round((c.totalUsd / (c.totalUsd + stated)) * 100),
    signals,
  };
}

/** The book: households with the most stated held-away money first, then the most signals. */
export function heldAway(clients: ClientFile[]): HouseholdWallet[] {
  return clients.map(heldAwayFor).sort((a, b) => b.heldAwayStatedUsd - a.heldAwayStatedUsd || b.signals.length - a.signals.length || a.clientName.localeCompare(b.clientName));
}

/** Totals across the book, for the sentence at the top of the screen. */
export function walletTotals(rows: HouseholdWallet[]) {
  const onPlatform = rows.reduce((s, r) => s + r.onPlatformUsd, 0);
  const stated = rows.reduce((s, r) => s + r.heldAwayStatedUsd, 0);
  return {
    onPlatformUsd: onPlatform,
    heldAwayStatedUsd: stated,
    walletSharePct: onPlatform + stated ? Math.round((onPlatform / (onPlatform + stated)) * 100) : 100,
    withSignals: rows.filter((r) => r.signals.length).length,
    unstated: rows.reduce((s, r) => s + r.unstated, 0),
  };
}
