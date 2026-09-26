import { describe, it, expect } from "vitest";
import { rank, score } from "@/lib/ranking/rank";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";

describe("ranking", () => {
  it("puts the external-event flagship first", () => {
    expect(rank(OPPORTUNITIES)[0].id).toBe("opp-renner-property");
  });
  it("respects the cap and excludes dismissed rows", () => {
    expect(rank(OPPORTUNITIES, new Set(), 3)).toHaveLength(3);
    expect(rank(OPPORTUNITIES, new Set(["opp-renner-property"]))[0].id).not.toBe("opp-renner-property");
  });
  it("is deterministic and weights market views lowest", () => {
    expect(rank(OPPORTUNITIES).map((o) => o.id)).toEqual(rank([...OPPORTUNITIES].reverse()).map((o) => o.id));
    const pell = OPPORTUNITIES.find((o) => o.id === "opp-pell-market")!;
    expect(score(pell)).toBeLessThan(pell.materiality);
  });
});
