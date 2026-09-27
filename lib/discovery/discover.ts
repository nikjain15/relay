// The discovery agent: opportunities nobody typed in.
//
// The insight engine upstream flags what the data feeds show. What it cannot
// see is what the client said: "we've accepted an offer on the house", "my
// brother will handle the paperwork now", "retiring at the end of next year".
// Those sentences sit in captured messages, team notes, service requests and
// contact summaries, and each one is the start of an opportunity or a risk.
// This agent reads them, names the event, cites the sentence, says how sure
// it is, finds the corpus documents that would support a conversation, and
// proposes. The advisor accepts a candidate onto today's list or declines it.
// Nothing here is added to the list by the agent, and a candidate with no
// citable document arrives saying so, because the evidence screen will refuse
// it until one exists.
//
// Deterministic: regular expressions with a confidence per pattern. In
// production a typed extraction model would do the reading and this file
// would still decide what counts, what is cited, and that a person accepts.
// No model client may be imported here.
import type { ClientFile, Opportunity, TriggerClass } from "@/lib/types";
import { CLIENTS } from "@/lib/data";
import { search, buildIndex } from "@/lib/evidence/search";
import type { Doc } from "@/lib/types";
import { CORPUS } from "@/lib/fixtures/corpus";
import { POLICY } from "@/lib/data/policy";

export interface Extractor {
  id: string;
  /** What the advisor sees. */
  label: string;
  triggerClass: TriggerClass;
  strategy: Opportunity["strategy"];
  action: Opportunity["action"];
  pattern: RegExp;
  /** How sure a pattern hit is, before a person confirms it. */
  confidence: number;
  /** What to search the corpus for, to find supporting documents. */
  query: string;
  /** Why it matters, in one line. */
  why: string;
}

/** Adding an event kind is one entry here. Each is a pattern over a client's own words or a colleague's account of them. */
export const EXTRACTORS: Extractor[] = [
  { id: "property-sale", label: "Property sale or purchase", triggerClass: "life_event", strategy: "Liquidity", action: "review", confidence: 0.8, query: "property sale proceeds cash liquidity new cash inflows", why: "Proceeds or a deposit change the Liquidity picture within weeks.", pattern: /\b(accepted an offer|selling (the|our|a) (house|home|flat|apartment|second home)|sell(ing)? the (house|home)|completion is|house (sale|purchase)|buying a (house|home|flat)|deposit on a flat)\b/i },
  { id: "retirement", label: "Retirement or pension decision", triggerClass: "life_event", strategy: "Longevity", action: "review", confidence: 0.8, query: "retirement withdrawals required distributions pension review client information", why: "A retirement date fixes the Longevity number and starts the withdrawal plan.", pattern: /\b(retir(e|ing|ement)|pension (option|election|packet|transfer|decision|question)|(talk|think|walk) (through|about) (the|my|our) pension|stop(ping)? work)\b/i },
  { id: "relocation", label: "Relocation or cross-border move", triggerClass: "life_event", strategy: "Longevity", action: "review", confidence: 0.75, query: "non-US pooled funds US taxpayers cross-border tax", why: "A move across a border changes tax treatment of what is held.", pattern: /\b(moving (to|back to|abroad)|relocat(e|ing|ion)|move back to|two years (abroad|in))\b/i },
  { id: "inheritance", label: "Inheritance or windfall", triggerClass: "external_event", strategy: "Liquidity", action: "review", confidence: 0.8, query: "new cash inflows lowest-cost source of funding liquidity", why: "New money with no plan sits in cash or goes somewhere unplanned.", pattern: /\b(an inheritance|inheritance from|inherited (a|an|some|about|roughly|money|\$)|windfall|received (a|an) (inheritance|bonus|payout)|estate of)\b/i },
  { id: "liquidity-event", label: "Company sale, vesting or funding round", triggerClass: "external_event", strategy: "Longevity", action: "review", confidence: 0.8, query: "single-name concentration staged sales trading plan exchange fund", why: "Vesting or a sale creates concentration or cash, and a tax bill, on a date.", pattern: /\b(being acquired|acqui(red|sition)|shares vest|vest(s|ing) on|funding round|ipo|earn-?out|sold (the|my|our) (company|practice|business))\b/i },
  { id: "family-change", label: "Marriage, birth, divorce or a death", triggerClass: "life_event", strategy: "Legacy", action: "review", confidence: 0.7, query: "client information refreshed material life event beneficiary", why: "Beneficiaries, trusted contacts and the Legacy goal all turn on family changes.", pattern: /\b(getting married|wedding|engaged|new baby|(grandchild|baby|daughter|son) (born|arrived|on the way)|divorc(e|ing)|passed away|widow(ed)?|separat(ed|ing))\b/i },
  { id: "third-party", label: "Someone new acting for the client", triggerClass: "plan_service_event", strategy: "Legacy", action: "review", confidence: 0.75, query: "account review documentation trusted contact", why: "A new person handling the account is a protection question before it is a service request.", pattern: /\b((brother|sister|son|daughter|nephew|niece|friend|cousin) will (be )?(handl|deal|manag)|power of attorney|send everything to (him|her|them)|on my behalf)\b/i },
  { id: "excess-cash", label: "Cash the client wants working", triggerClass: "household_threshold", strategy: "Liquidity", action: "review", confidence: 0.7, query: "liquidity strategy sized planned spending instruments", why: "Cash above the target is a conversation the client has already asked for.", pattern: /\b(cash (could|should) (go|earn|do)|earn(s)? a little more|sitting in cash|too much (in )?cash)\b/i },
  { id: "education", label: "School or university fees", triggerClass: "life_event", strategy: "Legacy", action: "review", confidence: 0.7, query: "legacy education trust grandchildren", why: "A fees commitment is a Legacy goal with a date on it.", pattern: /\b(school fees|university|tuition|college fund|education (trust|fund))\b/i },
];

export interface Candidate {
  id: string;
  clientId: string;
  clientName: string;
  advisorId: string;
  extractor: Extractor;
  /** Where it was read: the record kind and its id, and the sentence. */
  source: { kind: "message" | "note" | "request" | "contact"; id: string; day: number; excerpt: string };
  confidence: number;
  /** Corpus documents above the retrieval floor for this kind of event, best first. Empty means the evidence screen will refuse it. */
  evidence: { docId: string; title: string; score: number }[];
  /** True when today's list already carries an opportunity of this class for this household. */
  duplicate: boolean;
}

function sentence(text: string, m: RegExpMatchArray): string {
  const i = m.index ?? 0;
  const start = Math.max(0, text.lastIndexOf(". ", i) + 1);
  const end = text.indexOf(". ", i);
  return text.slice(start, end < 0 ? undefined : end + 1).trim().slice(0, 200);
}

/** Every candidate in a client's records, oldest evidence first within a client, best confidence first across kinds. */
export function discover(clients: ClientFile[] = CLIENTS, docs: Doc[] = CORPUS): Candidate[] {
  const out: Candidate[] = [];
  const floor = POLICY.retrieval.floor;
  const cache = new Map<string, Candidate["evidence"]>();
  const evidenceFor = (x: Extractor) => {
    if (!cache.has(x.id)) {
      const hits = search(x.query, { index: docs === CORPUS ? undefined : buildIndex(docs) }).hits.filter((h) => h.score >= floor);
      const seen = new Set<string>();
      cache.set(x.id, hits.filter((h) => !seen.has(h.docId) && seen.add(h.docId)).slice(0, 3).map((h) => ({ docId: h.docId, title: h.title, score: h.score })));
    }
    return cache.get(x.id)!;
  };
  for (const c of clients) {
    const texts: { kind: Candidate["source"]["kind"]; id: string; day: number; text: string }[] = [
      ...(c.messages ?? []).map((m) => ({ kind: "message" as const, id: m.id, day: m.day, text: m.text })),
      ...c.notes.map((n, i) => ({ kind: "note" as const, id: `notes[${i}]`, day: n.day, text: n.text })),
      ...c.contactHistory.map((e, i) => ({ kind: "contact" as const, id: `contactHistory[${i}]`, day: e.day, text: e.summary })),
    ];
    const seenKinds = new Set<string>();
    for (const t of texts) {
      for (const x of EXTRACTORS) {
        const m = t.text.match(x.pattern);
        if (!m) continue;
        const key = `${c.id}:${x.id}`;
        if (seenKinds.has(key)) continue;
        seenKinds.add(key);
        out.push({
          id: `disc-${c.id.replace(/^hh-/, "")}-${x.id}`,
          clientId: c.id,
          clientName: c.name,
          advisorId: c.advisorId,
          extractor: x,
          source: { kind: t.kind, id: t.id, day: t.day, excerpt: sentence(t.text, m) },
          // A colleague's account is less certain than the client's own words.
          confidence: t.kind === "note" || t.kind === "contact" ? Math.round((x.confidence - 0.1) * 100) / 100 : x.confidence,
          evidence: evidenceFor(x),
          duplicate: c.opportunities.some((o) => o.triggerClass === x.triggerClass && o.strategy === x.strategy),
        });
      }
    }
  }
  return out.sort((a, b) => b.confidence - a.confidence || a.clientName.localeCompare(b.clientName));
}

/** What an accepted candidate becomes: an opportunity on today's list, its reason path the sentence it came from. */
export function toOpportunity(k: Candidate): Opportunity {
  return {
    id: `opp-${k.id.replace(/^disc-/, "")}`,
    householdId: k.clientId,
    triggerClass: k.extractor.triggerClass,
    title: `${k.extractor.label}: "${k.source.excerpt.slice(0, 80)}${k.source.excerpt.length > 80 ? "…" : ""}"`,
    plainTitle: `${k.extractor.label}, found in a ${k.source.kind}`,
    materiality: Math.round(50 + k.confidence * 40),
    observedDay: -k.source.day,
    action: k.extractor.action,
    strategy: k.extractor.strategy,
    reasonPath: [
      { kind: k.extractor.triggerClass === "life_event" ? "LifeEvent" : k.extractor.triggerClass === "external_event" ? "ExternalEvent" : k.extractor.triggerClass === "household_threshold" ? "Threshold" : "ServiceEvent", label: `${k.extractor.label}, read from a ${k.source.kind} (${k.source.id}), ${Math.round(k.confidence * 100)} percent` },
      { kind: "Household", label: `${k.clientName} household` },
    ],
    evidenceDocIds: k.evidence.map((e) => e.docId),
    ...(k.evidence.length ? {} : { evidenceExpectedMissing: true }),
  };
}
