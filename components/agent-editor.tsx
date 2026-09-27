"use client";

// Edit, turn off, delete or create an agent, in a panel beside the list.
//
// What an advisor may do alone follows the firm's one rule: tighten, never
// loosen. Renaming a desk, describing it, running it more often or giving it
// another rule take effect at once and go in the change log. Switching a desk
// off, running it less often, taking a rule away or removing the desk would
// loosen supervision, so each becomes a request a principal approves or
// refuses; nothing changes until they do. An advisor's own agent is theirs:
// every change to it, deleting included, takes effect at once. Every outcome
// stays on screen after the button is pressed.
import { useMemo, useState } from "react";
import Link from "next/link";
import type { AgentDefinition, Cadence } from "@/lib/compliance/agents";
import { CADENCE_RANK } from "@/lib/compliance/agents";
import { CADENCE_WORDS } from "@/lib/agents/explain";
import { TEMPLATES, fromTemplate, type AgentTemplate } from "@/lib/agents/templates";
import type { RosterAgent } from "@/lib/agents/roster";
import { useRelay } from "@/components/state";
import { useView } from "@/components/view";
import { SidePanel, Field, input, textarea } from "@/components/side-panel";
import { Pill, btn, btnPrimary } from "@/components/ui";
import { Icon } from "@/components/icons";

const CADENCES: Cadence[] = ["on_draft", "on_proposal", "daily", "weekly"];

function Outcome({ lines }: { lines: string[] }) {
  if (!lines.length) return null;
  return (
    <div className="mb-4 rounded border border-positive/40 bg-positive-soft px-3 py-2 text-[13px] text-positive" role="status">
      {lines.map((l, i) => <p key={i} className="flex gap-1.5"><Icon name="check" size={16} className="mt-0.5 shrink-0" />{l}</p>)}
    </div>
  );
}

/** A compliance desk. Tightening applies now; loosening asks a principal. */
export function DeskEditor({ agent, onClose }: { agent: AgentDefinition | null; onClose: () => void }) {
  const { editRule, requestAgentChange, agentRequests, advisorId } = useRelay();
  const v = useView();
  const [name, setName] = useState("");
  const [mission, setMission] = useState("");
  const [reason, setReason] = useState("");
  const [done, setDone] = useState<string[]>([]);
  const [key, setKey] = useState<string | null>(null);
  if (agent && key !== agent.id) { setKey(agent.id); setName(agent.name); setMission(agent.mission); setReason(""); setDone([]); }
  if (!agent) return null;
  const who = v.advisor.name;
  const edit = (field: string, from: string, to: string, why: string) => editRule({ actor: `${who}, Agents`, target: "agent", layer: "advisor", layerId: advisorId, agentId: agent.id, field, from, to, reason: why });
  const ask = (field: string, from: string, to: string, summary: string) => {
    requestAgentChange({ advisorId, agentId: agent.id, agentName: agent.name, field, from, to, reason: reason.trim(), summary });
    setDone((d) => [...d, `Sent to a principal: ${summary} Nothing changes until they approve.`]);
    setReason("");
  };
  const rules = v.policy.rules.filter((r) => agent.ruleIds.includes(r.id));
  const addable = v.policy.rules.filter((r) => r.scope === agent.scope && !agent.ruleIds.includes(r.id));
  const pending = agentRequests.filter((r) => r.agentId === agent.id && r.advisorId === advisorId);
  const needsReason = !reason.trim();

  return (
    <SidePanel open={!!agent} title={`Edit ${agent.name}`} sub="Compliance desk. You can tighten it now; loosening it asks a principal." onClose={onClose}>
      <Outcome lines={done} />
      <Field label="Name" hint="What you call this desk. Changes the wording only.">
        <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="What it is for" hint="One sentence, in your words.">
        <textarea className={textarea} rows={2} value={mission} onChange={(e) => setMission(e.target.value)} />
      </Field>
      <p className="mb-6">
        <button type="button" className={btnPrimary} disabled={name.trim() === agent.name && mission.trim() === agent.mission} onClick={() => {
          if (name.trim() && name.trim() !== agent.name) edit("name", agent.name, name.trim(), "Renamed by the advisor.");
          if (mission.trim() && mission.trim() !== agent.mission) edit("mission", agent.mission, mission.trim(), "Described by the advisor.");
          setDone((d) => [...d, "Saved the name and description."]);
        }}>Save wording</button>
      </p>

      <Field label="How often it runs" hint="Faster applies now. Slower loosens supervision, so it goes to a principal with your reason below.">
        <select className={input} value={agent.cadence} onChange={(e) => {
          const to = e.target.value as Cadence;
          if (CADENCE_RANK[to] >= CADENCE_RANK[agent.cadence]) { edit("cadence", agent.cadence, to, "Run more often, set by the advisor."); setDone((d) => [...d, `Now runs: ${CADENCE_WORDS[to].toLowerCase()}.`]); }
          else if (needsReason) setDone((d) => [...d, "Add a reason below first: running less often needs a principal."]);
          else ask("cadence", agent.cadence, to, `Run ${agent.name} ${CADENCE_WORDS[to].toLowerCase()} instead of ${CADENCE_WORDS[agent.cadence].toLowerCase()}.`);
        }}>
          {CADENCES.map((c) => <option key={c} value={c}>{CADENCE_WORDS[c]}</option>)}
        </select>
      </Field>

      <div className="mb-6">
        <p className="mb-1 text-[12px] font-medium text-ink">Rules it runs ({rules.length})</p>
        <ul className="divide-y divide-line rounded border border-line">
          {rules.map((r) => {
            const mineToRemove = agent.setBy?.rules[r.id] === "advisor";
            return (
              <li key={r.id} className="flex items-start justify-between gap-2 px-3 py-2 text-[13px]">
                <span className="min-w-0 text-ink">{r.title}<span className="block text-[11px] text-ink-3">{r.citation}{r.mandatory ? " · firm-mandatory" : ""}</span></span>
                <button type="button" className={btn} disabled={!mineToRemove && needsReason} onClick={() => {
                  if (mineToRemove) { edit("removeRule", r.id, r.id, "Removed a rule the advisor had added."); setDone((d) => [...d, `Removed "${r.title}".`]); }
                  else ask("removeRule", r.id, r.id, `Take "${r.title}" off ${agent.name}.`);
                }}>{mineToRemove ? "Remove" : "Ask to remove"}</button>
              </li>
            );
          })}
        </ul>
        {addable.length > 0 && (
          <label className="mt-2 block">
            <span className="sr-only">Give this desk another rule</span>
            <select className={input} value="" onChange={(e) => {
              const r = addable.find((x) => x.id === e.target.value);
              if (!r) return;
              edit("addRule", "", r.id, "Given another rule by the advisor.");
              setDone((d) => [...d, `Added "${r.title}". It runs on the next sweep, which is now.`]);
            }}>
              <option value="">Give it another rule of its kind (applies now)</option>
              {addable.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
            </select>
          </label>
        )}
      </div>

      <Field label="Why, for a principal" hint="Needed for anything that loosens supervision: running less often, taking a rule away, switching the desk off or removing it.">
        <textarea className={textarea} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: this desk duplicates the firm's surveillance vendor for my book" />
      </Field>
      <p className="mb-6 flex flex-wrap gap-2">
        <button type="button" className={btn} disabled={needsReason || !agent.enabled} onClick={() => ask("enabled", "true", "false", `Switch ${agent.name} off for ${who}.`)}>Ask to switch it off</button>
        <button type="button" className={btn} disabled={needsReason} onClick={() => ask("deleted", "false", "true", `Remove ${agent.name} from ${who}'s agents.`)}>Ask to delete it</button>
      </p>

      {pending.length > 0 && (
        <div>
          <p className="mb-1 text-[12px] font-medium text-ink">Your requests on this desk</p>
          <ul className="space-y-1 text-[13px]">
            {pending.map((r) => <li key={r.id} className="flex flex-col items-start gap-1 sm:flex-row sm:gap-2"><Pill tone={r.status === "approved" ? "pass" : r.status === "refused" ? "fail" : "accent"}>{r.status === "pending" ? "Waiting on a principal" : r.status}</Pill><span className="text-ink-2">{r.summary}</span></li>)}
          </ul>
        </div>
      )}
      <p className="mt-6 text-[12px]"><Link className="underline" href={`/agents/${agent.id}`}>Open the desk: its findings, and read a written policy into it</Link></p>
    </SidePanel>
  );
}

/** An advisor's own agent: every change applies at once. */
export function CustomEditor({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { customAgents, updateAgent, deleteAgent } = useRelay();
  const v = useView();
  const c = customAgents.find((x) => x.agent.id === id);
  const [form, setForm] = useState<{ name: string; mission: string; value: string; cadence: Cadence } | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [confirm, setConfirm] = useState(false);
  const [key, setKey] = useState<string | null>(null);
  if (c && key !== c.agent.id) { setKey(c.agent.id); setForm({ name: c.agent.name, mission: c.agent.mission, value: String(c.rule.params[0]?.value ?? ""), cadence: c.agent.cadence }); setDone([]); setConfirm(false); }
  if (!id) return null;
  if (!c || !form) {
    return <SidePanel open title="Agent deleted" onClose={onClose}><Outcome lines={done.length ? done : ["Deleted. Its findings closed with it; the deletion is in the change log."]} /></SidePanel>;
  }
  const p = c.rule.params[0];
  const who = `${v.advisor.name}, Agents`;
  const found = v.openCases.filter((k) => k.agentId === c.agent.id).length;
  return (
    <SidePanel open title={`Edit ${c.agent.name}`} sub="Your agent. Every change applies now and goes in the change log." onClose={onClose}>
      <Outcome lines={done} />
      <Field label="Name"><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="What it is for"><textarea className={textarea} rows={2} value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} /></Field>
      {p && (
        <Field label={p.label} hint={p.type === "number" ? `Between ${p.min} and ${p.max}.` : "Matched without regard to case."}>
          <input className={input} type={p.type === "number" ? "number" : "text"} min={p.min} max={p.max} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
        </Field>
      )}
      <Field label="How often it runs">
        <select className={input} value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value as Cadence })}>
          {CADENCES.map((k) => <option key={k} value={k}>{CADENCE_WORDS[k]}</option>)}
        </select>
      </Field>
      <p className="mb-2 text-[12px] text-ink-3">Today it has {found} open finding{found === 1 ? "" : "s"} on your book.</p>
      <p className="mb-6 flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={() => {
          const value = p?.type === "number" ? Math.min(p.max ?? Infinity, Math.max(p.min ?? -Infinity, Number(form.value))) : form.value.trim();
          updateAgent(c.agent.id, { name: form.name.trim() || c.agent.name, mission: form.mission.trim() || c.agent.mission, cadence: form.cadence, ...(p && String(value) !== String(p.value) ? { value } : {}) }, who);
          setDone((d) => [...d, "Saved. It ran again over your book with the new settings."]);
        }}>Save</button>
        <button type="button" className={btn} onClick={() => { updateAgent(c.agent.id, { enabled: !c.agent.enabled }, who); setDone((d) => [...d, c.agent.enabled ? "Switched off. It stops raising findings until you switch it on." : "Switched on."]); }}>{c.agent.enabled ? "Switch off" : "Switch on"}</button>
        {!confirm ? (
          <button type="button" className={btn} onClick={() => setConfirm(true)}>Delete</button>
        ) : (
          <span className="flex flex-wrap items-center gap-2 text-[12px] text-ink-2">Delete {c.agent.name} and close its findings?
            <button type="button" className={btnPrimary} onClick={() => { deleteAgent(c.agent.id, who); setDone(["Deleted. Its findings closed with it; the deletion is in the change log."]); }}>Delete it</button>
            <button type="button" className={btn} onClick={() => setConfirm(false)}>Keep it</button>
          </span>
        )}
      </p>
    </SidePanel>
  );
}

/** Research, retrieval, ranking and the rest: yours to switch off, and the place to go to change how they work. */
export function RosterEditor({ agent, onClose }: { agent: RosterAgent | null; onClose: () => void }) {
  const { rosterOff, setRosterOn, advisorId } = useRelay();
  const [done, setDone] = useState<string[]>([]);
  const [key, setKey] = useState<string | null>(null);
  if (agent && key !== agent.id) { setKey(agent.id); setDone([]); }
  if (!agent) return null;
  const off = (rosterOff[advisorId] ?? []).includes(agent.id);
  return (
    <SidePanel open title={`Edit ${agent.name}`} sub={agent.cadence === "morning" ? "Runs every morning on your book." : "Runs when you ask."} onClose={onClose}>
      <Outcome lines={done} />
      <p className="mb-4 text-[13px] text-ink">{agent.role}</p>
      {agent.id === "ranking" && <p className="mb-4 text-[13px] text-ink-2">Change how it ranks on <Link className="underline" href="/triage#tune" onClick={onClose}>Today&apos;s list, Tune the ranking</Link>: a weight per kind of signal and your list size.</p>}
      {agent.canTurnOff ? (
        <p className="mb-4 flex flex-wrap gap-2">
          <button type="button" className={off ? btnPrimary : btn} onClick={() => { setRosterOn(advisorId, agent.id, off); setDone((d) => [...d, off ? `${agent.name} is on again.` : `${agent.name} is off for you. The Overview shows it as off; switch it on here any time.`]); }}>
            {off ? "Switch it on" : "Switch it off for me"}
          </button>
        </p>
      ) : (
        <p className="mb-4 text-[13px] text-ink-2">Ask stays on: it is how you reach everything else.</p>
      )}
      <p className="text-[12px] text-ink-3">It is part of Relay, so it cannot be deleted; switching it off is yours and needs no principal, because it does not supervise anything.</p>
      <p className="mt-4 text-[12px]"><Link className="underline" href={agent.href} onClick={onClose}>Open what it made</Link></p>
    </SidePanel>
  );
}

/** Make an agent of your own from a template. */
export function CreateAgent({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { createAgent, customAgents } = useRelay();
  const v = useView();
  const [t, setT] = useState<AgentTemplate | null>(null);
  const [form, setForm] = useState({ name: "", mission: "", value: "", cadence: "daily" as Cadence });
  const [made, setMade] = useState<string | null>(null);
  const madeAgent = useMemo(() => customAgents.find((c) => c.agent.id === made), [customAgents, made]);
  const found = made ? v.openCases.filter((k) => k.agentId === made).length : 0;
  const pick = (x: AgentTemplate) => { setT(x); setForm({ name: x.defaultName, mission: x.what, value: String(x.param.value), cadence: x.cadence }); setMade(null); };
  const close = () => { setT(null); setMade(null); onClose(); };
  return (
    <SidePanel open={open} title="Create an agent" sub="Pick what it watches. It runs over your book in the same sweep as the desks, and its findings go to Supervision." onClose={close}>
      {madeAgent ? (
        <>
          <Outcome lines={[`Created ${madeAgent.agent.name}. It ran over your ${v.clients.length} households: ${found} finding${found === 1 ? "" : "s"}.`]} />
          <p className="flex flex-wrap gap-2">
            <Link className={btnPrimary} href="/supervision" onClick={close}>See its findings</Link>
            <button type="button" className={btn} onClick={() => { setT(null); setMade(null); }}>Create another</button>
          </p>
        </>
      ) : !t ? (
        <ul className="space-y-2">
          {TEMPLATES.map((x) => (
            <li key={x.id}>
              <button type="button" className="w-full rounded border border-line p-3 text-left hover:bg-subtle" onClick={() => pick(x)}>
                <span className="block text-[14px] font-medium text-ink">{x.title}</span>
                <span className="mt-0.5 block text-[12px] text-ink-2">{x.what}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          <p className="mb-4 text-[13px] text-ink-2">{t.what}</p>
          <Field label="Name"><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="What it is for"><textarea className={textarea} rows={2} value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} /></Field>
          <Field label={`${t.param.label}${t.param.unit ? ` (${t.param.unit})` : ""}`}>
            <input className={input} type={t.param.type === "number" ? "number" : "text"} min={t.param.min} max={t.param.max} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </Field>
          <Field label="How often it runs">
            <select className={input} value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value as Cadence })}>
              {CADENCES.map((k) => <option key={k} value={k}>{CADENCE_WORDS[k]}</option>)}
            </select>
          </Field>
          <p className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={!form.value.trim()} onClick={() => {
              const value = t.param.type === "number" ? Math.min(t.param.max ?? Infinity, Math.max(t.param.min ?? -Infinity, Number(form.value))) : form.value.trim();
              const c = fromTemplate(t, { advisorId: v.advisor.id, advisorName: v.advisor.name, name: form.name, mission: form.mission, value, cadence: form.cadence, n: customAgents.length + 1 });
              createAgent(c, `${v.advisor.name}, Agents`);
              setMade(c.agent.id);
              onCreated(c.agent.id);
            }}>Create and run it</button>
            <button type="button" className={btn} onClick={() => setT(null)}>Choose another</button>
          </p>
        </>
      )}
    </SidePanel>
  );
}
