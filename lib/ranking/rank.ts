// Deterministic ranking (BUILD-SPEC §6). The model never reorders this.
import type { Opportunity, TriggerClass } from "@/lib/types";
import { FIRM } from "@/lib/profile";

// Firm defaults; a screen passes the advisor's resolved cap and weights (resolveProfile).
export const DEFAULT_CAP = FIRM.values["triage.dailyCap"] as number;
export const DEFAULT_WEIGHTS = FIRM.values["triage.classWeights"] as Record<TriggerClass, number>;

/** A class missing from a partial weights object falls back to the firm weight, then 1: an item is never hidden by a missing weight. */
export function score(o: Opportunity, weights: Partial<Record<TriggerClass, number>> = DEFAULT_WEIGHTS): number {
  const w = weights[o.triggerClass] ?? DEFAULT_WEIGHTS[o.triggerClass] ?? 1;
  return Math.round(o.materiality * w * 10) / 10;
}

export function rank(opps: readonly Opportunity[], dismissed: ReadonlySet<string> = new Set(), cap = DEFAULT_CAP, weights: Partial<Record<TriggerClass, number>> = DEFAULT_WEIGHTS): Opportunity[] {
  const n = Number.isFinite(cap) ? Math.max(0, Math.floor(cap)) : DEFAULT_CAP;
  return opps
    .filter((o) => !dismissed.has(o.id))
    .slice()
    .sort((a, b) => score(b, weights) - score(a, weights) || a.id.localeCompare(b.id))
    .slice(0, n);
}
