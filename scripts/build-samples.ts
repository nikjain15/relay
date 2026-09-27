// Writes the downloadable sample files under public/samples from the same
// generator the "generate a book" button uses, so the file a person downloads
// and the book the button makes are the same data.
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { sampleCsv } from "@/lib/import/sample";

const ROOT = new URL("../", import.meta.url).pathname;
const OUT = join(ROOT, "public/samples");
mkdirSync(OUT, { recursive: true });
// 300 households, seed 7: the evaluation corpus. Change either number and the golden file under evals/ must be regenerated.
const s = sampleCsv(300, 7);
writeFileSync(join(OUT, "clients.csv"), s.clients);
writeFileSync(join(OUT, "messages.csv"), s.messages);
writeFileSync(join(OUT, "research-note.md"), `# Holding cash after a business sale

Proceeds from a sale sit in cash for a reason: the owner has not decided what the money is for. A Liquidity strategy is sized to planned spending, not to the proceeds, so the first conversation is about what the next three years cost and what the rest is for.

Where a sale carries an earn-out, the contingent amount is not counted toward any goal until it is paid. It is listed, dated and excluded, so the plan does not depend on a number the buyer controls.

A new payee wire in the weeks after a sale is verified by a call to a number already on file. The request may be genuine; the verification is not optional.
`);
console.log(`Wrote public/samples: clients.csv (${s.clients.split("\n").length - 2} rows), messages.csv, research-note.md`);
