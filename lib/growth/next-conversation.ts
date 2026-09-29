// The next conversation agent: for each household, the one reason to call
// this week, cited to the record it came from. Ranking orders opportunities;
// this orders people. An advisor who opens it knows who to call first and why,
// and spends the hour with the client rather than working out which client.
//
// Each reason is one of a fixed set, scored so that money elsewhere and a
// material opportunity come before an overdue form, and a household nobody has
// spoken to for a while is never last forever. The opener is a draft the
// advisor says or sends from their own tools; nothing here contacts anyone.
//
// Deterministic. No model client may be imported here.
import type { ClientFile, Meeting } from "@/lib/types";
import { heldAwayFor } from "@/lib/growth/held-away";
import { paperStatus, escalateAfter } from "@/lib/onboarding/status";
import { POLICY } from "@/lib/data/policy";
import { usd } from "@/lib/format";

export type ReasonKind = "held-away" | "opportunity" | "paperwork" | "task" | "quiet";

export interface Conversation {
  clientId: string;
  clientName: string;
  kind: ReasonKind;
  /** One sentence: why this household, this week. */
  reason: string;
  /** Where the reason was read. */
  source: { kind: string; id: string; excerpt: string };
  score: number;
  daysSinceContact: number | null;
  meetingToday?: Meeting;
  /** A draft opener the advisor says or sends. Never sent by Relay. */
  opener: string;
  href: string;
  /** Every other reason the household carries, so the call covers them too. */
  also: string[];
}

const first = (c: ClientFile) => (c.persons.find((p) => p.role !== "beneficiary") ?? c.persons[0])?.name ?? c.name;

/** The best reason to speak to one household, with every other reason listed under it. */
export function conversationFor(c: ClientFile, meetings: Meeting[] = []): Conversation {
  const last = c.contactHistory.length ? Math.max(...c.contactHistory.map((e) => e.day)) : null;
  const days = last === null ? null : -last;
  const name = first(c);
  const options: Omit<Conversation, "clientId" | "clientName" | "daysSinceContact" | "meetingToday" | "also">[] = [];

  const wallet = heldAwayFor(c);
  for (const s of wallet.signals) {
    options.push({ kind: "held-away", score: 80 + (s.amountUsd ? Math.min(15, Math.round(s.amountUsd / 100_000)) : 0) + s.confidence * 5, reason: `${s.label}${s.amountUsd ? `, about ${usd(s.amountUsd)}` : ""}: "${s.source.excerpt}"`, source: { kind: s.source.kind, id: s.source.id, excerpt: s.source.excerpt }, opener: `Draft for you: "Hi ${name}, when we last spoke you mentioned ${s.label.toLowerCase().replace(/^an? /, "")}. I'd like to put it beside what we hold so you can see the whole picture in one place. Would a short call this week suit?"`, href: `/wallet-share#${c.id}` });
  }
  for (const o of c.opportunities) {
    options.push({ kind: "opportunity", score: o.materiality, reason: o.plainTitle ?? o.title, source: { kind: "opportunity", id: o.id, excerpt: o.reasonPath[0]?.label ?? o.title }, opener: `Draft for you: "Hi ${name}, something on your file is worth a conversation: ${(o.plainTitle ?? o.title).replace(/\.$/, "").toLowerCase()}. I have the options ready to walk through."`, href: `/evidence/${o.id}` });
  }
  for (const w of c.paperwork) {
    const st = paperStatus(w, 0, escalateAfter(c.id));
    if (st.status === "signed") continue;
    options.push({ kind: "paperwork", score: st.status === "escalated" ? 70 : 45, reason: `${w.form} unsigned for ${st.daysOpen} days${st.status === "escalated" ? ", escalated to the branch supervisor" : ""}`, source: { kind: "paperwork", id: w.form, excerpt: w.note ?? `Requested day ${w.requestedDay}` }, opener: `Draft for you: "Hi ${name}, the ${w.form.toLowerCase()} is still waiting for your signature. I can walk you through it on a short call."`, href: "/onboarding" });
  }
  for (const t of c.tasks) {
    if (t.dueDay >= 0) continue;
    options.push({ kind: "task", score: 55 + Math.min(10, -t.dueDay), reason: `${t.text} is ${-t.dueDay} days overdue (${t.owner})`, source: { kind: "task", id: t.text, excerpt: t.text }, opener: `Draft for you: "Hi ${name}, a quick update on ${t.text.toLowerCase()}: here is where it stands and what I need from you."`, href: "/follow-ups" });
  }
  if (days === null || days > POLICY.economics.quietAfterDays) {
    options.push({ kind: "quiet", score: 50 + Math.min(20, Math.round((days ?? 120) / 10)), reason: days === null ? "No contact on file" : `No contact for ${days} days`, source: { kind: "contactHistory", id: last === null ? "none" : `day ${last}`, excerpt: c.contactHistory.find((e) => e.day === last)?.summary ?? "No contact recorded" }, opener: `Draft for you: "Hi ${name}, it has been a while since we spoke. Nothing urgent; I'd like to hear how things are and check the plan still fits."`, href: `/household/${c.id}` });
  }
  options.sort((a, b) => b.score - a.score);
  const best = options[0] ?? { kind: "quiet" as const, score: 0, reason: "Nothing on file needs a call this week", source: { kind: "file", id: c.id, excerpt: "" }, opener: "", href: `/household/${c.id}` };
  return { clientId: c.id, clientName: c.name, daysSinceContact: days, meetingToday: meetings.find((m) => m.clientId === c.id), also: options.slice(1).map((o) => o.reason), ...best };
}

/** The book, who to call first: a household already in today's calendar drops below the rest. */
export function conversations(clients: ClientFile[], meetings: Meeting[] = []): Conversation[] {
  return clients.map((c) => conversationFor(c, meetings)).sort((a, b) => Number(Boolean(a.meetingToday)) - Number(Boolean(b.meetingToday)) || b.score - a.score || a.clientName.localeCompare(b.clientName));
}
