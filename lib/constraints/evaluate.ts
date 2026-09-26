// Deterministic constraint engine (BUILD-SPEC §6). Every candidate is checked
// against every constraint in the household's IPS, and every breach is
// returned by name with a numeric detail: a rejected candidate is shown to the
// advisor with its reason, never silently dropped. No model client may be
// imported here (.dependency-cruiser.cjs).
import type { Candidate, Evaluation, Failure, Household, Opportunity, Product } from "@/lib/types";
import { SHELF } from "@/lib/fixtures/shelf";
import { coreUsd, fundingNeed, liquidityMonths, investableUsd, shortTermLotsUsd, singleNameUsd } from "@/lib/household-math";
import { pct, usd } from "@/lib/format";
import { POLICY } from "@/lib/data/policy";

const LOCKUP_DAYS = POLICY.liquidity.lockupDays;
const SLEEVE_MAX_DAYS = POLICY.liquidity.sleeveMaxAccessDays;
const SLEEVE_MAX_RISK = POLICY.liquidity.sleeveMaxRisk;
const CORE = POLICY.proposals.coreProductId;

export function evaluate(candidate: Candidate, product: Product, household: Household, strategy?: string): Evaluation {
  const failures: Failure[] = [];
  const total = investableUsd(household);

  for (const c of household.constraints) {
    switch (c.kind) {
      case "excludedProductTypes":
        if (c.types.includes(product.type)) {
          failures.push({ rule: "Excluded product type", detail: `IPS excludes ${product.type.replace(/_/g, " ")}` });
        }
        break;
      case "maxRiskLevel":
        if (product.riskLevel > c.level) {
          failures.push({ rule: "Risk level", detail: `Product risk ${product.riskLevel} exceeds IPS maximum ${c.level}` });
        }
        break;
      case "minLiquidityMonths": {
        const months = liquidityMonths(household);
        if (product.liquidityDays > LOCKUP_DAYS && months < c.months) {
          failures.push({
            rule: "Liquidity minimum",
            detail: `Locks up for ${product.liquidityDays} days while Liquidity covers ${months} of ${c.months} required months`,
          });
        }
        break;
      }
      case "noShortTermGains":
        if (candidate.source === "sell_all_lots" && shortTermLotsUsd(household) > 0) {
          failures.push({
            rule: "Tax-lot holding period",
            detail: "Selling all lots realises short-term gains on lots held one year or less",
          });
        }
        break;
      case "maxSingleName":
        if (candidate.action === "trim") {
          const after = ((singleNameUsd(household) - candidate.amountUsd) / total) * 100;
          if (after > c.pct + 1e-9) {
            failures.push({ rule: "Concentration", detail: `Leaves single-name at ${pct(after)} against ${c.pct}%` });
          }
        }
        break;
      default: {
        // Fail closed: a rule the engine does not understand blocks every candidate
        // instead of being skipped, so a typo in a client's IPS cannot widen what passes.
        const kind = (c as { kind?: unknown }).kind;
        failures.push({ rule: "Unknown rule", detail: `IPS rule "${String(kind)}" is not understood, so nothing passes until it is fixed` });
      }
    }
  }

  if (candidate.source === "rebalance_from_core" && candidate.amountUsd > coreUsd(household)) {
    failures.push({ rule: "Funding source", detail: `Needs ${usd(candidate.amountUsd)} from the core portfolio, which holds ${usd(coreUsd(household))}` });
  }

  if (candidate.action === "fund" && strategy === "Liquidity") {
    if (product.liquidityDays > SLEEVE_MAX_DAYS || product.riskLevel > SLEEVE_MAX_RISK) {
      failures.push({
        rule: "Liquidity strategy fit",
        detail: `Liquidity requires risk ${SLEEVE_MAX_RISK} or lower and access within ${SLEEVE_MAX_DAYS} days`,
      });
    }
  }

  return {
    candidate,
    pass: failures.length === 0,
    failures,
    annualCostUsd: Math.round((candidate.amountUsd * product.costBps) / 10_000),
  };
}

/** The bounded output space: shelf products crossed with the funding sources the action allows. */
export function candidatesFor(opp: Opportunity, household: Household): Candidate[] {
  if (opp.action !== "fund" && opp.action !== "trim") return [];
  const out: Candidate[] = [];
  if (opp.action === "fund") {
    const amount = fundingNeed(household, opp).amountUsd;
    if (amount <= 0) return [];
    const source = opp.inflowUsd ? "new_cash" : "rebalance_from_core";
    for (const p of SHELF) out.push({ id: `${opp.id}:${p.id}:${source}`, productId: p.id, action: "fund", source, amountUsd: amount });
    return out;
  }
  const cap = household.constraints.find((c) => c.kind === "maxSingleName");
  const capPct = cap && cap.kind === "maxSingleName" ? cap.pct : 100;
  const needed = Math.max(0, singleNameUsd(household) - (capPct / 100) * investableUsd(household));
  if (needed <= 0) return [];
  const longTerm = singleNameUsd(household) - shortTermLotsUsd(household);
  for (const p of SHELF) {
    const source = p.type === "exchange_fund" ? "contribute_in_kind" : "sell_long_term_lots";
    const amount = source === "sell_long_term_lots" ? Math.min(needed, longTerm) : needed;
    out.push({ id: `${opp.id}:${p.id}:${source}`, productId: p.id, action: "trim", source, amountUsd: Math.round(amount) });
  }
  out.push({ id: `${opp.id}:${CORE}:sell_all_lots`, productId: CORE, action: "trim", source: "sell_all_lots", amountUsd: Math.round(needed) });
  return out;
}

export function evaluateAll(opp: Opportunity, household: Household): Evaluation[] {
  return candidatesFor(opp, household).map((c) => {
    const product = SHELF.find((p) => p.id === c.productId);
    if (!product) throw new Error(`candidate references unknown product ${c.productId}`);
    return evaluate(c, product, household, opp.strategy);
  });
}
