import { describe, it, expect } from "vitest";
import { advisorView, type SessionBook, type SessionDecisions } from "@/lib/view/advisor-view";
import { SEED_EDITS } from "@/lib/compliance/store";
import { CLIENTS, CONNECTORS_DATA, ADVISORS_DATA, SERVICE_REQUESTS, PROSPECTS } from "@/lib/data";
import { CORPUS } from "@/lib/fixtures/corpus";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";

/**
 * One advisor's morning is read once and every screen reads it. These checks
 * pin what "yours" means, so a screen that counts the firm, or the static
 * files instead of the session book, fails here before it reaches a screen.
 */
const book: SessionBook = { clients: CLIENTS, documents: CORPUS, opportunities: OPPORTUNITIES, rules: [] };
const s: SessionDecisions = { ruleEdits: SEED_EDITS, connections: CONNECTORS_DATA.connections, caseDispositions: {}, actionDecisions: {}, dismissed: {}, overlay: {} };

describe("advisorView: one advisor's data, from one book", () => {
  for (const a of ADVISORS_DATA) {
    it(`${a.id}: every collection belongs to the advisor`, () => {
      const v = advisorView(book, a.id, s);
      const ids = new Set(CLIENTS.filter((c) => c.advisorId === a.id).map((c) => c.id));
      expect(v.clients.every((c) => c.advisorId === a.id)).toBe(true);
      expect(v.clients.length).toBe(ids.size);
      expect(v.meetings.length).toBe(a.walkthrough?.meetings?.length ?? 0);
      expect(v.tasks.every((t) => ids.has(t.clientId))).toBe(true);
      expect(v.serviceRequests.length).toBe(SERVICE_REQUESTS.filter((r) => ids.has(r.clientId)).length);
      expect(v.paperwork.every((w) => ids.has(w.clientId))).toBe(true);
      expect(v.prospects.length).toBe(PROSPECTS.filter((p) => p.advisorId === a.id).length);
      expect(v.opportunities.every((o) => ids.has(o.householdId))).toBe(true);
      expect(v.list.length).toBeLessThanOrEqual(v.profile.values["triage.dailyCap"]);
    });
  }

  it("the three advisors' households, tasks and requests add up to the book, with nothing counted twice", () => {
    const vs = ADVISORS_DATA.map((a) => advisorView(book, a.id, s));
    expect(vs.reduce((n, v) => n + v.clients.length, 0)).toBe(CLIENTS.length);
    expect(vs.reduce((n, v) => n + v.tasks.length, 0)).toBe(CLIENTS.reduce((n, c) => n + c.tasks.length, 0));
    expect(vs.reduce((n, v) => n + v.serviceRequests.length, 0)).toBe(SERVICE_REQUESTS.length);
  });

  it("reads the session book: a household connected this session is on every list at once", () => {
    const base = CLIENTS.find((c) => c.advisorId === ADVISORS_DATA[0].id)!;
    const extra = { ...base, id: "hh-connected-test", name: "Connected", tasks: [{ text: "Call", owner: "Advisor", dueDay: -1 }], opportunities: base.opportunities.map((o) => ({ ...o, id: `${o.id}-x`, householdId: "hh-connected-test" })) };
    const v = advisorView({ ...book, clients: [...CLIENTS, extra], opportunities: [...OPPORTUNITIES, ...extra.opportunities] }, base.advisorId, s);
    expect(v.clients.some((c) => c.id === extra.id)).toBe(true);
    expect(v.overdueTasks.some((t) => t.clientId === extra.id)).toBe(true);
    expect(v.opportunities.some((o) => o.householdId === extra.id)).toBe(true);
  });

  it("a disposition and a decision apply everywhere the view is read", () => {
    const v0 = advisorView(book, ADVISORS_DATA[0].id, s);
    const c = v0.openCases[0];
    const a = v0.pendingActions[0];
    const v1 = advisorView(book, ADVISORS_DATA[0].id, { ...s, caseDispositions: { [c.id]: {} }, actionDecisions: { [a.id]: {} } });
    expect(v1.openCases.length).toBe(v0.openCases.length - 1);
    expect(v1.pendingActions.some((x) => x.id === a.id)).toBe(false);
  });
});
