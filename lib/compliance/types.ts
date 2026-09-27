// Compliance rules as data.
//
// A rule is JSON, not a compiled predicate. That is the whole point: the
// supervision console edits rules at runtime and the next evaluation uses them,
// with no rebuild. A firm's obligations are not the same as another firm's, and
// an advisor serving pre-liquidity founders does not need the same surveillance
// as one running a pooled call queue, so the rule set has to be configurable to
// be honest.
//
// Evaluation stays deterministic. The DSL below is a small, total expression
// language over a flat bag of facts: no model client may be imported by the
// evaluator, so a rule always produces the same verdict for the same facts.

export type Authority = "FINRA" | "SEC" | "Firm";
export type Scope = "communication" | "coverage" | "proposal" | "account";
/** Ordered. A layer may raise severity, never lower it. */
export type Severity = "note" | "flag" | "block";
export const SEVERITY_ORDER: Severity[] = ["note", "flag", "block"];

export type FactValue = string | number | boolean | string[];
export type FactBag = Record<string, FactValue | undefined>;

export type Comparator =
  | "eq" | "neq" | "gt" | "gte" | "lt" | "lte"
  | "in" | "contains" | "matches" | "exists";

/**
 * A condition is a tree the console can render and edit. `param` reads a
 * threshold from the rule's own params, so the common edit (change 25 to 20) is
 * a number in a form rather than a hand-edited expression.
 */
export type Condition =
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition }
  | { fact: string; cmp: Comparator; value?: FactValue; param?: string };

export interface RuleParam {
  key: string;
  label: string;
  type: "number" | "text" | "boolean" | "enum";
  value: FactValue;
  /** Which direction is stricter, so a layer can only move it that way. */
  stricter?: "lower" | "higher" | "true";
  min?: number;
  max?: number;
  values?: string[];
  /** Shown under the field: why this number is what it is. */
  note?: string;
}

export interface RuleDefinition {
  id: string;
  title: string;
  authority: Authority;
  /** Rule or release cited, verbatim enough to look up. */
  citation: string;
  scope: Scope;
  severity: Severity;
  /** A firm-mandatory rule cannot be disabled or softened by a lower layer. */
  mandatory: boolean;
  enabled: boolean;
  when: Condition;
  params: RuleParam[];
  /** Fact keys captured into the evidence packet when this rule fires. */
  evidence: string[];
  /** What the agent drafts for the principal. {fact} placeholders are filled. */
  finding: string;
  remediation: string;
  /** Below this confidence the finding always routes to a human, even if clear. */
  confidenceFloor: number;
  /** Connector ids whose records this rule needs. Drives the "cannot evaluate" state. */
  requires: string[];
  /** What the agent prepares when this rule fires: holds, callbacks, forms, tasks, notes, sources. See lib/compliance/actions.ts. */
  actions?: unknown[];
}

/** A layer's change to a rule. Enable and tighten only; see policy.ts. */
export interface RuleOverride {
  ruleId: string;
  enabled?: boolean;
  severity?: Severity;
  params?: Record<string, FactValue>;
}

export type Outcome = "clear" | "flag" | "block" | "cannot_evaluate";

/**
 * A typed verdict with a confidence, in the System One shape: consumed by code,
 * not read as prose. Deterministic rules return confidence 1; a rule whose
 * facts are partly inferred returns less, and anything under the rule's floor
 * routes to a human regardless of outcome.
 */
export interface Verdict {
  ruleId: string;
  outcome: Outcome;
  confidence: number;
  severity: Severity;
  /** Facts that decided it, for the evidence packet. */
  facts: FactBag;
  finding: string;
  remediation: string;
  citation: string;
  /** True when a human must disposition this regardless of outcome. */
  requiresHuman: boolean;
  /** Set when outcome is cannot_evaluate: the connectors that are missing. */
  missingConnectors?: string[];
}
