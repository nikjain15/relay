// The corpus as the retrieval layer sees it: every document with its age, its
// review state and its place in a supersession chain, and every disagreement
// between two current documents, found from their structured claims.
//
// Deterministic. No model client may be imported here (dependency-cruiser
// `deterministic-no-model`), and nothing here reads a profile or the learning
// loop, so no preference can change what counts as evidence.
import type { Claim, Doc, DocPassage } from "@/lib/types";
import { CORPUS } from "@/lib/fixtures/corpus";
import { POLICY } from "@/lib/data/policy";

export type Freshness = "current" | "review_due" | "stale";

export interface DocState {
  doc: Doc;
  /** Days since publication, on the corpus clock. */
  ageDays: number;
  /** Negative once the review date has passed. */
  daysToReview: number;
  freshness: Freshness;
  /** Superseded or withdrawn documents are never evidence; the state says why. */
  usable: boolean;
  supersededBy?: Doc;
  supersedes?: Doc;
}

export function docState(doc: Doc, corpusDay: number = POLICY.retrieval.corpusDay): DocState {
  const ageDays = corpusDay - doc.day;
  const daysToReview = doc.reviewEveryDays - ageDays;
  const freshness: Freshness = daysToReview < 0 ? "stale" : daysToReview <= POLICY.retrieval.reviewDueWithinDays ? "review_due" : "current";
  return {
    doc,
    ageDays,
    daysToReview,
    freshness,
    usable: doc.status === "current",
    supersededBy: doc.supersededBy ? CORPUS.find((d) => d.id === doc.supersededBy) : undefined,
    supersedes: doc.supersedes ? CORPUS.find((d) => d.id === doc.supersedes) : undefined,
  };
}

export function corpusStates(corpusDay?: number): DocState[] {
  return CORPUS.map((d) => docState(d, corpusDay));
}

export const FRESHNESS_LABEL: Record<Freshness, string> = {
  current: "Current",
  review_due: "Review due",
  stale: "Past review date",
};

export interface ConflictSide {
  docId: string;
  title: string;
  passageId: string;
  day: number;
  value: string;
  freshness: Freshness;
}

/**
 * Two current documents asserting different values on the same topic.
 *
 * A retrieval layer that merged these would be choosing a side silently. This
 * one shows both, says which is newer and which is past its review date, and
 * leaves the choice with the advisor, which is what "conflicting sources shown
 * as conflicting" means in practice.
 */
export interface Conflict {
  topic: string;
  sides: ConflictSide[];
  /** The side a reader would reasonably lean on: newest among those not stale. Never applied automatically. */
  leans: string;
  note: string;
}

function claimsOf(doc: Doc): { passage: DocPassage; claim: Claim }[] {
  return doc.passages.flatMap((p) => (p.claims ?? []).map((claim) => ({ passage: p, claim })));
}

/** Conflicts among the given documents. Superseded and withdrawn documents are not sides: their supersession already resolves them. */
export function conflictsAmong(docs: Doc[], corpusDay?: number): Conflict[] {
  const byTopic = new Map<string, ConflictSide[]>();
  for (const doc of docs) {
    const state = docState(doc, corpusDay);
    if (!state.usable) continue;
    for (const { passage, claim } of claimsOf(doc)) {
      const list = byTopic.get(claim.topic) ?? [];
      list.push({ docId: doc.id, title: doc.title, passageId: passage.id, day: doc.day, value: claim.value, freshness: state.freshness });
      byTopic.set(claim.topic, list);
    }
  }
  const out: Conflict[] = [];
  for (const [topic, sides] of byTopic) {
    const values = new Set(sides.map((s) => s.value));
    if (values.size < 2) continue;
    const fresh = sides.filter((s) => s.freshness !== "stale");
    const pool = fresh.length ? fresh : sides;
    const newest = pool.reduce((a, b) => (b.day > a.day ? b : a));
    const staleSides = sides.filter((s) => s.freshness === "stale");
    const note = staleSides.length
      ? `${staleSides.map((s) => s.title).join(", ")} ${staleSides.length === 1 ? "is" : "are"} past the review date. The newer document is more likely to be current, but nothing here has been withdrawn, so both stand until a desk resolves it.`
      : "Both documents are current. Relay does not pick one; it shows the disagreement.";
    out.push({ topic, sides: sides.sort((a, b) => b.day - a.day), leans: newest.docId, note });
  }
  return out.sort((a, b) => a.topic.localeCompare(b.topic));
}

/** Every conflict in the whole corpus, for the library screen. */
export function corpusConflicts(corpusDay?: number): Conflict[] {
  return conflictsAmong(CORPUS, corpusDay);
}
