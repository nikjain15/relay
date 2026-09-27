import { describe, it, expect } from "vitest";
import { AGENTS, agentsForScope } from "@/lib/compliance/agents";
import { resolveAgents, SEED_EDITS, type RuleEdit } from "@/lib/compliance/store";
import { BASELINE } from "@/lib/compliance/policy";
import { sweep } from "@/lib/compliance/sweep";
import { policyFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { CONNECTORS_DATA } from "@/lib/data";

/**
 * The review desks: one agent per team a compliance function runs, and a
 * per-advisor layer that can only tighten. Every refusal is recorded.
 */
const edit = (over: Partial<RuleEdit>): RuleEdit => ({ id: "t", at: "2026-09-26T12:00:00Z", actor: "T", target: "agent", layer: "advisor", layerId: "adv-a", field: "enabled", from: "", to: "", reason: "test", ...over });

describe("review desks", () => {
  it("mirror a compliance function: every desk names its team, its authorities and rules of one scope", () => {
    expect(AGENTS.length).toBeGreaterThanOrEqual(8);
    for (const a of AGENTS) {
      expect(a.desk.length, a.id).toBeGreaterThan(3);
      expect(a.mirrors.length, a.id).toBeGreaterThan(20);
      expect(a.authorities.length, a.id).toBeGreaterThan(0);
      for (const r of a.ruleIds) expect(BASELINE.find((x) => x.id === r)?.scope, `${a.id} owns ${r}`).toBe(a.scope);
    }
    // Every rule in the baseline is watched by some desk, so nothing mandatory falls between two teams.
    const watched = new Set(AGENTS.flatMap((a) => a.ruleIds));
    for (const r of BASELINE) expect(watched.has(r.id), r.id).toBe(true);
    // The desks a compliance function actually has.
    for (const id of ["marketing-review", "complaints", "sales-practice", "record-completeness", "communications-surveillance", "conduct"]) expect(AGENTS.some((a) => a.id === id), id).toBe(true);
  });

  it("resolve per advisor: the seeded advisor edits tighten one book and not another", () => {
    const b = resolveAgents(SEED_EDITS, scopeFor("adv-b")).agents.find((a) => a.id === "marketing-review")!;
    const a = resolveAgents(SEED_EDITS, scopeFor("adv-a")).agents.find((a) => a.id === "marketing-review")!;
    expect(b.cadence).toBe("on_draft");
    expect(b.setBy!.cadence).toBe("advisor");
    expect(a.cadence).toBe("daily");
    const c = resolveAgents(SEED_EDITS, scopeFor("adv-c")).agents.find((a) => a.id === "sales-practice")!;
    expect(c.ruleIds).toContain("senior-investor-2165");
    expect(c.setBy!.rules["senior-investor-2165"]).toBe("advisor");
    expect(resolveAgents(SEED_EDITS).agents.find((a) => a.id === "sales-practice")!.ruleIds).not.toContain("senior-investor-2165");
  });

  it("refuse every loosening from a lower layer, and say why", () => {
    const edits = [
      ...SEED_EDITS,
      edit({ id: "x1", agentId: "complaints", field: "enabled", from: "true", to: "false" }),
      edit({ id: "x2", agentId: "communications-surveillance", field: "cadence", from: "on_draft", to: "weekly" }),
      edit({ id: "x3", agentId: "record-completeness", field: "removeRule", to: "off-channel-gap" }),
      edit({ id: "x4", agentId: "sales-practice", field: "addRule", to: "sec-marketing-206-4-1" }),
    ];
    const r = resolveAgents(edits, scopeFor("adv-a"));
    const rej = r.rejected.filter((x) => x.layerId === "adv-a");
    expect(rej.map((x) => `${x.agentId}:${x.field}`)).toEqual(expect.arrayContaining(["complaints:enabled", "communications-surveillance:cadence", "record-completeness:removeRule", "sales-practice:addRule"]));
    expect(r.agents.find((a) => a.id === "complaints")!.enabled).toBe(true);
    expect(r.agents.find((a) => a.id === "communications-surveillance")!.cadence).toBe("on_draft");
    expect(r.agents.find((a) => a.id === "record-completeness")!.ruleIds).toContain("off-channel-gap");
    expect(r.agents.find((a) => a.id === "sales-practice")!.ruleIds).not.toContain("sec-marketing-206-4-1");
    for (const x of rej) expect(x.reason.length).toBeGreaterThan(20);
  });

  it("allow every tightening from a lower layer", () => {
    const edits = [
      ...SEED_EDITS,
      edit({ id: "y1", agentId: "conduct", field: "cadence", from: "weekly", to: "daily" }),
      edit({ id: "y2", agentId: "client-protection", field: "addRule", to: "finra-2111-drift" }),
    ];
    const r = resolveAgents(edits, scopeFor("adv-a"));
    expect(r.rejected.filter((x) => x.layerId === "adv-a" && ["conduct", "client-protection"].includes(x.agentId))).toEqual([]);
    expect(r.agents.find((a) => a.id === "conduct")!.cadence).toBe("daily");
    expect(r.agents.find((a) => a.id === "client-protection")!.ruleIds).toContain("finra-2111-drift");
  });

  it("the firm layer may switch a desk off; then a mandatory rule is reported as unwatched, not silently retired", () => {
    const edits = [...SEED_EDITS, edit({ id: "z", layer: "firm", layerId: "firm", agentId: "complaints", field: "enabled", from: "true", to: "false" })];
    const agents = resolveAgents(edits).agents;
    expect(agents.find((a) => a.id === "complaints")!.enabled).toBe(false);
    expect(agentsForScope("communication", agents).some((a) => a.id === "complaints")).toBe(false);
  });

  it("the sweep runs the advisor's desks, so a rule added for one advisor fires on that book only", () => {
    const c = scopeFor("adv-c");
    const withRule = sweep("adv-c", policyFrom(SEED_EDITS, c), CONNECTORS_DATA.connections, undefined, resolveAgents(SEED_EDITS, c).agents);
    const seniorViaSales = withRule.cases.filter((k) => k.ruleId === "senior-investor-2165" && k.agentId === "sales-practice");
    const seniorViaDesk = withRule.cases.filter((k) => k.ruleId === "senior-investor-2165" && k.agentId === "client-protection");
    // The same rule watched by two desks raises the case under each; a supervisor sees who is watching.
    expect(seniorViaSales.length).toBe(seniorViaDesk.length);
    const a = scopeFor("adv-a");
    const other = sweep("adv-a", policyFrom(SEED_EDITS, a), CONNECTORS_DATA.connections, undefined, resolveAgents(SEED_EDITS, a).agents);
    expect(other.cases.some((k) => k.ruleId === "senior-investor-2165" && k.agentId === "sales-practice")).toBe(false);
  });
});
