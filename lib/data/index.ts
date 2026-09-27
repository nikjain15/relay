// The single source of client and reference data. Everything in the app, the
// engines, retrieval and any chat reads from data/ through this module, so
// editing a JSON file is the only step needed to change a client.
import type { BookRecord, ClientFile, Doc, Household, Opportunity, Product, Prospect, ServiceRequest, SupervisoryInputs } from "@/lib/types";
import type { Advisor } from "@/lib/data/advisor";
import type { Distribution } from "@/lib/recipients/count";
import type { ChannelAttestation, ConnectionState } from "@/lib/connectors/types";
import type { RuleDefinition } from "@/lib/compliance/types";
import bundle from "@/data/generated/bundle.json";
import shelf from "@/data/shelf.json";
import book from "@/data/book.json";
import communications from "@/data/communications.json";
import funnel from "@/data/funnel.json";
import serviceRequests from "@/data/service-requests.json";
import complianceRules from "@/data/compliance/rules.json";
import complianceAgents from "@/data/compliance/agents.json";
import complianceEdits from "@/data/compliance/edits.json";
import history from "@/data/compliance/history.json";

// One file per record under data/clients, data/advisors and data/documents,
// bundled by scripts/build-data.ts. Adding a record is adding a file; nothing
// here changes. JSON imports are widened by TypeScript; validate() in
// lib/data/validate.ts checks the shapes and cross-references at test time.
const B = bundle as unknown as { clients: ClientFile[]; advisors: Advisor[]; documents: Doc[] };
export const CLIENTS: ClientFile[] = B.clients;
export const ADVISORS_DATA: Advisor[] = B.advisors;
export const DOCUMENTS: Doc[] = B.documents;
export const SHELF_DATA = shelf as unknown as (Product & { plainName: string; plainDescription: string })[];
export const BOOK_DATA = book as unknown as BookRecord[];
export const COMMUNICATIONS = communications as unknown as {
  prototypeToday: string;
  demoCommunication: string;
  /** Note template per "strategy:action"; a proposal kind not listed gets its own template id. */
  templates: Record<string, string>;
  priorDistributions: Distribution[];
};
export const SERVICE_REQUESTS = serviceRequests as unknown as ServiceRequest[];
export const FUNNEL_DATA = funnel as unknown as { stage: string; count: number }[];
export const RULES_DATA = complianceRules as unknown as { version: number; rules: RuleDefinition[] };
export const AGENTS_DATA = complianceAgents as unknown as { version: number; agents: unknown[] };
export const EDITS_DATA = complianceEdits as unknown as { version: number; edits: unknown[] };
/** Findings raised over the past 90 days, with facts and dispositions. */
export const HISTORY = history as unknown as { findings: PastFinding[] };

// Views derived from the record files, so an engine can read "every prospect"
// or "every captured message" without knowing which file holds it. Each is a
// fresh array built once at load; a stress run may swap its contents.
export const PROSPECTS: Prospect[] = ADVISORS_DATA.flatMap((a) => (a.prospects ?? []).map((p) => ({ ...p, advisorId: a.id })));
export const CONNECTORS_DATA: { connections: ConnectionState[]; attestations: ChannelAttestation[] } = {
  connections: ADVISORS_DATA.flatMap((a) => (a.connections ?? []).map((c) => ({ ...c, advisorId: a.id }))),
  attestations: ADVISORS_DATA.flatMap((a) => (a.attestations ?? []).map((t) => ({ ...t, advisorId: a.id }))),
};
/** Supervisory flags a firm reads from its CRM and custodian, per client. */
export const ACCOUNT_INPUTS: { accounts: (SupervisoryInputs & { clientId: string })[] } = {
  accounts: CLIENTS.map((c) => ({ clientId: c.id, ...c.supervisory })),
};
/** Whether an outside business activity is on file per advisor. Read by the conduct rule. */
export const ADVISOR_INPUTS: { advisors: { advisorId: string; obaOnFile: boolean }[] } = {
  advisors: ADVISORS_DATA.map((a) => ({ advisorId: a.id, obaOnFile: a.obaOnFile ?? false })),
};
/** The custodian's prior valuations, so a rule can read a trend and not only a point. */
export const SNAPSHOTS: { series: { clientId: string; concentrationPct: { day: number; pct: number }[] }[] } = {
  series: CLIENTS.filter((c) => c.valuationHistory).map((c) => ({ clientId: c.id, concentrationPct: c.valuationHistory!.concentrationPct })),
};
/** The captured communication corpus the surveillance agent sweeps. */
export const MESSAGES: { messages: CapturedMessage[] } = {
  messages: CLIENTS.flatMap((c) => (c.messages ?? []).map((m) => ({ ...m, advisorId: c.advisorId, clientId: c.id }))),
};

export interface CapturedMessage {
  id: string;
  advisorId: string;
  clientId?: string;
  connectorId: string;
  channel: string;
  direction: "inbound" | "outbound";
  day: number;
  text: string;
}

export interface PastFinding {
  id: string;
  at: string;
  ruleId: string;
  agentId: string;
  scope: { advisorId: string; segmentId?: string; clientId?: string };
  subject: string;
  subjectLabel: string;
  connectors: string[];
  facts: Record<string, string | number | boolean | string[]>;
  factConfidence?: Record<string, number>;
  outcome: "clear" | "flag" | "block" | "cannot_evaluate";
  disposition: "cleared" | "returned" | "blocked";
  dispositionBy: string;
  comment: string;
}

export function toHousehold(c: ClientFile): Household {
  const { id, name, archetype, tier, totalUsd, persons, goals, holdings, constraints, monthlySpendUsd, hardPart, groundedIn } = c;
  return { id, name, archetype, tier, totalUsd, persons, goals, holdings, constraints, monthlySpendUsd, hardPart, groundedIn };
}

export const ALL_OPPORTUNITIES: Opportunity[] = CLIENTS.flatMap((c) => c.opportunities);

export function clientFile(id: string): ClientFile | undefined {
  return CLIENTS.find((c) => c.id === id || c.id === `hh-${id}`);
}

/**
 * Everything needed to ground retrieval or a chat about one client: the
 * client record, their advisor, their open opportunities, and the full text
 * of every document those opportunities cite. Nothing outside this bundle
 * should be asserted about the client.
 */
export function getClientFile(id: string) {
  const client = clientFile(id);
  if (!client) return undefined;
  const advisor = ADVISORS_DATA.find((a) => a.id === client.advisorId);
  const docIds = new Set(client.opportunities.flatMap((o) => o.evidenceDocIds));
  const cited = DOCUMENTS.filter((d) => docIds.has(d.id));
  const requests = SERVICE_REQUESTS.filter((r) => r.clientId === client.id);
  return { client, advisor, opportunities: client.opportunities, documents: cited, paperwork: client.paperwork, serviceRequests: requests };
}
