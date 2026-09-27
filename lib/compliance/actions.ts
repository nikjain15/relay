// Prepared actions: everything an agent can do about a finding short of the
// human gate, done before anyone opens the queue.
//
// A finding that only says "look at this" leaves the work to the person. So
// each rule carries, as data, the actions its finding calls for: a hold on a
// release, a callback on the number on file, a form to request, a task with an
// owner and a date, a note to a client or a principal, a source to connect. The
// agent renders them from the facts the rule read and hands them over
// prepared. The person accepts or declines each one. Nothing here is sent,
// scheduled or written to a system of record: an accepted note is a draft the
// advisor sends; an accepted task lands on the follow-up list for the session.
//
// Adding an action to a rule is editing rules.json. Adding a kind of action is
// one entry in KIND below and one renderer on the screen.
//
// Deterministic. No model client may be imported here.
import type { Case } from "@/lib/compliance/agents";
import type { FactBag } from "@/lib/compliance/types";
import type { EffectiveRule } from "@/lib/compliance/policy";
import { render } from "@/lib/compliance/dsl";

export type ActionKind = "hold" | "callback" | "request_form" | "task" | "draft_note" | "schedule" | "connect_source";

/** As written in rules.json. Fields are templates; {fact} placeholders are filled from the case's evidence. */
export type ActionTemplate =
  | { kind: "hold"; what: string }
  | { kind: "callback"; text: string }
  | { kind: "request_form"; form: string; text: string }
  | { kind: "task"; text: string; owner: string; dueInDays: number }
  | { kind: "draft_note"; to: "client" | "advisor" | "principal"; subject: string; body: string }
  | { kind: "schedule"; title: string; withinDays: number }
  | { kind: "connect_source"; channels: string; text: string };

export interface PreparedAction {
  id: string;
  caseId: string;
  ruleId: string;
  agentName: string;
  subjectLabel: string;
  kind: ActionKind;
  /** One line a person can accept on. */
  title: string;
  /** The full prepared content: a note body, a task's owner and date, a hold's scope. */
  detail: string;
  /** Who acts once it is accepted. Never Relay. */
  actor: string;
  /** Set for a task or a schedule: days from today. */
  dueInDays?: number;
  /** Set for a note: who it is addressed to. */
  to?: "client" | "advisor" | "principal";
  /** Set for a form request. */
  form?: string;
}

export const KIND: Record<ActionKind, { label: string; actor: string }> = {
  hold: { label: "Hold", actor: "Principal" },
  callback: { label: "Callback", actor: "Advisor" },
  request_form: { label: "Request a form", actor: "Client service associate" },
  task: { label: "Task", actor: "As assigned" },
  draft_note: { label: "Drafted note", actor: "Advisor sends" },
  schedule: { label: "Schedule", actor: "Advisor" },
  connect_source: { label: "Connect a source", actor: "Compliance" },
};

const fill = (t: string, facts: FactBag) => render(t, facts).replace(/\{\w+\}/g, "(not on file)");

/** The actions a rule prepares for one case, rendered from exactly the facts the rule read. */
export function prepareActions(c: Case, rule: EffectiveRule | undefined): PreparedAction[] {
  if (!rule || c.reason !== "fired") return [];
  const templates = (rule.actions ?? []) as ActionTemplate[];
  return templates.map((t, i) => {
    const base = { id: `${c.id}:${i}`, caseId: c.id, ruleId: c.ruleId, agentName: c.agentName, subjectLabel: c.subjectLabel, kind: t.kind, actor: KIND[t.kind].actor };
    switch (t.kind) {
      case "hold": return { ...base, title: "Hold pending disposition", detail: fill(t.what, c.evidence) };
      case "callback": return { ...base, title: "Callback on the number on file", detail: fill(t.text, c.evidence) };
      case "request_form": return { ...base, title: `Request: ${t.form}`, detail: fill(t.text, c.evidence), form: t.form };
      case "task": return { ...base, title: fill(t.text, c.evidence), detail: `Owner: ${t.owner}. Due in ${t.dueInDays} day${t.dueInDays === 1 ? "" : "s"}.`, actor: t.owner, dueInDays: t.dueInDays };
      case "draft_note": return { ...base, title: `Draft to ${t.to}: ${fill(t.subject, c.evidence)}`, detail: fill(t.body, c.evidence), to: t.to };
      case "schedule": return { ...base, title: fill(t.title, c.evidence), detail: `Within ${t.withinDays} days. Relay proposes the slot; the advisor books it.`, dueInDays: t.withinDays };
      case "connect_source": return { ...base, title: `Connect a source for ${fill(t.channels, c.evidence)}`, detail: fill(t.text, c.evidence) };
    }
  });
}

/** Every prepared action for a queue, in queue order. */
export function prepareAll(cases: Case[], rules: EffectiveRule[]): PreparedAction[] {
  const byId = new Map(rules.map((r) => [r.id, r]));
  return cases.flatMap((c) => prepareActions(c, byId.get(c.ruleId)));
}
