// Lexical passage search with a visible reason for every score.
//
// The prototype makes no model calls, so relevance is term overlap weighted
// by how rare each term is across the corpus. That is a weaker ranker than an
// embedding model, and it is deliberately the part a model would own in
// production (query rewriting and reranking). What a model would NOT own is
// everything that decides whether a passage may be shown as evidence: the
// floor, the citation requirement, the staleness penalty and the exclusion of
// superseded documents. Those stay in this file, in code, so the reason a
// passage appears can be read off the screen and recomputed by hand.
//
// Deterministic. No model client may be imported here.
import type { Doc } from "@/lib/types";
import { CORPUS } from "@/lib/fixtures/corpus";
import { POLICY } from "@/lib/data/policy";
import { docState, type Freshness } from "@/lib/evidence/corpus";

const STOP = new Set(
  "a an and are as at be by for from has have in into is it its of on or that the this to was were will with not no yet than then their there these those they you your our we us".split(" "),
);

/** Lower case, letters and digits only, light stemming so "sales" meets "sale" and "funded" meets "fund". */
export function stem(word: string): string {
  let w = word.toLowerCase();
  if (w.length > 5 && w.endsWith("ies")) w = w.slice(0, -3) + "y";
  else if (w.length > 5 && w.endsWith("ing")) w = w.slice(0, -3);
  else if (w.length > 4 && w.endsWith("ed")) w = w.slice(0, -2);
  else if (w.length > 4 && /(sses|xes|zes|ches|shes)$/.test(w)) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .split(/[^A-Za-z0-9]+/)
    .filter((t) => t.length >= 3 && !STOP.has(t.toLowerCase()) && !/^\d+$/.test(t))
    .map(stem);
}

/** Each stem with the first word in the text that produced it, so a screen can show "sales" rather than "sale". */
export function surfaceForms(text: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const w of text.split(/[^A-Za-z0-9]+/)) {
    if (w.length < 3 || STOP.has(w.toLowerCase()) || /^\d+$/.test(w)) continue;
    const s = stem(w);
    if (!out.has(s)) out.set(s, w.toLowerCase());
  }
  return out;
}

export interface IndexedPassage {
  docId: string;
  passageId: string;
  title: string;
  day: number;
  text: string;
  terms: Set<string>;
  freshness: Freshness;
  usable: boolean;
}

export interface Index {
  passages: IndexedPassage[];
  /** Inverse document frequency per stem, over passages. Rare terms carry more weight. */
  idf: Map<string, number>;
  docs: number;
}

export function buildIndex(docs: Doc[] = CORPUS): Index {
  const passages: IndexedPassage[] = docs.flatMap((d) => {
    const s = docState(d);
    return d.passages.map((p) => ({
      docId: d.id,
      passageId: p.id,
      title: d.title,
      day: d.day,
      text: p.text,
      terms: new Set(tokenize(`${d.title} ${p.text}`)),
      freshness: s.freshness,
      usable: s.usable,
    }));
  });
  const df = new Map<string, number>();
  for (const p of passages) for (const t of p.terms) df.set(t, (df.get(t) ?? 0) + 1);
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log(1 + passages.length / n));
  return { passages, idf, docs: docs.length };
}

export type ReasonKind = "term" | "cited" | "stale" | "excluded";

export interface Reason {
  kind: ReasonKind;
  label: string;
  /** Signed contribution to the score, so the number on screen adds up. */
  delta: number;
}

export interface Hit {
  docId: string;
  passageId: string;
  title: string;
  day: number;
  text: string;
  /** 0 to 1. Share of the query's weight this passage covers, plus the citation boost, times the staleness penalty. */
  score: number;
  matched: string[];
  reasons: Reason[];
  freshness: Freshness;
  cited: boolean;
}

export interface SearchResult {
  hits: Hit[];
  /** Query stems that no usable passage in the corpus contains. What the corpus cannot speak to. */
  unmatched: string[];
  /** Passages in superseded or withdrawn documents, never shown as evidence, listed so the exclusion is visible. */
  excluded: { docId: string; title: string; passageId: string; reason: string }[];
  searched: number;
  floor: number;
}

/**
 * Score every usable passage for the query. Every hit is returned, above the
 * floor or below it, so a refusal can show the nearest miss and say why it was
 * not enough.
 */
export function search(query: string, opts: { cited?: string[]; index?: Index } = {}): SearchResult {
  const index = opts.index ?? buildIndex();
  const cited = new Set(opts.cited ?? []);
  const qterms = [...new Set(tokenize(query))];
  const surface = surfaceForms(query);
  // A term the corpus has never seen weighs as much as its rarest term. Without
  // this, a query made mostly of words the corpus cannot speak to is "fully
  // covered" by the one common word it shares with everything, and a passage
  // about account paperwork scores 0.8 against a trust distribution event.
  const unseen = Math.log(1 + index.passages.length);
  const weight = (t: string) => index.idf.get(t) ?? unseen;
  const total = qterms.reduce((s, t) => s + weight(t), 0);
  const { citedBoost, stalePenalty, floor } = POLICY.retrieval;
  const seen = new Set<string>();
  const hits: Hit[] = [];
  const excluded: SearchResult["excluded"] = [];

  for (const p of index.passages) {
    const matched = qterms.filter((t) => p.terms.has(t));
    matched.forEach((t) => seen.add(t));
    if (!p.usable) {
      const state = docState(CORPUS.find((d) => d.id === p.docId)!);
      excluded.push({
        docId: p.docId,
        title: p.title,
        passageId: p.passageId,
        reason: state.supersededBy ? `Superseded by "${state.supersededBy.title}"` : "Withdrawn",
      });
      continue;
    }
    const reasons: Reason[] = matched.map((t) => ({
      kind: "term" as const,
      label: surface.get(t) ?? t,
      delta: total ? weight(t) / total : 0,
    }));
    let score = reasons.reduce((s, r) => s + r.delta, 0);
    const isCited = cited.has(p.docId);
    if (isCited) {
      reasons.push({ kind: "cited", label: "Cited by the opportunity record", delta: citedBoost });
      score += citedBoost;
    }
    score = Math.min(1, score);
    if (p.freshness === "stale") {
      const penalty = score * (1 - stalePenalty);
      reasons.push({ kind: "stale", label: "Past its review date", delta: -penalty });
      score -= penalty;
    }
    if (score > 0) {
      hits.push({
        docId: p.docId, passageId: p.passageId, title: p.title, day: p.day, text: p.text,
        score: Math.round(score * 1000) / 1000, matched: matched.map((t) => surface.get(t) ?? t), reasons, freshness: p.freshness, cited: isCited,
      });
    }
  }

  hits.sort((a, b) => b.score - a.score || a.docId.localeCompare(b.docId) || a.passageId.localeCompare(b.passageId));
  return { hits, unmatched: qterms.filter((t) => !seen.has(t)).map((t) => surface.get(t) ?? t), excluded, searched: index.passages.length, floor };
}
