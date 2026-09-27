import { describe, it, expect } from "vitest";
import { discover, toOpportunity, EXTRACTORS } from "@/lib/discovery/discover";
import { CLIENTS } from "@/lib/data";
import { retrieve } from "@/lib/evidence/retrieve";
import type { ClientFile } from "@/lib/types";

/**
 * The discovery agent reads what clients said and proposes. Every candidate
 * cites the sentence and the record it came from, carries a confidence, and
 * is matched to corpus documents; a candidate with none arrives saying so and
 * is refused by the evidence layer if accepted. It never adds to the list.
 */
const base = CLIENTS[0];
const withText = (texts: string[], kind: "message" | "note" = "message"): ClientFile => ({
  ...base,
  id: "hh-t",
  name: "T",
  opportunities: [],
  notes: kind === "note" ? texts.map((t) => ({ from: "x", day: -1, text: t })) : [],
  contactHistory: [],
  messages: kind === "message" ? texts.map((t, i) => ({ id: `m${i}`, connectorId: "microsoft-365", channel: "email", direction: "inbound" as const, day: -2, text: t })) : [],
});

describe("discovery", () => {
  it("finds the events in the shipped book and cites each to its sentence", () => {
    const ks = discover();
    expect(ks.length).toBeGreaterThanOrEqual(6);
    for (const k of ks) {
      expect(k.source.excerpt.length).toBeGreaterThan(5);
      expect(k.confidence).toBeGreaterThan(0.5);
      expect(k.confidence).toBeLessThan(1);
      const c = CLIENTS.find((x) => x.id === k.clientId)!;
      const record = k.source.kind === "message" ? c.messages.find((m) => m.id === k.source.id)?.text : k.source.kind === "note" ? c.notes[Number(k.source.id.match(/\d+/)![0])].text : c.contactHistory[Number(k.source.id.match(/\d+/)![0])].summary;
      expect(record, `${k.id} cites a record that exists`).toContain(k.source.excerpt.replace(/…$/, "").slice(0, 30));
    }
    expect(ks.map((k) => k.id)).toEqual(expect.arrayContaining(["disc-brandvold-relocation", "disc-marchetti-oyelaran-third-party", "disc-desrosiers-retirement"]));
  });

  it("does not read an inherited holding as an inheritance, nor grandchildren as a birth", () => {
    expect(discover([withText(["Reluctant to sell any of the inherited holding."])]).map((k) => k.extractor.id)).toEqual([]);
    expect(discover([withText(["Received an inheritance from an aunt; roughly four hundred thousand."])]).map((k) => k.extractor.id)).toEqual(["inheritance"]);
    expect(discover([withText(["Wants to set something up for the grandchildren's school fees."])]).map((k) => k.extractor.id)).toEqual(["education"]);
  });

  it("reads a colleague's note at ten points less confidence than the client's own words", () => {
    const own = discover([withText(["We've just accepted an offer on the house."])])[0];
    const note = discover([withText(["Client says they accepted an offer on the house."], "note")])[0];
    expect(own.extractor.id).toBe("property-sale");
    expect(note.confidence).toBeCloseTo(own.confidence - 0.1, 5);
  });

  it("marks a candidate as a duplicate when the list already carries that class for the household", () => {
    const c = { ...withText(["Retiring at the end of next year."]), opportunities: [{ ...base.opportunities[0], triggerClass: "life_event" as const, strategy: "Longevity" as const }] };
    expect(discover([c])[0].duplicate).toBe(true);
  });

  it("one sentence, one candidate per kind; every extractor has a query the corpus answers or an honest empty", () => {
    const k = discover([withText(["Retiring next year, retiring for good, pension packet arrived."])]);
    expect(k.filter((x) => x.extractor.id === "retirement")).toHaveLength(1);
    for (const x of EXTRACTORS) expect(x.query.length).toBeGreaterThan(10);
  });

  it("an accepted candidate becomes an opportunity whose evidence is what retrieval will actually cite, or a refusal", () => {
    for (const k of discover()) {
      const o = toOpportunity(k);
      expect(o.householdId).toBe(k.clientId);
      expect(o.reasonPath[0].label).toContain(k.source.id);
      const ev = retrieve(o);
      expect(ev.refused).toBe(k.evidence.length === 0);
    }
  });

  it("never adds anything to the list on its own", () => {
    const before = CLIENTS.flatMap((c) => c.opportunities).length;
    discover();
    expect(CLIENTS.flatMap((c) => c.opportunities).length).toBe(before);
  });
});
