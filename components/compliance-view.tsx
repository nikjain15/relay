"use client";

// Rules and agents, editable here, in force immediately.
//
// The screen is the argument. A compliance officer can change a threshold, raise
// a severity or switch an agent off, and see the effect on a live sample before
// anything is saved. Three things are deliberately visible:
//
//   1. Every change needs a reason, and lands in an append-only log.
//   2. A lower layer can only tighten. An attempt to loosen is refused on screen,
//      with the reason, rather than silently ignored.
//   3. A rule whose source is not connected reads "cannot evaluate", never
//      "clear". The rule set and the connector set are one system.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRelay } from "@/components/state";
import { Banner, Card, CardGrid, Field, PageTitle, Pill, Section, StatRow, btn, btnPrimary, input, textarea } from "@/components/ui";
import type { Severity } from "@/lib/compliance/types";
import { SEVERITY_ORDER } from "@/lib/compliance/types";
import type { EffectiveRule } from "@/lib/compliance/policy";
import { scopeFor, type EditableLayer } from "@/lib/compliance/scope";
import { policyFrom, agentsFrom } from "@/lib/compliance/store";
import { explain, paramMap } from "@/lib/compliance/dsl";
import { agentOwning, runScope, queue, uncoveredMandatoryRules } from "@/lib/compliance/agents";
import { coverageFor } from "@/lib/connectors/coverage";
import { coverageFacts } from "@/lib/compliance/facts";
import { CONNECTORS_DATA } from "@/lib/data";

const SEVERITY_LABEL: Record<Severity, string> = { note: "Note", flag: "Flag for review", block: "Block" };
function Provenance({ rule, field, layers }: { rule: EffectiveRule; field: "enabled" | "severity" | string; layers: EditableLayer[] }) {
  const layer =
    field === "enabled" ? rule.setBy.enabled : field === "severity" ? rule.setBy.severity : rule.setBy.params[field] ?? "firm";
  const label = layers.find((l) => l.layer === layer)?.label ?? layer;
  return <span className="text-[11px] text-ink-3">Set by {label.toLowerCase()}</span>;
}

function RuleCard({
  rule,
  editing,
  layers,
  connected,
  onEdit,
}: {
  rule: EffectiveRule;
  editing: EditableLayer;
  layers: EditableLayer[];
  connected: string[];
  onEdit: (field: string, from: string, to: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const missing = rule.requires.filter((r) => !connected.includes(r));
  const owner = agentOwning(rule.id);
  const params = paramMap(rule);
  return (
    <Card
      title={
        <span id={rule.id} className="scroll-mt-20">
          {rule.title}
        </span>
      }
      sub={`${rule.authority} · ${rule.citation}`}
      tone={missing.length ? "caution" : "plain"}
      right={
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {rule.mandatory && <Pill>Mandatory</Pill>}
          <Pill tone={rule.severity === "block" ? "fail" : rule.severity === "flag" ? "accent" : "neutral"}>{SEVERITY_LABEL[rule.severity]}</Pill>
          {!rule.enabled && <Pill>Off</Pill>}
        </div>
      }
    >
      {missing.length > 0 && (
        <p className="mb-3 text-[13px] text-caution">
          Cannot be evaluated: reads from {missing.join(", ")}, which is not connected.{" "}
          <Link href="/connectors" className="underline">
            Connect it
          </Link>
          .
        </p>
      )}
      <p className="text-[13px] text-ink-2">
        <span className="font-medium text-ink">Fires when</span> {explain(rule.when, params).replace(/\n\s*/g, " ")}
      </p>
      <p className="mt-2 text-[13px] text-ink-2">
        <span className="font-medium text-ink">Watched by</span>{" "}
        {owner ? owner.name : <span className="text-critical">no enabled agent</span>}
      </p>

      <button type="button" className={`${btn} mt-3`} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        {open ? "Close" : "Change this rule"}
      </button>

      {open && (
        <div className="mt-3 border-t border-line pt-3">
          <Field label="Severity" hint={<Provenance rule={rule} field="severity" layers={layers} />}>
            <select
              className={input}
              value={rule.severity}
              onChange={(e) => onEdit("severity", rule.severity, e.target.value)}
            >
              {SEVERITY_ORDER.map((s) => (
                <option key={s} value={s}>
                  {SEVERITY_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>

          {rule.params.map((p) => (
            <Field key={p.key} label={p.label} hint={p.note ?? <Provenance rule={rule} field={p.key} layers={layers} />}>
              {p.type === "boolean" ? (
                <select className={input} value={String(p.value)} onChange={(e) => onEdit(p.key, String(p.value), e.target.value)}>
                  <option value="true">Required</option>
                  <option value="false">Not required</option>
                </select>
              ) : (
                <input
                  className={input}
                  type={p.type === "number" ? "number" : "text"}
                  min={p.min}
                  max={p.max}
                  defaultValue={String(p.value)}
                  onBlur={(e) => e.target.value !== String(p.value) && onEdit(p.key, String(p.value), e.target.value)}
                />
              )}
            </Field>
          ))}

          <Field label="In force" hint={rule.mandatory ? "Firm-mandatory. A lower layer cannot switch this off." : <Provenance rule={rule} field="enabled" layers={layers} />}>
            <select
              className={input}
              value={String(rule.enabled)}
              disabled={rule.mandatory && editing.layer !== "firm"}
              onChange={(e) => onEdit("enabled", String(rule.enabled), e.target.value)}
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </Field>
        </div>
      )}
    </Card>
  );
}

export function ComplianceView({ advisorId }: { advisorId: string }) {
  const { ruleEdits, editRule, connections } = useRelay();
  const scope = useMemo(() => scopeFor(advisorId), [advisorId]);
  const [editing, setEditing] = useState<EditableLayer>(scope.layers[0]);
  const [pending, setPending] = useState<{ ruleId: string; field: string; from: string; to: string } | null>(null);
  const [reason, setReason] = useState("");

  const connected = useMemo(
    () => connections.filter((c) => c.advisorId === advisorId && c.status === "connected").map((c) => c.connectorId),
    [connections, advisorId],
  );
  const policy = useMemo(
    () => policyFrom(ruleEdits, { segmentId: scope.segmentId, advisorId }),
    [ruleEdits, advisorId, scope.segmentId],
  );
  const agents = useMemo(() => agentsFrom(ruleEdits), [ruleEdits]);
  const uncovered = useMemo(() => uncoveredMandatoryRules(policy), [policy]);

  // The live sample: record completeness, run through the agents as configured
  // right now. Changing a rule above changes this without a reload.
  const cases = useMemo(() => {
    const report = coverageFor(advisorId, connections, CONNECTORS_DATA.attestations);
    return queue(runScope(policy, { ...coverageFacts(report), availableConnectors: connected }));
  }, [advisorId, connections, policy, connected]);

  const inForce = policy.rules.filter((r) => r.enabled);
  const commit = () => {
    if (!pending || reason.trim().length < 8) return;
    editRule({
      actor: `${editing.label} console`,
      target: "rule",
      layer: editing.layer,
      layerId: editing.id,
      ruleId: pending.ruleId,
      field: pending.field,
      from: pending.from,
      to: pending.to,
      reason: reason.trim(),
    });
    setPending(null);
    setReason("");
  };

  return (
    <>
      <PageTitle
        title="Rules and agents"
        sub="The rule set is data, not code. A change here is in force on the next evaluation, everywhere in Relay, with no release. Every change is attributable and every change needs a reason."
      />

      <StatRow
        items={[
          { value: inForce.length, label: "Rules in force" },
          { value: agents.filter((a) => a.enabled).length, label: "Agents running" },
          { value: cases.length, label: "Open cases", tone: cases.length ? "critical" : "positive" },
          { value: policy.rejected.length, label: "Refused changes", tone: policy.rejected.length ? "critical" : "plain" },
        ]}
      />

      {uncovered.length > 0 && (
        <Banner tone="critical" title="A mandatory rule is not watched by any enabled agent">
          {uncovered.join(", ")}. Switching an agent off must not retire a rule the firm made mandatory. Re-enable the agent, or assign the
          rule to another one.
        </Banner>
      )}

      {policy.rejected.length > 0 && (
        <Banner tone="caution" title={`${policy.rejected.length} ${policy.rejected.length === 1 ? "change was" : "changes were"} refused`}>
          <ul className="mt-1 space-y-1">
            {policy.rejected.map((r, i) => (
              <li key={i}>
                {r.layer} tried to set {r.field} to {r.attempted} on {r.ruleId}. {r.reason}
              </li>
            ))}
          </ul>
        </Banner>
      )}

      <Section title="Who is editing">
        <p className="mb-3 max-w-2xl text-[13px] text-ink-2">
          Rules resolve firm, then segment, then advisor, then client. A lower layer may enable a rule the firm left off, raise a severity and
          move a threshold in the stricter direction. It cannot disable a mandatory rule, lower a severity, or loosen a threshold.
        </p>
        <div className="flex flex-wrap gap-2">
          {scope.layers.map((l) => (
            <button
              key={l.id}
              type="button"
              onClick={() => setEditing(l)}
              aria-pressed={editing.id === l.id}
              className={editing.id === l.id ? btnPrimary : btn}
            >
              {l.label}
            </button>
          ))}
        </div>
      </Section>

      {pending && (
        <Card tone="caution" title="Why are you making this change?" sub={`${pending.ruleId}: ${pending.field} from ${pending.from} to ${pending.to}, as ${editing.label}.`}>
          <textarea
            className={textarea}
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="A supervisor reading this in a year needs to understand why. One or two sentences."
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={reason.trim().length < 8} onClick={commit}>
              Record the change
            </button>
            <button type="button" className={btn} onClick={() => { setPending(null); setReason(""); }}>
              Cancel
            </button>
          </div>
          <p className="mt-2 text-[12px] text-ink-3">
            Recording appends to the change log. If it would loosen the rule it is refused, and the attempt is kept.
          </p>
        </Card>
      )}

      <Section title="Agents">
        <p className="mb-3 max-w-2xl text-[13px] text-ink-2">
          An agent detects, classifies and assembles the evidence on its own. It never dispositions. Anything that fires, and anything it is
          not confident enough to clear, reaches a principal with the finding drafted and the citation attached.
        </p>
        <CardGrid cols={2}>
          {agents.map((a) => {
            const owned = policy.rules.filter((r) => a.ruleIds.includes(r.id));
            const evaluable = owned.filter((r) => r.requires.every((x) => connected.includes(x)));
            return (
              <Card
                key={a.id}
                title={a.name}
                sub={a.mission}
                right={<Pill tone={a.enabled ? "pass" : "neutral"}>{a.enabled ? "Running" : "Off"}</Pill>}
              >
                <p className="text-[13px] text-ink-2">
                  {owned.length} {owned.length === 1 ? "rule" : "rules"}, {evaluable.length} evaluable with what is connected. Runs{" "}
                  {a.cadence.replace("on_", "on every ").replace("_", " ")}.
                </p>
                <ul className="mt-2 space-y-1 text-[13px]">
                  {owned.map((r) => (
                    <li key={r.id}>
                      <a href={`#${r.id}`} className="underline">
                        {r.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </CardGrid>
      </Section>

      <Section title="Live sample: record completeness">
        <p className="mb-3 max-w-2xl text-[13px] text-ink-2">
          The agents as configured above, run against this advisor&apos;s actual coverage. Change a rule and this changes with it.
        </p>
        {cases.length === 0 ? (
          <Card tone="positive" title="Nothing needs a person">
            <p className="text-[13px] text-ink-2">No rule fired and nothing fell under its confidence floor.</p>
          </Card>
        ) : (
          <CardGrid cols={2}>
            {cases.map((c) => (
              <Card
                key={c.id}
                tone={c.severity === "block" ? "critical" : "caution"}
                title={c.ruleTitle}
                sub={`${c.agentName} · ${c.citation}`}
                right={<Pill tone={c.severity === "block" ? "fail" : "accent"}>{c.reason === "fired" ? SEVERITY_LABEL[c.severity] : c.reason === "cannot_evaluate" ? "Cannot evaluate" : "Needs confirming"}</Pill>}
              >
                <p className="text-[13px] text-ink">{c.finding}</p>
                <p className="mt-2 text-[13px] text-ink-2">
                  <span className="font-medium text-ink">Suggested:</span> {c.remediation}
                </p>
                <p className="mt-2 text-[12px] text-ink-3">
                  Confidence {Math.round(c.confidence * 100)} percent. Pending a principal&apos;s disposition; Relay does not clear its own
                  findings.
                </p>
              </Card>
            ))}
          </CardGrid>
        )}
      </Section>

      <Section title="The rule set">
        <CardGrid cols={2}>
          {policy.rules.map((r) => (
            <RuleCard
              key={r.id}
              rule={r}
              editing={editing}
              layers={scope.layers}
              connected={connected}
              onEdit={(field, from, to) => {
                setPending({ ruleId: r.id, field, from, to });
                setReason("");
              }}
            />
          ))}
        </CardGrid>
      </Section>

      <p className="mt-8 text-[13px] text-ink-2">
        Every change lands in the{" "}
        <Link href="/compliance/log" className="underline">
          change log
        </Link>
        , with who made it, when, at which layer and why.
      </p>
    </>
  );
}
