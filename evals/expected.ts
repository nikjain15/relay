// What every agent SHOULD find in the evaluation corpus, worked out from the
// CSV files, the rule parameters, the advisor files and the hand-reviewed
// labels, with no engine imported. This is the independent side of the eval:
// if it agrees with the engines, both were right for the same reason or wrong
// for different ones, and the second is what an eval is for.
//
// Deliberately duplicates arithmetic the engines do (Liquidity months,
// concentration, drift) rather than calling them. That duplication is the point.
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

export const ROOT = new URL("../", import.meta.url).pathname;
const json = <T,>(p: string): T => JSON.parse(readFileSync(join(ROOT, p), "utf8")) as T;

/** A CSV reader of its own, so the eval does not depend on the one under test. */
export function csv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  const s = text.replace(/^﻿/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) { if (ch === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n") { row.push(cell); cell = ""; if (row.some((c) => c !== "")) rows.push(row); row = []; }
    else if (ch !== "\r") cell += ch;
  }
  row.push(cell); if (row.some((c) => c !== "")) rows.push(row);
  const h = rows[0];
  return rows.slice(1).map((r) => Object.fromEntries(h.map((k, i) => [k, r[i] ?? ""])));
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const n = (s: string) => Number(String(s).replace(/[$,\s%]/g, "")) || 0;
const yes = (s: string) => /^(true|yes|y|1|on)$/i.test(s);

interface Rule { id: string; enabled: boolean; requires: string[]; params: { key: string; value: number }[] }
interface Labels {
  messages: Record<string, { direction: string; rules: string[]; discovery: string[] }>;
  notes: Record<string, string[]>;
  contactSummaries: Record<string, string[]>;
}

export interface ExpectedRow {
  id: string;
  name: string;
  advisorId: string;
  liquidityMonths: number;
  totalUsd: number;
  concentrationPct: number | null;
  opportunities: string[];
  /** rule id -> "fired" | "cannot_evaluate" */
  account: Record<string, "fired" | "cannot_evaluate">;
  /** rule id -> number of messages expected to fire it */
  messageRules: Record<string, number>;
  /** messages that sit on a source that is not healthy for this advisor, so are not swept */
  notSwept: number;
  discovery: string[];
}

/** Coherence of the corpus itself, independent of any engine: a record that fails these is a bad test, not a good one. */
export function coherence(sampleDir = "public/samples"): string[] {
  const clients = csv(readFileSync(join(ROOT, sampleDir, "clients.csv"), "utf8"));
  const messages = csv(readFileSync(join(ROOT, sampleDir, "messages.csv"), "utf8"));
  const names = new Set(clients.map((r) => r.name));
  const problems: string[] = [];
  if (names.size !== clients.length) problems.push("duplicate household names");
  for (const r of clients) {
    const cash = n(r.cashUsd), core = n(r.coreUsd), single = n(r.singleNameUsd), spend = n(r.monthlySpendUsd);
    const total = cash + core + single;
    const age1 = n(r.person1Age), age2 = r.person2Age ? n(r.person2Age) : null;
    if (!(age1 >= 18 && age1 <= 100)) problems.push(`${r.name}: person1Age ${r.person1Age}`);
    if (age2 !== null && !(age2 >= 18 && age2 <= 100)) problems.push(`${r.name}: person2Age ${r.person2Age}`);
    if (r.person2 === "" !== (r.person2Age === "")) problems.push(`${r.name}: person2 and person2Age disagree`);
    if (!(spend >= 1000)) problems.push(`${r.name}: monthlySpendUsd ${r.monthlySpendUsd}`);
    if (!(total > 0)) problems.push(`${r.name}: no assets`);
    if ((spend * 12) / total > 0.1) problems.push(`${r.name}: spends ${Math.round(((spend * 12) / total) * 100)}% of assets a year`);
    if (cash % spend !== 0) problems.push(`${r.name}: cash is not a whole number of months of spending`);
    if (n(r.liquidityTargetMonths) < n(r.minLiquidityMonths)) problems.push(`${r.name}: liquidity target below the minimum`);
    if ((r.singleName === "") !== (r.singleNameUsd === "")) problems.push(`${r.name}: singleName and singleNameUsd disagree`);
    if (single) {
      const pct = (single / total) * 100;
      for (const k of ["concentration90", "concentration60", "concentration30"]) if (r[k] === "" || n(r[k]) <= 0 || n(r[k]) >= 100) problems.push(`${r.name}: ${k} ${r[k]}`);
      if (!(n(r.concentration90) < pct)) problems.push(`${r.name}: concentration did not rise from day 90 to today`);
    } else if (r.concentration90 !== "") problems.push(`${r.name}: history for a holding that does not exist`);
    if (!(n(r.longevityTargetUsd) > 0)) problems.push(`${r.name}: no Longevity target`);
    if (n(r.lastContactDaysAgo) < 0 || n(r.lastContactDaysAgo) > 365 * 3) problems.push(`${r.name}: lastContactDaysAgo ${r.lastContactDaysAgo}`);
    for (const k of ["trustedContactOnFile", "unusualDisbursement", "newThirdPartyContact"]) if (!/^(yes|no)$/.test(r[k])) problems.push(`${r.name}: ${k} ${r[k]}`);
  }
  for (const m of messages) {
    if (!names.has(m.clientId)) problems.push(`message for unknown household ${m.clientId}`);
    if (!/^(inbound|outbound)$/.test(m.direction)) problems.push(`message direction ${m.direction}`);
    if (!/^(email|sms|chat)$/.test(m.channel)) problems.push(`message channel ${m.channel}`);
    if (n(m.daysAgo) < 0 || n(m.daysAgo) > 365) problems.push(`message daysAgo ${m.daysAgo}`);
  }
  return problems;
}

export interface Expected {
  rows: ExpectedRow[];
  totals: { households: number; messages: number; findingsByRule: Record<string, number>; discoveryByKind: Record<string, number>; opportunities: number; notSwept: number; cannotEvaluate: Record<string, number> };
}

export function expected(sampleDir = "public/samples"): Expected {
  const clients = csv(readFileSync(join(ROOT, sampleDir, "clients.csv"), "utf8"));
  const messages = csv(readFileSync(join(ROOT, sampleDir, "messages.csv"), "utf8"));
  const labels = json<Labels>("evals/labels.json");
  const rules = json<{ rules: Rule[] }>("data/compliance/rules.json").rules;
  const edits = json<{ edits: { target: string; layer: string; ruleId?: string; field: string; to: string }[] }>("data/compliance/edits.json").edits;
  const param = (id: string, key: string) => rules.find((r) => r.id === id)!.params.find((p) => p.key === key)!.value;
  // A firm-layer edit in the seeded log changes what is in force for everyone.
  const enabled = (id: string) => {
    const r = rules.find((x) => x.id === id)!;
    const e = edits.filter((x) => x.target === "rule" && x.ruleId === id && x.layer === "firm" && x.field === "enabled").pop();
    return e ? e.to === "true" : r.enabled;
  };
  const advisors = readdirSync(join(ROOT, "data/advisors")).map((f) => json<{ id: string; connections: { connectorId: string; status: string }[] }>(`data/advisors/${f}`));
  const healthy = (advisorId: string) => new Set(advisors.find((a) => a.id === advisorId)!.connections.filter((c) => c.status === "connected").map((c) => c.connectorId));
  const CONNECTOR_FOR: Record<string, string> = { email: "microsoft-365", sms: "compliant-texting", chat: "teams-chat" };
  const evaluable = (advisorId: string, ruleId: string) => rules.find((r) => r.id === ruleId)!.requires.every((c) => healthy(advisorId).has(c));

  const maxConcentration = param("finra-2111-suitability", "maxConcentration");
  const seniorAge = param("senior-investor-2165", "age");
  const driftPoints = param("finra-2111-drift", "driftPoints");
  const headroomPoints = param("finra-2111-drift", "headroomPoints");

  const rows: ExpectedRow[] = clients.map((r) => {
    const id = `hh-${slug(r.name)}`;
    const cash = n(r.cashUsd), core = n(r.coreUsd), single = n(r.singleNameUsd), spend = n(r.monthlySpendUsd);
    const total = cash + core + single;
    const months = spend > 0 ? Math.floor(cash / spend) : 0;
    const liqTarget = n(r.liquidityTargetMonths) || Math.max(n(r.minLiquidityMonths) || 12, 24);
    const limit = n(r.maxSingleNamePct) || 25;
    const pct = single ? Math.round((single / total) * 1000) / 10 : null;
    const lastContact = n(r.lastContactDaysAgo);
    const opportunities: string[] = [];
    if (spend && months < liqTarget) opportunities.push("liquidity");
    if (single && (single / total) * 100 > limit) opportunities.push("concentration");
    if (r.lastContactDaysAgo !== "" && lastContact > 180) opportunities.push("review");

    const account: ExpectedRow["account"] = {};
    const ages = [n(r.person1Age), r.person2Age ? n(r.person2Age) : 0].filter((a) => a > 0);
    const oldest = ages.length ? Math.max(...ages) : 0;
    const senior = oldest >= seniorAge && (!yes(r.trustedContactOnFile) || yes(r.unusualDisbursement) || yes(r.newThirdPartyContact));
    if (senior) account["senior-investor-2165"] = evaluable(r.advisorId, "senior-investor-2165") ? "fired" : "cannot_evaluate";
    if (pct !== null && pct > maxConcentration) account["finra-2111-suitability"] = evaluable(r.advisorId, "finra-2111-suitability") ? "fired" : "cannot_evaluate";
    if (pct !== null && r.concentration90 !== "") {
      const drift = Math.round((pct - n(r.concentration90)) * 10) / 10;
      const headroom = Math.round((limit - pct) * 10) / 10;
      if (drift > driftPoints && headroom < headroomPoints) account["finra-2111-drift"] = evaluable(r.advisorId, "finra-2111-drift") ? "fired" : "cannot_evaluate";
    }
    // A rule that cannot be evaluated is reported for every household of that advisor, fired or not.
    for (const rid of ["senior-investor-2165", "finra-2111-suitability", "finra-2111-drift"]) if (!evaluable(r.advisorId, rid)) account[rid] = "cannot_evaluate";

    const mine = messages.filter((m) => m.clientId === r.name);
    const messageRules: Record<string, number> = {};
    let notSwept = 0;
    const discovery = new Set<string>();
    for (const m of mine) {
      const label = labels.messages[m.text];
      if (!label) throw new Error(`Unlabelled message in the corpus: ${m.text}`);
      const connector = CONNECTOR_FOR[m.channel] ?? "microsoft-365";
      if (!healthy(r.advisorId).has(connector)) { notSwept++; continue; }
      for (const rid of label.rules) if (enabled(rid) && evaluable(r.advisorId, rid)) messageRules[rid] = (messageRules[rid] ?? 0) + 1;
      for (const k of label.discovery) discovery.add(k);
    }
    // Discovery reads what the client said whether or not the source is healthy; the note and the contact summary too.
    for (const m of mine) for (const k of labels.messages[m.text].discovery) discovery.add(k);
    if (r.note) {
      const kinds = labels.notes[r.note];
      if (!kinds) throw new Error(`Unlabelled note in the corpus: ${r.note}`);
      kinds.forEach((k) => discovery.add(k));
    }
    if (r.lastContactSummary && labels.contactSummaries[r.lastContactSummary] === undefined) throw new Error(`Unlabelled contact summary: ${r.lastContactSummary}`);
    (labels.contactSummaries[r.lastContactSummary] ?? []).forEach((k) => discovery.add(k));

    return { id, name: r.name, advisorId: r.advisorId, liquidityMonths: months, totalUsd: total, concentrationPct: pct, opportunities, account, messageRules, notSwept, discovery: [...discovery].sort() };
  });

  const findingsByRule: Record<string, number> = {};
  const cannotEvaluate: Record<string, number> = {};
  const discoveryByKind: Record<string, number> = {};
  for (const r of rows) {
    for (const [rid, v] of Object.entries(r.account)) (v === "fired" ? findingsByRule : cannotEvaluate)[rid] = ((v === "fired" ? findingsByRule : cannotEvaluate)[rid] ?? 0) + 1;
    for (const [rid, k] of Object.entries(r.messageRules)) findingsByRule[rid] = (findingsByRule[rid] ?? 0) + k;
    for (const k of r.discovery) discoveryByKind[k] = (discoveryByKind[k] ?? 0) + 1;
  }
  return {
    rows,
    totals: { households: rows.length, messages: messages.length, findingsByRule, discoveryByKind, opportunities: rows.reduce((s, r) => s + r.opportunities.length, 0), notSwept: rows.reduce((s, r) => s + r.notSwept, 0), cannotEvaluate },
  };
}
