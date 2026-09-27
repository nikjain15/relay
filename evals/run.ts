// The evaluation: the agents against the expected answers, over the committed
// 300-household corpus.
//
// Usage: npm run eval            print the report and compare to evals/golden.json
//        npm run eval -- --write  rewrite evals/golden.json and evals/REPORT.md
//
// Precision and recall are per rule and per discovery kind, at the level of
// (household, rule) and (household, kind). Anything under 1.0 is a defect in
// the engine, in the expectation, or in the corpus, and the report names every
// disagreement so it can be read rather than averaged away.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expected, coherence, ROOT } from "./expected";
import { parseCsv } from "@/lib/import/csv";
import { mapClients, mapMessages } from "@/lib/import/map";
import { clientErrors } from "@/lib/data/validate";
import { ADVISORS_DATA, CONNECTORS_DATA, DOCUMENTS, SHELF_DATA, toHousehold } from "@/lib/data";
import { liquidityMonths } from "@/lib/household-math";
import { sweep } from "@/lib/compliance/sweep";
import { policyFrom, SEED_EDITS } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { prepareAll } from "@/lib/compliance/actions";
import { briefAll } from "@/lib/research/brief";
import { retrieve } from "@/lib/evidence/retrieve";
import { discover } from "@/lib/discovery/discover";

export interface Score { expected: number; found: number; tp: number; fp: number; fn: number; precision: number; recall: number; misses: string[]; extras: string[] }
export interface EvalResult {
  corpus: { households: number; messages: number; validationErrors: number; coherenceProblems: string[]; opportunities: number };
  arithmetic: { liquidityMonthsAgree: number; totalsAgree: number; disagreements: string[] };
  opportunities: Score;
  rules: Record<string, Score>;
  cannotEvaluate: Record<string, Score>;
  notSwept: { expected: number; found: number };
  discovery: Record<string, Score>;
  briefings: { households: number; unknowns: number; inferred: number; citationsResolved: boolean };
  retrieval: { opportunities: number; refused: number; conflicts: number };
  timingsMs: Record<string, number>;
}

function score(exp: Set<string>, got: Set<string>): Score {
  const tp = [...exp].filter((x) => got.has(x)).length;
  const misses = [...exp].filter((x) => !got.has(x)).sort();
  const extras = [...got].filter((x) => !exp.has(x)).sort();
  return { expected: exp.size, found: got.size, tp, fp: extras.length, fn: misses.length, precision: got.size ? tp / got.size : 1, recall: exp.size ? tp / exp.size : 1, misses, extras };
}

export function runEval(sampleDir = "public/samples"): EvalResult {
  const timingsMs: Record<string, number> = {};
  const t = (k: string, f: () => void) => { const a = performance.now(); f(); timingsMs[k] = Math.round(performance.now() - a); };
  const exp = expected(sampleDir);

  // 1. Through the real import path.
  const clientRows = parseCsv(readFileSync(join(ROOT, sampleDir, "clients.csv"), "utf8")).rows;
  const messageRows = parseCsv(readFileSync(join(ROOT, sampleDir, "messages.csv"), "utf8")).rows;
  const mapped = mapClients(clientRows, { source: "eval" });
  mapMessages(messageRows, mapped.clients);
  const ctx = { docIds: new Set(DOCUMENTS.map((d) => d.id)), productIds: new Set(SHELF_DATA.map((p) => p.id)), advisorIds: new Set(ADVISORS_DATA.map((a) => a.id)) };
  const seen = { ids: new Set<string>(), personIds: new Set<string>(), oppIds: new Set<string>() };
  const validationErrors = mapped.clients.flatMap((c) => clientErrors(c, ctx, seen));
  const clients = mapped.clients;

  // 2. Arithmetic the engines do, checked against the eval's own.
  const disagreements: string[] = [];
  let liq = 0, tot = 0;
  for (const e of exp.rows) {
    const c = clients.find((x) => x.id === e.id);
    if (!c) { disagreements.push(`${e.id}: not mapped`); continue; }
    if (liquidityMonths(toHousehold(c)) === e.liquidityMonths) liq++; else disagreements.push(`${e.id}: Liquidity ${liquidityMonths(toHousehold(c))} months, expected ${e.liquidityMonths}`);
    if (c.totalUsd === e.totalUsd) tot++; else disagreements.push(`${e.id}: total ${c.totalUsd}, expected ${e.totalUsd}`);
  }
  const oppExp = new Set(exp.rows.flatMap((r) => r.opportunities.map((k) => `${r.id}:${k}`)));
  const oppGot = new Set(clients.flatMap((c) => c.opportunities.map((o) => `${c.id}:${o.id.split("-").pop()}`)));

  // 3. The compliance agents.
  const rules: Record<string, Score> = {};
  const cannot: Record<string, Score> = {};
  const gotFired = new Map<string, Set<string>>();
  const gotCannot = new Map<string, Set<string>>();
  let notSweptFound = 0, findingsTotal = 0, actionsTotal = 0;
  t("sweep", () => {
    for (const a of ADVISORS_DATA) {
      const policy = policyFrom(SEED_EDITS, scopeFor(a.id));
      const found = sweep(a.id, policy, CONNECTORS_DATA.connections, clients);
      notSweptFound += found.messagesNotSwept.length;
      findingsTotal += found.cases.length;
      actionsTotal += prepareAll(found.cases, policy.rules).length;
      for (const c of found.cases) {
        if (c.subject === a.id) continue; // record-completeness findings are per advisor, not per household
        const subject = c.subject.startsWith("msg-") ? `msg:${c.subject}` : c.subject;
        const bucket = c.reason === "cannot_evaluate" ? gotCannot : c.reason === "fired" ? gotFired : null;
        if (!bucket) continue;
        if (!bucket.has(c.ruleId)) bucket.set(c.ruleId, new Set());
        bucket.get(c.ruleId)!.add(subject);
      }
    }
  });
  const ruleIds = new Set([...Object.keys(exp.totals.findingsByRule), ...Object.keys(exp.totals.cannotEvaluate), ...gotFired.keys(), ...gotCannot.keys()]);
  for (const rid of ruleIds) {
    // Expected fired: households (account rules) plus one entry per message (message rules), keyed the way the sweep keys them.
    const expFired = new Set<string>();
    for (const r of exp.rows) {
      if (r.account[rid] === "fired") expFired.add(r.id);
      for (let i = 0; i < (r.messageRules[rid] ?? 0); i++) expFired.add(`msg:${r.id}:${rid}:${i}`);
    }
    // Message-level subjects are message ids the mapper assigns; match by household count rather than id.
    const gotF = gotFired.get(rid) ?? new Set<string>();
    if ([...gotF].some((s) => s.startsWith("msg:"))) {
      const gotByHousehold = new Map<string, number>();
      for (const s of gotF) { const hh = `hh-${s.replace(/^msg:msg-/, "").replace(/-\d+$/, "")}`; gotByHousehold.set(hh, (gotByHousehold.get(hh) ?? 0) + 1); }
      const expSet = new Set<string>(), gotSet = new Set<string>();
      for (const r of exp.rows) for (let i = 0; i < (r.messageRules[rid] ?? 0); i++) expSet.add(`${r.id}#${i}`);
      for (const [hh, k] of gotByHousehold) for (let i = 0; i < k; i++) gotSet.add(`${hh}#${i}`);
      rules[rid] = score(expSet, gotSet);
    } else {
      rules[rid] = score(new Set([...expFired].filter((s) => !s.startsWith("msg:"))), gotF);
    }
    const expC = new Set(exp.rows.filter((r) => r.account[rid] === "cannot_evaluate").map((r) => r.id));
    const gotC = gotCannot.get(rid) ?? new Set<string>();
    if (expC.size || gotC.size) cannot[rid] = score(expC, gotC);
  }

  // 4. Discovery, briefings, retrieval.
  const discovery: Record<string, Score> = {};
  t("discover", () => {
    const found = discover(clients);
    const kinds = new Set([...Object.keys(exp.totals.discoveryByKind), ...found.map((k) => k.extractor.id)]);
    for (const k of kinds) {
      discovery[k] = score(new Set(exp.rows.filter((r) => r.discovery.includes(k)).map((r) => r.id)), new Set(found.filter((x) => x.extractor.id === k).map((x) => x.clientId)));
    }
  });
  let briefs = { households: 0, unknowns: 0, inferred: 0, citationsResolved: true };
  t("brief", () => {
    const b = briefAll(CONNECTORS_DATA.connections, clients);
    briefs = { households: b.length, unknowns: b.reduce((s, x) => s + x.unknowns.length, 0), inferred: b.reduce((s, x) => s + x.inferred.length, 0), citationsResolved: b.every((x) => [...x.since, ...x.observed, ...x.inferred, ...x.unknowns].every((f) => f.cites.length > 0)) };
  });
  const retrieval = { opportunities: 0, refused: 0, conflicts: 0 };
  t("retrieve", () => {
    for (const o of clients.flatMap((c) => c.opportunities)) {
      const ev = retrieve(o);
      retrieval.opportunities++;
      if (ev.refused) retrieval.refused++; else if (ev.conflicts.length) retrieval.conflicts++;
    }
  });

  return {
    corpus: { households: clients.length, messages: clients.reduce((s, c) => s + c.messages.length, 0), validationErrors: validationErrors.length, coherenceProblems: coherence(sampleDir), opportunities: clients.reduce((s, c) => s + c.opportunities.length, 0) },
    arithmetic: { liquidityMonthsAgree: liq, totalsAgree: tot, disagreements },
    opportunities: score(oppExp, oppGot),
    rules, cannotEvaluate: cannot,
    notSwept: { expected: exp.totals.notSwept, found: notSweptFound },
    discovery, briefings: briefs, retrieval, timingsMs: { ...timingsMs, findings: findingsTotal, actionsPrepared: actionsTotal },
  };
}

function pct(x: number) { return `${(x * 100).toFixed(1)}%`; }

export function report(r: EvalResult): string {
  const lines: string[] = [];
  lines.push("# Evaluation report: the 300-household corpus", "", "Generated by `npm run eval -- --write`. Do not edit. Every number below is the engines against expectations worked out from the CSV files, the rule parameters, the advisor files and `evals/labels.json`, with no engine imported on the expected side.", "");
  lines.push("## Corpus", "", `| | |`, `|---|---|`, `| Households | ${r.corpus.households} |`, `| Captured messages | ${r.corpus.messages} |`, `| Validation errors through the import path | ${r.corpus.validationErrors} |`, `| Coherence problems in the data itself | ${r.corpus.coherenceProblems.length} |`, `| Opportunities detected from the records | ${r.corpus.opportunities} |`, "");
  lines.push("## Arithmetic, engine against the eval's own", "", `| Check | Agree | Of |`, `|---|---:|---:|`, `| Liquidity months per household | ${r.arithmetic.liquidityMonthsAgree} | ${r.corpus.households} |`, `| Total assets per household | ${r.arithmetic.totalsAgree} | ${r.corpus.households} |`, "");
  if (r.arithmetic.disagreements.length) lines.push("Disagreements:", ...r.arithmetic.disagreements.map((d) => `- ${d}`), "");
  const row = (name: string, s: Score) => `| ${name} | ${s.expected} | ${s.found} | ${s.tp} | ${s.fp} | ${s.fn} | ${pct(s.precision)} | ${pct(s.recall)} |`;
  const head = ["| | Expected | Found | Correct | Extra | Missed | Precision | Recall |", "|---|---:|---:|---:|---:|---:|---:|---:|"];
  lines.push("## Opportunities detected on import", "", ...head, row("liquidity, concentration, review", r.opportunities), "");
  lines.push("## Compliance agents, per household and per message", "", ...head, ...Object.entries(r.rules).sort().map(([k, s]) => row(k, s)), "");
  if (Object.keys(r.cannotEvaluate).length) lines.push("Reported as cannot evaluate, where the advisor's source is not connected (never as clear):", "", ...head, ...Object.entries(r.cannotEvaluate).sort().map(([k, s]) => row(k, s)), "");
  lines.push(`Messages on a source that is not healthy: expected ${r.notSwept.expected} not swept, found ${r.notSwept.found}.`, "");
  lines.push("## Discovery, per household and kind", "", ...head, ...Object.entries(r.discovery).sort().map(([k, s]) => row(k, s)), "");
  lines.push("## Research and retrieval", "", `| | |`, `|---|---|`, `| Briefings | ${r.briefings.households} |`, `| Things not established | ${r.briefings.unknowns} |`, `| Inferences with a confidence | ${r.briefings.inferred} |`, `| Every claim cites a record | ${r.briefings.citationsResolved ? "yes" : "NO"} |`, `| Opportunities cited | ${r.retrieval.opportunities - r.retrieval.refused} of ${r.retrieval.opportunities} |`, `| Refused for want of a citation | ${r.retrieval.refused} |`, `| Resting on documents that disagree | ${r.retrieval.conflicts} |`, "");
  lines.push("## Timings, in this run", "", `| Step | ms |`, `|---|---:|`, ...Object.entries(r.timingsMs).filter(([k]) => !["findings", "actionsPrepared"].includes(k)).map(([k, v]) => `| ${k} | ${v} |`), "", `${r.timingsMs.findings} findings and ${r.timingsMs.actionsPrepared} prepared actions in total.`, "");
  const misses = [...Object.entries(r.rules), ...Object.entries(r.discovery)].filter(([, s]) => s.misses.length || s.extras.length);
  lines.push("## Disagreements, named", "");
  if (misses.length === 0) lines.push("None. Every expected finding was found and nothing unexpected was raised.");
  for (const [k, s] of misses) {
    if (s.misses.length) lines.push(`- ${k}, missed: ${s.misses.slice(0, 20).join(", ")}${s.misses.length > 20 ? ` and ${s.misses.length - 20} more` : ""}`);
    if (s.extras.length) lines.push(`- ${k}, extra: ${s.extras.slice(0, 20).join(", ")}${s.extras.length > 20 ? ` and ${s.extras.length - 20} more` : ""}`);
  }
  return lines.join("\n") + "\n";
}

/** The part of the result that must not change without someone meaning it. Timings are left out. */
export function golden(r: EvalResult) {
  const strip = (s: Score) => ({ expected: s.expected, found: s.found, tp: s.tp, fp: s.fp, fn: s.fn });
  return {
    corpus: { ...r.corpus, coherenceProblems: r.corpus.coherenceProblems.length },
    arithmetic: { liquidityMonthsAgree: r.arithmetic.liquidityMonthsAgree, totalsAgree: r.arithmetic.totalsAgree },
    opportunities: strip(r.opportunities),
    rules: Object.fromEntries(Object.entries(r.rules).sort().map(([k, s]) => [k, strip(s)])),
    cannotEvaluate: Object.fromEntries(Object.entries(r.cannotEvaluate).sort().map(([k, s]) => [k, strip(s)])),
    notSwept: r.notSwept,
    discovery: Object.fromEntries(Object.entries(r.discovery).sort().map(([k, s]) => [k, strip(s)])),
    briefings: r.briefings,
    retrieval: r.retrieval,
  };
}

