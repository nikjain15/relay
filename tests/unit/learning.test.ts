import { describe, it, expect } from "vitest";
import { suggest, guard, EVENTS, type Suggestion } from "@/lib/learning/learn";
import { SCHEMA, KEYS } from "@/lib/profile";

describe("the learning loop", () => {
  const ids = (xs: Suggestion[]) => xs.map((s) => s.id).sort();

  it("proposes from the behavior log, each with evidence and a measure", () => {
    const s = suggest();
    expect(ids(s)).toEqual(["adv-a:order", "adv-a:sort", "adv-a:weight:market_view", "adv-b:cap", "adv-b:weight:plan_service_event", "adv-c:cap", "adv-c:weight:market_view", "hh-alcott:channel", "hh-pell:channel", "hh-thornbury:length"]);
    for (const x of s) {
      expect(x.because.length).toBeGreaterThan(10);
      expect(x.measure.length).toBeGreaterThan(10);
      expect(x.evidence.events).toBeGreaterThanOrEqual(4);
    }
    expect(s.find((x) => x.id === "adv-b:cap")!.to).toBe(12);
    expect(s.find((x) => x.id === "hh-alcott:channel")!.to).toBe("call");
  });

  it("never proposes a rule", () => {
    const rules = KEYS.filter((k) => SCHEMA[k].kind === "rule");
    expect(suggest().some((s) => rules.includes(s.key))).toBe(false);
    const planted = { ...suggest()[0], key: "paperwork.escalateAfterDays" as const, scope: "client" as const, to: 30 };
    expect(() => guard(planted)).toThrow(/rule/);
  });

  it("stays inside the schema's bounds", () => {
    const s = suggest().find((x) => x.id === "adv-b:cap")!;
    expect(() => guard({ ...s, to: 2 })).toThrow(/from 5 to 20/);
  });

  it("holds back a declined suggestion until the cooling-off period ends", () => {
    expect(suggest().find((x) => x.id === "adv-b:weight:plan_service_event")!.heldBack).toMatch(/declined this 5 days ago/);
    const fresh = EVENTS.map((e) => (e.type === "suggestion_rejected" ? { ...e, day: -20 } : e));
    expect(suggest({ events: fresh }).find((x) => x.id === "adv-b:weight:plan_service_event")!.heldBack).toBeUndefined();
    expect(suggest({ rejected: [{ scopeId: "hh-pell", key: "contact.channel", day: 0 }] }).find((x) => x.id === "hh-pell:channel")!.heldBack).toBeDefined();
  });

  it("needs enough evidence, and ignores events outside the window", () => {
    expect(suggest({ events: EVENTS.slice(0, 3) })).toEqual([]);
    expect(suggest().some((s) => s.scopeId === "hh-vasquez-hale")).toBe(false);
  });

  it("stops proposing once the change is in effect", () => {
    const after = suggest({ overlay: { advisor: { "adv-a": { "proposals.sortBy": "cost" } }, client: { "hh-thornbury": { "note.length": "brief" } } } });
    expect(ids(after)).not.toContain("adv-a:sort");
    expect(ids(after)).not.toContain("hh-thornbury:length");
  });
});
