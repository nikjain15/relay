// Run the in-force rules against a fact bag and return typed verdicts.
//
// The division of labour matters and is the reason this survives a supervisory
// review. Detection, classification and evidence assembly are autonomous. The
// disposition is not: anything that fires, and anything whose confidence sits
// under the rule's floor, routes to a principal. The agent drafts the finding
// and the remediation; a human approves, returns or blocks.
//
// Deterministic. No model client may be imported here, so the same facts always
// produce the same verdict and a past decision can be replayed exactly.
import type { FactBag, Outcome, Verdict } from "@/lib/compliance/types";
import type { EffectiveRule, ResolvedPolicy } from "@/lib/compliance/policy";
import { activeRules } from "@/lib/compliance/policy";
import { evaluate, paramMap, render } from "@/lib/compliance/dsl";

export interface EvaluateInput {
  facts: FactBag;
  /** Connector ids currently connected and healthy. A rule whose inputs are missing cannot be evaluated. */
  availableConnectors: string[];
  /**
   * Per-fact confidence, 0 to 1, for facts that were inferred rather than
   * observed. Anything absent is treated as observed and certain.
   */
  factConfidence?: Record<string, number>;
  scope?: EffectiveRule["scope"];
}

/** A rule's confidence is the weakest confidence among the facts it read. */
function confidenceFor(rule: EffectiveRule, input: EvaluateInput): number {
  const conf = input.factConfidence ?? {};
  const used = [...rule.evidence, ...Object.keys(input.facts)].filter((k) => k in conf);
  if (used.length === 0) return 1;
  return Math.min(...used.map((k) => conf[k] ?? 1));
}

export function evaluateRule(rule: EffectiveRule, input: EvaluateInput): Verdict {
  const missing = rule.requires.filter((id) => !input.availableConnectors.includes(id));
  const params = paramMap(rule);
  const facts: FactBag = Object.fromEntries(
    rule.evidence.map((k) => [k, input.facts[k]]).filter(([, v]) => v !== undefined),
  );

  if (missing.length > 0) {
    return {
      ruleId: rule.id,
      outcome: "cannot_evaluate",
      confidence: 0,
      severity: rule.severity,
      facts,
      finding: `Cannot evaluate: this rule reads records from ${missing.join(", ")}, which is not connected.`,
      remediation: "Connect the source, or record a documented exception for why this rule is not evaluated.",
      citation: rule.citation,
      requiresHuman: true,
      missingConnectors: missing,
    };
  }

  const fired = evaluate(rule.when, input.facts, params);
  const confidence = confidenceFor(rule, input);
  const outcome: Outcome = fired ? (rule.severity === "block" ? "block" : "flag") : "clear";

  return {
    ruleId: rule.id,
    outcome,
    confidence,
    severity: rule.severity,
    facts,
    finding: fired ? render(rule.finding, { ...input.facts, ...params }) : "No finding.",
    remediation: fired ? render(rule.remediation, { ...input.facts, ...params }) : "",
    citation: rule.citation,
    // A human dispositions anything that fired, and anything the agent is not
    // sure enough about to clear on its own.
    requiresHuman: fired || confidence < rule.confidenceFloor,
  };
}

export interface Findings {
  verdicts: Verdict[];
  blocking: Verdict[];
  flagged: Verdict[];
  unevaluable: Verdict[];
  /** True when nothing fired and nothing needs a human. */
  clean: boolean;
  /** The lowest confidence across everything evaluated. */
  confidence: number;
}

export function runPolicy(policy: ResolvedPolicy, input: EvaluateInput): Findings {
  const rules = activeRules(policy).filter((r) => (input.scope ? r.scope === input.scope : true));
  const verdicts = rules.map((r) => evaluateRule(r, input));
  const blocking = verdicts.filter((v) => v.outcome === "block");
  const flagged = verdicts.filter((v) => v.outcome === "flag");
  const unevaluable = verdicts.filter((v) => v.outcome === "cannot_evaluate");
  return {
    verdicts,
    blocking,
    flagged,
    unevaluable,
    clean: verdicts.every((v) => v.outcome === "clear" && !v.requiresHuman),
    confidence: verdicts.length === 0 ? 1 : Math.min(...verdicts.map((v) => v.confidence)),
  };
}
