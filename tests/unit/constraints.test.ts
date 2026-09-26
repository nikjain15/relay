import { describe, it, expect } from "vitest";
import { evaluate, evaluateAll } from "@/lib/constraints/evaluate";
import { household } from "@/lib/fixtures/households";
import { opportunity } from "@/lib/fixtures/opportunities";
import { product } from "@/lib/fixtures/shelf";
import type { Candidate } from "@/lib/types";

const renner = household("hh-renner")!;
const cand = (productId: string, over: Partial<Candidate> = {}): Candidate => ({
  id: "t",
  productId,
  action: "trim",
  source: "sell_long_term_lots",
  amountUsd: 28_704_000,
  ...over,
});
const rules = (productId: string, over: Partial<Candidate> = {}) =>
  evaluate(cand(productId, over), product(productId)!, renner).failures.map((f) => f.rule);

describe("each constraint fails on the Renner fixture for the right product", () => {
  it("excluded product type", () => expect(rules("prod-private-credit")).toContain("Excluded product type"));
  it("risk level", () => expect(rules("prod-sector-etf")).toContain("Risk level"));
  it("liquidity minimum", () => expect(rules("prod-exchange-fund", { source: "contribute_in_kind" })).toContain("Liquidity minimum"));
  it("tax-lot holding period", () => expect(rules("prod-core-model", { source: "sell_all_lots" })).toContain("Tax-lot holding period"));
  it("concentration when the trim is too small", () => expect(rules("prod-core-model", { amountUsd: 1_000_000 })).toContain("Concentration"));
  it("a compliant candidate passes", () => expect(rules("prod-core-model")).toEqual([]));
});

describe("the worked example", () => {
  it("concentration trim: long-term lots into the core model pass; all lots are rejected for holding period", () => {
    const evs = evaluateAll(opportunity("opp-renner-concentration")!, renner);
    const byId = (id: string) => evs.find((e) => e.candidate.id.endsWith(id))!;
    expect(byId("prod-core-model:sell_long_term_lots").pass).toBe(true);
    expect(byId("prod-core-model:sell_all_lots").failures.map((f) => f.rule)).toEqual(["Tax-lot holding period"]);
  });

  it("property proceeds fund Liquidity: only instruments fit for a Liquidity strategy pass", () => {
    const evs = evaluateAll(opportunity("opp-renner-property")!, renner);
    const passing = evs.filter((e) => e.pass).map((e) => e.candidate.productId).sort();
    expect(passing).toEqual(["prod-mmf", "prod-muni-ladder", "prod-tsy-ladder"]);
    for (const e of evs) expect(e.candidate.amountUsd).toBe(3_060_000);
  });

  it("review actions produce no product candidates", () => {
    expect(evaluateAll(opportunity("opp-okafor-life")!, household("hh-okafor-lind")!)).toEqual([]);
  });
});

describe("nothing to trim means no candidates", () => {
  it("Pell holds no single-name position, so a trim yields no proposals", () => {
    expect(evaluateAll(opportunity("opp-pell-market")!, household("hh-pell")!)).toEqual([]);
  });
});
