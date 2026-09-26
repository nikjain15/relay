import type { Household, Opportunity } from "@/lib/types";
import shelf from "@/data/shelf.json";
import { POLICY } from "@/lib/data/policy";

export function investableUsd(h: Household): number {
  return h.holdings.reduce((s, x) => s + x.valueUsd, 0);
}

export function singleNameUsd(h: Household): number {
  return h.holdings.filter((x) => x.singleName).reduce((s, x) => s + x.valueUsd, 0);
}

export function singleNamePct(h: Household): number {
  return (singleNameUsd(h) / investableUsd(h)) * 100;
}

// A holding counts toward Liquidity when its product is one the constraint
// engine would accept for a Liquidity strategy (risk and access within the
// sleeve limits), so money moved into the proposed product closes the gap it
// was proposed for. Cash reserved for a named purpose never counts.
const LIQUID = new Set(
  (shelf as { id: string; riskLevel: number; liquidityDays: number }[])
    .filter((p) => p.riskLevel <= POLICY.liquidity.sleeveMaxRisk && p.liquidityDays <= POLICY.liquidity.sleeveMaxAccessDays)
    .map((p) => p.id),
);

/** Unearmarked holdings in Liquidity-eligible products. */
export function liquidUsd(h: Household): number {
  return h.holdings.filter((x) => x.productId && LIQUID.has(x.productId) && !x.earmarked).reduce((s, x) => s + x.valueUsd, 0);
}

/** Whole months of spending covered by Liquidity holdings. No spending figure means no cover is assumed. */
export function liquidityMonths(h: Household): number {
  return h.monthlySpendUsd > 0 ? Math.floor(liquidUsd(h) / h.monthlySpendUsd) : 0;
}

export function shortTermLotsUsd(h: Household): number {
  return h.holdings.reduce((s, x) => s + (x.shortTermLotsUsd ?? 0), 0);
}

export function coreUsd(h: Household): number {
  return h.holdings.filter((x) => x.productId === POLICY.proposals.coreProductId).reduce((s, x) => s + x.valueUsd, 0);
}

export interface FundingNeed {
  unit: "months" | "USD";
  /** Target in the goal's unit, and the dollars that target means. */
  target: number;
  targetUsd: number;
  /** Dollars already counted toward the goal. */
  haveUsd: number;
  /** A known outflow the goal must also cover (a capital call, a tax bill). */
  outflowUsd: number;
  needUsd: number;
  /** What the proposal moves: the need, capped by new cash when the event brings some. */
  amountUsd: number;
}

/**
 * The exact dollar gap a "fund" opportunity closes. Months goals are measured
 * in dollars (target months x monthly spending, less Liquidity holdings), not
 * in rounded months, and a known outflow is added so the goal still holds
 * after it is paid.
 */
export function fundingNeed(h: Household, opp: Opportunity): FundingNeed {
  const goal = h.goals.find((g) => g.strategy === opp.strategy);
  const unit = goal?.unit ?? "USD";
  const target = goal?.target ?? 0;
  const targetUsd = unit === "months" ? target * h.monthlySpendUsd : target;
  const haveUsd = unit === "months" ? liquidUsd(h) : (goal?.funded ?? 0);
  const outflowUsd = opp.outflowUsd ?? 0;
  const needUsd = Math.max(0, targetUsd - haveUsd + outflowUsd);
  const amountUsd = opp.inflowUsd ? Math.min(opp.inflowUsd, needUsd) : needUsd;
  return { unit, target, targetUsd, haveUsd, outflowUsd, needUsd, amountUsd };
}
