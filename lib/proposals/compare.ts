// The figures an advisor compares before choosing an option.
//
// A candidate that only says "eligible, 15 bps" is not how an advisor chooses.
// They weigh the income it throws off after tax, what it costs over the time
// the money will sit there, when it can be reached, and how much rate risk it
// carries. Every figure here is arithmetic over the shelf entry and the
// amount; the yields and rates are illustrative data, stated as such, and a
// plan or a tax adviser supplies the client's own in production.
//
// Deterministic. No model client may be imported here.
import type { Candidate, Product } from "@/lib/types";
import { POLICY } from "@/lib/data/policy";
import { usd } from "@/lib/format";

export interface OptionEconomics {
  yieldPct: number;
  grossIncomeUsd: number;
  /** Combined marginal rate applied, percent, and the words for it. */
  taxPct: number;
  taxNote: string;
  afterTaxIncomeUsd: number;
  /** Cost of the position over the firm's comparison horizon. */
  horizonYears: number;
  costOverHorizonUsd: number;
  /** After-tax income less cost, over the horizon. */
  netOverHorizonUsd: number;
  durationYears: number;
  /** A one-point rise in rates, in dollars, from duration alone. */
  ratePointUsd: number;
  accessLabel: string;
  minimumUsd: number;
  minimumMet: boolean;
}

const TAX: Record<NonNullable<Product["taxTreatment"]>, { pct: () => number; note: string }> = {
  taxable: { pct: () => T().federalOrdinaryPct + T().statePct + T().niitPct, note: "ordinary income: federal, state and net investment income tax" },
  ordinary: { pct: () => T().federalOrdinaryPct + T().statePct + T().niitPct, note: "ordinary income: federal, state and net investment income tax" },
  state_exempt: { pct: () => T().federalOrdinaryPct + T().niitPct, note: "federal and net investment income tax; exempt from state tax" },
  federal_exempt: { pct: () => T().statePct, note: "state tax only; exempt from federal tax" },
  qualified: { pct: () => T().federalQualifiedPct + T().statePct + T().niitPct, note: "qualified dividend rate, state and net investment income tax" },
  deferred: { pct: () => 0, note: "no current tax; gain deferred until the position is sold" },
};
const T = () => POLICY.proposals.taxAssumptions;

export function accessLabel(days: number): string {
  if (days <= 1) return "Next day";
  if (days < 30) return `${days} days`;
  if (days < 365) return `${Math.round(days / 30)} months`;
  const y = days / 365;
  return `${Number.isInteger(y) ? y : y.toFixed(1)} years`;
}

export function economics(candidate: Candidate, product: Product): OptionEconomics {
  const yieldPct = product.yieldPct ?? 0;
  const amount = candidate.amountUsd;
  const gross = Math.round((amount * yieldPct) / 100);
  const treatment = product.taxTreatment ?? "taxable";
  const taxPct = TAX[treatment].pct();
  const afterTax = Math.round(gross * (1 - taxPct / 100));
  const horizonYears = POLICY.proposals.horizonYears;
  const cost = Math.round((amount * product.costBps) / 10_000);
  const duration = product.durationYears ?? 0;
  const minimum = product.minimumUsd ?? 0;
  return {
    yieldPct,
    grossIncomeUsd: gross,
    taxPct,
    taxNote: TAX[treatment].note,
    afterTaxIncomeUsd: afterTax,
    horizonYears,
    costOverHorizonUsd: cost * horizonYears,
    netOverHorizonUsd: afterTax * horizonYears - cost * horizonYears,
    durationYears: duration,
    ratePointUsd: Math.round(amount * duration * 0.01),
    accessLabel: accessLabel(product.liquidityDays),
    minimumUsd: minimum,
    minimumMet: amount >= minimum,
  };
}

/** One line a person can read: "$125K a year after tax, $9K cost over 3 years". */
export function economicsLine(e: OptionEconomics): string {
  return `${usd(e.afterTaxIncomeUsd)} a year after tax, ${usd(e.costOverHorizonUsd)} cost over ${e.horizonYears} years, access ${e.accessLabel.toLowerCase()}`;
}
