import { describe, it, expect } from "vitest";
import { readPolicy, toRule, SAMPLE_POLICY, FACT_VOCABULARY } from "@/lib/compliance/policy-import";
import { evaluate, factsUsed, paramMap } from "@/lib/compliance/dsl";
import { policyFrom, resolveAgents, SEED_EDITS, type RuleEdit } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import { CONNECTORS_DATA } from "@/lib/data";
import { accountFacts } from "@/lib/compliance/facts";
import { CLIENTS } from "@/lib/data";

/**
 * The policy reader: a written procedure in, candidate rules out, each cited
 * to its sentence, evaluable by the engine, and in force only once a person
 * adds it to a desk through the change log.
 */
describe("policy reader", () => {
  const r = readPolicy(SAMPLE_POLICY, "wsp-s4.md");

  it("reads every obligation over known facts and skips the rest with a reason", () => {
    expect(r.candidates.length).toBe(7);
    expect(r.skipped.some((s) => s.sentence.startsWith("The firm's brand colours"))).toBe(true);
    expect(r.skipped.find((s) => s.sentence.startsWith("Advisors should read this section"))!.why).toMatch(/names no fact/);
    for (const c of r.candidates) expect(c.sentence.length).toBeGreaterThan(20);
  });

  it("reads a number with its comparator, and a negated boolean as false", () => {
    const senior = r.candidates.find((c) => c.sentence.startsWith("An account whose client is 65"))!;
    expect(senior.scope).toBe("account");
    expect(senior.params[0]).toMatchObject({ key: "clientAgeThreshold", value: 65, stricter: "lower" });
    expect(JSON.stringify(senior.when)).toContain('"cmp":"gte"');
    expect(senior.severity).toBe("flag");
    expect(senior.authority).toBe("FINRA");
    expect(senior.citation).toBe("FINRA Rule 2165");
    const trusted = r.candidates.find((c) => c.sentence.includes("no trusted contact"))!;
    expect(JSON.stringify(trusted.when)).toContain('"fact":"trustedContactOnFile","cmp":"eq","value":false');
    const held = r.candidates.find((c) => c.sentence.startsWith("An unusual disbursement"))!;
    expect(held.severity).toBe("block");
    expect(JSON.stringify(held.when)).toContain('"fact":"complaintLogged","cmp":"eq","value":false');
  });

  it("joins facts with any when the sentence says or, and all otherwise", () => {
    const marketing = r.candidates.find((c) => c.sentence.includes("performance projection or a testimonial"))!;
    expect("any" in marketing.when || ("all" in marketing.when && JSON.stringify(marketing.when).includes("any"))).toBe(true);
    const senior = r.candidates.find((c) => c.sentence.startsWith("An account whose client is 65"))!;
    expect("all" in senior.when).toBe(true);
  });

  it("only proposes facts the engines compute, so every candidate is evaluable", () => {
    const known = new Set(FACT_VOCABULARY.map((f) => f.key));
    for (const c of r.candidates) for (const k of factsUsed(c.when)) expect(known.has(k), k).toBe(true);
    const senior = r.candidates.find((c) => c.sentence.startsWith("An account whose client is 65"))!;
    const fires = evaluate(senior.when, { clientAge: 71, newThirdPartyContact: true }, paramMap(senior));
    const clear = evaluate(senior.when, { clientAge: 40, newThirdPartyContact: true }, paramMap(senior));
    expect(fires).toBe(true);
    expect(clear).toBe(false);
  });

  it("is pure: the same text reads the same twice", () => {
    const a = readPolicy(SAMPLE_POLICY, "x"), b = readPolicy(SAMPLE_POLICY, "x");
    expect(a.candidates.map(toRule)).toEqual(b.candidates.map(toRule));
  });

  it("an added rule runs in the sweep once a person gives it to a desk, and overlaps are named", () => {
    const senior = r.candidates.find((c) => c.sentence.startsWith("An account whose client is 65"))!;
    expect(senior.overlaps).toContain("senior-investor-2165");
    const rule = toRule(senior);
    const edit: RuleEdit = { id: "e-test", at: "2026-09-27T09:00:00Z", actor: "test", target: "agent", layer: "firm", layerId: "firm", agentId: "client-protection", field: "addRule", from: "", to: rule.id, reason: "test" };
    const edits = [...SEED_EDITS, edit];
    const scope = scopeFor("adv-a");
    const policy = policyFrom(edits, scope, undefined, [rule]);
    expect(policy.rules.some((x) => x.id === rule.id)).toBe(true);
    const agents = resolveAgents(edits, scope, undefined, [rule]).agents;
    expect(agents.find((a) => a.id === "client-protection")!.ruleIds).toContain(rule.id);
    // Without the rule passed in, the same edit is refused rather than silently ignored.
    expect(resolveAgents(edits, scope).rejected.some((x) => x.field === "addRule" && x.attempted === rule.id)).toBe(true);
    const found = sweep("adv-a", policy, CONNECTORS_DATA.connections, undefined, agents);
    const c = CLIENTS.find((k) => k.advisorId === "adv-a" && accountFacts({ client: k, custodianConnected: true, trustedContactOnFile: true, complaintLogged: false, newThirdPartyContact: k.supervisory?.newThirdPartyContact }).facts.clientAge !== undefined && Number(accountFacts({ client: k, custodianConnected: true, trustedContactOnFile: true, complaintLogged: false }).facts.clientAge) >= 65 && k.supervisory?.newThirdPartyContact);
    if (c) expect(found.cases.some((x) => x.ruleId === rule.id && x.subject === c.id)).toBe(true);
    expect(found.cases.some((x) => x.ruleId === rule.id)).toBe(Boolean(c));
  });
});
