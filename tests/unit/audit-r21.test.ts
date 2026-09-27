import { describe, it, expect } from "vitest";
import { evaluate, evaluateAll } from "@/lib/constraints/evaluate";
import { rank, score, DEFAULT_CAP } from "@/lib/ranking/rank";
import { countRetailRecipients } from "@/lib/recipients/count";
import { addressees, compose } from "@/lib/drafting/compose";
import { runChecks } from "@/lib/policy/checks";
import { retrieve } from "@/lib/evidence/retrieve";
import { paperStatus, openItems } from "@/lib/onboarding/status";
import { classify } from "@/lib/servicing/classify";
import { suggest, EVENTS, type BehaviorEvent, type Refused } from "@/lib/learning/learn";
import { resolveProfile, ADVISOR_PROFILES } from "@/lib/profile";
import { fundingNeed, liquidityMonths } from "@/lib/household-math";
import { needText } from "@/lib/need-text";
import { reviewPack } from "@/lib/meetings/prep";
import { household } from "@/lib/fixtures/households";
import { opportunity, OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { product } from "@/lib/fixtures/shelf";
import { clientFile } from "@/lib/data";
import type { Candidate, Constraint, Household, Opportunity } from "@/lib/types";
import { PRIOR_DISTRIBUTIONS, PROTOTYPE_TODAY, templateFor } from "@/lib/fixtures/distributions";

// One test per finding of the R-21 audit (the R-21 audit record, kept privately). Each
// failed on the code before its fix.

const renner = household("hh-renner")!;
const alcott = household("hh-alcott")!;
const with_ = (h: Household, over: Partial<Household>): Household => ({ ...h, ...over });
const fundOpp = (over: Partial<Opportunity> = {}): Opportunity => ({ ...opportunity("opp-alcott-liquidity")!, ...over });

describe("A1 funding need is exact dollars, and covers a known outflow", () => {
  it("a months goal is measured in dollars, not rounded-down months", () => {
    // $110K of cash at $20K a month is 5.5 months: the gap to 12 months is $130K, not 7 x $20K = $140K.
    const h = with_(alcott, { monthlySpendUsd: 20_000, holdings: [{ name: "Cash", productId: "prod-mmf", valueUsd: 110_000, singleName: false }, { name: "Core", productId: "prod-core-model", valueUsd: 1_000_000, singleName: false }], goals: [{ strategy: "Liquidity", funded: 5, target: 12, unit: "months", assumption: "" }] });
    expect(fundingNeed(h, fundOpp()).needUsd).toBe(130_000);
    expect(evaluateAll(fundOpp(), h)[0].candidate.amountUsd).toBe(130_000);
  });

  it("the Thornbury capital call is covered: $2.1M, not $900K", () => {
    const o = opportunity("opp-thornbury-cashflow")!;
    const h = household("hh-thornbury")!;
    expect(evaluateAll(o, h).find((e) => e.pass)!.candidate.amountUsd).toBe(2_100_000);
    expect(needText(h, o).need).toBe("24 months × $50K = $1.2M, less $300K already set aside, plus the $1.2M capital call: $2.1M needed");
  });

  it("new cash smaller than the need says what is left to fund (Alcott maturity)", () => {
    const t = needText(alcott, opportunity("opp-alcott-maturity")!);
    expect(t.need).toMatch(/: \$550K needed$/);
    expect(t.source).toBe("$200K from the $200K of new cash, leaving $350K still to fund");
  });

  it("a USD goal is target less funded, not target x monthly spending", () => {
    const o = fundOpp({ strategy: "Legacy" });
    expect(fundingNeed(renner, o).needUsd).toBe(10_000_000);
  });

  it("a funded goal yields no candidates rather than $0 proposals", () => {
    const h = with_(alcott, { holdings: [...alcott.holdings.filter((x) => x.productId !== "prod-mmf"), { name: "Cash", productId: "prod-mmf", valueUsd: 36 * 22_000, singleName: false }] });
    expect(evaluateAll(fundOpp(), h)).toEqual([]);
  });

  it("money moved into the proposed Treasury ladder counts toward Liquidity, so the gap closes", () => {
    const h = with_(renner, { holdings: [...renner.holdings, { name: "Treasury ladder", productId: "prod-tsy-ladder", valueUsd: 3_060_000, singleName: false }] });
    expect(liquidityMonths(h)).toBe(36);
    expect(evaluateAll(opportunity("opp-renner-property")!, h)).toEqual([]);
  });
});

describe("A2 constraint boundaries and fail-closed rules", () => {
  const cand = (productId: string, over: Partial<Candidate> = {}): Candidate => ({ id: "t", productId, action: "trim", source: "sell_long_term_lots", amountUsd: 28_704_000, ...over });
  const rules = (h: Household, productId: string, over: Partial<Candidate> = {}, strategy?: string) => evaluate(cand(productId, over), product(productId)!, h, strategy).failures.map((f) => f.rule);

  it("an unknown IPS rule blocks every candidate instead of being skipped", () => {
    const h = with_(renner, { constraints: [...renner.constraints, { kind: "maxLeverage", pct: 2 } as unknown as Constraint] });
    expect(rules(h, "prod-core-model")).toContain("Unknown rule");
    expect(evaluateAll(opportunity("opp-renner-property")!, h).some((e) => e.pass)).toBe(false);
  });

  it("concentration: exactly at the cap passes, $1 over fails", () => {
    expect(rules(renner, "prod-core-model", { amountUsd: 28_704_000 })).toEqual([]);
    expect(rules(renner, "prod-core-model", { amountUsd: 28_704_000 - 700 })).toContain("Concentration");
  });

  it("risk: equal to the maximum passes, one above fails", () => {
    const h = with_(renner, { constraints: [{ kind: "maxRiskLevel", level: 3 }] });
    expect(rules(h, "prod-core-model")).toEqual([]);
    expect(rules(h, "prod-structured-note")).toContain("Risk level");
  });

  it("liquidity minimum: a lock-up is allowed once cash covers the required months exactly", () => {
    const h = with_(alcott, { constraints: [{ kind: "minLiquidityMonths", months: 11 }] });
    expect(rules(h, "prod-exchange-fund", { source: "contribute_in_kind" })).not.toContain("Liquidity minimum");
    const short = with_(alcott, { constraints: [{ kind: "minLiquidityMonths", months: 12 }] });
    expect(rules(short, "prod-exchange-fund", { source: "contribute_in_kind" })).toContain("Liquidity minimum");
  });

  it("short-term gains: selling all lots is fine when no lot is short-term", () => {
    const h = with_(renner, { holdings: renner.holdings.map((x) => ({ ...x, shortTermLotsUsd: undefined })) });
    expect(rules(h, "prod-core-model", { source: "sell_all_lots" })).not.toContain("Tax-lot holding period");
  });

  it("a rebalance cannot take more from the core portfolio than it holds", () => {
    const pell = household("hh-pell")!;
    const c: Candidate = { id: "t", productId: "prod-tsy-ladder", action: "fund", source: "rebalance_from_core", amountUsd: 200_000 };
    expect(evaluate(c, product("prod-tsy-ladder")!, pell, "Liquidity").failures.map((f) => f.rule)).toContain("Funding source");
  });
});

describe("A3 ranking edges", () => {
  const two = [{ ...OPPORTUNITIES[0], id: "b-tie", materiality: 50 }, { ...OPPORTUNITIES[0], id: "a-tie", materiality: 50 }];
  it("ties break by id", () => expect(rank(two).map((o) => o.id)).toEqual(["a-tie", "b-tie"]));
  it("a cap of zero, a negative cap and a fractional cap never misbehave", () => {
    expect(rank(OPPORTUNITIES, new Set(), 0)).toEqual([]);
    expect(rank(OPPORTUNITIES, new Set(), -1)).toEqual([]);
    expect(rank(OPPORTUNITIES, new Set(), 2.7)).toHaveLength(2);
    expect(rank(OPPORTUNITIES, new Set(), Number.NaN)).toHaveLength(Math.min(DEFAULT_CAP, OPPORTUNITIES.length));
  });
  it("a weights object missing a class falls back to the firm weight, never NaN", () => {
    const o = OPPORTUNITIES.find((x) => x.triggerClass === "market_view")!;
    expect(score(o, { external_event: 1 })).toBe(score(o));
  });
});

describe("A4 recipients are the people the note is addressed to", () => {
  it("beneficiaries are not addressed and not counted; a trust note goes to the trustee", () => {
    const ok = household("hh-okafor-lind")!;
    expect(ok.persons).toHaveLength(3);
    expect(addressees(ok).map((p) => p.role)).toEqual(["trustee"]);
    expect(addressees(renner)).toHaveLength(2);
  });
  it("the same person sent by two advisors counts once; a send dated after the check is not counted", () => {
    const d = (personId: string, advisorId: string, date: string) => ({ communicationId: "c", personId, advisorId, institutional: false, date });
    expect(countRetailRecipients([d("p1", "a", "2026-01-10"), d("p1", "b", "2026-01-11")], "c", "2026-01-12")).toBe(1);
    expect(countRetailRecipients([d("p1", "a", "2026-01-13")], "c", "2026-01-12")).toBe(0);
  });
});

describe("A4b the counter counts per note template", () => {
  it("a concentration note does not pick up another advisor's sends of the Liquidity note", () => {
    const liq = templateFor(opportunity("opp-renner-property")!);
    const conc = templateFor(opportunity("opp-renner-concentration")!);
    expect(conc).not.toBe(liq);
    expect(countRetailRecipients(PRIOR_DISTRIBUTIONS, liq, PROTOTYPE_TODAY)).toBe(6);
    expect(countRetailRecipients(PRIOR_DISTRIBUTIONS, conc, PROTOTYPE_TODAY)).toBe(0);
  });
});

describe("A5 compose and policy checks, every candidate, full and brief", () => {
  it("every candidate of every proposable opportunity passes every check at both lengths", () => {
    let n = 0;
    for (const o of OPPORTUNITIES) {
      const ev = retrieve(o);
      if (ev.refused) continue;
      const h = household(o.householdId)!;
      for (const e of evaluateAll(o, h)) {
        for (const length of ["full", "brief"] as const) {
          const d = compose(h, o, e, product(e.candidate.productId)!, ev.passages, { length });
          const r = runChecks({ draft: d.text, sources: d.sources, citedTitles: d.citedTitles, recipients: addressees(h).length, recordedRegime: "correspondence" });
          expect(r.filter((x) => !x.pass), `${e.candidate.id} ${length}`).toEqual([]);
          n++;
        }
      }
    }
    expect(n).toBeGreaterThan(60);
  });

  it("the call-first rule blocks approval until the advisor confirms the call", () => {
    const o = opportunity("opp-renner-property")!;
    const ev = retrieve(o);
    if (ev.refused) throw new Error("expected evidence");
    const d = compose(renner, o, evaluateAll(o, renner)[0], product("prod-tsy-ladder")!, ev.passages);
    const base = { draft: d.text, sources: d.sources, citedTitles: d.citedTitles, recipients: 2, recordedRegime: "correspondence" as const };
    expect(runChecks(base).some((c) => c.id === "call-first")).toBe(false);
    expect(runChecks({ ...base, callFirst: { required: true, confirmed: false } }).find((c) => c.id === "call-first")!.pass).toBe(false);
    expect(runChecks({ ...base, callFirst: { required: true, confirmed: true } }).find((c) => c.id === "call-first")!.pass).toBe(true);
    expect(resolveProfile({ clientId: "hh-okafor-lind" }).values["contact.callBeforeNote"]).toBe(true);
  });
});

describe("A6 refusal and partial evidence", () => {
  it("a refused opportunity is left out of the review pack's decisions", () => {
    expect(reviewPack("hh-pell")!.decisions.map((d) => d.opportunity.id)).not.toContain("opp-pell-market");
  });
  it("a citation that does not resolve is reported even when others do", () => {
    const r = retrieve({ ...opportunity("opp-renner-property")!, evidenceDocIds: ["doc-liquidity-note", "doc-missing"] });
    expect(r.refused).toBe(false);
    expect(r.missing).toEqual(["doc-missing"]);
  });
});

describe("A7 paperwork at exactly the escalation day", () => {
  it("firm 14 days: day 14 is due, day 15 is escalated", () => {
    expect(paperStatus({ form: "x", requestedDay: -14 }, 0, 14).status).toBe("due");
    expect(paperStatus({ form: "x", requestedDay: -15 }, 0, 14).status).toBe("escalated");
  });
  it("Wealth Advice Center 7 days applies to its clients", () => {
    const pell = { ...clientFile("hh-pell")!, paperwork: [{ form: "a", requestedDay: -7 }, { form: "b", requestedDay: -8 }] };
    expect(openItems(pell).map((w) => w.status)).toEqual(["due", "escalated"]);
  });
});

describe("A8 servicing: money movement is never missed", () => {
  const k = (text: string) => classify({ id: "x", clientId: "hh-renner", receivedHoursAgo: 0, channel: "Email", text });
  it.each([
    "Please transfer $50,000 to my new account at another bank",
    "Send 25k to my daughter's account",
    "Wiring instructions attached for the closing",
    "Set up an ACH to my checking",
    "Change the bank account my monthly distribution goes to",
    "Please update my address and wire $10K today",
    "Can you move the money to Chase this week",
  ])("money movement, case %#", (text) => expect(k(text)).toMatchObject({ kind: "Money movement", callbackRequired: true }));
  it.each([
    ["Can you get the transfer value of my UK pension moved here?", "Transfer in"],
    ["Set up this year's required withdrawal, paid monthly.", "Distribution set-up"],
    ["Please update my mailing address.", "Account details"],
    ["What happens to my old 401(k) if I don't sign the form yet?", "Question"],
  ])("not money movement, case %#", (text, kind) => expect(k(text).kind).toBe(kind));
});

describe("A9 learning loop", () => {
  const rej = (day: number): BehaviorEvent => ({ day, advisorId: "adv-b", type: "suggestion_rejected", scope: "advisor", scopeId: "adv-b", key: "triage.classWeights", detail: "plan_service_event" });
  const held = (events: BehaviorEvent[]) => suggest({ events }).find((s) => s.id === "adv-b:weight:plan_service_event")?.heldBack;
  const base = EVENTS.filter((e) => e.type !== "suggestion_rejected");

  it("the most recent decline sets the cooling-off, whatever the log order", () => {
    expect(held([...base, rej(-20), rej(-2)])).toMatch(/declined this 2 days ago/);
    expect(held([...base, rej(-2), rej(-20)])).toMatch(/declined this 2 days ago/);
  });

  it("events after today are ignored, and the window is the 30 days ending today", () => {
    const future = base.map((e) => ({ ...e, day: 5 }));
    expect(suggest({ events: future })).toEqual([]);
    const at = (day: number) => Array.from({ length: 5 }, () => ({ day, advisorId: "adv-a", clientId: "hh-renner", type: "draft_edited" as const, change: "shortened" as const }));
    expect(suggest({ events: at(-29) }).map((s) => s.id)).toEqual(["hh-renner:length"]);
    expect(suggest({ events: at(-30) })).toEqual([]);
  });

  it("note length needs the configured minimum of events, like every other learner", () => {
    const four = Array.from({ length: 4 }, () => ({ day: -1, advisorId: "adv-a", clientId: "hh-renner", type: "draft_edited" as const, change: "shortened" as const }));
    expect(suggest({ events: four })).toEqual([]);
  });

  it("a malformed event never crashes the loop: the guard stops the suggestion and reports it", () => {
    const bad = Array.from({ length: 5 }, () => ({ day: -1, advisorId: "adv-b", clientId: "hh-pell", type: "client_response" as const, channel: "sms", responded: true }));
    const refused: Refused[] = [];
    expect(() => suggest({ events: bad, refused })).not.toThrow();
    expect(refused.map((r) => r.id)).toEqual(["hh-pell:channel"]);
  });

  it("the list-size evidence names the real maximum, even when the proposal is clamped to the minimum", () => {
    const days = Array.from({ length: 5 }, () => ({ day: -1, advisorId: "adv-a", type: "day_end" as const, worked: 2 }));
    const s = suggest({ events: days }).find((x) => x.id === "adv-a:cap")!;
    expect(s.to).toBe(5);
    expect(s.because).toMatch(/never more than 2,/);
  });

  it("a client's suggestions follow the client's own advisor, not whoever logged the first event", () => {
    const ev = Array.from({ length: 5 }, () => ({ day: -1, advisorId: "adv-b", clientId: "hh-renner", type: "draft_edited" as const, change: "shortened" as const }));
    expect(suggest({ events: ev }).find((s) => s.id === "hh-renner:length")!.advisorId).toBe("adv-a");
  });

  it("an advisor with learning switched off gets no suggestions", () => {
    const ap = ADVISOR_PROFILES.find((a) => a.advisorId === "adv-b")!;
    ap.learning = false;
    try {
      expect(suggest().some((s) => s.advisorId === "adv-b")).toBe(false);
    } finally {
      ap.learning = true;
    }
  });

  it("a weight already at the schema minimum is never proposed lower", () => {
    const overlay = { advisor: { "adv-a": { "triage.classWeights": { market_view: 0.3 } } } };
    expect(suggest({ overlay }).some((s) => s.id === "adv-a:weight:market_view")).toBe(false);
  });
});

describe("A10 resolveProfile never takes an out-of-bounds or malformed value", () => {
  it("overlay values outside the schema are ignored and reported", () => {
    const r = resolveProfile({ clientId: "hh-renner" }, { advisor: { "adv-a": { "triage.dailyCap": 1000, "triage.classWeights": { rumour: 0.5 } } }, client: { "hh-renner": { "paperwork.escalateAfterDays": 0, "note.length": "essay" } } });
    expect(r.values["triage.dailyCap"]).toBe(12);
    expect(r.values["paperwork.escalateAfterDays"]).toBe(14);
    expect(r.values["note.length"]).toBe("full");
    expect(Object.keys(r.values["triage.classWeights"])).not.toContain("rumour");
    expect(r.ignored.filter((x) => x.includes("ignored:"))).toHaveLength(4);
  });
  it("a string where a number belongs does not tighten a rule", () => {
    const r = resolveProfile({ clientId: "hh-pell" }, { client: { "hh-pell": { "paperwork.escalateAfterDays": "3" } } });
    expect(r.values["paperwork.escalateAfterDays"]).toBe(7);
  });
});
