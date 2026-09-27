import { describe, it, expect } from "vitest";
import { BASELINE, resolvePolicy, activeRules } from "@/lib/compliance/policy";
import { runPolicy, evaluateRule } from "@/lib/compliance/engine";
import { policyFrom, SEED_EDITS } from "@/lib/compliance/store";
import { evaluate, explain, factsUsed, render } from "@/lib/compliance/dsl";
import type { RuleDefinition } from "@/lib/compliance/types";

const ALL_CONNECTORS = ["microsoft-365", "archive", "custodian-feed", "salesforce-fsc", "zoom", "compliant-texting"];
const rule = (id: string) => BASELINE.find((r) => r.id === id) as RuleDefinition;

describe("rule DSL", () => {
  it("is total: an unknown fact is false, never an exception", () => {
    expect(evaluate({ fact: "nope", cmp: "gt", value: 1 }, {}, {})).toBe(false);
    expect(evaluate({ fact: "nope", cmp: "exists" }, {}, {})).toBe(false);
  });

  it("reads thresholds from params so the console edits a number, not an expression", () => {
    const cond = { fact: "recipientCount30d", cmp: "gt" as const, param: "threshold" };
    expect(evaluate(cond, { recipientCount30d: 26 }, { threshold: 25 })).toBe(true);
    expect(evaluate(cond, { recipientCount30d: 26 }, { threshold: 30 })).toBe(false);
  });

  it("supports all, any and not", () => {
    const facts = { a: true, b: false };
    expect(evaluate({ all: [{ fact: "a", cmp: "eq", value: true }, { fact: "b", cmp: "eq", value: false }] }, facts, {})).toBe(true);
    expect(evaluate({ any: [{ fact: "b", cmp: "eq", value: true }, { fact: "a", cmp: "eq", value: true }] }, facts, {})).toBe(true);
    expect(evaluate({ not: { fact: "a", cmp: "eq", value: true } }, facts, {})).toBe(false);
  });

  it("explains itself and lists the facts it reads, for the console", () => {
    const r = rule("finra-2210-regime");
    expect([...factsUsed(r.when)]).toContain("recipientCount30d");
    expect(explain(r.when, { threshold: 25 })).toContain("recipientCount30d is more than 25");
  });

  it("fills placeholders in a finding", () => {
    expect(render("{n} over {threshold}", { n: 31, threshold: 25 })).toBe("31 over 25");
  });
});

describe("rules are live-configurable", () => {
  const facts = { recipientCount30d: 26, principalApproved: false };

  it("the same facts change verdict when the threshold is edited", () => {
    const base = resolvePolicy([]);
    const before = evaluateRule(activeRules(base).find((r) => r.id === "finra-2210-regime")!, {
      facts, availableConnectors: ALL_CONNECTORS,
    });
    expect(before.outcome).toBe("block");

    // An advisor tightens to 20. Still fires, as it should.
    const tightened = resolvePolicy([{ layer: "advisor", id: "adv-a", overrides: [{ ruleId: "finra-2210-regime", params: { threshold: 20 } }] }]);
    const after = evaluateRule(activeRules(tightened).find((r) => r.id === "finra-2210-regime")!, {
      facts: { recipientCount30d: 21, principalApproved: false }, availableConnectors: ALL_CONNECTORS,
    });
    expect(after.outcome).toBe("block");
    expect(after.finding).toContain("20");
  });

  it("enabling a rule the firm left off puts it in force immediately", () => {
    expect(rule("outside-business-3270").enabled).toBe(false);
    const p = resolvePolicy([{ layer: "advisor", id: "adv-a", overrides: [{ ruleId: "outside-business-3270", enabled: true }] }]);
    const active = activeRules(p).map((r) => r.id);
    expect(active).toContain("outside-business-3270");
    expect(p.rules.find((r) => r.id === "outside-business-3270")!.setBy.enabled).toBe("advisor");
  });
});

describe("a lower layer may only tighten", () => {
  it("cannot disable a mandatory rule", () => {
    const p = resolvePolicy([{ layer: "advisor", id: "adv-a", overrides: [{ ruleId: "off-channel-gap", enabled: false }] }]);
    expect(p.rules.find((r) => r.id === "off-channel-gap")!.enabled).toBe(true);
    expect(p.rejected.some((r) => r.ruleId === "off-channel-gap" && r.field === "enabled")).toBe(true);
  });

  it("cannot soften severity, and can raise it", () => {
    const down = resolvePolicy([{ layer: "advisor", id: "adv-a", overrides: [{ ruleId: "finra-2210-regime", severity: "note" }] }]);
    expect(down.rules.find((r) => r.id === "finra-2210-regime")!.severity).toBe("block");
    expect(down.rejected[0].reason).toContain("only raise severity");

    const up = resolvePolicy([{ layer: "client", id: "renner", overrides: [{ ruleId: "finra-2111-suitability", severity: "block" }] }]);
    expect(up.rules.find((r) => r.id === "finra-2111-suitability")!.severity).toBe("block");
    expect(up.rejected).toHaveLength(0);
  });

  it("cannot loosen a threshold, and records the attempt", () => {
    const p = resolvePolicy([{ layer: "advisor", id: "adv-a", overrides: [{ ruleId: "finra-2210-regime", params: { threshold: 40 } }] }]);
    const eff = p.rules.find((r) => r.id === "finra-2210-regime")!;
    expect(eff.params.find((x) => x.key === "threshold")!.value).toBe(25);
    expect(p.rejected.some((r) => r.field === "threshold")).toBe(true);
  });

  it("records provenance per field so the console can show who set what", () => {
    const p = resolvePolicy([
      { layer: "segment", id: "uhnw", overrides: [{ ruleId: "finra-2111-suitability", params: { maxConcentration: 20 } }] },
      { layer: "client", id: "renner", overrides: [{ ruleId: "finra-2111-suitability", params: { maxConcentration: 10 } }] },
    ]);
    const eff = p.rules.find((r) => r.id === "finra-2111-suitability")!;
    expect(eff.params.find((x) => x.key === "maxConcentration")!.value).toBe(10);
    expect(eff.setBy.params.maxConcentration).toBe("client");
  });
});

describe("engine", () => {
  it("cannot evaluate a rule whose connector is missing, and says which", () => {
    const p = resolvePolicy([]);
    const v = evaluateRule(activeRules(p).find((r) => r.id === "reg-bi-care-evidence")!, {
      facts: { isRecommendation: true, alternativesConsidered: 0 }, availableConnectors: [],
    });
    expect(v.outcome).toBe("cannot_evaluate");
    expect(v.missingConnectors).toContain("custodian-feed");
    expect(v.requiresHuman).toBe(true);
  });

  it("does not queue an uncertain clear when a certain fact already settles it", () => {
    // Regression. The specified-adult rule's inferred inputs sit below its floor,
    // so every account reached a principal, including a 41-year-old's: the age
    // gate rules the rule out with certainty and no flip of an inference changes
    // that. A queue full of findings like that is a queue nobody reads.
    const p = resolvePolicy([]);
    const rule = activeRules(p).find((r) => r.id === "senior-investor-2165")!;
    const young = evaluateRule(rule, {
      facts: { clientAge: 41, unusualDisbursement: false, newThirdPartyContact: false, trustedContactOnFile: true, clientId: "c" },
      availableConnectors: ALL_CONNECTORS,
      factConfidence: { unusualDisbursement: 0.7, newThirdPartyContact: 0.7 },
    });
    expect(young.outcome).toBe("clear");
    expect(young.requiresHuman).toBe(false);

    // Over the age gate, the same uncertainty decides the verdict, so it goes to a person.
    const older = evaluateRule(rule, {
      facts: { clientAge: 79, unusualDisbursement: false, newThirdPartyContact: false, trustedContactOnFile: true, clientId: "c" },
      availableConnectors: ALL_CONNECTORS,
      factConfidence: { unusualDisbursement: 0.7, newThirdPartyContact: 0.7 },
    });
    expect(older.outcome).toBe("clear");
    expect(older.requiresHuman).toBe(true);
  });

  it("routes a low-confidence clear to a human anyway", () => {
    const p = resolvePolicy([]);
    const v = evaluateRule(activeRules(p).find((r) => r.id === "complaint-identification-4513")!, {
      facts: { complaintLanguage: false, complaintLogged: false },
      availableConnectors: ALL_CONNECTORS,
      factConfidence: { complaintLanguage: 0.4 },
    });
    expect(v.outcome).toBe("clear");
    expect(v.requiresHuman).toBe(true);
  });

  it("judges a rule only on the facts it read", () => {
    const p = resolvePolicy([]);
    const suitability = activeRules(p).find((r) => r.id === "finra-2111-suitability")!;
    // An inferred fact belonging to a different rule must not drag this verdict
    // under its floor: the finding would name no fact this rule uses.
    const v = evaluateRule(suitability, {
      facts: { concentrationPct: 10, instrument: "X", clientId: "c", unusualDisbursement: false },
      availableConnectors: ALL_CONNECTORS,
      factConfidence: { unusualDisbursement: 0.7 },
    });
    expect(v.outcome).toBe("clear");
    expect(v.confidence).toBe(1);
    expect(v.requiresHuman).toBe(false);
  });

  it("separates blocking from flagged and reports overall confidence", () => {
    // The seeded log raises the marketing rule from flag to block (e-001); the baseline alone carries it as a flag.
    const p = policyFrom(SEED_EDITS);
    const f = runPolicy(p, {
      scope: "communication",
      availableConnectors: ALL_CONNECTORS,
      facts: {
        recipientCount30d: 31, principalApproved: false,
        containsProjection: true, machineDrafted: true, unsourcedFigures: 2, citationCount: 0,
        complaintLanguage: false, complaintLogged: false,
        containsSensitiveData: false, channelApproved: true,
        reviewed: true, containsRecommendation: false,
      },
    });
    expect(f.blocking.map((v) => v.ruleId)).toContain("finra-2210-regime");
    expect(f.blocking.map((v) => v.ruleId)).toContain("sec-marketing-206-4-1");
    expect(f.blocking.map((v) => v.ruleId)).toContain("genai-supervision-24-09");
    expect(f.clean).toBe(false);
    expect(f.confidence).toBeGreaterThan(0);
  });

  it("is clean when nothing fires", () => {
    const p = resolvePolicy([]);
    const f = runPolicy(p, {
      scope: "communication",
      availableConnectors: ALL_CONNECTORS,
      facts: {
        recipientCount30d: 1, principalApproved: false, reviewed: true, containsRecommendation: true,
        containsProjection: false, containsTestimonial: false,
        complaintLanguage: false, complaintLogged: true,
        containsSensitiveData: false, channelApproved: true,
        machineDrafted: true, unsourcedFigures: 0, citationCount: 2,
      },
    });
    expect(f.clean).toBe(true);
  });
});

describe("rule catalog integrity", () => {
  it("every rule has a citation, evidence, a finding and a remediation", () => {
    for (const r of BASELINE) {
      expect(r.citation.length, r.id).toBeGreaterThan(8);
      expect(r.evidence.length, r.id).toBeGreaterThan(0);
      expect(r.finding.length, r.id).toBeGreaterThan(20);
      expect(r.remediation.length, r.id).toBeGreaterThan(20);
      expect(r.confidenceFloor).toBeGreaterThan(0);
      expect(r.confidenceFloor).toBeLessThanOrEqual(1);
    }
  });

  it("every param a condition references exists on its rule", () => {
    for (const r of BASELINE) {
      const keys = new Set(r.params.map((p) => p.key));
      const json = JSON.stringify(r.when);
      for (const m of json.matchAll(/"param":"(\w+)"/g)) expect(keys.has(m[1]), `${r.id} references ${m[1]}`).toBe(true);
    }
  });

  it("ids are unique and url-safe", () => {
    const ids = BASELINE.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });
});
