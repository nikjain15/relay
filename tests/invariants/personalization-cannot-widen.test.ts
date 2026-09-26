import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { runChecks } from "@/lib/policy/checks";
import { compose } from "@/lib/drafting/compose";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { retrieve } from "@/lib/evidence/retrieve";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { product } from "@/lib/fixtures/shelf";
import { rank } from "@/lib/ranking/rank";

/**
 * Personalization orders, sizes and words things. It never changes what is
 * allowed (R-19). dependency-cruiser forbids the import; this test also scans
 * the source and checks the outputs that matter under extreme settings.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));

describe("personalization cannot widen what is allowed", () => {
  it("eligibility, compliance checks, the counter and evidence never read a profile or the learning loop", () => {
    for (const dir of ["lib/constraints", "lib/policy", "lib/recipients", "lib/evidence"]) {
      for (const f of readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" }).filter((x) => /\.tsx?$/.test(x))) {
        const src = readFileSync(join(ROOT, dir, f), "utf8");
        expect(/@\/lib\/(profile|learning)|data\/(profiles|events)/.test(src), `${dir}/${f}`).toBe(false);
      }
    }
  });

  it("a brief note keeps its citation, figures and disclosure: every brief draft passes every check", () => {
    let n = 0;
    for (const opp of OPPORTUNITIES) {
      const h = household(opp.householdId)!;
      const ev = retrieve(opp);
      if (ev.refused) continue;
      for (const e of evaluateAll(opp, h).filter((x) => x.pass)) {
        const d = compose(h, opp, e, product(e.candidate.productId)!, ev.passages, { length: "brief" });
        const r = runChecks({ draft: d.text, sources: d.sources, citedTitles: d.citedTitles, recipients: h.persons.length, recordedRegime: "correspondence" });
        expect(r.filter((x) => !x.pass), `${opp.id} ${e.candidate.id}`).toEqual([]);
        n++;
      }
    }
    expect(n).toBeGreaterThan(5);
  });

  it("extreme weights reorder the list but never add a dismissed item or exceed the cap", () => {
    const low = { external_event: 0.3, life_event: 0.3, household_threshold: 0.3, plan_service_event: 0.3, market_view: 1 };
    const dismissed = new Set([OPPORTUNITIES[0].id]);
    const r = rank(OPPORTUNITIES, dismissed, 5, low);
    expect(r).toHaveLength(5);
    expect(r.some((o) => dismissed.has(o.id))).toBe(false);
    expect(new Set(rank(OPPORTUNITIES, new Set(), 99, low).map((o) => o.id))).toEqual(new Set(rank(OPPORTUNITIES, new Set(), 99).map((o) => o.id)));
  });
});
