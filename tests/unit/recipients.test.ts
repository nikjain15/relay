import { describe, it, expect } from "vitest";
import { classify, countRetailRecipients, regimeAfter, type Distribution } from "@/lib/recipients/count";

const C = "note-concentration-v1";
const dist = (personId: string, date: string, extra: Partial<Distribution> = {}): Distribution => ({
  communicationId: C,
  personId,
  advisorId: "adv-a",
  institutional: false,
  date,
  ...extra,
});
const people = (n: number, date: string, advisorId = "adv-a") =>
  Array.from({ length: n }, (_, i) => dist(`${advisorId}-p${i}`, date, { advisorId }));

describe("2210 regime boundary", () => {
  it("24 and 25 are correspondence; 26 is a retail communication", () => {
    expect(classify(24)).toBe("correspondence");
    expect(classify(25)).toBe("correspondence");
    expect(classify(26)).toBe("retail communication");
  });
});

describe("counts persons, not households", () => {
  it("13 two-person households cross the threshold", () => {
    const d = Array.from({ length: 13 }, (_, h) => [dist(`h${h}-a`, "2026-01-10"), dist(`h${h}-b`, "2026-01-10")]).flat();
    expect(countRetailRecipients(d, C, "2026-01-10")).toBe(26);
  });

  it("the same person twice counts once", () => {
    expect(countRetailRecipients([dist("p1", "2026-01-01"), dist("p1", "2026-01-05")], C, "2026-01-05")).toBe(1);
  });
});

describe("counts firm-wide, not per advisor", () => {
  it("two advisors at 13 each is 26", () => {
    const d = [...people(13, "2026-01-10", "adv-a"), ...people(13, "2026-01-10", "adv-b")];
    expect(regimeAfter([], d, C, "2026-01-10")).toEqual({ count: 26, regime: "retail communication" });
  });
});

describe("window and exclusions", () => {
  it("day 30 is inside the window and day 31 is outside", () => {
    const d = [dist("old", "2026-01-01"), ...people(25, "2026-01-30")];
    expect(countRetailRecipients(d, C, "2026-01-30")).toBe(26);
    expect(countRetailRecipients(d, C, "2026-01-31")).toBe(25);
  });

  it("institutional investors and other communications are not counted", () => {
    const d = [
      ...people(25, "2026-01-10"),
      dist("inst", "2026-01-10", { institutional: true }),
      dist("other", "2026-01-10", { communicationId: "note-other" }),
    ];
    expect(countRetailRecipients(d, C, "2026-01-10")).toBe(25);
  });
});
