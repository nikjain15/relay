// One sentence for the amount a "fund" proposal moves, shared by the proposal
// screen and the walkthrough mockup so the two can never show different
// arithmetic. Every figure comes from fundingNeed().
import type { Household, Opportunity } from "@/lib/types";
import { fundingNeed } from "@/lib/household-math";
import { usd } from "@/lib/format";

export function needText(h: Household, opp: Opportunity): { need: string; source: string } {
  const n = fundingNeed(h, opp);
  const base = n.unit === "months" ? `${n.target} months × ${usd(h.monthlySpendUsd)} = ${usd(n.targetUsd)}` : `${usd(n.targetUsd)} target`;
  const less = n.haveUsd > 0 ? `, less ${usd(n.haveUsd)} already set aside` : "";
  const plus = n.outflowUsd > 0 ? `, plus the ${usd(n.outflowUsd)} ${opp.outflowLabel ?? "outflow"}` : "";
  const need = `${base}${less}${plus}: ${usd(n.needUsd)} needed`;
  const source = opp.inflowUsd
    ? `${usd(n.amountUsd)} from the ${usd(opp.inflowUsd)} of new cash${n.amountUsd < n.needUsd ? `, leaving ${usd(n.needUsd - n.amountUsd)} still to fund` : ""}`
    : `${usd(n.amountUsd)} moved from the core portfolio`;
  return { need, source };
}
