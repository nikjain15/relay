// The consequence agent: what the book looks like the morning after an action,
// before anyone takes it.
//
// Every other agent here reads what has happened. This one reads what would
// happen. It applies a proposed action to a copy of the household, then runs
// the same deterministic engines the rest of Relay runs on the real one: the
// household arithmetic, the constraint engine, every account rule in force, the
// evidence layer and the recipient counter. The result is a before and after
// for each consequence, a trace of each step, and the questions a supervisor
// will ask, so the person deciding sees the second-order effects first.
//
// Nothing here is a forecast. It is arithmetic over a hypothetical state, and
// where a figure would need a market view (a price, a return) it is not shown.
//
// Deterministic. No model client may be imported here. In production a model
// might phrase the supervisor's questions more naturally; it would never decide
// what they are.
import type { Candidate, ClientFile, Evaluation, Holding, Opportunity, Product } from "@/lib/types";
import type { ResolvedPolicy } from "@/lib/compliance/policy";
import type { Verdict } from "@/lib/compliance/types";
import { runPolicy } from "@/lib/compliance/engine";
import { accountFacts } from "@/lib/compliance/facts";
import { evaluate, evaluateAll } from "@/lib/constraints/evaluate";
import { coreUsd, fundingNeed, investableUsd, liquidityMonths, singleNamePct, singleNameUsd } from "@/lib/household-math";
import { retrieve } from "@/lib/evidence/retrieve";
import { regimeAfter, RETAIL_THRESHOLD, type Distribution } from "@/lib/recipients/count";
import { PRIOR_DISTRIBUTIONS, PROTOTYPE_TODAY, templateFor } from "@/lib/fixtures/distributions";
import { SHELF, product as productById } from "@/lib/fixtures/shelf";
import { SERVICE_REQUESTS } from "@/lib/data";
import { pct, usd } from "@/lib/format";
import { POLICY } from "@/lib/data/policy";
import type { IconName } from "@/components/icons";

export type Tone = "positive" | "caution" | "critical" | "plain";

export interface Consequence {
  key: string;
  label: string;
  before: string;
  after: string;
  /** Signed change in words, or empty when nothing moved. */
  change: string;
  tone: Tone;
  icon: IconName;
  /** Why it moved, in one sentence. */
  why: string;
}

export interface TraceStep {
  n: number;
  icon: IconName;
  title: string;
  detail: string;
  verdict: "ok" | "fail" | "note";
}

export interface RuleChange {
  ruleId: string;
  title: string;
  from: Verdict["outcome"];
  to: Verdict["outcome"];
  finding: string;
}

export interface Simulation {
  clientId: string;
  clientName: string;
  opportunityId: string;
  candidate: Candidate;
  product: Product;
  /** The household as it would stand the morning after. */
  after: ClientFile;
  constraints: Evaluation;
  consequences: Consequence[];
  rules: { before: Verdict[]; after: Verdict[]; changes: RuleChange[] };
  evidence: { cited: number; refused: boolean; conflicts: number };
  regime: { count: number; regime: string; threshold: number };
  /** Things this action sets in motion that are not on the proposal screen. */
  followOns: string[];
  /** What a supervisor will ask when this file is opened. */
  supervisorQuestions: string[];
  /** What no agent does: the human gate, listed. */
  humanGate: string[];
  trace: TraceStep[];
  /** The one-word grade a person reads first. */
  grade: "clean" | "review" | "blocked";
}

const SOURCE_LABEL: Record<Candidate["source"], string> = {
  new_cash: "new cash from the event",
  rebalance_from_core: "the core portfolio",
  sell_long_term_lots: "long-term lots of the single name",
  sell_all_lots: "every lot of the single name",
  contribute_in_kind: "the single name, contributed in kind",
};

function clone(c: ClientFile): ClientFile {
  return { ...c, holdings: c.holdings.map((h) => ({ ...h })), goals: c.goals.map((g) => ({ ...g })) };
}

function take(holdings: Holding[], pick: (h: Holding) => boolean, amount: number): number {
  // Draw from the largest matching holding first, never below zero; returns what could not be drawn.
  let left = amount;
  for (const h of holdings.filter(pick).sort((a, b) => b.valueUsd - a.valueUsd)) {
    const d = Math.min(h.valueUsd, left);
    h.valueUsd -= d;
    if (h.shortTermLotsUsd) h.shortTermLotsUsd = Math.max(0, h.shortTermLotsUsd - d);
    left -= d;
    if (left <= 0) break;
  }
  return left;
}

/** The household after the candidate is carried out. Pure arithmetic over holdings; no price moves. */
export function applyCandidate(client: ClientFile, candidate: Candidate, product: Product, strategy?: Opportunity["strategy"]): ClientFile {
  const after = clone(client);
  const amount = candidate.amountUsd;
  const into = after.holdings.find((h) => h.productId === product.id && !h.singleName && !h.earmarked);
  const add = (v: number) => {
    if (into) into.valueUsd += v;
    else after.holdings.push({ name: product.name, productId: product.id, valueUsd: v, singleName: false });
  };
  let moved = amount;
  switch (candidate.source) {
    case "new_cash":
      add(amount);
      break;
    case "rebalance_from_core":
      moved = amount - take(after.holdings, (h) => h.productId === POLICY.proposals.coreProductId, amount);
      add(moved);
      break;
    case "sell_long_term_lots":
    case "sell_all_lots":
    case "contribute_in_kind":
      moved = amount - take(after.holdings, (h) => h.singleName, amount);
      add(moved);
      break;
  }
  after.holdings = after.holdings.filter((h) => h.valueUsd > 0);
  after.totalUsd = investableUsd(after);
  // A dollar goal is funded by what moved; a months goal is read from the holdings.
  const goal = strategy ? after.goals.find((g) => g.strategy === strategy) : undefined;
  if (goal && goal.unit === "USD" && candidate.action === "fund") goal.funded += moved;
  return after;
}

function tone(better: boolean, worse: boolean): Tone {
  return worse ? "critical" : better ? "positive" : "plain";
}

function delta(before: number, after: number, unit: "months" | "pct" | "usd"): string {
  const d = after - before;
  if (Math.abs(d) < (unit === "pct" ? 0.05 : unit === "usd" ? 1 : 1)) return "";
  const sign = d > 0 ? "+" : "";
  if (unit === "months") return `${sign}${d} months`;
  if (unit === "pct") return `${sign}${(Math.round(d * 10) / 10).toFixed(1)} points`;
  return d < 0 ? `-${usd(-d)}` : `+${usd(d)}`;
}

/**
 * Run every engine on the household as it would stand after `candidate`.
 * `policy` and `connected` are the same objects the sweep uses, so the rule
 * verdicts here are the ones a principal would see the next morning.
 */
export function simulate(client: ClientFile, opp: Opportunity, candidate: Candidate, policy: ResolvedPolicy, connected: string[]): Simulation {
  const product = productById(candidate.productId);
  if (!product) throw new Error(`unknown product ${candidate.productId}`);
  const trace: TraceStep[] = [];
  const step = (icon: IconName, title: string, detail: string, verdict: TraceStep["verdict"] = "note") => trace.push({ n: trace.length + 1, icon, title, detail, verdict });

  // 1. The action, stated as arithmetic.
  step("agent", "Read the proposal", `${candidate.action === "fund" ? "Fund" : "Trim"} ${usd(candidate.amountUsd)} into ${product.name} from ${SOURCE_LABEL[candidate.source]}.`);
  const constraints = evaluate(candidate, product, client, opp.strategy);
  step("rules", "Checked the household's own rules", constraints.pass ? `${client.constraints.length} IPS rules, all met.` : constraints.failures.map((f) => `${f.rule}: ${f.detail}`).join(" "), constraints.pass ? "ok" : "fail");

  // 2. The state after.
  const after = applyCandidate(client, candidate, product, opp.strategy);
  step("trend", "Applied it to a copy of the household", `Holdings recomputed with no price movement assumed. ${after.holdings.length} positions after, ${client.holdings.length} before.`);

  const consequences: Consequence[] = [];
  const liqB = liquidityMonths(client), liqA = liquidityMonths(after);
  const liqTarget = client.constraints.find((c) => c.kind === "minLiquidityMonths");
  const liqGoal = client.goals.find((g) => g.strategy === "Liquidity");
  const liqNeed = liqGoal?.unit === "months" ? liqGoal.target : liqTarget?.kind === "minLiquidityMonths" ? liqTarget.months : undefined;
  consequences.push({
    key: "liquidity", label: "Liquidity cover", icon: "clock",
    before: `${liqB} months`, after: `${liqA} months`, change: delta(liqB, liqA, "months"),
    tone: liqNeed !== undefined && liqA < liqNeed ? (liqA < liqB ? "critical" : "caution") : tone(liqA > liqB, liqA < liqB),
    why: liqNeed !== undefined ? `Against ${liqNeed} months the household wants covered.` : "No Liquidity target on file.",
  });
  const snB = singleNameUsd(client) ? singleNamePct(client) : 0, snA = singleNameUsd(after) ? singleNamePct(after) : 0;
  const cap = client.constraints.find((c) => c.kind === "maxSingleName");
  const capPct = cap?.kind === "maxSingleName" ? cap.pct : undefined;
  consequences.push({
    key: "concentration", label: "Single-name concentration", icon: "chart",
    before: pct(snB), after: pct(snA), change: delta(snB, snA, "pct"),
    tone: capPct !== undefined && snA > capPct ? "critical" : tone(snA < snB, snA > snB),
    why: capPct !== undefined ? `The family's rule is ${capPct}%.` : "No concentration rule on file.",
  });
  if (capPct !== undefined && singleNameUsd(client)) {
    const hB = Math.round((capPct - snB) * 10) / 10, hA = Math.round((capPct - snA) * 10) / 10;
    consequences.push({
      key: "headroom", label: "Headroom under the ceiling", icon: "flag",
      before: `${hB.toFixed(1)} points`, after: `${hA.toFixed(1)} points`, change: delta(hB, hA, "pct"),
      tone: hA < 0 ? "critical" : hA < 10 ? "caution" : "positive",
      why: "The drift rule fires when concentration is rising and less than ten points of headroom remain.",
    });
  }
  const coreB = coreUsd(client), coreA = coreUsd(after);
  consequences.push({
    key: "core", label: "Core portfolio", icon: "planning",
    before: usd(coreB), after: usd(coreA), change: delta(coreB, coreA, "usd"),
    tone: coreA < 0.5 * coreB && coreB > 0 ? "caution" : "plain",
    why: candidate.source === "rebalance_from_core" ? "This is the funding source." : "Untouched by this action.",
  });
  const need = fundingNeed(client, opp);
  if (candidate.action === "fund" && need.needUsd > 0) {
    const needA = fundingNeed(after, opp).needUsd;
    consequences.push({
      key: "gap", label: `${opp.strategy} gap`, icon: "hourglass",
      before: usd(need.needUsd), after: usd(needA), change: delta(need.needUsd, needA, "usd"),
      tone: needA === 0 ? "positive" : needA < need.needUsd ? "caution" : "critical",
      why: needA === 0 ? "Closed in full." : `${usd(needA)} still open after this action.`,
    });
  }
  consequences.push({
    key: "cost", label: "Annual cost of the position", icon: "list",
    before: usd(0), after: usd(constraints.annualCostUsd), change: constraints.annualCostUsd ? `+${usd(constraints.annualCostUsd)}` : "",
    tone: "plain",
    why: `${product.costBps} basis points on ${usd(candidate.amountUsd)}.`,
  });
  step("chart", "Recomputed Liquidity, concentration and the goal gap", consequences.filter((c) => c.change).map((c) => `${c.label} ${c.change}`).join("; ") || "Nothing moved.");

  // 3. Every account rule in force, before and after, from the same fact adapter the sweep uses.
  const factsFor = (c: ClientFile) =>
    accountFacts({
      client: c,
      requests: SERVICE_REQUESTS.filter((r) => r.clientId === c.id),
      custodianConnected: connected.includes("custodian-feed"),
      history: c.valuationHistory?.concentrationPct,
      trustedContactOnFile: c.supervisory?.trustedContactOnFile ?? false,
      complaintLogged: c.supervisory?.complaintLogged ?? false,
      unusualDisbursement: c.supervisory?.unusualDisbursement,
      newThirdPartyContact: c.supervisory?.newThirdPartyContact,
    });
  const run = (c: ClientFile) => {
    const f = factsFor(c);
    return runPolicy(policy, { facts: f.facts, availableConnectors: connected, factConfidence: f.confidence, scope: "account" }).verdicts;
  };
  const before = run(client), afterV = run(after);
  const changes: RuleChange[] = afterV
    .map((v) => ({ v, b: before.find((x) => x.ruleId === v.ruleId) }))
    .filter(({ v, b }) => b && b.outcome !== v.outcome)
    .map(({ v, b }) => ({ ruleId: v.ruleId, title: policy.rules.find((r) => r.id === v.ruleId)?.title ?? v.ruleId, from: b!.outcome, to: v.outcome, finding: v.outcome === "clear" ? b!.finding : v.finding }));
  const worse = changes.filter((c) => c.to === "block" || (c.to === "flag" && c.from === "clear"));
  const better = changes.filter((c) => c.to === "clear");
  step("shield", `Ran ${afterV.length} account rules on the morning after`,
    changes.length === 0 ? "No verdict changes." : changes.map((c) => `${c.title}: ${c.from} to ${c.to}`).join("; "),
    worse.length ? "fail" : better.length ? "ok" : "note");

  // 4. The evidence the proposal rests on, and the note that would follow.
  const ev = retrieve(opp);
  const evidence = { cited: ev.refused ? 0 : ev.passages.length, refused: ev.refused, conflicts: ev.refused ? 0 : ev.conflicts.length };
  step("library", "Checked what the proposal can cite", ev.refused ? "Refused: no current document supports this opportunity." : `${evidence.cited} passages, ${evidence.conflicts} disagreement${evidence.conflicts === 1 ? "" : "s"} between current documents.`, ev.refused ? "fail" : "ok");
  const comm = templateFor(opp);
  const proposed: Distribution[] = client.persons.map((p) => ({ communicationId: comm, personId: p.id, advisorId: client.advisorId, institutional: false, date: PROTOTYPE_TODAY }));
  const reg = regimeAfter(PRIOR_DISTRIBUTIONS, proposed, comm, PROTOTYPE_TODAY);
  const regime = { count: reg.count, regime: reg.regime, threshold: RETAIL_THRESHOLD };
  step("people", "Counted who the follow-up note would reach", `${reg.count} retail recipients of this template in 30 days firm-wide, so it is ${reg.regime}${reg.regime === "retail communication" ? " and needs principal pre-approval" : ""}.`);

  // 5. Second-order effects and the questions.
  const followOns: string[] = [];
  const otherOpps = client.opportunities.filter((o) => o.id !== opp.id && (o.action === "fund" || o.action === "trim"));
  for (const o of otherOpps) {
    const b = evaluateAll(o, client).filter((e) => e.pass).length, a = evaluateAll(o, after).filter((e) => e.pass).length;
    if (a !== b) followOns.push(`"${o.plainTitle ?? o.title}" would have ${a} eligible option${a === 1 ? "" : "s"} instead of ${b}.`);
  }
  if (candidate.source === "sell_long_term_lots" || candidate.source === "sell_all_lots") followOns.push("A realised gain, and a tax figure the client will ask about. Relay does not estimate it; the custodian's lot report does.");
  if (candidate.source === "contribute_in_kind") followOns.push(`A lock-up: the exchange fund is ${product.liquidityDays} days from cash, so this money leaves the Liquidity picture for its term.`);
  if (candidate.source === "rebalance_from_core") followOns.push("A rebalance ticket and a rationale record, both drafted; a person releases the trade.");
  if (liqA < liqB && liqNeed !== undefined && liqA < liqNeed) followOns.push(`Liquidity falls under the ${liqNeed}-month target, which puts a new liquidity opportunity on the list next morning.`);
  if (worse.length) followOns.push(`${worse.length} rule${worse.length === 1 ? "" : "s"} would fire on the morning sweep, so a supervisory finding follows the trade.`);
  if (evidence.conflicts) followOns.push("The note would cite two documents that disagree; the desk view has to be chosen and named.");

  const supervisorQuestions: string[] = [
    ...constraints.failures.map((f) => `Why was the "${f.rule}" rule overridden? ${f.detail}.`),
    ...worse.map((c) => `The morning after, "${c.title}" reads ${c.to}. What was the plan for that?`),
    ...(ev.refused ? ["What document is this recommendation grounded in?"] : []),
    ...(regime.regime === "retail communication" ? ["Was the note pre-approved as a retail communication?"] : []),
    ...(constraints.pass && !worse.length ? [`Which of the ${evaluateAll(opp, client).filter((e) => e.pass).length} eligible options were compared, and why this one?`] : []),
    ...(need.outflowUsd ? [`Does the amount still cover the ${usd(need.outflowUsd)} ${opp.outflowLabel ?? "outflow"} after the move?`] : []),
  ];
  const humanGate = [
    "Choose the option and release the trade.",
    "Read the rationale record and sign it.",
    regime.regime === "retail communication" ? "Get principal pre-approval for the note, then send it." : "Review the note, then send it.",
    ...(worse.length ? ["Disposition the finding the morning sweep would raise."] : []),
  ];
  const grade: Simulation["grade"] = !constraints.pass || worse.some((c) => c.to === "block") || ev.refused ? "blocked" : worse.length || supervisorQuestions.length > 1 || evidence.conflicts ? "review" : "clean";
  step("check", "Graded it", grade === "clean" ? "Clean: every rule met, no verdict worsens, evidence cited." : grade === "review" ? "Review: nothing blocks, but a supervisor will have questions." : "Blocked: a rule fails or a finding would fire.", grade === "blocked" ? "fail" : grade === "clean" ? "ok" : "note");

  return { clientId: client.id, clientName: client.name, opportunityId: opp.id, candidate, product, after, constraints, consequences, rules: { before, after: afterV, changes }, evidence, regime, followOns, supervisorQuestions, humanGate, trace, grade };
}

/** Every option the proposal screen would offer, each carried through to the morning after. */
export function simulateAll(client: ClientFile, opp: Opportunity, policy: ResolvedPolicy, connected: string[]): Simulation[] {
  return evaluateAll(opp, client).map((e) => simulate(client, opp, e.candidate, policy, connected));
}

/** Opportunities a household can act on, so a screen can list what is simulable. */
export function simulable(client: ClientFile): Opportunity[] {
  return client.opportunities.filter((o) => (o.action === "fund" || o.action === "trim") && evaluateAll(o, client).length > 0);
}

export const SHELF_SIZE = SHELF.length;
