// Entry for `npm run eval` and `npm run eval:write`.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { runEval, report, golden } from "./run";
import { ROOT } from "./expected";

const r = runEval();
const text = report(r);
const g = JSON.stringify(golden(r), null, 2) + "\n";
const goldenPath = join(ROOT, "evals/golden.json");
console.log(text);
if (process.env.EVAL_WRITE === "1") {
  writeFileSync(join(ROOT, "evals/REPORT.md"), text);
  writeFileSync(goldenPath, g);
  console.log("Wrote evals/REPORT.md and evals/golden.json");
} else {
  const current = existsSync(goldenPath) ? readFileSync(goldenPath, "utf8") : "";
  if (current !== g) {
    console.error("evals/golden.json differs from this run. If the change is intended: npm run eval:write");
    process.exit(1);
  }
  console.log("Matches evals/golden.json.");
}
