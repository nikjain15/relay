// The rule evaluator. Deterministic and total: every condition returns a
// boolean, an unknown fact is false rather than an exception, and no model
// client may be imported here.
import type { Comparator, Condition, FactBag, FactValue, RuleDefinition, Severity } from "@/lib/compliance/types";
import { SEVERITY_ORDER } from "@/lib/compliance/types";

function compare(actual: FactValue | undefined, cmp: Comparator, expected: FactValue | undefined): boolean {
  if (cmp === "exists") return actual !== undefined && actual !== "" && actual !== false;
  if (actual === undefined || expected === undefined) return false;

  switch (cmp) {
    case "eq": return actual === expected;
    case "neq": return actual !== expected;
    case "gt": return typeof actual === "number" && typeof expected === "number" && actual > expected;
    case "gte": return typeof actual === "number" && typeof expected === "number" && actual >= expected;
    case "lt": return typeof actual === "number" && typeof expected === "number" && actual < expected;
    case "lte": return typeof actual === "number" && typeof expected === "number" && actual <= expected;
    case "in": return Array.isArray(expected) && typeof actual === "string" && expected.includes(actual);
    case "contains":
      if (Array.isArray(actual)) return typeof expected === "string" && actual.includes(expected);
      return typeof actual === "string" && typeof expected === "string" && actual.toLowerCase().includes(expected.toLowerCase());
    case "matches":
      if (typeof actual !== "string" || typeof expected !== "string") return false;
      try { return new RegExp(expected, "i").test(actual); } catch { return false; }
    default: return false;
  }
}

/** Resolve a condition's right-hand side: a literal, or a named rule param. */
function rhs(node: { value?: FactValue; param?: string }, params: Record<string, FactValue>): FactValue | undefined {
  return node.param !== undefined ? params[node.param] : node.value;
}

export function evaluate(condition: Condition, facts: FactBag, params: Record<string, FactValue>): boolean {
  if ("all" in condition) return condition.all.every((c) => evaluate(c, facts, params));
  if ("any" in condition) return condition.any.some((c) => evaluate(c, facts, params));
  if ("not" in condition) return !evaluate(condition.not, facts, params);
  return compare(facts[condition.fact], condition.cmp, rhs(condition, params));
}

/** Every fact key a condition reads. Used to build the evidence packet and to explain a rule in the console. */
export function factsUsed(condition: Condition, out: Set<string> = new Set()): Set<string> {
  if ("all" in condition) condition.all.forEach((c) => factsUsed(c, out));
  else if ("any" in condition) condition.any.forEach((c) => factsUsed(c, out));
  else if ("not" in condition) factsUsed(condition.not, out);
  else out.add(condition.fact);
  return out;
}

export function paramMap(rule: RuleDefinition): Record<string, FactValue> {
  return Object.fromEntries(rule.params.map((p) => [p.key, p.value]));
}

export const severityRank = (s: Severity): number => SEVERITY_ORDER.indexOf(s);
export const atLeastAsStrict = (a: Severity, b: Severity): boolean => severityRank(a) >= severityRank(b);

/** Fill {fact} placeholders in a finding or remediation line. */
export function render(template: string, facts: FactBag): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => {
    const v = facts[key];
    if (v === undefined) return whole;
    return Array.isArray(v) ? v.join(", ") : String(v);
  });
}

/** A human-readable rendering of a condition, for the console. */
export function explain(condition: Condition, params: Record<string, FactValue>, depth = 0): string {
  const pad = "  ".repeat(depth);
  if ("all" in condition) return condition.all.map((c) => explain(c, params, depth + 1)).join(`\n${pad}and\n`);
  if ("any" in condition) return condition.any.map((c) => explain(c, params, depth + 1)).join(`\n${pad}or\n`);
  if ("not" in condition) return `${pad}not (${explain(condition.not, params, 0).trim()})`;
  const v = rhs(condition, params);
  const shown = Array.isArray(v) ? `[${v.join(", ")}]` : String(v ?? "");
  const verb: Record<Comparator, string> = {
    eq: "is", neq: "is not", gt: "is more than", gte: "is at least",
    lt: "is under", lte: "is at most", in: "is one of", contains: "contains",
    matches: "matches", exists: "is present",
  };
  return `${pad}${condition.fact} ${verb[condition.cmp]}${condition.cmp === "exists" ? "" : ` ${shown}`}`;
}
