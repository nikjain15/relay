import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runEval, golden } from "../../evals/run";
import { expected, coherence, ROOT } from "../../evals/expected";

/**
 * The 300-household corpus under public/samples/ is the evaluation set. The
 * expected side is worked out in evals/expected.ts from the CSV files, the
 * rule parameters, the advisor files and the hand-reviewed labels, with no
 * engine imported. Anything short of full agreement fails the check.
 */
describe("evaluation corpus", () => {
  const r = runEval();
  const e = expected();

  it("is the committed corpus, whole and valid through the import path", () => {
    expect(r.corpus.households).toBe(300);
    expect(r.corpus.messages).toBe(585);
    expect(r.corpus.validationErrors).toBe(0);
    expect(e.totals.households).toBe(300);
  });

  it("is coherent as data: ages, spending against assets, whole months of cash, targets, history, channels", () => {
    expect(coherence()).toEqual([]);
  });

  it("agrees with the eval's own arithmetic on every household", () => {
    expect(r.arithmetic.disagreements).toEqual([]);
    expect(r.arithmetic.liquidityMonthsAgree).toBe(300);
    expect(r.arithmetic.totalsAgree).toBe(300);
  });

  it("finds every expected opportunity, finding and candidate, and nothing else", () => {
    const all = [r.opportunities, ...Object.values(r.rules), ...Object.values(r.cannotEvaluate), ...Object.values(r.discovery)];
    for (const s of all) {
      expect(s.misses).toEqual([]);
      expect(s.extras).toEqual([]);
      expect(s.precision).toBe(1);
      expect(s.recall).toBe(1);
    }
    expect(r.notSwept.found).toBe(r.notSwept.expected);
  });

  it("exercises every rule and every extractor at least once", () => {
    for (const rid of ["complaint-identification-4513", "finra-2111-drift", "finra-2111-suitability", "finra-3110-correspondence", "sec-marketing-206-4-1", "senior-investor-2165"]) expect(r.rules[rid]?.expected ?? 0).toBeGreaterThan(0);
    for (const k of ["property-sale", "retirement", "relocation", "inheritance", "liquidity-event", "family-change", "third-party", "excess-cash", "education"]) expect(r.discovery[k]?.expected ?? 0).toBeGreaterThan(0);
    expect(Object.keys(r.cannotEvaluate).length).toBeGreaterThan(0);
    expect(r.notSwept.expected).toBeGreaterThan(0);
  });

  it("cites every briefing claim and every opportunity", () => {
    expect(r.briefings.households).toBe(300);
    expect(r.briefings.citationsResolved).toBe(true);
    expect(r.retrieval.refused).toBe(0);
  });

  it("matches evals/golden.json; regenerate with npm run eval:write when a change is intended", () => {
    const current = JSON.parse(readFileSync(join(ROOT, "evals/golden.json"), "utf8"));
    expect(golden(r)).toEqual(current);
  });
});
