// Agents: a named surveillance job over a subset of the rule set.
//
// An agent is not a second rule engine. It is a bundle, a cadence and an owner,
// so a supervisor can reason about "who is watching communications" rather than
// about twelve loose rules, and so an agent can be added, disabled or given a
// new rule from the console without touching code.
//
// Autonomy is bounded on purpose (D-73): detection, classification and evidence
// assembly are autonomous; disposition is a human act. Every case an agent
// raises arrives pending, with the finding drafted, the citation attached and
// the evidence it read. A principal clears, returns or blocks it.
//
// Deterministic. No model client may be imported here.
import type { FactBag, Scope, Severity, Verdict } from "@/lib/compliance/types";
import type { ResolvedPolicy } from "@/lib/compliance/policy";
import { activeRules } from "@/lib/compliance/policy";
import { evaluateRule } from "@/lib/compliance/engine";
import { severityRank } from "@/lib/compliance/dsl";
import type { FactSet } from "@/lib/compliance/facts";
import { AGENTS_DATA } from "@/lib/data";

export type Cadence = "on_draft" | "on_proposal" | "daily" | "weekly";

export interface AgentDefinition {
  id: string;
  name: string;
  mission: string;
  /** The review desk this agent is, in the words a legal, risk and compliance function uses. */
  desk: string;
  /** The human team it mirrors and what that team reviews. */
  mirrors: string;
  /** Authorities applied: rules and regulations by their usual short names. */
  authorities: string[];
  scope: Scope;
  ruleIds: string[];
  cadence: Cadence;
  enabled: boolean;
  /** When it last ran, on the prototype clock ("day 0, 06:20"). */
  lastRunAt?: string;
  /** Which layer last set each field, once resolved for an advisor. Absent on the catalog entry. */
  setBy?: { enabled: string; cadence: string; rules: Record<string, string> };
}

/** Faster cadences rank higher. A lower layer may move an agent up this order and never down. */
export const CADENCE_RANK: Record<Cadence, number> = { weekly: 0, daily: 1, on_draft: 2, on_proposal: 2 };

export type Disposition = "pending" | "cleared" | "returned" | "blocked";

/** One thing that needs a person. The unit the supervision queue is made of. */
export interface Case {
  id: string;
  agentId: string;
  agentName: string;
  ruleId: string;
  ruleTitle: string;
  subject: string;
  subjectLabel: string;
  severity: Severity;
  citation: string;
  finding: string;
  remediation: string;
  /** Exactly the facts the rule read, so a disposition can be defended later. */
  evidence: FactBag;
  confidence: number;
  disposition: Disposition;
  /** Why this reached a human: it fired, or the agent was not sure enough. */
  reason: "fired" | "low_confidence" | "cannot_evaluate";
}

export interface AgentRun {
  agentId: string;
  agentName: string;
  subject: string;
  verdicts: Verdict[];
  cases: Case[];
  /** Rules this agent owns that could not be evaluated, and what is missing. */
  blockedBy: string[];
  clean: boolean;
}

export const AGENTS: AgentDefinition[] = AGENTS_DATA.agents as AgentDefinition[];

export function listAgents(): AgentDefinition[] {
  return [...AGENTS].sort((a, b) => a.name.localeCompare(b.name));
}

export function getAgent(id: string): AgentDefinition | undefined {
  return AGENTS.find((a) => a.id === id);
}

export function agentsForScope(scope: Scope, agents: AgentDefinition[] = AGENTS): AgentDefinition[] {
  return agents.filter((a) => a.enabled && a.scope === scope);
}

export function agentOwning(ruleId: string, agents: AgentDefinition[] = AGENTS): AgentDefinition | undefined {
  return agents.find((a) => a.enabled && a.ruleIds.includes(ruleId));
}

/**
 * Mandatory rules in force that no enabled agent watches.
 *
 * This is the check that keeps a configurable agent layer honest: disabling an
 * agent must not quietly retire a rule the firm made mandatory. The console
 * shows this as a warning it cannot dismiss.
 */
export function uncoveredMandatoryRules(policy: ResolvedPolicy, agents: AgentDefinition[] = AGENTS): string[] {
  const watched = new Set(agents.filter((a) => a.enabled).flatMap((a) => a.ruleIds));
  return activeRules(policy)
    .filter((r) => r.mandatory && !watched.has(r.id))
    .map((r) => r.id);
}

export function runAgent(agent: AgentDefinition, policy: ResolvedPolicy, input: FactSet & { availableConnectors: string[] }): AgentRun {
  const rules = activeRules(policy).filter((r) => agent.ruleIds.includes(r.id));
  const verdicts = rules.map((r) => evaluateRule(r, {
    facts: input.facts,
    availableConnectors: input.availableConnectors,
    factConfidence: input.confidence,
  }));

  const cases: Case[] = verdicts
    .filter((v) => v.requiresHuman)
    .map((v) => {
      const rule = rules.find((r) => r.id === v.ruleId)!;
      const reason: Case["reason"] =
        v.outcome === "cannot_evaluate" ? "cannot_evaluate" : v.outcome === "clear" ? "low_confidence" : "fired";
      return {
        id: `${agent.id}:${v.ruleId}:${input.subject}`,
        agentId: agent.id,
        agentName: agent.name,
        ruleId: v.ruleId,
        ruleTitle: rule.title,
        subject: input.subject,
        subjectLabel: input.subjectLabel,
        severity: v.severity,
        citation: v.citation,
        finding: reason === "low_confidence"
          ? `Nothing fired, but this rests on an inferred fact at ${Math.round(v.confidence * 100)} percent confidence against a floor of ${Math.round(rule.confidenceFloor * 100)}.`
          : v.finding,
        remediation: reason === "low_confidence" ? "Confirm or correct the inferred fact, then the verdict stands on its own." : v.remediation,
        evidence: v.facts,
        confidence: v.confidence,
        disposition: "pending",
        reason,
      };
    });

  return {
    agentId: agent.id,
    agentName: agent.name,
    subject: input.subject,
    verdicts,
    cases,
    blockedBy: verdicts.flatMap((v) => v.missingConnectors ?? []),
    clean: cases.length === 0,
  };
}

/** Every enabled agent for this fact set's scope. The queue is the union of their cases. */
export function runScope(policy: ResolvedPolicy, input: FactSet & { availableConnectors: string[] }, agents: AgentDefinition[] = AGENTS): AgentRun[] {
  return agentsForScope(input.scope, agents).map((a) => runAgent(a, policy, input));
}

/** Blocking first, then flags, then the merely uncertain. What a supervisor works top down. */
export function queue(runs: AgentRun[]): Case[] {
  const rank = (c: Case) => (c.reason === "fired" ? 2 : c.reason === "cannot_evaluate" ? 1 : 0);
  return runs
    .flatMap((r) => r.cases)
    .sort((a, b) => rank(b) - rank(a) || severityRank(b.severity) - severityRank(a.severity) || a.ruleId.localeCompare(b.ruleId));
}
