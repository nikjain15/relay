// One advisor's morning, read once. Every screen that shows a count, a list or
// a finding for "you" reads it from here, so the Overview's "4 tasks overdue"
// and the Follow-ups screen it links to are the same four tasks by
// construction, not by two copies of the same filter.
//
// The input is the session book (the shipped records plus anything connected
// in the browser this session), never the static data files on their own, so a
// household connected on Sources shows up on every screen at once. The advisor
// is whoever the session is signed in as; switching advisor switches every
// screen.
//
// Deterministic. No model client may be imported here.
import type { ClientFile, Doc, Opportunity } from "@/lib/types";
import type { ConnectionState } from "@/lib/connectors/types";
import type { RuleDefinition } from "@/lib/compliance/types";
import type { RuleEdit } from "@/lib/compliance/store";
import type { CustomAgent } from "@/lib/agents/templates";
import { policyFrom, agentsFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import { prepareAll } from "@/lib/compliance/actions";
import { coverageFor } from "@/lib/connectors/coverage";
import { rank } from "@/lib/ranking/rank";
import { resolveProfile, type Overlay } from "@/lib/profile";
import { todaysMeetings } from "@/lib/meetings/prep";
import { tasksOf } from "@/lib/followups";
import { triage } from "@/lib/servicing/classify";
import { openItems } from "@/lib/onboarding/status";
import { rankProspects } from "@/lib/prospecting/rank";
import { ADVISORS_DATA, CONNECTORS_DATA, PROSPECTS, SERVICE_REQUESTS } from "@/lib/data";

export interface SessionBook {
  clients: ClientFile[];
  documents: Doc[];
  opportunities: Opportunity[];
  rules: RuleDefinition[];
}

export interface SessionDecisions {
  ruleEdits: RuleEdit[];
  connections: ConnectionState[];
  caseDispositions: Record<string, unknown>;
  actionDecisions: Record<string, unknown>;
  dismissed: Record<string, string>;
  overlay: Overlay;
  customAgents?: CustomAgent[];
}

/** A display name for a household: "Smith family" when there is more than one person, else the person. */
export const displayName = (c: ClientFile) => (c.persons.length > 1 ? `${c.name} family` : c.persons[0]?.name ?? c.name);

export function advisorView(book: SessionBook, advisorId: string, s: SessionDecisions) {
  const advisor = ADVISORS_DATA.find((a) => a.id === advisorId) ?? ADVISORS_DATA[0];
  const clients = book.clients.filter((c) => c.advisorId === advisor.id);
  const ids = new Set(clients.map((c) => c.id));
  const clientOf = (id: string) => book.clients.find((c) => c.id === id);

  // The findings and what the agents prepared: one sweep, with the rules added this session.
  const scope = scopeFor(advisor.id);
  const policy = policyFrom(s.ruleEdits, scope, undefined, book.rules);
  // The desks as resolved for this advisor (a desk removed with a principal's approval drops out),
  // then the advisor's own agents, which run in the same sweep.
  const agents = [
    ...agentsFrom(s.ruleEdits, undefined, scope, book.rules).filter((a) => !a.deleted),
    ...(s.customAgents ?? []).filter((c) => c.advisorId === advisor.id).map((c) => c.agent),
  ];
  const found = sweep(advisor.id, policy, s.connections, book.clients, agents);
  const openCases = found.cases.filter((c) => !s.caseDispositions[c.id]);
  const actions = prepareAll(openCases, policy.rules);
  const pendingActions = actions.filter((a) => !s.actionDecisions[a.id]);
  const coverage = coverageFor(advisor.id, s.connections, CONNECTORS_DATA.attestations);

  // Today's list, ranked with the advisor's resolved weights and list size.
  const profile = resolveProfile({ advisorId: advisor.id }, s.overlay);
  const opportunities = book.opportunities.filter((o) => ids.has(o.householdId));
  const list = rank(opportunities, new Set(Object.keys(s.dismissed)), profile.values["triage.dailyCap"], profile.values["triage.classWeights"]);

  const meetings = todaysMeetings(advisor.id);
  const tasks = tasksOf(clients);
  const serviceRequests = triage(SERVICE_REQUESTS.filter((r) => ids.has(r.clientId)));
  const paperwork = clients.flatMap((c) => openItems(c).map((w) => ({ ...w, clientId: c.id, clientName: displayName(c) })));
  const prospects = rankProspects(PROSPECTS, advisor.id);

  return {
    advisor,
    clients,
    clientOf,
    policy,
    agents,
    found,
    openCases,
    blocking: openCases.filter((c) => c.severity === "block" && c.reason === "fired"),
    actions,
    pendingActions,
    coverage,
    profile,
    opportunities,
    list,
    meetings,
    tasks,
    overdueTasks: tasks.filter((t) => t.dueDay < 0),
    serviceRequests,
    serviceOverdue: serviceRequests.filter((r) => r.overdue),
    paperwork,
    escalated: paperwork.filter((w) => w.status === "escalated"),
    prospects,
  };
}

export type AdvisorView = ReturnType<typeof advisorView>;
