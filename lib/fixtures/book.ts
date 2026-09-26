import type { BookRecord } from "@/lib/types";

// Light records from Advisor A's wider book, for the batch-send demo only.
// Thirteen two-person households and five single-person households.
const COUPLES = ["Achterberg", "Bellweather", "Castellano", "Delacroix-Ng", "Eskildsen", "Fairbairn", "Galloway-Otieno", "Haverford", "Ilves", "Jardine", "Kessler-Amado", "Lindqvist", "Mbeki-Hart"];
const SINGLES = ["Norcross", "Oyelaran", "Prescott-Voss", "Quiller", "Rasmussen"];

export const BOOK: BookRecord[] = [
  ...COUPLES.map((name) => ({ id: `bk-${name.toLowerCase()}`, name, persons: 2 })),
  ...SINGLES.map((name) => ({ id: `bk-${name.toLowerCase()}`, name, persons: 1 })),
];
