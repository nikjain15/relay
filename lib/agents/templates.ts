// An advisor's own agent, made from a template. Each template is one watch an
// advisor asks for often, written as a rule in the engine's own shape, so the
// agent it makes runs in the same sweep as the compliance desks, raises
// findings on the same Supervision queue and prepares the same kinds of action.
// A template only adds a watch; it never switches a desk off or loosens a rule,
// so an advisor may create one without a principal.
//
// Deterministic. No model client may be imported here.
import type { AgentDefinition, Cadence } from "@/lib/compliance/agents";
import type { RuleDefinition, Scope } from "@/lib/compliance/types";
import type { ActionTemplate } from "@/lib/compliance/actions";

export interface AgentTemplate {
  id: string;
  title: string;
  /** One sentence: what an agent made from this template watches for. */
  what: string;
  scope: Scope;
  /** The one number or phrase the advisor sets. */
  param: { key: string; label: string; type: "number" | "text"; value: number | string; min?: number; max?: number; unit?: string };
  defaultName: string;
  cadence: Cadence;
  rule: (id: string, value: number | string) => RuleDefinition;
}

const base = (id: string, title: string, scope: Scope): Pick<RuleDefinition, "id" | "title" | "authority" | "citation" | "scope" | "severity" | "mandatory" | "enabled" | "confidenceFloor" | "requires"> => ({
  id, title, authority: "Firm", citation: "Advisor's own watch", scope, severity: "flag", mandatory: false, enabled: true, confidenceFloor: 0.9, requires: [],
});

export const TEMPLATES: AgentTemplate[] = [
  {
    id: "cash-floor",
    title: "Cash cover below a floor",
    what: "Flags any household whose cash covers fewer months of spending than you set, and drafts the review task.",
    scope: "account",
    param: { key: "months", label: "Flag below", type: "number", value: 6, min: 1, max: 60, unit: "months of spending" },
    defaultName: "Cash cover watch",
    cadence: "daily",
    rule: (id, v) => ({
      ...base(id, `Cash cover under ${v} months`, "account"),
      when: { all: [{ fact: "cashCoverMonths", cmp: "lt", param: "months" }] },
      params: [{ key: "months", label: "Months of spending", type: "number", value: Number(v), min: 1, max: 60 }],
      evidence: ["clientId", "cashCoverMonths", "cashTargetMonths"],
      finding: "{clientId}: cash covers {cashCoverMonths} months of spending, under the {months}-month floor you set.",
      remediation: "Review cash cover with the family and propose from the approved shelf.",
      actions: [{ kind: "task", text: "Review cash cover for {clientId}: {cashCoverMonths} months against your {months}-month floor.", owner: "Advisor", dueInDays: 5 }] satisfies ActionTemplate[],
    }),
  },
  {
    id: "quiet-client",
    title: "No contact for too long",
    what: "Flags any household you have not spoken to within the days you set, and drafts the call to schedule.",
    scope: "account",
    param: { key: "days", label: "Flag after", type: "number", value: 90, min: 7, max: 365, unit: "days without contact" },
    defaultName: "Quiet client watch",
    cadence: "weekly",
    rule: (id, v) => ({
      ...base(id, `No contact in ${v} days`, "account"),
      when: { all: [{ fact: "daysSinceContact", cmp: "gt", param: "days" }] },
      params: [{ key: "days", label: "Days without contact", type: "number", value: Number(v), min: 7, max: 365 }],
      evidence: ["clientId", "daysSinceContact"],
      finding: "{clientId}: last contact {daysSinceContact} days ago, past the {days} days you set.",
      remediation: "Schedule a check-in.",
      actions: [{ kind: "schedule", title: "Check-in with {clientId}: last contact {daysSinceContact} days ago", withinDays: 10 }] satisfies ActionTemplate[],
    }),
  },
  {
    id: "concentration-level",
    title: "One stock above a level",
    what: "Flags any household with more of its wealth in one name than the level you set, from the custodian's positions.",
    scope: "account",
    param: { key: "pct", label: "Flag above", type: "number", value: 30, min: 5, max: 90, unit: "percent in one name" },
    defaultName: "Concentration watch",
    cadence: "daily",
    rule: (id, v) => ({
      ...base(id, `One name above ${v}%`, "account"),
      requires: ["custodian-feed"],
      when: { all: [{ fact: "concentrationPct", cmp: "gt", param: "pct" }] },
      params: [{ key: "pct", label: "Percent in one name", type: "number", value: Number(v), min: 5, max: 90 }],
      evidence: ["clientId", "instrument", "concentrationPct"],
      finding: "{clientId}: {concentrationPct}% in {instrument}, above the {pct}% level you set.",
      remediation: "Discuss a staged reduction from the approved shelf.",
      actions: [{ kind: "task", text: "Prepare a concentration conversation for {clientId}: {concentrationPct}% in one name.", owner: "Advisor", dueInDays: 10 }] satisfies ActionTemplate[],
    }),
  },
  {
    id: "phrase",
    title: "A phrase in what clients write",
    what: "Flags any captured message from a client that contains the words you set, and holds it for your review.",
    scope: "communication",
    param: { key: "phrase", label: "Watch for", type: "text", value: "move my money" },
    defaultName: "Phrase watch",
    cadence: "on_draft",
    rule: (id, v) => ({
      ...base(id, `Client wrote "${v}"`, "communication"),
      when: { all: [{ fact: "direction", cmp: "eq", value: "inbound" }, { fact: "excerpt", cmp: "contains", param: "phrase" }] },
      params: [{ key: "phrase", label: "Words to watch for", type: "text", value: String(v) }],
      evidence: ["clientId", "channel", "excerpt"],
      finding: "A client wrote \"{phrase}\" on {channel}: \"{excerpt}\"",
      remediation: "Read the message and reply from your own tools.",
      actions: [{ kind: "task", text: "Read and answer the {channel} message that mentions \"{phrase}\".", owner: "Advisor", dueInDays: 1 }] satisfies ActionTemplate[],
    }),
  },
];

export interface CustomAgent {
  agent: AgentDefinition;
  rule: RuleDefinition;
  advisorId: string;
  templateId: string;
}

/** Make an advisor's agent from a template: the agent, and the one rule it runs. */
export function fromTemplate(t: AgentTemplate, opts: { advisorId: string; advisorName: string; name: string; mission: string; value: number | string; cadence: Cadence; n: number }): CustomAgent {
  const id = `custom-${opts.advisorId}-${t.id}-${opts.n}`;
  const rule = t.rule(`${id}-rule`, opts.value);
  return {
    advisorId: opts.advisorId,
    templateId: t.id,
    rule,
    agent: {
      id,
      name: opts.name.trim() || t.defaultName,
      mission: opts.mission.trim() || t.what,
      desk: "Your agent",
      mirrors: `Made by ${opts.advisorName} from the "${t.title}" template.`,
      authorities: ["Advisor's own watch"],
      scope: t.scope,
      ruleIds: [rule.id],
      cadence: opts.cadence,
      enabled: true,
      lastRunAt: "just now",
    },
  };
}
