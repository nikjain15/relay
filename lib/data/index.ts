// The single source of client and reference data. Everything in the app, the
// engines, retrieval and any chat reads from data/ through this module, so
// editing a JSON file is the only step needed to change a client.
import type { BookRecord, ClientFile, Doc, Household, Opportunity, Product, Prospect, ServiceRequest } from "@/lib/types";
import type { Advisor } from "@/lib/data/advisor";
import type { Distribution } from "@/lib/recipients/count";
import renner from "@/data/clients/renner.json";
import alcott from "@/data/clients/alcott.json";
import brandvold from "@/data/clients/brandvold.json";
import okaforLind from "@/data/clients/okafor-lind.json";
import vasquezHale from "@/data/clients/vasquez-hale.json";
import thornbury from "@/data/clients/thornbury.json";
import pell from "@/data/clients/pell.json";
import shelf from "@/data/shelf.json";
import documents from "@/data/documents.json";
import book from "@/data/book.json";
import advisors from "@/data/advisors.json";
import communications from "@/data/communications.json";
import funnel from "@/data/funnel.json";
import prospects from "@/data/prospects.json";
import serviceRequests from "@/data/service-requests.json";

// JSON imports are widened by TypeScript; validate() in lib/data/validate.ts
// checks the shapes and cross-references at test time.
export const CLIENTS = [renner, alcott, brandvold, okaforLind, vasquezHale, thornbury, pell] as unknown as ClientFile[];
export const SHELF_DATA = shelf as unknown as (Product & { plainName: string; plainDescription: string })[];
export const DOCUMENTS = documents as unknown as Doc[];
export const BOOK_DATA = book as unknown as BookRecord[];
export const ADVISORS_DATA = advisors as unknown as Advisor[];
export const COMMUNICATIONS = communications as unknown as {
  prototypeToday: string;
  demoCommunication: string;
  priorDistributions: Distribution[];
};
export const PROSPECTS = prospects as unknown as Prospect[];
export const SERVICE_REQUESTS = serviceRequests as unknown as ServiceRequest[];
export const FUNNEL_DATA = funnel as unknown as { stage: string; count: number }[];

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
