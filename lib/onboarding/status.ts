// Paperwork status by rule (BUILD-SPEC §6): unsigned documents escalate to the
// branch supervisor after the resolved rule for that client (firm 14 days; a
// segment or client may only make it shorter, per the illustrative procedure).
import type { ClientFile, PaperworkItem } from "@/lib/types";
import { FIRM, resolveProfile } from "@/lib/profile";

export const ESCALATE_AFTER_DAYS = FIRM.values["paperwork.escalateAfterDays"] as number;
export const escalateAfter = (clientId: string) => resolveProfile({ clientId }).values["paperwork.escalateAfterDays"];
export type PaperStatus = "signed" | "due" | "escalated";

export function paperStatus(w: PaperworkItem, today = 0, after = ESCALATE_AFTER_DAYS): { status: PaperStatus; daysOpen: number } {
  if (w.signedDay !== undefined) return { status: "signed", daysOpen: w.signedDay - w.requestedDay };
  const daysOpen = today - w.requestedDay;
  return { status: daysOpen > after ? "escalated" : "due", daysOpen };
}

export function openItems(c: ClientFile) {
  return c.paperwork.map((w) => ({ ...w, ...paperStatus(w, 0, escalateAfter(c.id)) })).filter((w) => w.status !== "signed");
}

/** A reminder the advisor or associate sends. Never sent by Relay. */
export function reminderDraft(c: ClientFile, w: PaperworkItem): string {
  const first = c.persons.find((p) => p.role !== "beneficiary") ?? c.persons[0];
  return `Draft for you to send: "Hi ${first.name}, a quick reminder that the ${w.form.toLowerCase()} is still waiting for your signature. I can walk you through it on a short call."`;
}
