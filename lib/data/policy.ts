// Firm policy and app settings from data/policy.json and data/app.json.
// Engines import this module only, so they never depend on client data.
import policy from "@/data/policy.json";
import app from "@/data/app.json";

export const POLICY = policy as unknown as {
  triage: { dismissReasons: string[] };
  liquidity: { cashProductId: string; sleeveMaxRisk: number; sleeveMaxAccessDays: number; lockupDays: number };
  proposals: { coreProductId: string };
  communications: { disclosureDocId: string };
  retrieval: { corpusDay: number; floor: number; topK: number; citedBoost: number; stalePenalty: number; reviewDueWithinDays: number };
  prospecting: { warmth: Record<"existing" | "referral" | "event" | "signal", number>; sizeBands: { minUsd: number; points: number }[] };
  servicing: {
    rules: { pattern: string; kind: string; route: string; targetHours: number; callbackRequired: boolean }[];
    default: { kind: string; route: string; targetHours: number; callbackRequired: boolean };
  };
};

export const APP = app as unknown as {
  todayLabel: string;
  defaultAdvisorId: string;
  featured: { clientId: string; opportunityId: string; productId: string; reviewClientId: string };
  defaultTalkingPoints: string[];
};
