// Which rules are in force, for whom, at what strength, and who set each one.
//
// Same shape as lib/profile: firm, then segment, then advisor, then client.
// The invariant that makes a configurable rule set safe is that a lower layer
// may only TIGHTEN. It can enable a rule the firm left off, raise severity, and
// move a threshold in the stricter direction. It cannot disable a mandatory
// rule, lower severity, or loosen a threshold. Without that, "configurable"
// means "an advisor can switch off the rule that would have caught them".
//
// Deterministic. No model client may be imported here.
import type { FactValue, RuleDefinition, RuleOverride, RuleParam } from "@/lib/compliance/types";
import { severityRank } from "@/lib/compliance/dsl";
import { RULES_DATA } from "@/lib/data";

export type RuleLayer = "firm" | "segment" | "advisor" | "client";

export interface LayerOverrides {
  layer: RuleLayer;
  id: string;
  overrides: RuleOverride[];
}

export interface RejectedChange {
  ruleId: string;
  layer: RuleLayer;
  field: string;
  attempted: string;
  reason: string;
}

export interface EffectiveRule extends RuleDefinition {
  /** Which layer last set each field, so the console can show provenance. */
  setBy: { enabled: RuleLayer; severity: RuleLayer; params: Record<string, RuleLayer> };
}

export interface ResolvedPolicy {
  rules: EffectiveRule[];
  /** Changes a layer attempted that would have loosened the rule. Shown, never applied silently. */
  rejected: RejectedChange[];
  version: number;
}

export const BASELINE: RuleDefinition[] = RULES_DATA.rules;
export const BASELINE_VERSION = RULES_DATA.version;

function tighterParam(spec: RuleParam, current: FactValue, next: FactValue): boolean {
  if (spec.stricter === "lower") return typeof next === "number" && typeof current === "number" && next < current;
  if (spec.stricter === "higher") return typeof next === "number" && typeof current === "number" && next > current;
  if (spec.stricter === "true") return next === true && current !== true;
  return false;
}

/**
 * Apply layers in order. Every rejection is recorded rather than dropped,
 * because an advisor who tried to loosen a rule is itself a supervision signal.
 */
export function resolvePolicy(layers: LayerOverrides[], baseline: RuleDefinition[] = BASELINE): ResolvedPolicy {
  const rejected: RejectedChange[] = [];
  const rules: EffectiveRule[] = baseline.map((r) => ({
    ...r,
    params: r.params.map((p) => ({ ...p })),
    setBy: { enabled: "firm", severity: "firm", params: Object.fromEntries(r.params.map((p) => [p.key, "firm" as RuleLayer])) },
  }));
  const byId = new Map(rules.map((r) => [r.id, r]));

  for (const { layer, overrides } of layers) {
    for (const ov of overrides) {
      const rule = byId.get(ov.ruleId);
      if (!rule) {
        rejected.push({ ruleId: ov.ruleId, layer, field: "rule", attempted: "override", reason: "No such rule in the baseline." });
        continue;
      }

      if (ov.enabled !== undefined && ov.enabled !== rule.enabled) {
        if (ov.enabled === false && rule.mandatory) {
          rejected.push({ ruleId: rule.id, layer, field: "enabled", attempted: "disable", reason: "Mandatory at the firm layer. A lower layer cannot switch it off." });
        } else {
          rule.enabled = ov.enabled;
          rule.setBy.enabled = layer;
        }
      }

      if (ov.severity !== undefined && ov.severity !== rule.severity) {
        if (severityRank(ov.severity) < severityRank(rule.severity)) {
          rejected.push({ ruleId: rule.id, layer, field: "severity", attempted: ov.severity, reason: `Would soften ${rule.severity} to ${ov.severity}. A lower layer may only raise severity.` });
        } else {
          rule.severity = ov.severity;
          rule.setBy.severity = layer;
        }
      }

      for (const [key, next] of Object.entries(ov.params ?? {})) {
        const spec = rule.params.find((p) => p.key === key);
        if (!spec) {
          rejected.push({ ruleId: rule.id, layer, field: key, attempted: String(next), reason: "No such parameter on this rule." });
          continue;
        }
        if (next === spec.value) continue;
        if (typeof next === "number" && ((spec.min !== undefined && next < spec.min) || (spec.max !== undefined && next > spec.max))) {
          rejected.push({ ruleId: rule.id, layer, field: key, attempted: String(next), reason: `Outside the permitted range ${spec.min ?? "-"} to ${spec.max ?? "-"}.` });
          continue;
        }
        if (!tighterParam(spec, spec.value, next)) {
          rejected.push({ ruleId: rule.id, layer, field: key, attempted: String(next), reason: `Would loosen ${spec.label}. A lower layer may only move it in the stricter direction.` });
          continue;
        }
        spec.value = next;
        rule.setBy.params[key] = layer;
      }
    }
  }

  return { rules, rejected, version: BASELINE_VERSION };
}

/** Rules actually in force, in the order a console should list them. */
export function activeRules(policy: ResolvedPolicy): EffectiveRule[] {
  return policy.rules
    .filter((r) => r.enabled)
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.id.localeCompare(b.id));
}
