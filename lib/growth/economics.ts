// The book economics agent: where the advisor's hours go against where the
// revenue comes from. For the advisor only, never client-facing.
//
// Revenue is an estimate from an illustrative fee schedule by tier
// (data/policy.json economics); time is an estimate from the records the file
// holds: contacts in the window, service requests, open tasks and today's
// meetings, each at a fixed number of hours. A firm replaces both with its own
// schedule and time records; the screen says which was used. The agent flags
// two things: a household that pays for attention it is not getting, and one
// that takes hours out of proportion to what it pays. It never recommends
// dropping a client; it shows the arithmetic and a person decides.
//
// Deterministic. No model client may be imported here.
import type { ClientFile, Meeting, ServiceRequest } from "@/lib/types";
import { POLICY } from "@/lib/data/policy";

export interface HouseholdEconomics {
  clientId: string;
  clientName: string;
  tier: ClientFile["tier"];
  totalUsd: number;
  feeBps: number;
  /** Estimated annual revenue at the schedule's rate for the tier. */
  revenueUsd: number;
  /** Estimated hours in the window: contacts, meetings, requests, open tasks. */
  hours: number;
  contacts: number;
  requests: number;
  openTasks: number;
  meetingsToday: number;
  daysSinceContact: number | null;
  revenuePerHour: number | null;
  /** Pays above the book's median and has not been spoken to inside the quiet window. */
  underServed: boolean;
  /** Takes more than one and a half times the median hours for less than the median revenue. */
  timeHeavy: boolean;
}

const median = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s.length ? s[Math.floor((s.length - 1) / 2)] : 0; };

export function bookEconomics(clients: ClientFile[], requests: ServiceRequest[] = [], meetings: Meeting[] = []): HouseholdEconomics[] {
  const E = POLICY.economics;
  const rows = clients.map((c) => {
    const contacts = c.contactHistory.filter((e) => e.day >= -E.windowDays).length;
    const reqs = requests.filter((r) => r.clientId === c.id).length;
    const openTasks = c.tasks.length;
    const mt = meetings.filter((m) => m.clientId === c.id).length;
    const hours = Math.round((contacts * E.hoursPerContact + mt * E.hoursPerMeeting + reqs * E.hoursPerServiceRequest + openTasks * E.hoursPerOpenTask) * 10) / 10;
    const feeBps = E.feeBpsByTier[c.tier] ?? 0;
    const revenueUsd = Math.round((c.totalUsd * feeBps) / 10_000);
    const last = c.contactHistory.length ? Math.max(...c.contactHistory.map((e) => e.day)) : null;
    return { clientId: c.id, clientName: c.name, tier: c.tier, totalUsd: c.totalUsd, feeBps, revenueUsd, hours, contacts, requests: reqs, openTasks, meetingsToday: mt, daysSinceContact: last === null ? null : -last, revenuePerHour: hours ? Math.round(revenueUsd / hours) : null, underServed: false, timeHeavy: false };
  });
  const medRevenue = median(rows.map((r) => r.revenueUsd));
  const medHours = median(rows.map((r) => r.hours));
  for (const r of rows) {
    r.underServed = r.revenueUsd > medRevenue && (r.daysSinceContact === null || r.daysSinceContact > E.quietAfterDays);
    r.timeHeavy = r.hours > medHours * 1.5 && r.revenueUsd < medRevenue;
  }
  return rows.sort((a, b) => b.revenueUsd - a.revenueUsd || a.clientName.localeCompare(b.clientName));
}

export function economicsTotals(rows: HouseholdEconomics[]) {
  const revenue = rows.reduce((s, r) => s + r.revenueUsd, 0);
  const hours = Math.round(rows.reduce((s, r) => s + r.hours, 0) * 10) / 10;
  return { revenueUsd: revenue, hours, revenuePerHour: hours ? Math.round(revenue / hours) : null, underServed: rows.filter((r) => r.underServed), timeHeavy: rows.filter((r) => r.timeHeavy), windowDays: POLICY.economics.windowDays };
}
