// Structured care-obligation rationale (PRD S5.2, FR-10): basis, reasonably
// available alternatives, costs compared, and why this candidate suits this
// household. Structured data, not prose.
import type { Evaluation, Household, Opportunity, RationaleRecord } from "@/lib/types";
import { SHELF } from "@/lib/fixtures/shelf";
import { constraintText } from "@/lib/constraint-text";

export function rationale(opp: Opportunity, h: Household, selected: Evaluation, all: Evaluation[]): RationaleRecord {
  const bps = (id: string) => SHELF.find((p) => p.id === id)?.costBps ?? 0;
  return {
    opportunityId: opp.id,
    householdId: h.id,
    basis: opp.reasonPath.map((n) => `${n.kind}: ${n.label}`),
    selected: { productId: selected.candidate.productId, source: selected.candidate.source, amountUsd: selected.candidate.amountUsd },
    alternatives: all
      .filter((e) => e.candidate.id !== selected.candidate.id)
      .map((e) => ({
        productId: e.candidate.productId,
        source: e.candidate.source,
        outcome: e.pass ? "Eligible, not selected" : `Rejected: ${e.failures.map((f) => f.rule).join(", ")}`,
      })),
    costsCompared: all
      .filter((e) => e.pass)
      .map((e) => ({ productId: e.candidate.productId, costBps: bps(e.candidate.productId), annualCostUsd: e.annualCostUsd })),
    whySuitable: h.constraints.map((c) => `Meets: ${constraintText(c)}`),
  };
}
