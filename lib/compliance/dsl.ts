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

/** What each fact means, in the words a supervisor would use. A fact not listed is shown by its name, split into words. */
export const FACT_LABEL: Record<string, string> = {
  alternativesConsidered: "alternatives considered", basisRecorded: "the basis is recorded", channelApproved: "the channel is approved",
  citationCount: "the number of cited sources", clientAge: "the client's age", complaintLanguage: "the text reads as a complaint",
  complaintLogged: "a complaint is logged", completeness: "record completeness", concentrationDriftPts: "the rise in one name over 90 days (points)",
  concentrationHeadroomPts: "headroom under the family's one-name limit (points)", concentrationPct: "the share of wealth in one name (%)",
  containsProjection: "it projects performance", containsRecommendation: "it contains a recommendation", containsSensitiveData: "it contains sensitive personal data",
  containsTestimonial: "it contains a testimonial", costsCompared: "costs are compared", gapChannels: "channels in use and not captured",
  isRecommendation: "it is a recommendation", machineDrafted: "it was drafted by a model", newThirdPartyContact: "a new third party is in contact",
  obaOnFile: "an outside activity is disclosed", outsideBusinessLanguage: "it mentions outside business", partialChannels: "channels read but not retained",
  principalApproved: "a principal approved it", recipientCount30d: "retail recipients in 30 days", reviewed: "it has been reviewed",
  trustedContactOnFile: "a trusted contact is on file", unsourcedFigures: "figures without a source", unusualDisbursement: "a disbursement is unusual",
  cashCoverMonths: "months of spending held in cash", daysSinceContact: "days since the last contact", direction: "the message",
  excerpt: "what the client wrote",
};
const words = (k: string) => FACT_LABEL[k] ?? k.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase();

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
  // A yes-or-no fact reads as a statement: "a principal approved it" is false reads as "not: a principal approved it".
  if (condition.cmp === "eq" && typeof v === "boolean") return `${pad}${v ? "" : "not: "}${words(condition.fact)}`;
  if (condition.fact === "direction" && condition.cmp === "eq") return `${pad}the message is ${v === "inbound" ? "from the client" : "to the client"}`;
  const quoted = condition.cmp === "contains" && typeof v === "string" ? `"${v}"` : shown;
  return `${pad}${words(condition.fact)} ${verb[condition.cmp]}${condition.cmp === "exists" ? "" : ` ${quoted}`}`;
}
