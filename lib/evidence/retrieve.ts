// Evidence for an opportunity. When no cited document resolves, the answer is
// a refusal that names what is missing, never a narration (PRD S4.1).
import type { Opportunity, Passage } from "@/lib/types";
import { CORPUS } from "@/lib/fixtures/corpus";

export type EvidenceResult = { refused: false; passages: Passage[] } | { refused: true; missing: string[] };

export function retrieve(opp: Opportunity): EvidenceResult {
  const passages: Passage[] = [];
  const missing: string[] = [];
  for (const id of opp.evidenceDocIds) {
    const d = CORPUS.find((x) => x.id === id);
    if (!d) {
      missing.push(id);
      continue;
    }
    for (const text of d.passages) passages.push({ docId: d.id, title: d.title, day: d.day, text });
  }
  return passages.length ? { refused: false, passages } : { refused: true, missing };
}
