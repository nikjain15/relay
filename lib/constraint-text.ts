import type { Constraint } from "@/lib/types";

export function constraintText(c: Constraint): string {
  switch (c.kind) {
    case "maxSingleName":
      return `Single-name exposure at most ${c.pct}%`;
    case "minLiquidityMonths":
      return `Liquidity at least ${c.months} months before any lockup`;
    case "maxRiskLevel":
      return `Product risk level at most ${c.level} of 5`;
    case "noShortTermGains":
      return "No realised short-term gains";
    case "excludedProductTypes":
      return `Excluded: ${c.types.map((t) => t.replace(/_/g, " ")).join(", ")}`;
  }
}
