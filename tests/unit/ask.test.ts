import { describe, it, expect } from "vitest";
import { answer, householdIn, suggestions, type AskContext } from "@/lib/ask/answer";
import { policyFrom, agentsFrom, SEED_EDITS } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import { prepareAll } from "@/lib/compliance/actions";
import { CLIENTS, CONNECTORS_DATA } from "@/lib/data";
import { CORPUS } from "@/lib/fixtures/corpus";
import { liquidityMonths } from "@/lib/household-math";
import { APP } from "@/lib/data/policy";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { economics } from "@/lib/proposals/compare";
import { SHELF } from "@/lib/fixtures/shelf";
import { score } from "@/lib/ranking/rank";

/** Ask answers from the records and names them; it never answers from nothing. */
function ctx(advisorId = APP.defaultAdvisorId): AskContext {
  const scope = scopeFor(advisorId);
  const policy = policyFrom(SEED_EDITS, scope);
  const agents = agentsFrom(SEED_EDITS, undefined, scope);
  const found = sweep(advisorId, policy, CONNECTORS_DATA.connections, CLIENTS, agents);
  return { advisorId, clients: CLIENTS, documents: CORPUS, cases: found.cases, actions: prepareAll(found.cases, policy.rules), policy, agents, connections: CONNECTORS_DATA.connections };
}

describe("ask", () => {
  const c = ctx();
  const featured = CLIENTS.find((k) => k.id === APP.featured.clientId)!;

  it("finds the household a question is about by any word of its name", () => {
    expect(householdIn("how much cash does renner have", CLIENTS)?.id).toBe(featured.id);
    expect(householdIn("nothing here", CLIENTS)).toBeUndefined();
  });

  it("answers cash cover from household arithmetic and cites the holdings", () => {
    const a = answer("How much cash cover does Renner have?", c);
    expect(a.text).toContain(`${liquidityMonths(featured)} months`);
    expect(a.cites.some((k) => k.record === `data/clients/${featured.id}.json#holdings`)).toBe(true);
    expect(a.links.some((l) => l.href === `/household/${featured.id}`)).toBe(true);
  });

  it("answers findings from the sweep and cites the rule", () => {
    const withCase = c.cases[0];
    const subject = CLIENTS.find((k) => k.id === withCase.subject);
    if (!subject) return;
    const a = answer(`Any findings on ${subject.name}?`, c);
    expect(a.text).toContain(withCase.ruleTitle);
    expect(a.cites.some((k) => k.record.endsWith(withCase.ruleId))).toBe(true);
  });

  it("answers what to do first from the sweep, the coverage report and the calendar", () => {
    const a = answer("What should I do first today?", c);
    expect(a.text).toMatch(/blocking finding|no blocking finding/);
    expect(a.text).toMatch(/prepared action/);
    expect(a.links.some((l) => l.href === "/")).toBe(true);
  });

  it("describes a desk from the catalogue and links to it", () => {
    const a = answer("What does the marketing review desk watch?", c);
    expect(a.text).toMatch(/Marketing/);
    expect(a.links[0].href).toBe("/agents/marketing-review");
  });

  it("refuses to act on the outside world", () => {
    const a = answer("Send the note to Renner", c);
    expect(a.text).toMatch(/never sends/);
  });

  it("says when it cannot match, rather than inventing, and every suggestion answers", () => {
    const a = answer("what is the meaning of life", c);
    expect(a.confidence).toBe(0);
    for (const s of suggestions(CLIENTS, c.advisorId)) expect(answer(s, c).confidence, s).toBeGreaterThan(0);
  });

  it("finds a household named with a hyphen or a possessive", () => {
    const hyphen = CLIENTS.find((k) => k.name.includes("-"))!;
    expect(householdIn(`what changed for ${hyphen.name} since we last spoke`, CLIENTS)?.id).toBe(hyphen.id);
    expect(householdIn(`what are ${featured.name}'s goals`, CLIENTS)?.id).toBe(featured.id);
  });

  it("answers what changed since we last spoke with what changed, not the last contact", () => {
    const a = answer(`What changed for ${featured.name} since we last spoke?`, c);
    expect(a.text).toMatch(/^Since /);
    expect(a.cites.some((k) => k.record.includes("opportunities["))).toBe(true);
  });

  it("answers every chip it offers", () => {
    for (const q of ["What did the agents prepare?", "Which findings are blocking?", "Who am I meeting today?"]) expect(answer(q, c).confidence, q).toBeGreaterThan(0);
  });

  it("gives the options with the figures from the options arithmetic, and the rate it used", () => {
    const opp = featured.opportunities.find((o) => o.action === "fund")!;
    const tsy = SHELF.find((p) => p.type === "treasury_ladder")!;
    const ev = evaluateAll(opp, featured).find((e) => e.candidate.productId === tsy.id)!;
    const x = economics(ev.candidate, tsy);
    const a = answer(`What is the after-tax income on the treasury ladder for ${featured.name}?`, c);
    expect(a.text).toContain(`${x.taxPct}%`);
    expect(a.cites.some((k) => k.record === "data/policy.json#proposals.taxAssumptions")).toBe(true);
    expect(a.links[0].href).toBe(`/household/${featured.id}/proposal?opp=${opp.id}`);
  });

  it("explains the score as materiality times the weight, with the arithmetic", () => {
    const a = answer("How is the score worked out?", c);
    const top = CLIENTS.filter((k) => k.advisorId === c.advisorId).flatMap((k) => k.opportunities).sort((x, y) => score(y) - score(x))[0];
    expect(a.text).toContain(`${score(top)} = materiality ${top.materiality}`);
    expect(a.links.some((l) => l.href === "/triage#tune")).toBe(true);
  });

  it("says what it does not know rather than guessing", () => {
    expect(answer("Who is at risk of leaving?", c).text).toMatch(/no attrition model/);
    expect(answer(`What is ${featured.name}'s tax bracket?`, c).text).toMatch(/no tax return on file/);
  });

  it("answers the book-wide questions an advisor asks from the records", () => {
    for (const q of ["Any follow-ups due?", "Are there service requests open?", "Which prospects should I call?", "Who needs cash?", "Is the treasury one-pager current?", "Prep me for my 2pm"]) {
      const a = answer(q, c);
      expect(a.confidence, q).toBeGreaterThan(0);
      expect(a.cites.length, q).toBeGreaterThan(0);
    }
  });
});
