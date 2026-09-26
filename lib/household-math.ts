import type { Household } from "@/lib/types";

export function investableUsd(h: Household): number {
  return h.holdings.reduce((s, x) => s + x.valueUsd, 0);
}

export function singleNameUsd(h: Household): number {
  return h.holdings.filter((x) => x.singleName).reduce((s, x) => s + x.valueUsd, 0);
}

export function singleNamePct(h: Household): number {
  return (singleNameUsd(h) / investableUsd(h)) * 100;
}

/** Months of spending covered by unearmarked cash. */
export function liquidityMonths(h: Household): number {
  const cash = h.holdings.filter((x) => x.productId === "prod-mmf" && !x.earmarked).reduce((s, x) => s + x.valueUsd, 0);
  return Math.floor(cash / h.monthlySpendUsd);
}

export function shortTermLotsUsd(h: Household): number {
  return h.holdings.reduce((s, x) => s + (x.shortTermLotsUsd ?? 0), 0);
}
