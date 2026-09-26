// Deterministic ranking (BUILD-SPEC §6). The model never reorders this.
import type { Opportunity, TriggerClass } from "@/lib/types";
import { FIRM } from "@/lib/profile";

// Firm defaults; a screen passes the advisor's resolved cap and weights (resolveProfile).
export const DEFAULT_CAP = FIRM.values["triage.dailyCap"] as number;
export const DEFAULT_WEIGHTS = FIRM.values["triage.classWeights"] as Record<TriggerClass, number>;

export function score(o: Opportunity, weights: Record<TriggerClass, number> = DEFAULT_WEIGHTS): number {
  return Math.round(o.materiality * weights[o.triggerClass] * 10) / 10;
}

export function rank(opps: readonly Opportunity[], dismissed: ReadonlySet<string> = new Set(), cap = DEFAULT_CAP, weights = DEFAULT_WEIGHTS): Opportunity[] {
  return opps
    .filter((o) => !dismissed.has(o.id))
    .slice()
    .sort((a, b) => score(b, weights) - score(a, weights) || a.id.localeCompare(b.id))
    .slice(0, cap);
}
