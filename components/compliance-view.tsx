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
import { Banner, Brief, Card, CardGrid, Field, More, PageTitle, Pill, Section, btn, btnPrimary, input, textarea } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import type { Severity } from "@/lib/compliance/types";
import { SEVERITY_ORDER } from "@/lib/compliance/types";
import type { EffectiveRule } from "@/lib/compliance/policy";
import { scopeFor, type EditableLayer } from "@/lib/compliance/scope";
import { policyFrom, resolveAgents } from "@/lib/compliance/store";
import { Desks } from "@/components/desks";
import { explain, paramMap } from "@/lib/compliance/dsl";
import { agentOwning, runScope, queue, uncoveredMandatoryRules } from "@/lib/compliance/agents";
import { coverageFor } from "@/lib/connectors/coverage";
import { coverageFacts } from "@/lib/compliance/facts";
import { CONNECTORS_DATA } from "@/lib/data";
import { propose } from "@/lib/compliance/propose";
import { sweep } from "@/lib/compliance/sweep";

const SEVERITY_LABEL: Record<Severity, string> = { note: "Note", flag: "Flag for review", block: "Block" };
/** A rule's icon says what it watches, which is faster to scan than its authority. */
const SCOPE_ICON: Record<string, IconName> = { communication: "email", coverage: "archive", proposal: "document", account: "people" };
function Provenance({ rule, field, layers }: { rule: EffectiveRule; field: "enabled" | "severity" | string; layers: EditableLayer[] }) {
  const layer =
    field === "enabled" ? rule.setBy.enabled : field === "severity" ? rule.setBy.severity : rule.setBy.params[field] ?? "firm";
  const label = layers.find((l) => l.layer === layer)?.label ?? layer;
  return <span className="text-caption text-ink-3">Set by {label.toLowerCase()}</span>;
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
      icon={SCOPE_ICON[rule.scope] ?? "rules"}
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
        <p className="mb-3 text-body text-caution">
          Cannot be evaluated: reads from {missing.join(", ")}, which is not connected.{" "}
          <Link href="/sources" className="underline">
            Connect it
          </Link>
          .
        </p>
      )}
      <p className="text-body text-ink-2">
        <span className="font-medium text-ink">Fires when</span> {explain(rule.when, params).replace(/\n\s*/g, " ")}
      </p>
      <p className="mt-2 flex items-center gap-1.5 text-body text-ink-2">
        <Icon name="agent" size={16} className="text-ink-3" />
        {owner ? owner.name : <span className="text-critical">Watched by no enabled agent</span>}
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

export function ComplianceView() {
  // The signed-in advisor, from session state: every screen follows the same one.
  const advisorId = useRelay().advisorId;
  const { ruleEdits, editRule, connections, proposalDecisions, decideProposal, book } = useRelay();
  const [declining, setDeclining] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const scope = useMemo(() => scopeFor(advisorId), [advisorId]);
  const [editing, setEditing] = useState<EditableLayer>(scope.layers[0]);
  const [pending, setPending] = useState<{ ruleId: string; field: string; from: string; to: string } | null>(null);
  const [reason, setReason] = useState("");

  const connected = useMemo(
    () => connections.filter((c) => c.advisorId === advisorId && c.status === "connected").map((c) => c.connectorId),
    [connections, advisorId],
  );
  const policy = useMemo(
    () => policyFrom(ruleEdits, { segmentId: scope.segmentId, advisorId }, undefined, book.rules),
    [ruleEdits, advisorId, scope.segmentId, book.rules],
  );
  const resolved = useMemo(() => resolveAgents(ruleEdits, { segmentId: scope.segmentId, advisorId }, undefined, book.rules), [ruleEdits, advisorId, scope.segmentId, book.rules]);
  const agents = resolved.agents;
  const uncovered = useMemo(() => uncoveredMandatoryRules(policy, agents), [policy, agents]);

  // The live sample: record completeness, run through the agents as configured
  // right now. Changing a rule above changes this without a reload.
  const cases = useMemo(() => {
    const report = coverageFor(advisorId, connections, CONNECTORS_DATA.attestations);
    return queue(runScope(policy, { ...coverageFacts(report), availableConnectors: connected }, agents));
  }, [advisorId, connections, policy, connected, agents]);

  // The proposer reads the standing sweep and the past 90 days of findings.
  // Over the session book, as every other screen sweeps it: a connected household's findings count here too.
  const proposed = useMemo(() => propose(policy, sweep(advisorId, policy, connections, book.clients, agents).cases, ruleEdits), [policy, advisorId, connections, book.clients, ruleEdits, agents]);
  const openProposals = proposed.proposals.filter((p) => !proposalDecisions[p.id]);
  const accept = (p: (typeof proposed.proposals)[number]) => {
    editRule({
      actor: "Compliance Principal, accepting an agent proposal",
      target: "rule",
      layer: p.layer,
      layerId: p.layerId,
      ruleId: p.ruleId,
      field: p.field,
      from: p.from,
      to: p.to,
      reason: `Proposed by the rule-change agent (${p.learner}): ${p.rationale} Evidence: ${p.evidence.map((e) => e.id).join(", ")}.`,
    });
    decideProposal(p.id, "accepted", "Accepted as proposed.");
  };

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
        icon="rules"
        title="Rules and desks"
        sub="The rule set is data. A change here is in force on the next evaluation, everywhere, with no release."
      />
      <Brief
        name="Rule proposer"
        icon="flag"
        at="day 0, 06:35"
        says={<>{inForce.length} rules are in force across {agents.filter((a) => a.enabled).length} desks for this advisor{book.rules.length ? `, ${book.rules.length} of them read from a policy document this session` : ""}. I read {proposed.findingsRead} findings from the last {proposed.windowDays} days and {openProposals.length ? <>propose {openProposals.length} change{openProposals.length === 1 ? "" : "s"}, stricter only, for a principal to accept or refuse.</> : "propose nothing today."} {policy.rejected.length ? `${policy.rejected.length} attempted loosening${policy.rejected.length === 1 ? " was refused and stays" : "s were refused and stay"} on the record.` : ""}</>}
        points={openProposals.slice(0, 3).map((p) => ({ text: `${p.ruleTitle}: ${p.field === "enabled" ? (String(p.to) === "true" ? "turn it on" : "turn it off") : `${p.field} from ${p.from} to ${p.to}`}. ${String(p.rationale).replace(/^./, (x) => x.toUpperCase())}`, tone: "caution" as const, icon: "flag" as const }))}
        next={openProposals.length ? { label: "Decide the first proposal", href: "#proposals" } : { label: "Open a desk to tune it or teach it a policy", href: "/agents" }}
        note="Every layer can tighten and none can loosen. A refused change is itself a supervision signal, so it is kept."
      />

      <Section title={openProposals.length ? "Proposed by the agent, waiting on a principal" : "Nothing proposed by the agent"}>
        <div id="proposals" className="scroll-mt-20" />
        <p className="mb-3 max-w-2xl text-body text-ink-2">
          The proposer reads what the other agents keep finding, over the last {proposed.windowDays} days ({proposed.findingsRead} findings) and the
          current sweep, and drafts a change in the stricter direction only. It applies nothing: accepting one appends an edit to the change log in
          your name, through the same resolver as any other change.
        </p>
        {openProposals.length > 0 && (
          <CardGrid cols={2}>
            {openProposals.map((p) => (
              <Card key={p.id} tone="caution" icon="flag" title={p.ruleTitle} sub={`${p.field} ${p.from} to ${p.to}, at the ${p.layer === "firm" ? "firm" : `${p.layer} ${p.layerId}`} layer`} right={<Pill tone="accent">Proposed</Pill>}>
                <p className="text-body text-ink">{p.rationale}</p>
                <ul className="mt-2 space-y-0.5 text-meta text-ink-3">
                  {p.evidence.map((e) => (
                    <li key={e.id}>{e.label}</li>
                  ))}
                </ul>
                {declining === p.id ? (
                  <div className="mt-3">
                    <textarea className={textarea} rows={2} value={declineReason} onChange={(e) => setDeclineReason(e.target.value)} placeholder="Why not. One sentence a supervisor can read later." />
                    <div className="mt-2 flex flex-wrap gap-2">
                      <button type="button" className={btnPrimary} disabled={declineReason.trim().length < 8} onClick={() => { decideProposal(p.id, "declined", declineReason.trim()); setDeclining(null); setDeclineReason(""); }}>Record the refusal</button>
                      <button type="button" className={btn} onClick={() => setDeclining(null)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={btnPrimary} onClick={() => accept(p)}>Accept, in my name</button>
                    <button type="button" className={btn} onClick={() => { setDeclining(p.id); setDeclineReason(""); }}>Decline with a reason</button>
                  </div>
                )}
                <p className="mt-2 text-caption text-ink-3">Learner: {p.learner}. A proposal the resolver would refuse never reaches this screen.</p>
              </Card>
            ))}
          </CardGrid>
        )}
        {proposed.observations.length > 0 && (
          <div className="mt-4 space-y-3">
            {proposed.observations.map((o) => (
              <Card key={o.ruleId} icon="eye" title={`Seen, not proposed: ${o.ruleTitle}`} sub={o.text}>
                <p className="text-body text-ink-2"><span className="font-medium text-ink">Why the agent will not draft this:</span> {o.refusal}</p>
                <ul className="mt-2 space-y-0.5 text-meta text-ink-3">
                  {o.evidence.map((e) => (
                    <li key={e.id}>{e.label}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        )}
        {Object.keys(proposalDecisions).length > 0 && (
          <ul className="mt-3 space-y-0.5 text-meta text-ink-3">
            {Object.entries(proposalDecisions).map(([id, d]) => (
              <li key={id}>{id}: {d.decision}, &ldquo;{d.reason}&rdquo; (this session)</li>
            ))}
          </ul>
        )}
      </Section>

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
        <p className="mb-3 max-w-2xl text-body text-ink-2">Firm, then segment, then advisor, then client. A lower layer can only tighten.</p>
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
        <More summary="What tighten-only means, exactly">
          A lower layer may enable a rule the firm left off, raise a severity, and move a threshold in the stricter
          direction. It may not disable a mandatory rule, lower a severity, or loosen a threshold. A refused change is
          recorded rather than dropped, because a layer that tried to loosen a rule is itself a supervision signal.
        </More>
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
          <p className="mt-2 text-meta text-ink-3">
            Recording appends to the change log. If it would loosen the rule it is refused, and the attempt is kept.
          </p>
        </Card>
      )}

      <Section title={`Review desks, as they stand for ${scope.layers[scope.layers.length - 1].label}`}>
        <p className="mb-3 max-w-2xl text-body text-ink-2">
          One agent per team a legal, risk and compliance function runs. Each detects, classifies and assembles evidence on its own, and dispositions nothing.
        </p>
        <Desks agents={agents} rejected={resolved.rejected} rules={policy.rules} connected={connected} editing={editing} layers={scope.layers} onEdit={(e) => editRule({ actor: `${editing.label} console`, target: "agent", ...e })} />
      </Section>

      <Section title="Live sample: record completeness">
        <p className="mb-3 max-w-2xl text-body text-ink-2">
          The configuration above, run against this advisor&apos;s actual coverage. Change a rule and this changes with it.
        </p>
        {cases.length === 0 ? (
          <Card tone="positive" title="Nothing needs a person">
            <p className="text-body text-ink-2">No rule fired and nothing fell under its confidence floor.</p>
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
                <p className="text-body text-ink">{c.finding}</p>
                <p className="mt-2 text-body text-ink-2">
                  <span className="font-medium text-ink">Suggested:</span> {c.remediation}
                </p>
                <p className="mt-2 text-meta text-ink-3">
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

      <p className="mt-8 text-body text-ink-2">
        Every change lands in the{" "}
        <Link href="/compliance/log" className="underline">
          change log
        </Link>
        , with who made it, when, at which layer and why.
      </p>
    </>
  );
}
