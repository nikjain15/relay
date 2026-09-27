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

export interface AgentExplanation {
  role: string;
  reads: string;
  checks: string[];
  prepares: string[];
  runs: string;
  never: string;
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
  };
}
