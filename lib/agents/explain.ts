// What an agent does, in words an advisor reads once: its role, what it
// reads, what it checks, what it prepares, when it runs, and what it never
// does. Built from the agent's own definition and the rules it runs, so the
// explanation cannot drift from the behaviour: add a rule to a desk and its
// "checks" line gains a line.
//
// Deterministic. No model client may be imported here.
import type { AgentDefinition } from "@/lib/compliance/agents";
import type { EffectiveRule } from "@/lib/compliance/policy";
import type { ActionTemplate } from "@/lib/compliance/actions";
import type { RosterAgent } from "@/lib/agents/roster";
import type { RuleDefinition } from "@/lib/compliance/types";

export interface AgentExplanation {
  role: string;
  reads: string;
  checks: string[];
  prepares: string[];
  runs: string;
  never: string;
  /** How it decides. */
  method: string;
  /** What it is built on: each rule's primary text, with where that rule stands in law. */
  grounded: { label: string; url: string; status?: string; pending?: string }[];
  /** Said when there is nothing to cite, so an empty list never reads as an omission. */
  groundedNote?: string;
}

const READS: Record<AgentDefinition["scope"], string> = {
  communication: "Every captured email and message, and every note before it goes to a client",
  account: "Every household's accounts, positions and file",
  proposal: "Every proposal before it reaches a client",
  coverage: "Which channels you use and which of them are captured",
};

export const CADENCE_WORDS: Record<AgentDefinition["cadence"], string> = {
  on_draft: "On every draft and captured message",
  on_proposal: "On every proposal",
  daily: "Every morning",
  weekly: "Once a week",
};

const PREPARES: Record<ActionTemplate["kind"], string> = {
  hold: "a hold until a principal decides",
  callback: "a callback on a number on file",
  request_form: "a form request",
  task: "a task with an owner",
  draft_note: "a drafted note, which a person sends",
  schedule: "a meeting to schedule",
  connect_source: "a source to connect",
};

/** A compliance desk, or an advisor's own agent. */
export function explainAgent(a: AgentDefinition, rules: EffectiveRule[]): AgentExplanation {
  const mine = rules.filter((r) => a.ruleIds.includes(r.id) && r.enabled);
  const kinds = [...new Set(mine.flatMap((r) => ((r.actions ?? []) as ActionTemplate[]).map((t) => t.kind)))];
  return {
    role: a.mission,
    reads: READS[a.scope],
    checks: mine.length ? mine.map((r) => r.title) : ["Nothing yet: it has no rule switched on"],
    prepares: kinds.length ? kinds.map((k) => PREPARES[k]) : ["a finding for a person to decide"],
    runs: CADENCE_WORDS[a.cadence],
    never: a.id.startsWith("custom-")
      ? "Never sends, never changes an account, never clears its own finding."
      : "Never sends, never clears its own finding, and no advisor can switch it off or loosen it without a principal.",
    method: a.id.startsWith("custom-")
      ? "One rule you set, evaluated as a stated condition over the same facts the desks read."
      : `${mine.length} rule${mine.length === 1 ? "" : "s"}, each a stated condition over facts computed from the book; under a rule's confidence floor, or without the source it needs, it asks a person rather than clears.`,
    // Every rule the desk carries, on or off: what it is built on does not change when a layer switches a rule off.
    grounded: groundedIn(rules.filter((r) => a.ruleIds.includes(r.id))),
    groundedNote: a.id.startsWith("custom-") ? "Your own watch: a firm threshold you chose, not a regulation." : undefined,
  };
}

/** One of the agents that are not a desk: research, retrieval, ranking and the rest. */
export function explainRoster(a: RosterAgent): AgentExplanation {
  return {
    role: a.role,
    reads: a.reads,
    checks: a.checks,
    prepares: [a.leaves],
    runs: a.cadence === "morning" ? "Every morning, before you open Relay" : "When you ask",
    never: a.never,
    method: a.method,
    grounded: a.basis,
    groundedNote: a.basis.length ? undefined : "Arithmetic or a convenience, not a regulatory duty; the method above is the whole of it.",
  };
}

/** Each rule's sources once, with where the rule stands, in the order the desk runs them. */
export function groundedIn(rules: RuleDefinition[]): AgentExplanation["grounded"] {
  const out: AgentExplanation["grounded"] = [];
  for (const r of rules) {
    for (const s of r.sources ?? []) {
      if (out.some((x) => x.url === s.url && x.label === s.label)) continue;
      out.push({ ...s, status: r.status?.text, pending: r.status?.pending });
    }
  }
  return out;
}
