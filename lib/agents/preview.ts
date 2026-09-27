// What an agent would find before it exists: the draft agent run over the
// advisor's own book, through the same policy resolution and the same sweep
// the desks use. The advisor sees the households it would flag as they set the
// number, so an agent is never created blind and never "works" only in a demo.
//
// Deterministic. No model client may be imported here.
import type { AgentTemplate, CustomAgent } from "@/lib/agents/templates";
import { fromTemplate } from "@/lib/agents/templates";
import type { Case } from "@/lib/compliance/agents";
import type { RuleDefinition } from "@/lib/compliance/types";
import type { ConnectionState } from "@/lib/connectors/types";
import type { ClientFile } from "@/lib/types";
import { policyFrom, type RuleEdit } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";

export interface PreviewInput {
  advisorId: string;
  advisorName: string;
  clients: ClientFile[];
  connections: ConnectionState[];
  ruleEdits: RuleEdit[];
  /** Rules already in the session (policy documents, other agents). */
  rules: RuleDefinition[];
}

export interface Preview {
  /** What fired, one per household or message. */
  fired: Case[];
  /** What the rule could not evaluate, because a source it needs is not connected. */
  cannotEvaluate: Case[];
  /** How many records it read. */
  read: { households: number; messages: number };
}

/** Run a custom agent (drafted or saved) over the book and return only its own cases. */
export function runAgent(agent: CustomAgent, x: PreviewInput): Preview {
  const policy = policyFrom(x.ruleEdits, scopeFor(x.advisorId), undefined, [...x.rules.filter((r) => r.id !== agent.rule.id), agent.rule]);
  const s = sweep(x.advisorId, policy, x.connections, x.clients, [agent.agent]);
  const mine = s.cases.filter((c) => c.agentId === agent.agent.id);
  return {
    fired: mine.filter((c) => c.reason !== "cannot_evaluate"),
    cannotEvaluate: mine.filter((c) => c.reason === "cannot_evaluate"),
    read: { households: s.accountsScanned, messages: s.messagesScanned },
  };
}

/** Preview a template at a value, before anything is created. */
export function previewTemplate(t: AgentTemplate, value: number | string, x: PreviewInput): Preview {
  const draft = fromTemplate(t, { advisorId: x.advisorId, advisorName: x.advisorName, name: "", mission: "", value, cadence: t.cadence, n: 0 });
  return runAgent(draft, x);
}
