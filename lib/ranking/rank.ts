// Deterministic ranking (BUILD-SPEC §6). The model never reorders this.
import type { Opportunity, TriggerClass } from "@/lib/types";

export const DEFAULT_CAP = 12;

const CLASS_WEIGHT: Record<TriggerClass, number> = {
  external_event: 1,
  life_event: 1,
  household_threshold: 0.95,
  plan_service_event: 0.85,
  market_view: 0.7,
};

export function score(o: Opportunity): number {
  return Math.round(o.materiality * CLASS_WEIGHT[o.triggerClass] * 10) / 10;
}

export function rank(opps: readonly Opportunity[], dismissed: ReadonlySet<string> = new Set(), cap = DEFAULT_CAP): Opportunity[] {
  return opps
    .filter((o) => !dismissed.has(o.id))
    .slice()
    .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
    .slice(0, cap);
}
