// What each agent did, as a status a person can read in five seconds.
//
// The sweep produces cases. This turns the same run into the shape a status
// screen and a header need: per agent, when it last ran, what it read, what
// it raised, what it prepared, and what it could not evaluate; and a timeline
// of the morning's runs in the order they happened. Everything here is derived
// from the sweep and the catalog; nothing is stored, so it can never disagree
// with the queue.
//
// Deterministic. No model client may be imported here.
import type { Case, AgentDefinition } from "@/lib/compliance/agents";
import type { ResolvedPolicy } from "@/lib/compliance/policy";
import type { Sweep } from "@/lib/compliance/sweep";
import type { PreparedAction } from "@/lib/compliance/actions";
import type { IconName } from "@/components/icons";

export interface AgentStatus {
  agent: AgentDefinition;
  icon: IconName;
  lastRunAt: string;
  cadenceLabel: string;
  rulesWatched: number;
  rulesEvaluable: number;
  /** Rules in the bundle the firm has switched off. */
  rulesOff: number;
  /** What it read this run: accounts, messages or channels, in words. */
  scanned: string;
  open: number;
  blocking: number;
  needsConfirming: number;
  cannotEvaluate: number;
  actionsPrepared: number;
  /** clear, attention or blocked, for the one glance. */
  state: "clear" | "attention" | "blocked" | "off";
}

const CADENCE: Record<AgentDefinition["cadence"], string> = {
  on_draft: "On every draft and captured message",
  on_proposal: "On every proposal",
  daily: "Daily",
  weekly: "Weekly",
};

const ICON: Record<string, IconName> = {
  "communications-surveillance": "email",
  "record-completeness": "archive",
  "recommendation-evidence": "document",
  "client-protection": "people",
  "conduct": "flag",
};

export function agentStatuses(agents: AgentDefinition[], policy: ResolvedPolicy, found: Sweep, actions: PreparedAction[], open: Case[], connected: string[]): AgentStatus[] {
  return agents.map((agent) => {
    const mine = open.filter((c) => c.agentId === agent.id);
    const rules = policy.rules.filter((r) => r.enabled && agent.ruleIds.includes(r.id));
    const evaluable = rules.filter((r) => r.requires.every((x) => connected.includes(x)));
    const blocking = mine.filter((c) => c.reason === "fired" && c.severity === "block").length;
    const scanned =
      agent.scope === "communication" ? `${found.messagesScanned} captured messages${found.channelsScanned.length ? ` on ${found.channelsScanned.join(", ")}` : ""}`
      : agent.scope === "coverage" ? "every attested channel"
      : agent.scope === "account" ? `${found.accountsScanned} accounts`
      : "each proposal as it is released";
    return {
      agent,
      icon: ICON[agent.id] ?? "agent",
      lastRunAt: agent.lastRunAt ?? "not yet run",
      cadenceLabel: CADENCE[agent.cadence],
      rulesWatched: rules.length,
      rulesEvaluable: evaluable.length,
      rulesOff: policy.rules.filter((r) => !r.enabled && agent.ruleIds.includes(r.id)).length,
      scanned,
      open: mine.length,
      blocking,
      needsConfirming: mine.filter((c) => c.reason === "low_confidence").length,
      cannotEvaluate: mine.filter((c) => c.reason === "cannot_evaluate").length,
      actionsPrepared: actions.filter((a) => mine.some((c) => c.id === a.caseId)).length,
      state: !agent.enabled ? "off" : blocking ? "blocked" : mine.length ? "attention" : "clear",
    };
  });
}

export interface ActivityItem {
  at: string;
  icon: IconName;
  title: string;
  meta: string;
  tone: "plain" | "critical" | "caution" | "positive";
  href?: string;
}

/** The morning's runs, most recent first, from the agents' own last-run times and what each found. */
export function activity(statuses: AgentStatus[], extra: ActivityItem[] = []): ActivityItem[] {
  const items: ActivityItem[] = statuses
    .filter((s) => s.agent.enabled)
    .map((s) => ({
      at: s.lastRunAt,
      icon: s.icon,
      title: `${s.agent.name} read ${s.scanned}`,
      meta: s.open === 0
        ? `Nothing raised. ${s.rulesWatched} rules, ${s.rulesEvaluable} evaluable with what is connected.`
        : `${s.open} raised (${s.blocking} blocking), ${s.actionsPrepared} actions prepared${s.cannotEvaluate ? `, ${s.cannotEvaluate} could not be evaluated` : ""}.`,
      tone: s.state === "blocked" ? "critical" : s.state === "attention" ? "caution" : "positive",
      href: "/supervision",
    }));
  return [...items, ...extra].sort((a, b) => rank(b.at) - rank(a.at));
}

/** "day 0, 06:25" sorts after "day -2, 06:30"; text cadences sort last. */
function rank(at: string): number {
  const m = /day (-?\d+), (\d\d):(\d\d)/.exec(at);
  if (!m) return -1e9;
  return Number(m[1]) * 1440 + Number(m[2]) * 60 + Number(m[3]);
}
