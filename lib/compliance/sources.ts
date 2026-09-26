// Which sources a rule needs, and which rules a source serves.
//
// One direction is authoritative: a rule names the connectors it requires,
// because that is what the engine reads when it decides whether it can evaluate
// the rule at all. The other direction is derived here rather than stored in the
// catalog. Holding the same relationship in two files means the two drift, and
// the drift is invisible until a screen tells an advisor that connecting a source
// will close a finding it has nothing to do with.
import type { RuleDefinition } from "@/lib/compliance/types";
import { BASELINE } from "@/lib/compliance/policy";

/** Rules that cannot be evaluated without this connector. */
export function rulesFedBy(connectorId: string, rules: RuleDefinition[] = BASELINE): RuleDefinition[] {
  return rules.filter((r) => r.requires.includes(connectorId));
}

/** Connector ids this rule reads from. */
export function sourcesForRule(ruleId: string, rules: RuleDefinition[] = BASELINE): string[] {
  return rules.find((r) => r.id === ruleId)?.requires ?? [];
}

/**
 * Rules that no connector can satisfy, either because nothing provides the
 * source or because the rule names one that does not exist. A rule in this list
 * can never clear and never fire, which is worse than a rule that fires often.
 */
export function unservedRules(connectorIds: string[], rules: RuleDefinition[] = BASELINE): string[] {
  return rules.filter((r) => r.requires.some((c) => !connectorIds.includes(c))).map((r) => r.id);
}
