import { describe, it, expect } from "vitest";
import { CLIENTS, CONNECTORS_DATA } from "@/lib/data";
import { applyCandidate, simulable, simulate, simulateAll } from "@/lib/simulate/simulate";
import { policyFrom, SEED_EDITS } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { connectedIds } from "@/lib/compliance/sweep";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { investableUsd, liquidityMonths, singleNamePct } from "@/lib/household-math";
import { product } from "@/lib/fixtures/shelf";
import { APP } from "@/lib/data/policy";

/**
 * The consequence agent: the household the morning after an action, run through
 * the same engines as the household today. Figures below are recomputed from
 * the client file by hand, not read back from the engine.
 */
const ctx = (advisorId: string) => ({ policy: policyFrom(SEED_EDITS, scopeFor(advisorId)), connected: connectedIds(advisorId, CONNECTORS_DATA.connections) });
const renner = CLIENTS.find((c) => c.id === APP.featured.clientId)!;
const property = renner.opportunities.find((o) => o.id === APP.featured.opportunityId)!;
const trim = renner.opportunities.find((o) => o.action === "trim")!;

describe("applyCandidate", () => {
  it("moves new cash into the product and nothing else", () => {
    const c = evaluateAll(property, renner).find((e) => e.candidate.source === "new_cash")!.candidate;
    const after = applyCandidate(renner, c, product(c.productId)!, property.strategy);
    expect(investableUsd(after)).toBe(investableUsd(renner) + c.amountUsd);
    expect(after.holdings.find((h) => h.productId === c.productId)!.valueUsd).toBe((renner.holdings.find((h) => h.productId === c.productId)?.valueUsd ?? 0) + c.amountUsd);
    expect(renner.holdings.map((h) => h.valueUsd)).toEqual(CLIENTS.find((x) => x.id === renner.id)!.holdings.map((h) => h.valueUsd)); // the original is untouched
  });

  it("sells the single name down and never below zero", () => {
    const c = evaluateAll(trim, renner).find((e) => e.candidate.source === "sell_long_term_lots")!.candidate;
    const after = applyCandidate(renner, c, product(c.productId)!, trim.strategy);
    const cap = renner.constraints.find((k) => k.kind === "maxSingleName")!;
    expect(singleNamePct(after)).toBeLessThanOrEqual((cap.kind === "maxSingleName" ? cap.pct : 0) + 0.01);
    expect(after.holdings.every((h) => h.valueUsd > 0)).toBe(true);
    expect(investableUsd(after)).toBe(investableUsd(renner)); // a trim moves money, it does not create it
  });
});

describe("simulate", () => {
  it("recomputes Liquidity months from the copy, by the same arithmetic", () => {
    const { policy, connected } = ctx(renner.advisorId);
    const c = evaluateAll(property, renner).find((e) => e.pass)!.candidate;
    const s = simulate(renner, property, c, policy, connected);
    const liq = s.consequences.find((x) => x.key === "liquidity")!;
    expect(liq.before).toBe(`${liquidityMonths(renner)} months`);
    expect(liq.after).toBe(`${liquidityMonths(s.after)} months`);
    expect(liquidityMonths(s.after)).toBeGreaterThan(liquidityMonths(renner));
  });

  it("shows the concentration finding clearing the morning after a trim, and grades the tax-lot breach blocked", () => {
    const { policy, connected } = ctx(renner.advisorId);
    const sims = simulateAll(renner, trim, policy, connected);
    const ok = sims.find((s) => s.candidate.source === "sell_long_term_lots" && s.constraints.pass)!;
    expect(ok.rules.changes.map((r) => `${r.ruleId}:${r.from}>${r.to}`)).toContain("finra-2111-suitability:flag>clear");
    const all = sims.find((s) => s.candidate.source === "sell_all_lots")!;
    expect(all.grade).toBe("blocked");
    expect(all.supervisorQuestions.some((q) => q.includes("Tax-lot holding period"))).toBe(true);
  });

  it("never assumes a price move: a fund from core leaves total assets unchanged", () => {
    const alcott = CLIENTS.find((c) => c.id === APP.featured.reviewClientId)!;
    const opp = simulable(alcott).find((o) => !o.inflowUsd)!;
    const { policy, connected } = ctx(alcott.advisorId);
    for (const s of simulateAll(alcott, opp, policy, connected)) {
      expect(investableUsd(s.after)).toBe(investableUsd(alcott));
      expect(s.trace.at(-1)!.title).toBe("Graded it");
    }
  });

  it("carries a capital call into the supervisor's questions", () => {
    const t = CLIENTS.find((c) => c.opportunities.some((o) => o.outflowUsd))!;
    const opp = t.opportunities.find((o) => o.outflowUsd)!;
    const { policy, connected } = ctx(t.advisorId);
    const s = simulateAll(t, opp, policy, connected).find((x) => x.constraints.pass)!;
    expect(s.supervisorQuestions.some((q) => q.includes(opp.outflowLabel ?? "outflow"))).toBe(true);
  });

  it("grades clean only when every rule is met, no verdict worsens and evidence is cited", () => {
    for (const c of CLIENTS) {
      const { policy, connected } = ctx(c.advisorId);
      for (const o of simulable(c)) for (const s of simulateAll(c, o, policy, connected)) {
        if (s.grade === "clean") {
          expect(s.constraints.pass).toBe(true);
          expect(s.evidence.refused).toBe(false);
          expect(s.rules.changes.filter((r) => r.to !== "clear")).toEqual([]);
        }
        if (!s.constraints.pass || s.evidence.refused) expect(s.grade).toBe("blocked");
        expect(s.humanGate.length).toBeGreaterThanOrEqual(3);
      }
    }
  });
});
