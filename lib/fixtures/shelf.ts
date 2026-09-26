import type { Product } from "@/lib/types";

// The approved shelf. Relay selects from this and never free-generates a product.
export const SHELF: Product[] = [
  { id: "prod-tsy-ladder", name: "Treasury ladder, 0 to 3 years", type: "treasury_ladder", riskLevel: 1, liquidityDays: 2, costBps: 10, description: "Laddered US Treasuries matched to 36 months of spending" },
  { id: "prod-mmf", name: "Government money market fund", type: "money_market", riskLevel: 1, liquidityDays: 1, costBps: 15, description: "Same-day liquidity for near-term spending" },
  { id: "prod-exchange-fund", name: "Exchange fund (7-year lockup)", type: "exchange_fund", riskLevel: 3, liquidityDays: 2555, costBps: 90, description: "Contributes concentrated stock for a diversified unit interest without a sale" },
  { id: "prod-core-model", name: "Diversified core model", type: "diversified_model", riskLevel: 3, liquidityDays: 3, costBps: 45, description: "The firm's core multi-asset model portfolio" },
  { id: "prod-structured-note", name: "Buffered structured note, 5-year", type: "structured_note", riskLevel: 4, liquidityDays: 1825, costBps: 150, description: "Downside buffer on an index, capped upside, issuer credit risk" },
  { id: "prod-private-credit", name: "Private credit feeder", type: "private_credit", riskLevel: 5, liquidityDays: 1095, costBps: 175, description: "Quarterly liquidity with gates" },
  { id: "prod-muni-ladder", name: "Municipal ladder, 1 to 7 years", type: "municipal_ladder", riskLevel: 2, liquidityDays: 3, costBps: 25, description: "Tax-exempt income for high-bracket households" },
  { id: "prod-sector-etf", name: "Single-sector ETF", type: "sector_etf", riskLevel: 5, liquidityDays: 1, costBps: 40, description: "Concentrated exposure to one sector" },
];

export function product(id: string): Product | undefined {
  return SHELF.find((p) => p.id === id);
}
