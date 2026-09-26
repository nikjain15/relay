import { describe, it, expect } from "vitest";
import { resolveProfile, SEGMENTS, FIRM } from "@/lib/profile";
import { validateProfiles } from "@/lib/profile/validate";

describe("resolveProfile: four layers", () => {
  it("a Wealth Advice Center client takes the segment's settings, with provenance", () => {
    const r = resolveProfile({ clientId: "hh-pell" });
    expect(r.values["triage.dailyCap"]).toBe(20);
    expect(r.values["note.length"]).toBe("brief");
    expect(r.provenance["note.length"]).toBe("segment:wealth-advice-center");
    expect(r.values["paperwork.escalateAfterDays"]).toBe(7);
    expect(r.version).toBe("firm@1 segment:wealth-advice-center@1 advisor:adv-b@1 client:hh-pell@1");
  });

  it("preferences: the most specific layer wins", () => {
    expect(resolveProfile({ clientId: "hh-renner" }).values["contact.channel"]).toBe("email");
    const ok = resolveProfile({ clientId: "hh-okafor-lind" });
    expect(ok.values["contact.channel"]).toBe("call");
    expect(ok.provenance["contact.channel"]).toBe("client:hh-okafor-lind");
    const learned = resolveProfile({ clientId: "hh-renner" }, { client: { "hh-renner": { "note.length": "brief" } } });
    expect(learned.values["note.length"]).toBe("brief");
    expect(learned.provenance["note.length"]).toBe("client:hh-renner (learned)");
  });

  it("weights merge per class, so one learned class leaves the others alone", () => {
    const r = resolveProfile({ advisorId: "adv-a" }, { advisor: { "adv-a": { "triage.classWeights": { market_view: 0.6 } } } });
    expect(r.values["triage.classWeights"].market_view).toBe(0.6);
    expect(r.values["triage.classWeights"].external_event).toBe(1);
  });

  it("rules: the strictest layer wins and a looser value is ignored", () => {
    const looser = resolveProfile({ clientId: "hh-pell" }, { client: { "hh-pell": { "paperwork.escalateAfterDays": 30 } } });
    expect(looser.values["paperwork.escalateAfterDays"]).toBe(7);
    expect(looser.ignored.join()).toContain("would loosen paperwork.escalateAfterDays");
    const stricter = resolveProfile({ clientId: "hh-pell" }, { client: { "hh-pell": { "paperwork.escalateAfterDays": 3 } } });
    expect(stricter.values["paperwork.escalateAfterDays"]).toBe(3);
    const off = resolveProfile({ clientId: "hh-okafor-lind" }, { client: { "hh-okafor-lind": { "contact.callBeforeNote": false } } });
    expect(off.values["contact.callBeforeNote"]).toBe(true);
  });

  it("a layer may set only the keys the schema allows it", () => {
    const r = resolveProfile({ advisorId: "adv-a" }, { advisor: { "adv-a": { "contact.channel": "portal" } } });
    expect(r.values["contact.channel"]).toBe("email");
    expect(r.ignored.join()).toContain("may not set contact.channel");
  });
});

describe("validateProfiles", () => {
  it("passes on the data as shipped", () => expect(validateProfiles()).toEqual([]));

  it("fails on an out-of-range value, a looser rule and a disallowed layer (planted, then removed)", () => {
    const seg = SEGMENTS[1];
    const saved = { ...seg.values };
    seg.values = { ...saved, "triage.dailyCap": 99, "paperwork.escalateAfterDays": 30, "contact.window": "x" };
    try {
      const e = validateProfiles().join("\n");
      expect(e).toContain("triage.dailyCap must be a number from 5 to 20");
      expect(e).toContain(`would loosen the firm rule (${String(FIRM.values["paperwork.escalateAfterDays"])})`);
      expect(e).toContain("the segment layer may not set contact.window");
    } finally {
      seg.values = saved;
    }
    expect(validateProfiles()).toEqual([]);
  });
});
