import { describe, it, expect } from "vitest";
import { validate } from "@/lib/data/validate";
import { getClientFile, CLIENTS } from "@/lib/data";

describe("data/ is valid", () => {
  it("every file passes shape and cross-reference checks", () => {
    expect(validate()).toEqual([]);
  });

  it("twelve clients across three advisors, four with a walkthrough story", () => {
    expect(CLIENTS).toHaveLength(12);
    expect(new Set(CLIENTS.map((c) => c.advisorId)).size).toBe(3);
    expect(CLIENTS.filter((c) => c.walkthrough).map((c) => c.id).sort()).toEqual(["hh-alcott", "hh-pell", "hh-renner", "hh-thornbury"]);
  });
});

describe("getClientFile grounds retrieval and chat", () => {
  it("returns the client, advisor, opportunities and every cited document", () => {
    const f = getClientFile("renner")!;
    expect(f.client.name).toBe("Renner");
    expect(f.advisor?.id).toBe("adv-a");
    expect(f.opportunities.map((o) => o.id)).toContain("opp-renner-property");
    expect(f.documents.map((d) => d.id).sort()).toEqual(["doc-concentration-note", "doc-exchange-fund", "doc-liquidity-note", "doc-tsy-onepager"]);
  });

  it("never returns a document the client's opportunities do not cite", () => {
    const f = getClientFile("hh-pell")!;
    expect(f.advisor?.id).toBe("adv-b");
    expect(f.documents.map((d) => d.id)).not.toContain("doc-review-procedure");
  });

  it("returns nothing for an unknown client", () => {
    expect(getClientFile("nobody")).toBeUndefined();
  });
});
