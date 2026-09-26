import type { Doc } from "@/lib/types";
import { DOCUMENTS } from "@/lib/data";

// Illustrative documents from data/documents.json. Relative dates only; no
// view is attributed to any real Chief Investment Office.
export const CORPUS: Doc[] = DOCUMENTS;

export function doc(id: string): Doc | undefined {
  return CORPUS.find((d) => d.id === id);
}
