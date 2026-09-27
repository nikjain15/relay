import { describe, it, expect } from "vitest";
import { advisorView, type SessionBook, type SessionDecisions } from "@/lib/view/advisor-view";
import { resolveAgents, SEED_EDITS, type RuleEdit } from "@/lib/compliance/store";
import { TEMPLATES, fromTemplate } from "@/lib/agents/templates";
import { explainAgent, explainRoster } from "@/lib/agents/explain";
import { ROSTER } from "@/lib/agents/roster";
import { AGENTS } from "@/lib/compliance/agents";
import { CLIENTS, CONNECTORS_DATA } from "@/lib/data";
import { CORPUS } from "@/lib/fixtures/corpus";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { liquidityMonths } from "@/lib/household-math";
import { APP } from "@/lib/data/policy";

const A = APP.defaultAdvisorId;
const s: SessionDecisions = { ruleEdits: SEED_EDITS, connections: CONNECTORS_DATA.connections, caseDispositions: {}, actionDecisions: {}, dismissed: {}, overlay: {} };
const book = (rules = [] as SessionBook["rules"]): SessionBook => ({ clients: CLIENTS, documents: CORPUS, opportunities: OPPORTUNITIES, rules });
const edit = (e: Partial<RuleEdit>): RuleEdit => ({ id: "t", at: "2026-01-30T09:00:00Z", actor: "test", target: "agent", layer: "advisor", layerId: A, field: "", from: "", to: "", reason: "test", ...e });

describe("an advisor's own agent, made from a template", () => {
  it("runs in the same sweep as the desks and raises exactly what its rule says", () => {
    const t = TEMPLATES.find((x) => x.id === "cash-floor")!;
    const c = fromTemplate(t, { advisorId: A, advisorName: "Test", name: "", mission: "", value: 12, cadence: "daily", n: 1 });
    const v = advisorView(book([c.rule]), A, { ...s, customAgents: [c] });
    const mine = v.openCases.filter((k) => k.agentId === c.agent.id).map((k) => k.subject).sort();
    const expected = CLIENTS.filter((k) => k.advisorId === A && liquidityMonths(k) < 12).map((k) => k.id).sort();
    expect(mine).toEqual(expected);
    expect(v.actions.some((a) => a.ruleId === c.rule.id)).toBe(true);
  });

  it("belongs to its advisor only", () => {
    const t = TEMPLATES[0];
    const c = fromTemplate(t, { advisorId: A, advisorName: "Test", name: "", mission: "", value: 60, cadence: "daily", n: 1 });
    const other = CLIENTS.find((k) => k.advisorId !== A)!.advisorId;
    const v = advisorView(book([c.rule]), other, { ...s, customAgents: [c] });
    expect(v.agents.some((a) => a.id === c.agent.id)).toBe(false);
  });

  it("every template makes a rule the engine can evaluate", () => {
    for (const t of TEMPLATES) {
      const c = fromTemplate(t, { advisorId: A, advisorName: "Test", name: "", mission: "", value: t.param.value, cadence: t.cadence, n: 1 });
      expect(c.agent.ruleIds).toEqual([c.rule.id]);
      expect(c.rule.scope).toBe(t.scope);
      expect(() => advisorView(book([c.rule]), A, { ...s, customAgents: [c] })).not.toThrow();
    }
  });
});

describe("editing a desk: tighten now, loosen with a principal", () => {
  const desk = AGENTS[0];
  it("renaming and describing change the wording and nothing else", () => {
    const r = resolveAgents([...SEED_EDITS, edit({ agentId: desk.id, field: "name", to: "My review" }), edit({ agentId: desk.id, field: "mission", to: "Mine." })], { advisorId: A });
    const a = r.agents.find((x) => x.id === desk.id)!;
    expect(a.name).toBe("My review");
    expect(a.mission).toBe("Mine.");
    expect(a.ruleIds).toEqual(desk.ruleIds);
  });
  it("switching a desk off or removing it is refused without a principal and applied with one", () => {
    const off = resolveAgents([...SEED_EDITS, edit({ agentId: desk.id, field: "enabled", from: "true", to: "false" })], { advisorId: A });
    expect(off.agents.find((x) => x.id === desk.id)!.enabled).toBe(true);
    expect(off.rejected.some((x) => x.agentId === desk.id)).toBe(true);
    const del = resolveAgents([...SEED_EDITS, edit({ agentId: desk.id, field: "deleted", to: "true" })], { advisorId: A });
    expect(del.agents.find((x) => x.id === desk.id)!.deleted).toBeFalsy();
    const ok = resolveAgents([...SEED_EDITS, edit({ agentId: desk.id, field: "deleted", to: "true", approvedBy: "Principal" })], { advisorId: A });
    expect(ok.agents.find((x) => x.id === desk.id)!.deleted).toBe(true);
    const v = advisorView(book(), A, { ...s, ruleEdits: [...SEED_EDITS, edit({ agentId: desk.id, field: "deleted", to: "true", approvedBy: "Principal" })] });
    expect(v.agents.some((a) => a.id === desk.id)).toBe(false);
  });
  it("an approval applies to the one advisor it was given for", () => {
    const other = CLIENTS.find((k) => k.advisorId !== A)!.advisorId;
    const r = resolveAgents([...SEED_EDITS, edit({ agentId: desk.id, field: "enabled", from: "true", to: "false", approvedBy: "Principal" })], { advisorId: other });
    expect(r.agents.find((x) => x.id === desk.id)!.enabled).toBe(true);
  });
});

describe("every agent explains itself from its own definition", () => {
  it("a desk's checks are its rules", () => {
    const v = advisorView(book(), A, s);
    for (const a of v.agents) {
      const x = explainAgent(a, v.policy.rules);
      expect(x.role.length).toBeGreaterThan(10);
      expect(x.checks.length).toBeGreaterThan(0);
    }
  });
  it("every roster agent has a role, checks and a limit", () => {
    for (const a of ROSTER) {
      const x = explainRoster(a);
      expect(x.role && x.never && x.checks.length).toBeTruthy();
    }
  });
});
