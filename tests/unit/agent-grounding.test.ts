import { describe, it, expect } from "vitest";
import { TEMPLATES, fromTemplate } from "@/lib/agents/templates";
import { previewTemplate, runAgent, type PreviewInput } from "@/lib/agents/preview";
import { advisorView, type SessionDecisions } from "@/lib/view/advisor-view";
import { explainAgent, explainRoster } from "@/lib/agents/explain";
import { ROSTER } from "@/lib/agents/roster";
import { AGENTS } from "@/lib/compliance/agents";
import { policyFrom, SEED_EDITS } from "@/lib/compliance/store";
import { CATALOG } from "@/lib/connectors/catalog";
import { matches } from "@/components/list-controls";
import { CLIENTS, CONNECTORS_DATA, RULES_DATA, ADVISORS_DATA } from "@/lib/data";
import { CORPUS } from "@/lib/fixtures/corpus";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { APP } from "@/lib/data/policy";
import type { RuleDefinition } from "@/lib/compliance/types";

const A = APP.defaultAdvisorId;
const x = (advisorId = A): PreviewInput => ({ advisorId, advisorName: "Test", clients: CLIENTS, connections: CONNECTORS_DATA.connections, ruleEdits: SEED_EDITS, rules: [] });

describe("creating an agent in front of someone", () => {
  it("every template, at its default, finds something on the default advisor's book", () => {
    for (const t of TEMPLATES) expect(previewTemplate(t, t.param.value, x()).fired.length, t.id).toBeGreaterThan(0);
  });

  it("every quick pick shows a count the preview can back", () => {
    for (const t of TEMPLATES) for (const v of t.param.suggestions) expect(previewTemplate(t, v, x()).fired.length).toBeGreaterThanOrEqual(0);
    // A number the advisor can move changes what it finds: a looser floor never finds fewer.
    const cash = TEMPLATES.find((t) => t.id === "cash-floor")!;
    expect(previewTemplate(cash, 36, x()).fired.length).toBeGreaterThanOrEqual(previewTemplate(cash, 6, x()).fired.length);
  });

  it("the preview is exactly what the saved agent then raises", () => {
    for (const t of TEMPLATES) {
      const c = fromTemplate(t, { advisorId: A, advisorName: "Test", name: "", mission: "", value: t.param.value, cadence: t.cadence, n: 1 });
      const s: SessionDecisions = { ruleEdits: SEED_EDITS, connections: CONNECTORS_DATA.connections, caseDispositions: {}, actionDecisions: {}, dismissed: {}, overlay: {}, customAgents: [c] };
      const v = advisorView({ clients: CLIENTS, documents: CORPUS, opportunities: OPPORTUNITIES, rules: [c.rule] }, A, s);
      const saved = v.openCases.filter((k) => k.agentId === c.agent.id && k.reason !== "cannot_evaluate").map((k) => k.subject).sort();
      expect(previewTemplate(t, t.param.value, x()).fired.map((k) => k.subject).sort(), t.id).toEqual(saved);
      expect(runAgent(c, x()).fired.length).toBe(saved.length);
    }
  });

  it("a finding names the household, never its record id", () => {
    for (const t of TEMPLATES) for (const k of previewTemplate(t, t.param.value, x()).fired) {
      expect(k.finding).not.toMatch(/hh-/);
      expect(k.finding).toMatch(/^[A-Z]/);
    }
  });

  it("a phrase is matched in what clients wrote, whatever its case", () => {
    const t = TEMPLATES.find((y) => y.id === "phrase")!;
    expect(previewTemplate(t, "PENSION", x()).fired.map((k) => k.subject)).toEqual(previewTemplate(t, "pension", x()).fired.map((k) => k.subject));
    expect(previewTemplate(t, "a phrase nobody wrote", x()).fired).toHaveLength(0);
  });

  it("runs for every advisor, not only the demo one", () => {
    for (const a of ADVISORS_DATA) {
      const total = TEMPLATES.reduce((n, t) => n + previewTemplate(t, t.param.suggestions[t.param.suggestions.length - 1] ?? t.param.value, x(a.id)).fired.length, 0);
      expect(total, a.id).toBeGreaterThan(0);
    }
  });
});

describe("every agent says how it decides and what it is built on", () => {
  const policy = policyFrom(SEED_EDITS, { advisorId: A });

  it("every shipped rule has a status in law and an https source", () => {
    for (const r of RULES_DATA.rules as RuleDefinition[]) {
      expect(r.status?.text, r.id).toBeTruthy();
      expect(r.sources?.length, r.id).toBeGreaterThan(0);
      for (const s of r.sources!) expect(s.url).toMatch(/^https:\/\//);
    }
  });

  it("a rule that is not in force is never stated as in force", () => {
    for (const r of RULES_DATA.rules as RuleDefinition[]) {
      if (r.status!.state !== "in_force") expect(r.status!.text, r.id).not.toMatch(/^In force/);
      if (r.status!.pending) expect(r.status!.pending, r.id).toMatch(/not in force|not yet/i);
    }
  });

  it("every desk is grounded in the sources of the rules it runs", () => {
    for (const a of AGENTS) {
      const e = explainAgent(a, policy.rules);
      expect(e.method, a.id).toBeTruthy();
      expect(e.grounded.length, a.id).toBeGreaterThan(0);
    }
  });

  it("every other agent states its method, and says so when there is nothing to cite", () => {
    for (const a of ROSTER) {
      const e = explainRoster(a);
      expect(e.method, a.id).toBeTruthy();
      expect(e.grounded.length > 0 || Boolean(e.groundedNote), a.id).toBe(true);
    }
  });

  it("an advisor's own agent says it is a firm threshold, not a regulation", () => {
    const t = TEMPLATES[0];
    const c = fromTemplate(t, { advisorId: A, advisorName: "Test", name: "", mission: "", value: t.param.value, cadence: t.cadence, n: 1 });
    const e = explainAgent(c.agent, [c.rule] as never);
    expect(e.grounded).toHaveLength(0);
    expect(e.groundedNote).toMatch(/not a regulation/);
  });
});

describe("lists an advisor scans", () => {
  it("search matches every word, in any order and case", () => {
    expect(matches("Renner Pre-liquidity founder", "founder renner")).toBe(true);
    expect(matches("Renner Pre-liquidity founder", "renner retired")).toBe(false);
    expect(matches("anything", "   ")).toBe(true);
  });

  it("the firm's workstation leads the CRM connectors, then the market leaders", () => {
    const crm = CATALOG.filter((c) => c.channel === "crm").map((c) => c.id);
    expect(crm[0]).toBe("ubs-workstation");
    expect(crm[1]).toBe("salesforce-fsc");
    const custodian = CATALOG.filter((c) => c.channel === "custodian").map((c) => c.id);
    expect(custodian[0]).toBe("schwab-advisor-center");
  });
});
