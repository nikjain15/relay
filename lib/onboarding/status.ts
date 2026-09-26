// Paperwork status by rule (BUILD-SPEC §6): unsigned documents older than 14
// days escalate to the branch supervisor, per the illustrative procedure.
import type { ClientFile, PaperworkItem } from "@/lib/types";
import { POLICY } from "@/lib/data/policy";

export const ESCALATE_AFTER_DAYS = POLICY.paperwork.escalateAfterDays;
export type PaperStatus = "signed" | "due" | "escalated";

export function paperStatus(w: PaperworkItem, today = 0): { status: PaperStatus; daysOpen: number } {
  if (w.signedDay !== undefined) return { status: "signed", daysOpen: w.signedDay - w.requestedDay };
  const daysOpen = today - w.requestedDay;
  return { status: daysOpen > ESCALATE_AFTER_DAYS ? "escalated" : "due", daysOpen };
}

export function openItems(c: ClientFile) {
  return c.paperwork.map((w) => ({ ...w, ...paperStatus(w) })).filter((w) => w.status !== "signed");
}

/** A reminder the advisor or associate sends. Never sent by Relay. */
export function reminderDraft(c: ClientFile, w: PaperworkItem): string {
  const first = c.persons.find((p) => p.role !== "beneficiary") ?? c.persons[0];
  return `Draft for you to send: "Hi ${first.name}, a quick reminder that the ${w.form.toLowerCase()} is still waiting for your signature. I can walk you through it on a short call."`;
}
