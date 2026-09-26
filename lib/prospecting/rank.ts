// Deterministic prospect ranking (BUILD-SPEC §6). The advisor sends every
// introduction; this module only orders the list and drafts the ask.
import type { Prospect } from "@/lib/types";
import { usd } from "@/lib/format";
import { POLICY } from "@/lib/data/policy";

const WARMTH: Record<Prospect["path"], number> = POLICY.prospecting.warmth;
export const PATH_LABEL: Record<Prospect["path"], string> = {
  existing: "Existing relationship",
  referral: "Referral",
  event: "Met at an event",
  signal: "Signal only, no connection",
};

export function sizeBand(usdValue: number): number {
  return POLICY.prospecting.sizeBands.find((b) => usdValue >= b.minUsd)?.points ?? 0;
}

export function prospectScore(p: Prospect): number {
  return WARMTH[p.path] + p.fit + sizeBand(p.estimatedUsd);
}

export function rankProspects(list: readonly Prospect[], advisorId?: string): Prospect[] {
  return list
    .filter((p) => !advisorId || p.advisorId === advisorId)
    .slice()
    .sort((a, b) => prospectScore(b) - prospectScore(a) || b.estimatedUsd - a.estimatedUsd || a.id.localeCompare(b.id));
}

/** A drafted next step for the advisor to send or say. Never sent by Relay. */
export function introDraft(p: Prospect): string {
  switch (p.path) {
    case "referral":
      return `Draft for you to send: "Thank you for offering to introduce me. Would a short call in the next two weeks suit? I work with clients around ${p.signal.toLowerCase().split(";")[0]}."`;
    case "existing":
      return `Draft for you to send: "It would be good to meet and walk through what the family has in place, with no agenda beyond that."`;
    case "event":
      return `Draft for you to send: "Thank you for coming to the seminar. Happy to look at your options in a 30-minute call."`;
    default:
      return `No warm path yet. Estimated ${usd(p.estimatedUsd)}. Ask your clients and centers of influence for an introduction before any outreach.`;
  }
}
