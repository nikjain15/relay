"use client";

// The review desks: one agent per team a legal, risk and compliance function
// runs, as they stand for one advisor, with the layer that set each field and
// the controls to tighten them.
//
// Editing here appends to the same change log the rules use. A lower layer may
// switch a desk on, run it more often, or give it another rule of its scope;
// it may not switch it off, slow it down or take a rule away, and the refusal
// is shown with the attempt rather than swallowed.
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Field, Pill, More, btn, btnPrimary } from "@/components/ui";
import type { AgentDefinition } from "@/lib/compliance/agents";
import { CADENCE_RANK } from "@/lib/compliance/agents";
import type { AgentRejection } from "@/lib/compliance/store";
import type { EffectiveRule } from "@/lib/compliance/policy";
import type { EditableLayer } from "@/lib/compliance/scope";
import type { RuleEdit } from "@/lib/compliance/store";

const CADENCE: Record<AgentDefinition["cadence"], string> = { on_draft: "On every draft and message", on_proposal: "On every proposal", daily: "Daily", weekly: "Weekly" };
const input = "h-8 w-full rounded border border-line-strong bg-surface px-2 text-[13px] text-ink";

export function Desks({ agents, rejected, rules, connected, editing, layers, onEdit }: {
  agents: AgentDefinition[];
  rejected: AgentRejection[];
  rules: EffectiveRule[];
  connected: string[];
  editing: EditableLayer;
  layers: EditableLayer[];
  onEdit: (e: Omit<RuleEdit, "id" | "at" | "actor" | "target">) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [pending, setPending] = useState<{ agentId: string; field: string; from: string; to: string } | null>(null);
  const [reason, setReason] = useState("");
  const label = (layer: string) => layers.find((l) => l.layer === layer)?.label ?? layer;
  const commit = () => {
    if (!pending || reason.trim().length < 8) return;
    onEdit({ layer: editing.layer, layerId: editing.id, agentId: pending.agentId, field: pending.field, from: pending.from, to: pending.to, reason: reason.trim() });
    setPending(null); setReason("");
  };

  return (
    <>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {agents.map((a) => {
          const owned = rules.filter((r) => a.ruleIds.includes(r.id));
          const evaluable = owned.filter((r) => r.requires.every((x) => connected.includes(x)));
          const refused = rejected.filter((r) => r.agentId === a.id);
          const addable = rules.filter((r) => r.scope === a.scope && !a.ruleIds.includes(r.id));
          const faster = (Object.keys(CADENCE_RANK) as AgentDefinition["cadence"][]).filter((c) => CADENCE_RANK[c] > CADENCE_RANK[a.cadence] && (a.scope === "proposal" ? c !== "on_draft" : c !== "on_proposal"));
          const tuned = a.setBy && (a.setBy.enabled !== "firm" || a.setBy.cadence !== "firm" || Object.values(a.setBy.rules).some((l) => l !== "firm"));
          return (
            <div key={a.id} id={`desk-${a.id}`} className={`rounded border p-4 ${a.enabled ? "border-line" : "border-line bg-subtle"}`}>
              <div className="flex items-start gap-3">
                <Icon name="shield" size={20} className="mt-0.5 text-ink-3" />
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] text-ink">{a.desk}</p>
                  <p className="text-[12px] text-ink-3">{a.name} · {a.mirrors}</p>
                </div>
                <Pill tone={a.enabled ? "pass" : "neutral"}>{a.enabled ? "Running" : "Off"}</Pill>
              </div>
              <p className="mt-2 flex flex-wrap gap-1">
                {a.authorities.map((x) => <Pill key={x}>{x}</Pill>)}
              </p>
              <p className="mt-2 text-[13px] text-ink-2">
                {CADENCE[a.cadence]}{a.setBy?.cadence !== "firm" && <Pill tone="accent">set by {label(a.setBy!.cadence)}</Pill>}. {owned.length} rule{owned.length === 1 ? "" : "s"}, {evaluable.length} evaluable with what is connected.
                {tuned && <span className="text-ink-3"> Tuned for this advisor.</span>}
              </p>
              <ul className="mt-1 space-y-0.5 text-[13px]">
                {owned.map((r) => (
                  <li key={r.id} className="flex items-center gap-2">
                    <a href={`#${r.id}`} className="underline">{r.title}</a>
                    {a.setBy?.rules[r.id] && a.setBy.rules[r.id] !== "firm" && <Pill tone="accent">added by {label(a.setBy.rules[r.id])}</Pill>}
                  </li>
                ))}
              </ul>
              {refused.length > 0 && (
                <ul className="mt-2 space-y-1 text-[12px] text-critical">
                  {refused.map((r, i) => <li key={i} className="flex gap-1.5"><Icon name="block" size={16} className="mt-px shrink-0" /><span>Refused at the {label(r.layer)} layer: {r.field} to {r.attempted.replace("_", " ")}. {r.reason}</span></li>)}
                </ul>
              )}
              <button type="button" className={`${btn} mt-3`} onClick={() => setOpen(open === a.id ? null : a.id)} aria-expanded={open === a.id}>{open === a.id ? "Close" : `Tune for ${editing.label}`}</button>
              {open === a.id && (
                <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
                  <Field label="Cadence" hint={faster.length ? "Faster only. A lower layer never slows a desk." : "Already at the fastest cadence for its scope."}>
                    <select className={input} value={pending?.agentId === a.id && pending.field === "cadence" ? pending.to : a.cadence} disabled={!faster.length} onChange={(e) => setPending({ agentId: a.id, field: "cadence", from: a.cadence, to: e.target.value })}>
                      <option value={a.cadence}>{CADENCE[a.cadence]}</option>
                      {faster.map((c) => <option key={c} value={c}>{CADENCE[c]}</option>)}
                    </select>
                  </Field>
                  <Field label="Add a rule" hint={addable.length ? `Rules that read ${a.scope} facts and no desk of yours watches.` : "Every rule of this scope is already watched."}>
                    <select className={input} value={pending?.agentId === a.id && pending.field === "addRule" ? pending.to : ""} disabled={!addable.length} onChange={(e) => e.target.value && setPending({ agentId: a.id, field: "addRule", from: "", to: e.target.value })}>
                      <option value="">Choose a rule</option>
                      {addable.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                    </select>
                  </Field>
                  <Field label="Running" hint={a.enabled ? (editing.layer === "firm" ? "The firm may switch a desk off." : "A lower layer cannot switch a desk off; the attempt is logged and refused.") : "Switching on is always allowed."}>
                    <select className={input} value={pending?.agentId === a.id && pending.field === "enabled" ? pending.to : String(a.enabled)} onChange={(e) => setPending({ agentId: a.id, field: "enabled", from: String(a.enabled), to: e.target.value })}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </Field>
                  {pending?.agentId === a.id && (
                    <div className="sm:col-span-2">
                      <Field label={`Reason for ${pending.field} to ${pending.to.replace("_", " ")}, recorded against ${editing.label}`} hint="Eight characters or more. The change log is the state.">
                        <input className={input} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why this desk should run differently for this layer" />
                      </Field>
                      <p className="mt-2 flex gap-2">
                        <button type="button" className={btnPrimary} disabled={reason.trim().length < 8} onClick={commit}>Record the change</button>
                        <button type="button" className={btn} onClick={() => { setPending(null); setReason(""); }}>Cancel</button>
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <More summary="Why the desks are data, and what an advisor layer may change">
        Each desk is one entry in the agent catalog: the human team it mirrors, the authorities it applies,
        the rules it watches and its cadence. Adding a desk is adding an entry. An advisor&apos;s layer can
        switch a desk on, run it more often or give it another rule of its scope, and every change is an
        entry in the same change log the rules use, replayable to any past moment. It cannot switch a desk
        off, slow it down or take a rule away: the same tighten-only invariant the rule set has, enforced in
        the resolver and shown on the desk when an attempt is refused.
      </More>
    </>
  );
}
