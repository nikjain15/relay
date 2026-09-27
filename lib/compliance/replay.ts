// Replay: explain a past disposition by re-running the rule as it stood.
//
// "What were the rules when you cleared that?" is answered by folding the
// change log onto the baseline up to the finding's timestamp and evaluating
// the facts the rule read then. The same facts against today's rules say
// whether the outcome would differ now, and the edits in between say why.
// Nothing is recalled; it is recomputed.
//
// Deterministic. No model client may be imported here.
import type { PastFinding } from "@/lib/data";
import { HISTORY } from "@/lib/data";
import { policyFrom, editsAsOf, type RuleEdit } from "@/lib/compliance/store";
import { evaluateRule } from "@/lib/compliance/engine";
import type { EffectiveRule } from "@/lib/compliance/policy";
import type { Verdict } from "@/lib/compliance/types";

export interface Replay {
  finding: PastFinding;
  then: { rule: EffectiveRule | undefined; verdict: Verdict | undefined };
  now: { rule: EffectiveRule | undefined; verdict: Verdict | undefined };
  /** Edits to this rule between the finding and now, oldest first. */
  between: RuleEdit[];
  /** Fields whose effective value differs between then and now. */
  changed: { field: string; then: string; now: string }[];
  /** True when the recorded outcome matches what the replayed rules produce. A mismatch is a finding about the log. */
  reproduces: boolean;
  sameOutcomeNow: boolean;
}

function fields(r: EffectiveRule | undefined): Record<string, string> {
  if (!r) return {};
  return { enabled: String(r.enabled), severity: r.severity, ...Object.fromEntries(r.params.map((p) => [p.key, String(p.value)])) };
}

export function replay(finding: PastFinding, edits: RuleEdit[]): Replay {
  const scope = finding.scope;
  const thenPolicy = policyFrom(edits, scope, finding.at);
  const nowPolicy = policyFrom(edits, scope);
  const thenRule = thenPolicy.rules.find((r) => r.id === finding.ruleId);
  const nowRule = nowPolicy.rules.find((r) => r.id === finding.ruleId);
  const input = { facts: finding.facts, availableConnectors: finding.connectors, factConfidence: finding.factConfidence };
  const thenVerdict = thenRule?.enabled ? evaluateRule(thenRule, input) : undefined;
  const nowVerdict = nowRule?.enabled ? evaluateRule(nowRule, input) : undefined;
  const between = editsAsOf(edits).filter((e) => e.target === "rule" && e.ruleId === finding.ruleId && Date.parse(e.at) > Date.parse(finding.at));
  const a = fields(thenRule), b = fields(nowRule);
  const changed = Object.keys({ ...a, ...b }).filter((k) => a[k] !== b[k]).map((field) => ({ field, then: a[field] ?? "n/a", now: b[field] ?? "n/a" }));
  const thenOutcome = thenVerdict?.outcome ?? "clear";
  return {
    finding,
    then: { rule: thenRule, verdict: thenVerdict },
    now: { rule: nowRule, verdict: nowVerdict },
    between,
    changed,
    reproduces: thenOutcome === finding.outcome,
    sameOutcomeNow: (nowVerdict?.outcome ?? "clear") === thenOutcome,
  };
}

export function replayAll(edits: RuleEdit[], findings: PastFinding[] = HISTORY.findings): Replay[] {
  return findings.slice().sort((x, y) => Date.parse(y.at) - Date.parse(x.at)).map((f) => replay(f, edits));
}
