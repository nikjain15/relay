// Service request triage by rule (BUILD-SPEC §6). First matching rule wins.
// Money movement is flagged for callback verification to a number on file,
// a standard control against email-based wire fraud.
import type { ServiceRequest } from "@/lib/types";
import { POLICY } from "@/lib/data/policy";

export interface Classification {
  kind: string;
  route: string;
  targetHours: number;
  callbackRequired: boolean;
}

// Rules live in data/policy.json so routing and response times can change
// without code. Patterns are case-insensitive.
const RULES = POLICY.servicing.rules.map((r) => ({ match: new RegExp(r.pattern, "i"), c: { kind: r.kind, route: r.route, targetHours: r.targetHours, callbackRequired: r.callbackRequired } }));
const QUESTION: Classification = POLICY.servicing.default;

export function classify(r: ServiceRequest): Classification {
  return RULES.find((x) => x.match.test(r.text))?.c ?? QUESTION;
}

export function triage(list: readonly ServiceRequest[]) {
  return list
    .map((r) => {
      const c = classify(r);
      const overdue = r.receivedHoursAgo > c.targetHours;
      return { ...r, ...c, overdue, hoursLeft: c.targetHours - r.receivedHoursAgo };
    })
    .sort((a, b) => Number(b.callbackRequired) - Number(a.callbackRequired) || a.hoursLeft - b.hoursLeft);
}
