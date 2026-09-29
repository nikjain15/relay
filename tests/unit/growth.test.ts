import { describe, it, expect } from "vitest";
import { CLIENTS, SERVICE_REQUESTS, clientFile } from "@/lib/data";
import { heldAway, heldAwayFor, parseUsd, walletTotals } from "@/lib/growth/held-away";
import { bookEconomics, economicsTotals } from "@/lib/growth/economics";
import { conversations, conversationFor } from "@/lib/growth/next-conversation";
import { ROSTER } from "@/lib/agents/roster";

/**
 * Wallet share, book economics and the next conversation: every figure comes
 * from a record or the schedule, an unstated amount is never invented, and the
 * three agents are on the roster so every screen counts them.
 */
describe("held-away money", () => {
  it("reads amounts as written and never invents one", () => {
    expect(parseUsd("a $900K 401(k)")).toBe(900_000);
    expect(parseUsd("sold for $4.1M")).toBe(4_100_000);
    expect(parseUsd("$1,200,000 due")).toBe(1_200_000);
    expect(parseUsd("a pension at the old employer")).toBeUndefined();
  });

  it("cites each signal to a record and counts a stated amount once", () => {
    const w = heldAwayFor(clientFile("hh-desrosiers")!);
    expect(w.signals.length).toBeGreaterThan(0);
    for (const s of w.signals) expect(s.source.id).toBeTruthy();
    // The $900K 401(k) is named by the opportunity and the file; it counts once.
    expect(w.heldAwayStatedUsd).toBe(900_000);
    expect(w.walletSharePct).toBe(Math.round((3_400_000 / 4_300_000) * 100));
  });

  it("a household with no signal reads as whole", () => {
    const w = heldAwayFor(clientFile("hh-pell")!);
    expect(w.signals).toEqual([]);
    expect(w.walletSharePct).toBe(100);
  });

  it("orders the book by stated money elsewhere", () => {
    const rows = heldAway(CLIENTS);
    expect(rows[0].heldAwayStatedUsd).toBeGreaterThanOrEqual(rows[1].heldAwayStatedUsd);
    const t = walletTotals(rows);
    expect(t.walletSharePct).toBeLessThanOrEqual(100);
    expect(t.withSignals).toBeGreaterThan(0);
  });
});

describe("book economics", () => {
  it("revenue is assets times the tier's rate, hours from the records", () => {
    const rows = bookEconomics(CLIENTS, SERVICE_REQUESTS);
    const d = rows.find((r) => r.clientId === "hh-desrosiers")!;
    expect(d.revenueUsd).toBe(Math.round((3_400_000 * d.feeBps) / 10_000));
    expect(d.hours).toBeGreaterThan(0);
    expect(d.revenuePerHour).toBe(Math.round(d.revenueUsd / d.hours));
  });

  it("flags against the book's medians, never both ways at once", () => {
    const rows = bookEconomics(CLIENTS, SERVICE_REQUESTS);
    for (const r of rows) expect(r.underServed && r.timeHeavy).toBe(false);
    const t = economicsTotals(rows);
    expect(t.revenueUsd).toBe(rows.reduce((s, r) => s + r.revenueUsd, 0));
  });
});

describe("next conversation", () => {
  it("picks one cited reason per household and lists the rest", () => {
    const c = conversationFor(clientFile("hh-desrosiers")!);
    expect(c.kind).toBe("held-away");
    expect(c.source.id).toBeTruthy();
    expect(c.also.length).toBeGreaterThan(0);
    expect(c.opener).toMatch(/^Draft for you/);
  });

  it("a quiet household is never last forever", () => {
    const c = conversationFor(clientFile("hh-pell")!);
    expect(c.kind).toBe("quiet");
    expect(c.score).toBeGreaterThan(50);
  });

  it("households already in today's calendar go last", () => {
    const rows = conversations(CLIENTS, [{ time: "10:00", title: "Review", kind: "review", clientId: "hh-renner", purpose: "" }]);
    expect(rows[rows.length - 1].clientId).toBe("hh-renner");
  });
});

describe("on the roster", () => {
  it("the three agents are counted once with the rest", () => {
    for (const id of ["held-away", "economics", "conversation"]) expect(ROSTER.some((a) => a.id === id && a.cadence === "morning"), id).toBe(true);
  });
});
