import type { Constraint, ProductType } from "@/lib/types";

const PLURAL: Record<ProductType, string> = {
  treasury_ladder: "Treasury ladders",
  money_market: "money market funds",
  exchange_fund: "exchange funds",
  structured_note: "structured notes",
  diversified_model: "model portfolios",
  private_credit: "private credit",
  municipal_ladder: "municipal ladders",
  sector_etf: "single-sector funds",
};

// Plain-English wording for a family's rules, used on screen and in the
// rationale record.
export function constraintText(c: Constraint): string {
  switch (c.kind) {
    case "maxSingleName":
      return `At most ${c.pct}% in any one stock`;
    case "minLiquidityMonths":
      return `Keep ${c.months} months of cash before locking money up`;
    case "maxRiskLevel":
      return `Risk level at most ${c.level} of 5`;
    case "noShortTermGains":
      return "No short-term gains";
    case "excludedProductTypes":
      return `No ${c.types.map((t) => PLURAL[t]).join(" or ")}`;
  }
}
