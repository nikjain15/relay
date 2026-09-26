import { describe, it, expect } from "vitest";
import { runChecks } from "@/lib/policy/checks";
import { compose } from "@/lib/drafting/compose";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { retrieve } from "@/lib/evidence/retrieve";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { product } from "@/lib/fixtures/shelf";

const base = { sources: ["$3.06M", "0 of 36"], citedTitles: ["Sizing a Liquidity strategy"], recipients: 2, recordedRegime: "correspondence" as const };
const ok = "Move $3.06M; 0 of 36 months. [Source: Sizing a Liquidity strategy, day 2] It is not a projection of future performance.";
const failed = (draft: string, over = {}) => runChecks({ ...base, draft, ...over }).filter((c) => !c.pass).map((c) => c.id);

describe("each policy check fails on a planted draft", () => {
  it("passes a clean draft", () => expect(failed(ok)).toEqual([]));
  it("projection", () => expect(failed(`${ok} This will return 8% a year.`)).toContain("no-projection"));
  it("unsourced figure", () => expect(failed(`${ok} Fees are $9K.`)).toContain("figures-sourced"));
  it("missing citation", () => expect(failed(ok.replace("[Source: Sizing a Liquidity strategy, day 2]", ""))).toContain("citation"));
  it("regime mismatch", () => expect(failed(ok, { recipients: 26 })).toContain("regime"));
  it("missing disclosure", () => expect(failed(ok.replace("not a projection of future performance", "")) ).toContain("disclosure"));
  // Regression: a sourced figure ending a sentence used to carry the full stop
  // into the token, so "$3.06M." read as unsourced against "$3.06M".
  it("a sourced figure at the end of a sentence is not reported as unsourced", () =>
    expect(failed("Move $3.06M. [Source: Sizing a Liquidity strategy, day 2] It is not a projection of future performance.")).not.toContain("figures-sourced"));
});

describe("every composed draft passes every check", () => {
  it("for every passing candidate of every opportunity with evidence", () => {
    let drafts = 0;
    for (const opp of OPPORTUNITIES) {
      const h = household(opp.householdId)!;
      const ev = retrieve(opp);
      if (ev.refused) continue;
      for (const e of evaluateAll(opp, h).filter((x) => x.pass)) {
        const d = compose(h, opp, e, product(e.candidate.productId)!, ev.passages);
        const results = runChecks({ draft: d.text, sources: d.sources, citedTitles: d.citedTitles, recipients: h.persons.length, recordedRegime: "correspondence" });
        expect(results.filter((r) => !r.pass), `${opp.id} ${e.candidate.id}`).toEqual([]);
        expect(d.text).not.toContain("\u2014");
        drafts++;
      }
    }
    expect(drafts).toBeGreaterThan(5);
  });

  it("the market-view opportunity with no evidence is refused", () => {
    const r = retrieve(OPPORTUNITIES.find((o) => o.id === "opp-pell-market")!);
    expect(r.refused).toBe(true);
  });
});
