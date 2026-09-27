// The proposer: an agent that reads what the other agents keep finding and
// drafts a rule change for a principal.
//
// It may only propose in the stricter direction. That is not a preference, it
// is the same invariant the policy resolver enforces on every layer: a lower
// layer, and an agent is lower than any person, cannot loosen a rule. A pattern
// that would argue for loosening is reported as an observation with the reason
// the agent will not act on it, so a principal sees it and the agent does not
// touch it. Every proposal cites the findings that produced it, and nothing
// here is applied: accepting a proposal appends an edit to the change log in
// the principal's name, through the same resolver as any other change.
//
// Deterministic. No model client may be imported here.
import type { EffectiveRule, ResolvedPolicy, RuleLayer } from "@/lib/compliance/policy";
import { resolvePolicy, BASELINE } from "@/lib/compliance/policy";
import { toLayers, type RuleEdit } from "@/lib/compliance/store";
import type { Case } from "@/lib/compliance/agents";
import { HISTORY, type PastFinding } from "@/lib/data";

export interface Proposal {
  id: string;
  ruleId: string;
  ruleTitle: string;
  layer: RuleLayer;
  layerId: string;
  field: string;
  from: string;
  to: string;
  /** One sentence a principal can accept or refuse on. */
  rationale: string;
  /** The findings and cases that produced it. */
  evidence: { id: string; label: string }[];
  /** The learner that produced it, so a pattern can be switched off by name. */
  learner: string;
}

export interface Observation {
  ruleId: string;
  ruleTitle: string;
  text: string;
  /** Why the agent will not turn this into a proposal. */
  refusal: string;
  evidence: { id: string; label: string }[];
  learner: string;
}

export interface Proposals {
  proposals: Proposal[];
  observations: Observation[];
  windowDays: number;
  findingsRead: number;
}

const WINDOW_DAYS = 90;

/** The window ends at the newest timestamp in the log, which is the prototype's "now" on that clock. */
function windowStart(findings: PastFinding[], edits: RuleEdit[]): number {
  const latest = Math.max(...findings.map((f) => Date.parse(f.at)), ...edits.map((e) => Date.parse(e.at)));
  return latest - WINDOW_DAYS * 86_400_000;
}

const label = (f: PastFinding) => `${f.id}: ${f.subjectLabel}, ${f.at.slice(0, 10)}, ${f.outcome}, ${f.disposition}`;

export function propose(policy: ResolvedPolicy, current: Case[], edits: RuleEdit[], findings: PastFinding[] = HISTORY.findings): Proposals {
  const start = windowStart(findings, edits);
  const recent = findings.filter((f) => Date.parse(f.at) >= start);
  const proposals: Proposal[] = [];
  const observations: Observation[] = [];
  const byRule = (id: string) => recent.filter((f) => f.ruleId === id);

  // 1. A rule that is off, whose facts fired anyway, twice or more. Propose enabling it at the firm layer.
  for (const r of policy.rules.filter((x) => !x.enabled)) {
    const seen = byRule(r.id).filter((f) => Object.entries(f.facts).some(([k, v]) => v === true && r.evidence.includes(k)));
    const live = current.filter((c) => c.ruleId === r.id);
    if (seen.length + live.length >= 2) {
      proposals.push({
        id: `p-enable-${r.id}`, ruleId: r.id, ruleTitle: r.title, layer: "firm", layerId: "firm", field: "enabled", from: "false", to: "true",
        rationale: `${r.title.toLowerCase()} is not in force, and the language it looks for was seen ${seen.length + live.length} times in ${WINDOW_DAYS} days.`,
        evidence: [...seen.map((f) => ({ id: f.id, label: label(f) })), ...live.map((c) => ({ id: c.id, label: `Current sweep: ${c.subjectLabel}` }))],
        learner: "off-but-firing",
      });
    }
  }

  // 2. A numeric threshold that clears within 15 percent of the line three times or more in a segment. Propose tightening by one fifth, at that segment.
  for (const r of policy.rules.filter((x) => x.enabled)) {
    for (const p of r.params) {
      if (p.type !== "number" || typeof p.value !== "number" || !p.stricter) continue;
      const fact = factCompared(r, p.key);
      if (!fact) continue;
      const near = byRule(r.id).filter((f) => {
        const v = f.facts[fact];
        if (typeof v !== "number" || f.outcome !== "clear") return false;
        const line = p.value as number;
        return p.stricter === "lower" ? v <= line && v >= line * 0.85 : v >= line && v <= line * 1.15;
      });
      const bySegment = new Map<string, PastFinding[]>();
      for (const f of near) {
        const k = f.scope.segmentId ?? "firm";
        bySegment.set(k, [...(bySegment.get(k) ?? []), f]);
      }
      for (const [segmentId, fs] of bySegment) {
        if (fs.length < 3) continue;
        const line = p.value as number;
        const to: number = p.stricter === "lower" ? Math.max(p.min ?? 0, Math.round(line * 0.8)) : Math.min(p.max ?? Infinity, Math.round(line * 1.2));
        if (to === p.value) continue;
        proposals.push({
          id: `p-tighten-${r.id}-${p.key}-${segmentId}`, ruleId: r.id, ruleTitle: r.title, layer: segmentId === "firm" ? "firm" : "segment", layerId: segmentId, field: p.key, from: String(p.value), to: String(to),
          rationale: `${fs.length} drafts in ${WINDOW_DAYS} days cleared within 15 percent of the ${p.label.toLowerCase()} of ${p.value}. Reviewing at ${to} keeps this segment clear of the line rather than on it.`,
          evidence: fs.map((f) => ({ id: f.id, label: label(f) })),
          learner: "near-threshold",
        });
      }
    }
  }

  // 3. A flag-severity rule whose every disposition in the window confirmed the finding, twice or more. Propose raising it to block at the firm layer.
  for (const r of policy.rules.filter((x) => x.enabled && x.severity === "flag")) {
    const fired = byRule(r.id).filter((f) => f.outcome === "flag" || f.outcome === "block");
    if (fired.length < 2) continue;
    const confirmed = fired.filter((f) => f.disposition !== "cleared");
    if (confirmed.length === fired.length) {
      proposals.push({
        id: `p-raise-${r.id}`, ruleId: r.id, ruleTitle: r.title, layer: "firm", layerId: "firm", field: "severity", from: r.severity, to: "block",
        rationale: `Every one of ${fired.length} findings in ${WINDOW_DAYS} days was confirmed by a principal. A rule that is never cleared is a block wearing a flag.`,
        evidence: fired.map((f) => ({ id: f.id, label: label(f) })),
        learner: "always-confirmed",
      });
    } else if (confirmed.length === 0 && fired.length >= 3) {
      // The mirror image: always cleared. Loosening is not the agent's to propose.
      observations.push({
        ruleId: r.id, ruleTitle: r.title,
        text: `Fired ${fired.length} times in ${WINDOW_DAYS} days on ${new Set(fired.map((f) => f.subject)).size === 1 ? "one account" : `${new Set(fired.map((f) => f.subject)).size} accounts`} and was cleared every time${fired[0].comment ? `: "${fired[fired.length - 1].comment}"` : "."}`,
        refusal: "This pattern argues for loosening the rule or its parameter, and an agent may only propose in the stricter direction. A principal at the firm layer decides whether the parameter fits this household; Relay will not draft that change.",
        evidence: fired.map((f) => ({ id: f.id, label: label(f) })),
        learner: "always-cleared",
      });
    }
  }

  return { proposals: guard(proposals, edits), observations, windowDays: WINDOW_DAYS, findingsRead: recent.length };
}

/**
 * Nothing leaves the proposer that the resolver would refuse. The learners
 * above only draft stricter changes, but the guard does not trust them: a
 * proposal is resolved in the scope it targets, exactly as the console would
 * resolve an accepted edit, and dropped if that resolution records a refusal.
 * A proposal that would loosen is a bug, not a proposal.
 */
export function guard(proposals: Proposal[], edits: RuleEdit[]): Proposal[] {
  return proposals.filter((p) => {
    // Another segment's tighter value is not this segment's floor, so resolve for this scope only.
    const scope = { segmentId: p.layer === "segment" ? p.layerId : undefined, advisorId: p.layer === "advisor" ? p.layerId : undefined };
    const layers = toLayers([...edits, { id: "probe", at: new Date(0).toISOString(), actor: "probe", target: "rule", layer: p.layer, layerId: p.layerId, ruleId: p.ruleId, field: p.field, from: p.from, to: p.to, reason: "probe" }], scope);
    const resolved = resolvePolicy(layers, BASELINE);
    return !resolved.rejected.some((x) => x.ruleId === p.ruleId && x.field === p.field && x.layer === p.layer);
  });
}

/** The fact a rule compares against a given param, if its condition does so directly. */
function factCompared(rule: EffectiveRule, paramKey: string): string | undefined {
  const walk = (c: EffectiveRule["when"]): string | undefined => {
    if ("all" in c) return c.all.map(walk).find(Boolean);
    if ("any" in c) return c.any.map(walk).find(Boolean);
    if ("not" in c) return walk(c.not);
    return c.param === paramKey ? c.fact : undefined;
  };
  return walk(rule.when);
}
