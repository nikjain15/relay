// Types from docs/BUILD-SPEC.md §3. The reason path is a typed array, not a
// sentence, so what the advisor sees is the object the system decided with.

export type Tier = "$50M+" | "$5M+" | "$500K to $5M" | "Wealth Advice Center";
export type Strategy = "Liquidity" | "Longevity" | "Legacy";

export interface Person {
  id: string;
  name: string;
  role: "primary" | "spouse" | "trustee" | "beneficiary";
}

export interface Goal {
  strategy: Strategy;
  funded: number;
  target: number;
  unit: "months" | "USD";
  assumption: string;
}

export interface Holding {
  name: string;
  productId?: string;
  valueUsd: number;
  singleName: boolean;
  /** Value of lots held one year or less; selling them realises short-term gains. */
  shortTermLotsUsd?: number;
  /** Cash reserved for a named purpose does not count toward Liquidity. */
  earmarked?: string;
}

export type Constraint =
  | { kind: "maxSingleName"; pct: number }
  | { kind: "minLiquidityMonths"; months: number }
  | { kind: "maxRiskLevel"; level: number }
  | { kind: "noShortTermGains" }
  | { kind: "excludedProductTypes"; types: ProductType[] };

export interface Source {
  label: string;
  url: string;
}

export interface Household {
  id: string;
  name: string;
  archetype: string;
  tier: Tier;
  totalUsd: number;
  persons: Person[];
  goals: Goal[];
  holdings: Holding[];
  constraints: Constraint[];
  monthlySpendUsd: number;
  hardPart: string;
  /** Composite persona: where each part of the situation comes from (docs/PERSONAS.md). */
  groundedIn: Source[];
}

export type TriggerClass =
  | "life_event"
  | "external_event"
  | "household_threshold"
  | "plan_service_event"
  | "market_view";

export type NodeKind =
  | "ExternalEvent"
  | "LifeEvent"
  | "Threshold"
  | "ServiceEvent"
  | "Publication"
  | "Theme"
  | "Household"
  | "Goal"
  | "Holding"
  | "Constraint";

export interface ReasonNode {
  kind: NodeKind;
  label: string;
}

export type ActionKind = "trim" | "fund" | "rebalance" | "review";

export interface Opportunity {
  id: string;
  householdId: string;
  triggerClass: TriggerClass;
  title: string;
  materiality: number;
  observedDay: number;
  reasonPath: ReasonNode[];
  evidenceDocIds: string[];
  action: ActionKind;
  strategy: Strategy;
  /** New cash arriving with the event, if any. */
  inflowUsd?: number;
}

export type ProductType =
  | "treasury_ladder"
  | "money_market"
  | "exchange_fund"
  | "structured_note"
  | "diversified_model"
  | "private_credit"
  | "municipal_ladder"
  | "sector_etf";

export interface Product {
  id: string;
  name: string;
  type: ProductType;
  riskLevel: 1 | 2 | 3 | 4 | 5;
  liquidityDays: number;
  costBps: number;
  description: string;
}

export interface Passage {
  docId: string;
  title: string;
  day: number;
  text: string;
}

export interface Doc {
  id: string;
  title: string;
  kind: "research note" | "product one-pager" | "term sheet" | "model fact sheet" | "procedure extract" | "disclosure";
  day: number;
  passages: string[];
}

export interface BookRecord {
  id: string;
  name: string;
  persons: number;
}

export type FundingSource = "new_cash" | "rebalance_from_core" | "sell_long_term_lots" | "sell_all_lots" | "contribute_in_kind";

export interface Candidate {
  id: string;
  productId: string;
  action: ActionKind;
  source: FundingSource;
  amountUsd: number;
}

export interface Failure {
  rule: string;
  detail: string;
}

export interface Evaluation {
  candidate: Candidate;
  pass: boolean;
  failures: Failure[];
  annualCostUsd: number;
}

export interface RationaleRecord {
  opportunityId: string;
  householdId: string;
  basis: string[];
  selected: { productId: string; source: FundingSource; amountUsd: number };
  alternatives: { productId: string; source: FundingSource; outcome: string }[];
  costsCompared: { productId: string; costBps: number; annualCostUsd: number }[];
  whySuitable: string[];
}
