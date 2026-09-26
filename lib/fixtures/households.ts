import type { Household } from "@/lib/types";

// The seven archetypes of PRD Appendix A. Synthetic; surnames invented.
export const HOUSEHOLDS: Household[] = [
  {
    id: "hh-renner",
    name: "Renner",
    archetype: "Pre-liquidity founder",
    tier: "$50M+",
    totalUsd: 62_400_000,
    persons: [
      { id: "p-renner-1", name: "M. Renner", role: "primary" },
      { id: "p-renner-2", name: "J. Renner", role: "spouse" },
    ],
    monthlySpendUsd: 85_000,
    goals: [
      { strategy: "Liquidity", funded: 0, target: 36, unit: "months", assumption: "36 months of spending at $85K a month" },
      { strategy: "Longevity", funded: 18_000_000, target: 22_000_000, unit: "USD", assumption: "Core portfolio sized to fund spending from age 60" },
      { strategy: "Legacy", funded: 0, target: 10_000_000, unit: "USD", assumption: "Stated intent: education trust for three grandchildren" },
    ],
    holdings: [
      { name: "Founder single-name position", valueUsd: 44_304_000, singleName: true, shortTermLotsUsd: 6_000_000 },
      { name: "Diversified core model", productId: "prod-core-model", valueUsd: 18_000_000, singleName: false },
      { name: "Cash", productId: "prod-mmf", valueUsd: 96_000, singleName: false, earmarked: "Estimated tax on 10b5-1 sales" },
    ],
    constraints: [
      { kind: "maxSingleName", pct: 25 },
      { kind: "minLiquidityMonths", months: 24 },
      { kind: "maxRiskLevel", level: 4 },
      { kind: "noShortTermGains" },
      { kind: "excludedProductTypes", types: ["private_credit"] },
    ],
    hardPart: "Single position at 71% of investable assets, 10b5-1 plan running, Legacy unfunded",
  },
  {
    id: "hh-alcott",
    name: "Alcott",
    archetype: "Retired couple in drawdown",
    tier: "$5M+",
    totalUsd: 8_400_000,
    persons: [
      { id: "p-alcott-1", name: "R. Alcott", role: "primary" },
      { id: "p-alcott-2", name: "S. Alcott", role: "spouse" },
    ],
    monthlySpendUsd: 22_000,
    goals: [
      { strategy: "Liquidity", funded: 11, target: 36, unit: "months", assumption: "36 months of spending at $22K a month" },
      { strategy: "Longevity", funded: 7_200_000, target: 7_000_000, unit: "USD", assumption: "Funds spending to age 95" },
      { strategy: "Legacy", funded: 900_000, target: 1_000_000, unit: "USD", assumption: "Bequest to two children" },
    ],
    holdings: [
      { name: "Diversified core model", productId: "prod-core-model", valueUsd: 7_958_000, singleName: false },
      { name: "Cash", productId: "prod-mmf", valueUsd: 242_000, singleName: false },
      { name: "Maturing municipal bond", valueUsd: 200_000, singleName: false },
    ],
    constraints: [
      { kind: "maxSingleName", pct: 10 },
      { kind: "minLiquidityMonths", months: 24 },
      { kind: "maxRiskLevel", level: 3 },
      { kind: "excludedProductTypes", types: ["private_credit", "structured_note"] },
    ],
    hardPart: "Liquidity funded 11 of 36 target months, sequence-of-returns exposure, RMDs beginning",
  },
  {
    id: "hh-brandvold",
    name: "Brandvold",
    archetype: "Cross-border executive",
    tier: "$5M+",
    totalUsd: 14_200_000,
    persons: [{ id: "p-brandvold-1", name: "E. Brandvold", role: "primary" }],
    monthlySpendUsd: 40_000,
    goals: [
      { strategy: "Liquidity", funded: 18, target: 24, unit: "months", assumption: "24 months, higher because of relocation risk" },
      { strategy: "Longevity", funded: 9_000_000, target: 12_000_000, unit: "USD", assumption: "Retirement in the UK or US, undecided" },
      { strategy: "Legacy", funded: 0, target: 0, unit: "USD", assumption: "No stated legacy goal" },
    ],
    holdings: [
      { name: "Diversified core model", productId: "prod-core-model", valueUsd: 11_400_000, singleName: false },
      { name: "Legacy non-US funds (PFIC exposure)", valueUsd: 2_080_000, singleName: false },
      { name: "Cash", productId: "prod-mmf", valueUsd: 720_000, singleName: false },
    ],
    constraints: [
      { kind: "maxSingleName", pct: 10 },
      { kind: "minLiquidityMonths", months: 12 },
      { kind: "maxRiskLevel", level: 4 },
      { kind: "excludedProductTypes", types: ["exchange_fund"] },
    ],
    hardPart: "US and UK tax, unvested deferred compensation, PFIC exposure in legacy holdings",
  },
  {
    id: "hh-okafor-lind",
    name: "Okafor-Lind",
    archetype: "Multigenerational family trust",
    tier: "$5M+",
    totalUsd: 31_600_000,
    persons: [
      { id: "p-ol-1", name: "A. Okafor-Lind", role: "trustee" },
      { id: "p-ol-2", name: "T. Okafor-Lind", role: "beneficiary" },
      { id: "p-ol-3", name: "N. Okafor-Lind", role: "beneficiary" },
    ],
    monthlySpendUsd: 30_000,
    goals: [
      { strategy: "Liquidity", funded: 60, target: 24, unit: "months", assumption: "24 months of trust distributions" },
      { strategy: "Longevity", funded: 12_000_000, target: 10_000_000, unit: "USD", assumption: "Grantor, age 79" },
      { strategy: "Legacy", funded: 18_000_000, target: 20_000_000, unit: "USD", assumption: "Next generation, currently unengaged" },
    ],
    holdings: [
      { name: "Diversified core model", productId: "prod-core-model", valueUsd: 29_800_000, singleName: false },
      { name: "Cash", productId: "prod-mmf", valueUsd: 1_800_000, singleName: false },
    ],
    constraints: [
      { kind: "maxSingleName", pct: 10 },
      { kind: "minLiquidityMonths", months: 12 },
      { kind: "maxRiskLevel", level: 3 },
    ],
    hardPart: "Grantor is 79, next generation unengaged. The asset-retention archetype",
  },
  {
    id: "hh-vasquez-hale",
    name: "Vasquez-Hale",
    archetype: "Core affluent accumulator",
    tier: "$500K to $5M",
    totalUsd: 1_200_000,
    persons: [{ id: "p-vh-1", name: "D. Vasquez-Hale", role: "primary" }],
    monthlySpendUsd: 9_000,
    goals: [
      { strategy: "Liquidity", funded: 8, target: 12, unit: "months", assumption: "12 months of spending" },
      { strategy: "Longevity", funded: 1_050_000, target: 3_000_000, unit: "USD", assumption: "Retirement at 62" },
      { strategy: "Legacy", funded: 0, target: 0, unit: "USD", assumption: "No stated legacy goal" },
    ],
    holdings: [
      { name: "Diversified core model", productId: "prod-core-model", valueUsd: 1_128_000, singleName: false },
      { name: "Cash", productId: "prod-mmf", valueUsd: 72_000, singleName: false },
    ],
    constraints: [
      { kind: "maxSingleName", pct: 10 },
      { kind: "minLiquidityMonths", months: 6 },
      { kind: "maxRiskLevel", level: 4 },
    ],
    hardPart: "Pending 401(k) rollover, first advisory relationship",
  },
  {
    id: "hh-thornbury",
    name: "Thornbury",
    archetype: "Business owner",
    tier: "$5M+",
    totalUsd: 23_100_000,
    persons: [
      { id: "p-thornbury-1", name: "K. Thornbury", role: "primary" },
      { id: "p-thornbury-2", name: "L. Thornbury", role: "spouse" },
    ],
    monthlySpendUsd: 50_000,
    goals: [
      { strategy: "Liquidity", funded: 6, target: 24, unit: "months", assumption: "Near-term capital call on the operating business" },
      { strategy: "Longevity", funded: 5_000_000, target: 9_000_000, unit: "USD", assumption: "Sale of the business in 5 to 7 years" },
      { strategy: "Legacy", funded: 0, target: 4_000_000, unit: "USD", assumption: "Succession to two children" },
    ],
    holdings: [
      { name: "Operating business stake (illiquid)", valueUsd: 17_800_000, singleName: true },
      { name: "Diversified core model", productId: "prod-core-model", valueUsd: 5_000_000, singleName: false },
      { name: "Cash", productId: "prod-mmf", valueUsd: 300_000, singleName: false },
    ],
    constraints: [
      { kind: "maxSingleName", pct: 80 },
      { kind: "minLiquidityMonths", months: 12 },
      { kind: "maxRiskLevel", level: 4 },
    ],
    hardPart: "Illiquid operating stake, near-term liquidity need against marketable assets",
  },
  {
    id: "hh-pell",
    name: "Pell",
    archetype: "Mass-affluent, Wealth Advice Center",
    tier: "Wealth Advice Center",
    totalUsd: 180_000,
    persons: [{ id: "p-pell-1", name: "C. Pell", role: "primary" }],
    monthlySpendUsd: 5_000,
    goals: [
      { strategy: "Liquidity", funded: 4, target: 6, unit: "months", assumption: "6 months of spending" },
      { strategy: "Longevity", funded: 150_000, target: 900_000, unit: "USD", assumption: "Retirement at 67" },
      { strategy: "Legacy", funded: 0, target: 0, unit: "USD", assumption: "No stated legacy goal" },
    ],
    holdings: [
      { name: "Diversified core model", productId: "prod-core-model", valueUsd: 160_000, singleName: false },
      { name: "Cash", productId: "prod-mmf", valueUsd: 20_000, singleName: false },
    ],
    constraints: [
      { kind: "maxSingleName", pct: 10 },
      { kind: "minLiquidityMonths", months: 3 },
      { kind: "maxRiskLevel", level: 3 },
    ],
    hardPart: "Pooled coverage, contact-rate constrained, the calibrated-supervision test case",
  },
];

export function household(id: string): Household | undefined {
  return HOUSEHOLDS.find((h) => h.id === id);
}
