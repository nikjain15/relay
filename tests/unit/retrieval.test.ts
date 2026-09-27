import { describe, it, expect } from "vitest";
import { retrieve, queryFor } from "@/lib/evidence/retrieve";
import { search, tokenize, stem, buildIndex } from "@/lib/evidence/search";
import { corpusConflicts, corpusStates, docState, conflictsAmong } from "@/lib/evidence/corpus";
import { opportunity, OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { CORPUS } from "@/lib/fixtures/corpus";
import { POLICY } from "@/lib/data/policy";
import { compose } from "@/lib/drafting/compose";
import { runChecks } from "@/lib/policy/checks";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { household } from "@/lib/fixtures/households";
import { product } from "@/lib/fixtures/shelf";
import type { Doc } from "@/lib/types";

/**
 * Retrieval is a surface, not a lookup. Every score decomposes into reasons
 * that add up, a cited document that shares no words is marked weak rather
 * than dressed up, two current documents that disagree are shown as
 * disagreeing, a document past its review date says so and scores less, and a
 * refusal names what is missing and shows the nearest miss with why it was not
 * enough.
 */
const R = POLICY.retrieval;

describe("retrieval: relevance with a visible reason", () => {
  it("every score is the sum of its reasons, rounded", () => {
    for (const o of OPPORTUNITIES) {
      const ev = retrieve(o);
      if (ev.refused) continue;
      for (const p of [...ev.passages, ...ev.related]) {
        const sum = p.reasons.reduce((s, r) => s + r.delta, 0);
        expect(Math.abs(Math.min(1, sum) - p.score), `${o.id} ${p.docId}`).toBeLessThan(0.002);
      }
    }
  });

  it("ranks cited passages by score, best first, and compose cites the best one at passage level", () => {
    const o = opportunity("opp-renner-property")!;
    const ev = retrieve(o);
    expect(ev.refused).toBe(false);
    if (ev.refused) return;
    for (let i = 1; i < ev.passages.length; i++) expect(ev.passages[i - 1].score).toBeGreaterThanOrEqual(ev.passages[i].score);
    const h = household(o.householdId)!;
    const e = evaluateAll(o, h).find((x) => x.pass)!;
    const d = compose(h, o, e, product(e.candidate.productId)!, ev.passages);
    expect(d.text).toContain(`[Source: ${ev.passages[0].title}, passage ${ev.passages[0].passageId}, prototype corpus, day ${ev.passages[0].day}]`);
    expect(runChecks({ draft: d.text, sources: d.sources, citedTitles: d.citedTitles, recipients: 2, recordedRegime: "correspondence" }).find((c) => c.id === "citation")?.pass).toBe(true);
  });

  it("a term the corpus has never seen weighs as its rarest term, so one common word cannot cover a query", () => {
    const idx = buildIndex();
    const r = search("beneficiary distribution provision activates review", { index: idx });
    // "review" is the only term the corpus holds; the other four are unseen and count against the score.
    expect(r.unmatched).toEqual(["beneficiary", "distribution", "provision", "activates"]);
    expect(r.hits[0].score).toBeLessThan(0.35);
  });

  it("the citation boost is exactly the policy value and only applies to cited documents", () => {
    const r = search("nothing in common with any passage", { cited: ["doc-tsy-onepager"] });
    const cited = r.hits.find((h) => h.docId === "doc-tsy-onepager")!;
    expect(cited.score).toBe(R.citedBoost);
    expect(cited.reasons.map((x) => x.kind)).toEqual(["cited"]);
    expect(r.hits.filter((h) => h.docId !== "doc-tsy-onepager")).toHaveLength(0);
  });

  it("marks a cited document that shares no term with the opportunity, rather than dressing it up", () => {
    const ev = retrieve(opportunity("opp-renner-property")!);
    if (ev.refused) throw new Error("unexpected refusal");
    const weak = ev.passages.filter((p) => p.matched.length === 0);
    expect(weak.map((p) => p.docId)).toContain("doc-tsy-onepager");
    expect(weak[0].score).toBe(R.citedBoost);
  });

  it("stems lightly: sales meets sale, funded meets fund, treasuries meets treasury", () => {
    expect(stem("sales")).toBe(stem("sale"));
    expect(stem("funded")).toBe(stem("fund"));
    expect(stem("treasuries")).toBe(stem("treasury"));
    expect(tokenize("the and of")).toEqual([]);
  });

  it("the query is the record and nothing more", () => {
    const o = opportunity("opp-renner-property")!;
    const q = queryFor(o);
    expect(q.text).toContain(o.title);
    for (const n of o.reasonPath) expect(q.text).toContain(n.label);
    expect(q.terms.length).toBeGreaterThan(5);
  });
});

describe("retrieval: staleness", () => {
  it("computes age against the corpus clock and the document's own review cycle", () => {
    const memo = docState(CORPUS.find((d) => d.id === "doc-concentration-desk-memo")!);
    expect(memo.ageDays).toBe(R.corpusDay + 45);
    expect(memo.freshness).toBe("stale");
    const cross = docState(CORPUS.find((d) => d.id === "doc-crossborder-note")!);
    expect(cross.freshness).toBe("review_due");
    expect(cross.daysToReview).toBe(60 - (R.corpusDay - 4));
    expect(docState(CORPUS.find((d) => d.id === "doc-liquidity-note")!).freshness).toBe("current");
  });

  it("halves a stale passage's score and says so in its reasons", () => {
    const r = search("trading plan single position household threshold carried");
    const stale = r.hits.find((h) => h.docId === "doc-concentration-desk-memo")!;
    expect(stale.freshness).toBe("stale");
    const before = stale.reasons.filter((x) => x.kind === "term").reduce((s, x) => s + x.delta, 0);
    const penalty = stale.reasons.find((x) => x.kind === "stale")!;
    expect(penalty.delta).toBeCloseTo(-before * (1 - R.stalePenalty), 3);
    expect(stale.score).toBeCloseTo(before * R.stalePenalty, 2);
  });

  it("the library counts every state and the counts add up", () => {
    const states = corpusStates();
    const usable = states.filter((s) => s.usable);
    expect(states.length).toBe(CORPUS.length);
    expect(usable.filter((s) => s.freshness === "stale").map((s) => s.doc.id)).toEqual(["doc-concentration-desk-memo"]);
    expect(states.filter((s) => !s.usable).map((s) => s.doc.id)).toEqual(["doc-liquidity-note-v1"]);
    expect(usable.filter((s) => s.freshness === "current").length + usable.filter((s) => s.freshness === "review_due").length + 1).toBe(usable.length);
  });
});

describe("retrieval: conflicts are shown, never merged", () => {
  it("finds the two current documents that disagree on whether a trading plan suffices", () => {
    const ks = corpusConflicts();
    expect(ks).toHaveLength(1);
    expect(ks[0].topic).toBe("concentration.plan-suffices");
    expect(ks[0].sides.map((s) => s.docId).sort()).toEqual(["doc-concentration-desk-memo", "doc-concentration-note"]);
    expect(ks[0].leans).toBe("doc-concentration-note");
    expect(ks[0].note).toMatch(/past the review date/);
  });

  it("a superseded document is not a side: its supersession already resolves it", () => {
    const pair = CORPUS.filter((d) => d.id === "doc-liquidity-note" || d.id === "doc-liquidity-note-v1");
    expect(pair.map((d) => d.passages[0].claims?.[0].topic)).toEqual(["liquidity.horizon", "liquidity.horizon"]);
    expect(conflictsAmong(pair)).toEqual([]);
  });

  it("two current documents with different values on one topic conflict; the same value does not", () => {
    const mk = (id: string, day: number, value: string): Doc => ({ id, title: id, kind: "research note", desk: "x", day, reviewEveryDays: 90, status: "current", passages: [{ id: "p1", text: "t", claims: [{ topic: "t", value }] }] });
    expect(conflictsAmong([mk("a", 1, "yes"), mk("b", 2, "no")])).toHaveLength(1);
    expect(conflictsAmong([mk("a", 1, "yes"), mk("b", 2, "yes")])).toHaveLength(0);
    expect(conflictsAmong([mk("a", 1, "yes"), mk("b", 2, "no")])[0].leans).toBe("b");
  });

  it("an opportunity whose cited document is a side of a conflict shows it; the superseded edition is excluded and named", () => {
    const ev = retrieve(opportunity("opp-renner-concentration")!);
    if (ev.refused) throw new Error("unexpected refusal");
    expect(ev.conflicts.map((k) => k.topic)).toEqual(["concentration.plan-suffices"]);
    const withOld = retrieve({ ...opportunity("opp-renner-property")!, evidenceDocIds: ["doc-liquidity-note", "doc-liquidity-note-v1"] });
    if (withOld.refused) throw new Error("unexpected refusal");
    expect(withOld.excluded.map((e) => e.docId)).toEqual(["doc-liquidity-note-v1"]);
    expect(withOld.excluded[0].reason).toMatch(/Superseded by "Sizing a Liquidity strategy"/);
    expect(withOld.passages.some((p) => p.docId === "doc-liquidity-note-v1")).toBe(false);
  });
});

describe("retrieval: the refusal names what was missing", () => {
  it("refuses when no cited document resolves, with the missing ids, the unmatched terms and the nearest miss explained", () => {
    const ev = retrieve(opportunity("opp-pell-market")!);
    expect(ev.refused).toBe(true);
    if (!ev.refused) return;
    expect(ev.refusal.missing).toEqual(["doc-sector-note-not-in-corpus"]);
    expect(ev.refusal.unmatched).toContain("sector");
    expect(ev.refusal.nearest.length).toBeGreaterThan(0);
    for (const n of ev.refusal.nearest) {
      expect(n.why).toMatch(n.score < ev.refusal.floor ? /under the .* floor/ : /does not cite it/);
    }
  });

  it("refuses when every cited document is superseded, even though the text exists", () => {
    const ev = retrieve({ ...opportunity("opp-renner-property")!, evidenceDocIds: ["doc-liquidity-note-v1"] });
    expect(ev.refused).toBe(true);
    if (!ev.refused) return;
    expect(ev.refusal.missing).toEqual([]);
    expect(ev.excluded.map((e) => e.docId)).toEqual(["doc-liquidity-note-v1"]);
  });

  it("a related passage above the floor never rescues a missing citation", () => {
    // The concentration note is relevant to these words; the record does not cite it.
    const ev = retrieve({ ...opportunity("opp-renner-concentration")!, evidenceDocIds: ["doc-not-here"] });
    expect(ev.refused).toBe(true);
    if (!ev.refused) return;
    expect(ev.refusal.nearest[0].docId).toBe("doc-concentration-note");
    expect(ev.refusal.nearest[0].score).toBeGreaterThanOrEqual(ev.refusal.floor);
    expect(ev.refusal.nearest[0].why).toMatch(/does not substitute its own citation/);
  });

  it("still reports a missing id when other citations resolve", () => {
    const ev = retrieve({ ...opportunity("opp-renner-property")!, evidenceDocIds: ["doc-liquidity-note", "doc-missing"] });
    expect(ev.refused).toBe(false);
    expect(ev.missing).toEqual(["doc-missing"]);
  });
});
