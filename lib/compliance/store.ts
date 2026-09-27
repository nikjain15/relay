// Runtime rule and agent editing, as an append-only change log.
//
// "Configurable" is only defensible if every change is attributable. So the
// console does not mutate a rule. It appends an edit: who, when, which layer,
// which field, from what to what, and why. The effective policy is the baseline
// with the log folded onto it, which means three things a supervisor needs:
//
//   1. A change takes effect on the next evaluation, with no rebuild.
//   2. The state at any past moment is reproducible by replaying the log to that
//      timestamp, so a past disposition can be defended.
//   3. An attempt to loosen a rule is visible. resolvePolicy refuses it and
//      records it in `rejected`; the attempt stays in the log either way.
//
// Deterministic. No model client may be imported here.
import type { FactValue, RuleOverride, Severity } from "@/lib/compliance/types";
import type { LayerOverrides, ResolvedPolicy, RuleLayer } from "@/lib/compliance/policy";
import { resolvePolicy, BASELINE } from "@/lib/compliance/policy";
import type { AgentDefinition } from "@/lib/compliance/agents";
import { AGENTS, CADENCE_RANK } from "@/lib/compliance/agents";
import { EDITS_DATA } from "@/lib/data";

const LAYER_ORDER: RuleLayer[] = ["firm", "segment", "advisor", "client"];

export interface RuleEdit {
  id: string;
  /** ISO 8601. Replaying the log to a timestamp reproduces the policy as it stood. */
  at: string;
  actor: string;
  target: "rule" | "agent";
  layer: RuleLayer;
  layerId: string;
  ruleId?: string;
  agentId?: string;
  /** "enabled", "severity", or a param key. */
  field: string;
  from: string;
  to: string;
  reason: string;
}

export const SEED_EDITS: RuleEdit[] = EDITS_DATA.edits as RuleEdit[];

function parse(field: string, raw: string): FactValue {
  if (raw === "true") return true;
  if (raw === "false") return false;
  const n = Number(raw);
  return field === "severity" || Number.isNaN(n) || raw.trim() === "" ? raw : n;
}

/** Edits that were in force at `asOf`, oldest first. Omit `asOf` for now. */
export function editsAsOf(edits: RuleEdit[], asOf?: string): RuleEdit[] {
  const cut = asOf ? Date.parse(asOf) : Infinity;
  return edits
    .filter((e) => Date.parse(e.at) <= cut)
    .sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
}

/** Fold rule edits into the layer stack resolvePolicy expects. */
export function toLayers(edits: RuleEdit[], scope?: { segmentId?: string; advisorId?: string; clientId?: string }): LayerOverrides[] {
  const wanted = (e: RuleEdit) =>
    e.layer === "firm" ||
    (e.layer === "segment" && (!scope || e.layerId === scope.segmentId)) ||
    (e.layer === "advisor" && (!scope || e.layerId === scope.advisorId)) ||
    (e.layer === "client" && (!scope || e.layerId === scope.clientId));

  const out = new Map<string, LayerOverrides>();
  for (const e of edits.filter((e) => e.target === "rule" && e.ruleId && wanted(e))) {
    const key = `${e.layer}:${e.layerId}`;
    const bucket = out.get(key) ?? { layer: e.layer, id: e.layerId, overrides: [] as RuleOverride[] };
    let ov = bucket.overrides.find((o) => o.ruleId === e.ruleId);
    if (!ov) {
      ov = { ruleId: e.ruleId! };
      bucket.overrides.push(ov);
    }
    if (e.field === "enabled") ov.enabled = e.to === "true";
    else if (e.field === "severity") ov.severity = e.to as Severity;
    else ov.params = { ...(ov.params ?? {}), [e.field]: parse(e.field, e.to) };
    out.set(key, bucket);
  }
  return LAYER_ORDER.flatMap((l) => [...out.values()].filter((b) => b.layer === l));
}

/** The whole point: baseline plus log equals what the engine runs, right now. */
export function policyFrom(
  edits: RuleEdit[] = SEED_EDITS,
  scope?: { segmentId?: string; advisorId?: string; clientId?: string },
  asOf?: string,
): ResolvedPolicy {
  return resolvePolicy(toLayers(editsAsOf(edits, asOf), scope), BASELINE);
}

/** Agent edits fold the same way, over the agent catalog rather than the rules. */
export interface AgentRejection {
  agentId: string;
  layer: RuleLayer;
  layerId: string;
  field: string;
  attempted: string;
  reason: string;
}

export interface ResolvedAgents {
  agents: AgentDefinition[];
  /** Changes a lower layer attempted that would have loosened an agent. Shown, never applied. */
  rejected: AgentRejection[];
}

/**
 * Fold agent edits layer by layer, firm first, then the advisor's segment,
 * then the advisor. The same invariant as the rule set: a lower layer may
 * tighten (switch an agent on, run it more often, give it another rule of its
 * scope) and may not loosen (switch it off, slow it down, take away a rule a
 * higher layer gave it). Every refusal is recorded, not dropped.
 *
 * Without `scope`, only the firm layer applies: the catalog as the firm set it.
 */
export function resolveAgents(edits: RuleEdit[] = SEED_EDITS, scope?: { segmentId?: string; advisorId?: string }, asOf?: string): ResolvedAgents {
  const agents: AgentDefinition[] = AGENTS.map((a) => ({ ...a, ruleIds: [...a.ruleIds], setBy: { enabled: "firm", cadence: "firm", rules: Object.fromEntries(a.ruleIds.map((r) => [r, "firm"])) } }));
  const rejected: AgentRejection[] = [];
  const wanted = (e: RuleEdit) =>
    e.layer === "firm" ||
    (e.layer === "segment" && !!scope?.segmentId && e.layerId === scope.segmentId) ||
    (e.layer === "advisor" && !!scope?.advisorId && e.layerId === scope.advisorId);
  const ordered = editsAsOf(edits, asOf)
    .filter((e) => e.target === "agent" && e.agentId && wanted(e))
    .sort((a, b) => LAYER_ORDER.indexOf(a.layer) - LAYER_ORDER.indexOf(b.layer) || Date.parse(a.at) - Date.parse(b.at));
  for (const e of ordered) {
    const a = agents.find((x) => x.id === e.agentId);
    if (!a) { rejected.push({ agentId: e.agentId!, layer: e.layer, layerId: e.layerId, field: e.field, attempted: e.to, reason: "No such agent." }); continue; }
    const firm = e.layer === "firm";
    const refuse = (reason: string) => rejected.push({ agentId: a.id, layer: e.layer, layerId: e.layerId, field: e.field, attempted: e.to, reason });
    if (e.field === "enabled") {
      const on = e.to === "true";
      if (!on && !firm && a.enabled) { refuse("A lower layer cannot switch an agent off. The desk runs for every advisor the firm runs it for."); continue; }
      a.enabled = on; a.setBy!.enabled = e.layer;
    } else if (e.field === "cadence") {
      const to = e.to as AgentDefinition["cadence"];
      if (!(to in CADENCE_RANK)) { refuse("Not a cadence."); continue; }
      if (!firm && CADENCE_RANK[to] < CADENCE_RANK[a.cadence]) { refuse(`Would slow ${a.cadence.replace("_", " ")} to ${to.replace("_", " ")}. A lower layer may only run an agent more often.`); continue; }
      a.cadence = to; a.setBy!.cadence = e.layer;
    } else if (e.field === "addRule") {
      const rule = BASELINE.find((r) => r.id === e.to);
      if (!rule) { refuse("No such rule in the baseline."); continue; }
      if (rule.scope !== a.scope) { refuse(`The rule reads ${rule.scope} facts; this desk reads ${a.scope} facts.`); continue; }
      if (!a.ruleIds.includes(e.to)) { a.ruleIds.push(e.to); a.setBy!.rules[e.to] = e.layer; }
    } else if (e.field === "removeRule") {
      const gaveIt = a.setBy!.rules[e.to];
      if (!a.ruleIds.includes(e.to)) continue;
      if (!firm && LAYER_ORDER.indexOf(gaveIt as RuleLayer) < LAYER_ORDER.indexOf(e.layer)) { refuse(`The ${gaveIt} layer gave this desk that rule. A lower layer cannot take it away.`); continue; }
      a.ruleIds = a.ruleIds.filter((r) => r !== e.to); delete a.setBy!.rules[e.to];
    }
  }
  return { agents, rejected };
}

/** The agents as the firm set them, or as they stand for one advisor when `scope` is given. */
export function agentsFrom(edits: RuleEdit[] = SEED_EDITS, asOf?: string, scope?: { segmentId?: string; advisorId?: string }): AgentDefinition[] {
  return resolveAgents(edits, scope, asOf).agents;
}

/**
 * Append an edit. Returns the new log and the policy it produces, so a console
 * can show the consequence of a change before committing it.
 */
export function appendEdit(edits: RuleEdit[], edit: Omit<RuleEdit, "id" | "at"> & { at?: string }): { edits: RuleEdit[]; policy: ResolvedPolicy } {
  const next: RuleEdit = {
    ...edit,
    at: edit.at ?? new Date().toISOString(),
    id: `e-${String(edits.length + 1).padStart(3, "0")}`,
  };
  const log = [...edits, next];
  return { edits: log, policy: policyFrom(log) };
}

export interface EditSummary {
  edit: RuleEdit;
  label: string;
  /** True when resolvePolicy refused it because it would have loosened a rule. */
  rejected: boolean;
}

/** The change log as the console shows it, with refusals marked. */
export function changeLog(edits: RuleEdit[] = SEED_EDITS): EditSummary[] {
  const policy = policyFrom(edits);
  return editsAsOf(edits)
    .slice()
    .reverse()
    .map((edit) => {
      const rule = BASELINE.find((r) => r.id === edit.ruleId);
      const subject = edit.target === "agent"
        ? AGENTS.find((a) => a.id === edit.agentId)?.name ?? edit.agentId ?? ""
        : rule?.title ?? edit.ruleId ?? "";
      return {
        edit,
        label: `${subject}: ${edit.field} ${edit.from} to ${edit.to}`,
        rejected: edit.target === "agent"
          ? resolveAgents(edits, edit.layer === "advisor" ? { advisorId: edit.layerId } : edit.layer === "segment" ? { segmentId: edit.layerId } : undefined).rejected.some((r) => r.agentId === edit.agentId && r.field === edit.field && r.layer === edit.layer && r.attempted === edit.to)
          : policy.rejected.some((r) => r.ruleId === edit.ruleId && r.field === edit.field && r.layer === edit.layer),
      };
    });
}
