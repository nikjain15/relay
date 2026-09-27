// Evidence for an opportunity.
//
// The record cites documents; retrieval ranks their passages against what the
// opportunity is about, says why each one ranks where it does, brings in
// related passages the record did not cite (marked as such, never promoted to
// a citation), shows two current documents that disagree as disagreeing, and
// marks anything past its review date. When no cited document resolves, the
// answer is a refusal that names what was missing, never a narration
// (PRD S4.1). Relay does not substitute its own citation for the record's.
//
// Deterministic. No model client and no profile may be imported here.
import type { Opportunity, Passage } from "@/lib/types";
import { CORPUS } from "@/lib/fixtures/corpus";
import { POLICY } from "@/lib/data/policy";
import { search, surfaceForms, tokenize, type Hit } from "@/lib/evidence/search";
import { conflictsAmong, docState, type Conflict } from "@/lib/evidence/corpus";

export interface RankedPassage extends Passage {
  passageId: string;
  score: number;
  matched: string[];
  reasons: Hit["reasons"];
  freshness: Hit["freshness"];
}

export interface Refusal {
  /** Cited document ids that are not in the corpus. */
  missing: string[];
  /** What the opportunity is about that the corpus has nothing on. */
  unmatched: string[];
  /** The best uncited passages, with their scores, and why each is not enough. */
  nearest: (RankedPassage & { why: string })[];
  floor: number;
}

interface Common {
  /** What was searched for, and where the terms came from. */
  query: { text: string; terms: string[] };
  /** Cited documents that resolve, whether or not they are still current. */
  missing: string[];
  /** Passages in cited documents that are superseded or withdrawn: never evidence, always named. */
  excluded: { docId: string; title: string; passageId: string; reason: string }[];
  conflicts: Conflict[];
  searched: number;
}

export type EvidenceResult =
  | (Common & { refused: false; passages: RankedPassage[]; related: RankedPassage[] })
  | (Common & { refused: true; refusal: Refusal });

function toRanked(h: Hit): RankedPassage {
  return { docId: h.docId, title: h.title, day: h.day, text: h.text, passageId: h.passageId, score: h.score, matched: h.matched, reasons: h.reasons, freshness: h.freshness };
}

/** The query is the opportunity as the record states it: nothing is added that the record does not say. */
export function queryFor(opp: Opportunity): { text: string; terms: string[] } {
  const parts = [opp.title, opp.plainTitle ?? "", opp.strategy, opp.action, ...opp.reasonPath.map((n) => n.label)];
  const text = parts.filter(Boolean).join(". ");
  const surface = surfaceForms(text);
  return { text, terms: [...new Set(tokenize(text))].map((t) => surface.get(t) ?? t) };
}

export function retrieve(opp: Opportunity): EvidenceResult {
  const query = queryFor(opp);
  const missing = opp.evidenceDocIds.filter((id) => !CORPUS.some((d) => d.id === id));
  const citedDocs = CORPUS.filter((d) => opp.evidenceDocIds.includes(d.id));
  const result = search(query.text, { cited: opp.evidenceDocIds });
  const { topK } = POLICY.retrieval;

  const usableCited = citedDocs.filter((d) => docState(d).usable);
  const excluded = result.excluded.filter((e) => opp.evidenceDocIds.includes(e.docId));
  const common: Common = { query, missing, excluded, conflicts: [], searched: result.searched };

  if (usableCited.length === 0) {
    const nearest = result.hits.slice(0, 3).map((h) => ({
      ...toRanked(h),
      why: h.score < result.floor
        ? `Scores ${h.score.toFixed(2)}, under the ${result.floor.toFixed(2)} floor: it shares ${h.matched.length ? `only "${h.matched.join('", "')}"` : "no terms"} with this opportunity.`
        : `Relevant to the words, but the record does not cite it, and Relay does not substitute its own citation for the record's.`,
    }));
    return { ...common, refused: true, refusal: { missing, unmatched: result.unmatched, nearest, floor: result.floor } };
  }

  const cited = result.hits.filter((h) => h.cited).map(toRanked);
  const related = result.hits.filter((h) => !h.cited && h.score >= result.floor).slice(0, topK).map(toRanked);
  // A conflict is about what the evidence asserts, so it is found against the
  // whole corpus, not only against what happened to rank: a cited passage whose
  // claim is disputed by another current document is disputed whether or not
  // that document shares the opportunity's words.
  const inView = new Set([...cited, ...related].map((p) => p.docId));
  const conflicts = conflictsAmong(CORPUS).filter((c) => c.sides.some((s) => inView.has(s.docId)));
  return { ...common, refused: false, passages: cited, related, conflicts };
}
