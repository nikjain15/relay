import { describe, it, expect } from "vitest";
import { HOUSEHOLDS, household } from "@/lib/fixtures/households";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { SHELF } from "@/lib/fixtures/shelf";
import { CORPUS } from "@/lib/fixtures/corpus";
import { BOOK } from "@/lib/fixtures/book";
import { investableUsd, liquidityMonths, singleNamePct } from "@/lib/household-math";

describe("fixture numbers the PRD and demo depend on", () => {
  it("Renner: $62.4M, two persons, 71% single name, Liquidity 0 of 36", () => {
    const h = household("hh-renner")!;
    expect(investableUsd(h)).toBe(62_400_000);
    expect(h.totalUsd).toBe(62_400_000);
    expect(h.persons).toHaveLength(2);
    expect(Math.round(singleNamePct(h))).toBe(71);
    expect(h.goals.find((g) => g.strategy === "Liquidity")).toMatchObject({ funded: 0, target: 36 });
  });

  it("Alcott: $8.4M, Liquidity 11 of 36", () => {
    const h = household("hh-alcott")!;
    expect(investableUsd(h)).toBe(8_400_000);
    expect(h.goals.find((g) => g.strategy === "Liquidity")).toMatchObject({ funded: 11, target: 36 });
  });

  it("every household's holdings sum to its total, and Liquidity months derive from cash", () => {
    for (const h of HOUSEHOLDS) {
      expect(investableUsd(h), h.id).toBe(h.totalUsd);
      expect(liquidityMonths(h), h.id).toBe(h.goals.find((g) => g.strategy === "Liquidity")!.funded);
    }
  });

  it("opportunities cover all five trigger classes and the flagship is an external event", () => {
    expect(new Set(OPPORTUNITIES.map((o) => o.triggerClass)).size).toBe(5);
    expect(OPPORTUNITIES.find((o) => o.id === "opp-renner-property")!.triggerClass).toBe("external_event");
    for (const o of OPPORTUNITIES) expect(household(o.householdId), o.id).toBeDefined();
  });

  it("corpus uses relative days only, and no document names a real Chief Investment Office", () => {
    for (const d of CORPUS) {
      expect(Number.isInteger(d.day)).toBe(true);
      expect(`${d.title} ${d.passages.map((p) => p.text).join(" ")}`).not.toMatch(/\b(19|20)\d\d-\d\d-\d\d\b|Chief Investment Office|\bCIO\b/);
    }
  });

  it("the book has 13 two-person households", () => {
    expect(BOOK.filter((b) => b.persons === 2)).toHaveLength(13);
    expect(SHELF.length).toBe(8);
  });
});

describe("personas are cited composites", () => {
  it("every household and advisor lists at least one https source", async () => {
    const { ADVISORS } = await import("@/lib/fixtures/advisors");
    for (const p of [...HOUSEHOLDS, ...ADVISORS]) {
      expect(p.groundedIn.length, p.id).toBeGreaterThan(0);
      for (const s of p.groundedIn) expect(s.url, p.id).toMatch(/^https:\/\//);
    }
  });
});
