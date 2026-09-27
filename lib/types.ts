// Types from docs/BUILD-SPEC.md §3. The reason path is a typed array, not a
// sentence, so what the advisor sees is the object the system decided with.

export type Tier = "$50M+" | "$5M+" | "$500K to $5M" | "Wealth Advice Center";
export type Strategy = "Liquidity" | "Longevity" | "Legacy";

export interface Person {
  id: string;
  name: string;
  role: "primary" | "spouse" | "trustee" | "beneficiary";
  age?: number;
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
  /** A known cash outflow the goal must also cover, if any, and what it is ("capital call"). */
  outflowUsd?: number;
  outflowLabel?: string;
  /** Plain-English title for the advisor's list. */
  plainTitle?: string;
  /** Opening line for a client note about this opportunity. */
  clientNote?: string;
  /** True when the cited document is deliberately absent, to exercise refusal. */
  evidenceExpectedMissing?: boolean;
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
  /** Plain-English name used in client-facing text. */
  plainName?: string;
  plainDescription?: string;
  /** Mid-sentence form, with its article: "a government money market fund". */
  plainPhrase?: string;
}

export interface Passage {
  docId: string;
  title: string;
  day: number;
  text: string;
  /** Passage id inside its document, so a citation resolves to a passage and not just a title. */
  passageId?: string;
}

/** A structured assertion a passage makes, so two documents that disagree can be shown as disagreeing. */
export interface Claim {
  topic: string;
  value: string;
}

export interface DocPassage {
  id: string;
  text: string;
  claims?: Claim[];
}

export type DocStatus = "current" | "superseded" | "withdrawn";

export interface Doc {
  id: string;
  title: string;
  kind: "research note" | "product one-pager" | "term sheet" | "model fact sheet" | "procedure extract" | "disclosure";
  /** Who wrote it. Illustrative desks, never a real firm's research office. */
  desk: string;
  /** Publication day on the corpus clock (policy.json retrieval.corpusDay is today). Relative, never a calendar date. */
  day: number;
  /** How often the desk re-reviews it. Past this it is stale and retrieval says so. */
  reviewEveryDays: number;
  status: DocStatus;
  supersedes?: string;
  supersededBy?: string;
  passages: DocPassage[];
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
  /** The resolved settings version in force (resolveProfile().version), so the decision can be reproduced. */
  settingsVersion?: string;
}

export interface Task {
  text: string;
  owner: string;
  /** Relative to day 0: negative is overdue, 0 is due today. */
  dueDay: number;
}

export interface Meeting {
  time: string;
  title: string;
  kind: "call" | "review" | "prospect" | "internal" | "queue";
  clientId?: string;
  prospectId?: string;
  purpose: string;
}

export interface ContactEvent {
  /** Relative to the prototype's day 0; negative is in the past. */
  day: number;
  channel: string;
  summary: string;
}

export interface TeamNote {
  from: string;
  day: number;
  text: string;
}

export interface Walkthrough {
  order: number;
  tab: string;
  tabSub: string;
  shows: string;
  opportunityId: string;
  chooseProductId: string;
  summary: string;
  chain: string[];
  leftover: string;
  talkingPoints: string[];
  audience: { one: [string, number]; many: [string, number] };
  audienceNote: string;
  queue: string;
  afterApproval: string[];
}

export interface PaperworkItem {
  form: string;
  requestedDay: number;
  signedDay?: number;
  note?: string;
}

export interface Prospect {
  id: string;
  advisorId: string;
  label: string;
  path: "existing" | "referral" | "event" | "signal";
  pathDetail: string;
  signal: string;
  estimatedUsd: number;
  /** Fit to the advisor's practice, 0 to 2. */
  fit: number;
  lastTouchDays: number | null;
  groundedIn: Source[];
}

export interface ServiceRequest {
  id: string;
  clientId: string;
  receivedHoursAgo: number;
  channel: string;
  text: string;
}

/** What the firm's systems say about an account: read from CRM and custodian, never from the client's own words. */
export interface SupervisoryInputs {
  trustedContactOnFile: boolean;
  complaintLogged: boolean;
  unusualDisbursement: boolean;
  newThirdPartyContact: boolean;
  note?: string;
}

/** A message a connector captured, in either direction. The advisor and client are the file it sits in. */
export interface ClientMessage {
  id: string;
  connectorId: string;
  channel: string;
  direction: "inbound" | "outbound";
  day: number;
  text: string;
}

/** One client's complete record, as stored in data/clients/<id>.json. Everything about the client is in this one file. */
export interface ClientFile extends Household {
  advisorId: string;
  contactHistory: ContactEvent[];
  notes: TeamNote[];
  tasks: Task[];
  /** Client-layer settings (data/profiles/schema.json). */
  preferences?: { version: number; values: Record<string, unknown> };
  paperwork: PaperworkItem[];
  supervisory: SupervisoryInputs;
  /** The custodian's prior valuations of the largest single name. Day 0 is never stored; it is the holdings. */
  valuationHistory?: { concentrationPct: { day: number; pct: number }[] };
  messages: ClientMessage[];
  opportunities: Opportunity[];
  walkthrough?: Walkthrough;
}
