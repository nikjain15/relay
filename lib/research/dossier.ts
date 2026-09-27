// The dossier agent: everything known about one household, from every source
// the advisor has, each claim cited to where it came from, and the sources
// checked against each other.
//
// The briefing (brief.ts) answers "what do I not know before the next
// conversation". The dossier answers "what do we actually have on this
// household, and does it agree with itself". It reads five sources:
//
//   1. the client file: people, holdings, goals, the family's rules
//   2. the CRM: contact history, team notes, paperwork, service requests
//   3. the captured corpus: every message on a connected channel
//   4. the document corpus: what the firm's own research says about this
//      household's situation, through the same retrieval the evidence layer uses
//   5. the public record: press, filings, registries, court and charity records
//
// The fifth is the one a person would web-search for. This prototype has no
// outbound path, so it is shipped as data on the client file and labelled as
// such on screen; in production a read-only search connector fills it. Public
// items are never promoted to fact: they are "public, unverified, possibly the
// wrong person" until a person confirms them, and the agent says which
// client-file field each one corroborates or contradicts.
//
// Deterministic. No model client may be imported here. In production a model
// would summarise long press items into the excerpt; it would never decide
// what corroborates what.
import type { ClientFile, Doc, PublicRecordItem } from "@/lib/types";
import type { ConnectionState } from "@/lib/connectors/types";
import { buildIndex, search } from "@/lib/evidence/search";
import { CORPUS } from "@/lib/fixtures/corpus";
import { CONNECTORS_DATA, SERVICE_REQUESTS } from "@/lib/data";
import { liquidityMonths, singleNamePct, singleNameUsd } from "@/lib/household-math";
import { POLICY } from "@/lib/data/policy";
import { usd } from "@/lib/format";
import type { IconName } from "@/components/icons";

export type SourceKind = "file" | "crm" | "messages" | "documents" | "public";

export interface Cite {
  /** The record, in the same "file#field" form the briefing uses, or a public:// locator. */
  record: string;
  label: string;
  href?: string;
}

export interface DossierItem {
  id: string;
  source: SourceKind;
  text: string;
  /** 1 for something read from a record the firm holds; below 1 for anything public or inferred. */
  confidence: number;
  day?: number;
  cites: Cite[];
  /** A client-file field this item corroborates or contradicts, from a cross-check. */
  check?: { field: string; verdict: "corroborates" | "contradicts" | "not on file"; why: string };
}

export interface DossierSection {
  source: SourceKind;
  title: string;
  icon: IconName;
  /** How this source is reached in production, said plainly. */
  via: string;
  items: DossierItem[];
  /** Why the section is thin or empty, when it is. */
  gap?: string;
}

export interface Dossier {
  clientId: string;
  clientName: string;
  sections: DossierSection[];
  /** What two sources say differently, or what one says and the file does not. */
  checks: DossierItem[];
  /** What no source answers. */
  unknowns: { text: string; why: string }[];
  /** The note the agent drafts for the CRM; a person files it. */
  draftNote: string;
  counts: { read: number; sources: number; corroborated: number; contradicted: number; notOnFile: number };
  trace: { n: number; icon: IconName; title: string; detail: string }[];
}

export const DOSSIER_CONFIDENCE = {
  /** Read from a record the firm holds. */
  record: 1,
  /** A colleague's note: an account, not the client's words. */
  teamNote: 0.7,
  /** A passage the firm's research says about situations like this one, not about this household. */
  document: 0.6,
  /** A public item that names this household: unverified, possibly the wrong person. */
  publicRecord: 0.55,
  /** A public item that also matches a field on file. */
  publicCorroborated: 0.85,
} as const;

const PUBLIC_ICON: Record<PublicRecordItem["kind"], string> = { press: "Press", filing: "Filing", directorship: "Directorship", registry: "Registry", court: "Court record", charity: "Charity register" };

const ago = (day: number) => (day === 0 ? "today" : day === -1 ? "yesterday" : `${-day} days ago`);

export function dossier(client: ClientFile, connections: ConnectionState[] = CONNECTORS_DATA.connections, docs: Doc[] = CORPUS): Dossier {
  const rec = `data/clients/${client.id}.json`;
  const cite = (field: string, label: string, href?: string): Cite => ({ record: `${rec}#${field}`, label, href });
  const trace: Dossier["trace"] = [];
  const step = (icon: IconName, title: string, detail: string) => trace.push({ n: trace.length + 1, icon, title, detail });
  const connected = new Set(connections.filter((s) => s.advisorId === client.advisorId && s.status === "connected").map((s) => s.connectorId));
  let read = 0;

  // 1. The file.
  const file: DossierItem[] = [];
  file.push({ id: "people", source: "file", confidence: 1, text: `${client.persons.length === 1 ? "One person" : `${client.persons.length} people`}: ${client.persons.map((p) => `${p.name}, ${p.role}${p.age ? `, ${p.age}` : ""}`).join("; ")}.`, cites: [cite("persons", "People")] });
  file.push({ id: "tier", source: "file", confidence: 1, text: `${client.archetype}. ${client.tier} tier, ${usd(client.totalUsd)} on the platform.`, cites: [cite("tier", "Tier"), cite("totalUsd", "Assets")] });
  const sn = singleNameUsd(client);
  file.push({ id: "holdings", source: "file", confidence: 1, text: `${client.holdings.length} holdings${sn ? `, ${Math.round(singleNamePct(client))}% in one name` : ""}; Liquidity covers ${liquidityMonths(client)} months of ${usd(client.monthlySpendUsd)} a month.`, cites: [cite("holdings", "Holdings"), cite("monthlySpendUsd", "Spending")] });
  for (const [i, g] of client.goals.entries()) file.push({ id: `goal-${i}`, source: "file", confidence: 1, text: `${g.strategy}: ${g.unit === "months" ? `${g.funded} of ${g.target} months` : `${usd(g.funded)} of ${usd(g.target)}`}. ${g.assumption}`, cites: [cite(`goals[${i}]`, `${g.strategy} goal`)] });
  read += 3 + client.goals.length;
  step("people", "Read the client file", `${client.persons.length} people, ${client.holdings.length} holdings, ${client.goals.length} goals, ${client.constraints.length} rules.`);

  // 2. The CRM.
  const crm: DossierItem[] = [];
  const contacts = [...client.contactHistory].sort((a, b) => b.day - a.day);
  for (const [i, e] of contacts.entries()) crm.push({ id: `contact-${i}`, source: "crm", confidence: 1, day: e.day, text: `${e.channel}, ${ago(e.day)}: ${e.summary}`, cites: [cite(`contactHistory[${client.contactHistory.indexOf(e)}]`, "Contact history")] });
  for (const [i, n] of client.notes.entries()) crm.push({ id: `note-${i}`, source: "crm", confidence: DOSSIER_CONFIDENCE.teamNote, day: n.day, text: `${n.from}, ${ago(n.day)}: "${n.text}"`, cites: [cite(`notes[${i}]`, "Team note")] });
  for (const [i, p] of client.paperwork.entries()) crm.push({ id: `paper-${i}`, source: "crm", confidence: 1, day: p.signedDay ?? p.requestedDay, text: `${p.form}: ${p.signedDay !== undefined ? `signed ${ago(p.signedDay)}` : `requested ${ago(p.requestedDay)}, unsigned`}.`, cites: [cite(`paperwork[${i}]`, "Paperwork")] });
  const requests = SERVICE_REQUESTS.filter((r) => r.clientId === client.id);
  for (const r of requests) crm.push({ id: `req-${r.id}`, source: "crm", confidence: 1, day: 0, text: `Service request by ${r.channel}, ${r.receivedHoursAgo} hours ago: "${r.text}"`, cites: [{ record: `data/service-requests.json#${r.id}`, label: "Service request" }] });
  read += crm.length;
  step("crm", "Read the CRM", `${contacts.length} contacts, ${client.notes.length} team notes, ${client.paperwork.length} forms, ${requests.length} open requests.`);

  // 3. Captured messages, on connected sources only.
  const msgs: DossierItem[] = [];
  const all = client.messages ?? [];
  const swept = all.filter((m) => connected.has(m.connectorId));
  for (const m of [...swept].sort((a, b) => b.day - a.day)) msgs.push({ id: `msg-${m.id}`, source: "messages", confidence: 1, day: m.day, text: `${m.direction === "inbound" ? "Client wrote" : "Advisor wrote"} by ${m.channel}, ${ago(m.day)}: "${m.text}"`, cites: [cite(`messages[${all.indexOf(m)}]`, "Captured message")] });
  read += swept.length;
  step("email", "Read the captured corpus", `${swept.length} of ${all.length} messages, on connected sources${all.length > swept.length ? `; ${all.length - swept.length} on a source that is not connected were not read` : ""}.`);

  // 4. The document corpus, through the same retrieval the evidence layer uses.
  const queries = [client.archetype, ...client.opportunities.map((o) => o.title), ...client.goals.filter((g) => g.funded < g.target).map((g) => `${g.strategy} ${g.assumption}`)];
  const index = docs === CORPUS ? undefined : buildIndex(docs);
  const seen = new Set<string>();
  const documents: DossierItem[] = [];
  for (const q of queries) {
    for (const h of search(q, { index }).hits.filter((h) => h.score >= POLICY.retrieval.floor).slice(0, 2)) {
      const key = `${h.docId}#${h.passageId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      documents.push({ id: `doc-${key}`, source: "documents", confidence: DOSSIER_CONFIDENCE.document, day: h.day, text: `${h.title}${h.freshness === "stale" ? " (past its review date)" : ""}: "${h.text.length > 200 ? `${h.text.slice(0, 200)}...` : h.text}"`, cites: [{ record: `data/documents/${h.docId}.json#${h.passageId}`, label: h.title, href: `/documents/${h.docId}` }] });
    }
  }
  read += documents.length;
  step("library", "Searched the firm's documents", `${queries.length} queries from the archetype, the flagged opportunities and the unfunded goals; ${documents.length} passages above the floor.`);

  // 5. The public record, with each item checked against the file.
  const pub: DossierItem[] = [];
  const checks: DossierItem[] = [];
  for (const p of client.publicRecord ?? []) {
    const corroborates = p.matches !== undefined;
    const item: DossierItem = {
      id: `pub-${p.id}`, source: "public", day: p.day,
      confidence: corroborates ? DOSSIER_CONFIDENCE.publicCorroborated : DOSSIER_CONFIDENCE.publicRecord,
      text: `${PUBLIC_ICON[p.kind]}, ${ago(p.day)}: ${p.headline}. ${p.excerpt}`,
      cites: [{ record: p.ref, label: p.source }],
    };
    if (corroborates) {
      item.check = { field: p.matches!, verdict: "corroborates", why: `Matches ${cite(p.matches!, "").record}.` };
    } else {
      // Not on file: the public record says something the client file does not.
      const hint = p.kind === "directorship" ? "A board or advisory role: a held-away interest and a possible conflict to ask about." : p.kind === "court" ? "A court record: an estate or trust event the file does not yet carry." : p.kind === "charity" ? "A charitable role: a giving intent the Legacy goal does not reflect." : p.kind === "filing" ? "A commitment the file does not carry; the Liquidity picture may be wrong." : /zurich|abroad|relocat|based in/i.test(p.headline) ? "A move: the cross-border tax picture changes." : "Nothing on file reflects this.";
      item.check = { field: "(none)", verdict: "not on file", why: hint };
    }
    pub.push(item);
    checks.push(item);
  }
  // Contradictions between the file and the CRM, the cheap kind that catches real errors.
  const liq = client.goals.find((g) => g.strategy === "Liquidity");
  if (liq && liq.unit === "months" && liq.funded !== liquidityMonths(client)) {
    checks.push({ id: "check-liquidity", source: "file", confidence: 1, text: `The Liquidity goal records ${liq.funded} months funded; the holdings compute to ${liquidityMonths(client)}.`, cites: [cite("goals", "Liquidity goal"), cite("holdings", "Holdings")], check: { field: "goals", verdict: "contradicts", why: "One of the two is stale." } });
  }
  const unsigned = client.paperwork.filter((p) => p.signedDay === undefined && -p.requestedDay > 14);
  read += pub.length;
  step("search", "Read the public record", `${pub.length} item${pub.length === 1 ? "" : "s"}; ${pub.filter((x) => x.check?.verdict === "corroborates").length} corroborate the file, ${pub.filter((x) => x.check?.verdict === "not on file").length} not on file.${pub.length === 0 ? " Nothing found under this household's names." : ""}`);

  // Unknowns: what no source answers.
  const unknowns: Dossier["unknowns"] = [];
  const legacy = client.goals.find((g) => g.strategy === "Legacy");
  const named = /grandchild|child|daughter|son\b|spouse|trust|charit|foundation|heir|beneficiar|nephew|niece|school|education/i;
  if (legacy && legacy.target > 0 && !client.persons.some((p) => p.role === "beneficiary" || p.role === "trustee") && !named.test(legacy.assumption)) unknowns.push({ text: "Who the Legacy goal is for.", why: "The goal has a target; neither the assumption nor the people on the record say who it is for." });
  if (all.length > swept.length) unknowns.push({ text: `What was said on ${[...new Set(all.filter((m) => !connected.has(m.connectorId)).map((m) => m.channel))].join(", ")}.`, why: "Those messages sit on a source that is not connected, so this dossier did not read them." });
  if (contacts.length === 0) unknowns.push({ text: "When the household was last spoken to.", why: "No contact is logged." });
  if (unsigned.length) unknowns.push({ text: `Why ${unsigned.map((p) => p.form).join(" and ")} ${unsigned.length === 1 ? "is" : "are"} still unsigned.`, why: "Requested more than 14 days ago; no note says why." });
  if ((client.publicRecord ?? []).length === 0) unknowns.push({ text: "Anything the public record would add.", why: "Nothing was found under this household's names, which is not the same as nothing existing." });
  step("question", "Listed what no source answers", unknowns.length ? unknowns.map((u) => u.text).join(" ") : "Nothing outstanding.");

  const sections: DossierSection[] = [
    { source: "file", title: "The client file", icon: "people", via: "The record of file, one JSON per household.", items: file },
    { source: "crm", title: "CRM: contacts, notes, paperwork, requests", icon: "crm", via: connected.has("salesforce-fsc") ? "Read through the CRM connector, connected." : "The CRM connector is not connected; these are the copies in the client file.", items: crm, gap: crm.length === 0 ? "Nothing logged." : undefined },
    { source: "messages", title: "Captured messages", icon: "email", via: "Read from the archive of every connected channel, both directions.", items: msgs, gap: msgs.length === 0 ? (all.length ? "Messages exist but sit on a source that is not connected." : "No captured messages.") : undefined },
    { source: "documents", title: "What the firm's research says about this situation", icon: "library", via: "The same retrieval the evidence layer uses, with a reason per score; never about this household by name.", items: documents, gap: documents.length === 0 ? "No passage above the floor." : undefined },
    { source: "public", title: "Public record", icon: "search", via: "In production a read-only search connector; here, shipped as data on the client file. Unverified until a person confirms it.", items: pub, gap: pub.length === 0 ? "Nothing found under this household's names." : undefined },
  ];

  const corroborated = checks.filter((c) => c.check?.verdict === "corroborates").length;
  const contradicted = checks.filter((c) => c.check?.verdict === "contradicts").length;
  const notOnFile = checks.filter((c) => c.check?.verdict === "not on file").length;
  const lines = [
    `Dossier assembled by the research agent from ${sections.filter((s) => s.items.length).length} sources, ${read} records read.`,
    ...(client.publicRecord ?? []).filter((p) => p.matches === undefined).map((p) => `Public record, not on file: ${p.headline} (${p.source}, ${ago(p.day)}). ${checks.find((c) => c.id === `pub-${p.id}`)?.check?.why ?? ""}`),
    ...checks.filter((c) => c.check?.verdict === "contradicts").map((c) => `Sources disagree: ${c.text}`),
    ...(unknowns.length ? [`Could not establish: ${unknowns.map((u) => u.text.replace(/\.$/, "")).join("; ")}.`] : []),
    "Public items are unverified and need confirming with the client before anything rests on them.",
  ];
  step("document", "Drafted a CRM note", "A person files it; nothing is written by the agent.");

  return {
    clientId: client.id, clientName: client.name, sections, checks, unknowns,
    draftNote: lines.join(" "),
    counts: { read, sources: sections.filter((s) => s.items.length).length, corroborated, contradicted, notOnFile },
    trace,
  };
}
