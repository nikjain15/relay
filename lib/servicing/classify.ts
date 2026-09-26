// Service request triage by rule (BUILD-SPEC §6). First matching rule wins.
// Money movement is flagged for callback verification to a number on file,
// a standard control against email-based wire fraud.
import type { ServiceRequest } from "@/lib/types";

export interface Classification {
  kind: string;
  route: string;
  targetHours: number;
  callbackRequired: boolean;
}

const RULES: { match: RegExp; c: Classification }[] = [
  { match: /\bwire\b|\$[\d.,]+[mk]?\b.*\b(to|transfer)\b/i, c: { kind: "Money movement", route: "Advisor, then operations", targetHours: 4, callbackRequired: true } },
  { match: /beneficiar/i, c: { kind: "Beneficiary change", route: "Client service associate", targetHours: 48, callbackRequired: false } },
  { match: /withdrawal|distribution/i, c: { kind: "Distribution set-up", route: "Client service associate", targetHours: 48, callbackRequired: false } },
  { match: /pension|transfer value|move .* here/i, c: { kind: "Transfer in", route: "Advisor and wealth strategist", targetHours: 72, callbackRequired: false } },
  { match: /tax document|statement/i, c: { kind: "Documents", route: "Client service associate", targetHours: 24, callbackRequired: false } },
  { match: /address|phone number|email address/i, c: { kind: "Account details", route: "Service team", targetHours: 24, callbackRequired: false } },
];
const QUESTION: Classification = { kind: "Question", route: "Advisor", targetHours: 24, callbackRequired: false };

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
