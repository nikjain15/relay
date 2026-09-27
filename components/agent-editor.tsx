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
import { previewTemplate, runAgent, type Preview, type PreviewInput } from "@/lib/agents/preview";
import { explain, paramMap } from "@/lib/compliance/dsl";
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
    <div className="mb-4 rounded border border-positive/40 bg-positive-soft px-3 py-2 text-body text-positive" role="status">
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
        <p className="mb-1 text-meta font-medium text-ink">Rules it runs ({rules.length})</p>
        <ul className="divide-y divide-line rounded border border-line">
          {rules.map((r) => {
            const mineToRemove = agent.setBy?.rules[r.id] === "advisor";
            return (
              <li key={r.id} className="flex items-start justify-between gap-2 px-3 py-2 text-body">
                <span className="min-w-0 text-ink">{r.title}<span className="block text-caption text-ink-3">{r.citation}{r.mandatory ? " · firm-mandatory" : ""}</span></span>
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
          <p className="mb-1 text-meta font-medium text-ink">Your requests on this desk</p>
          <ul className="space-y-1 text-body">
            {pending.map((r) => <li key={r.id} className="flex flex-col items-start gap-1 sm:flex-row sm:gap-2"><Pill tone={r.status === "approved" ? "pass" : r.status === "refused" ? "fail" : "accent"}>{r.status === "pending" ? "Waiting on a principal" : r.status}</Pill><span className="text-ink-2">{r.summary}</span></li>)}
          </ul>
        </div>
      )}
      <p className="mt-6 text-meta"><Link className="underline" href={`/agents/${agent.id}`}>Open the desk: its findings, and read a written policy into it</Link></p>
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
      <p className="mb-2 text-meta text-ink-3">Today it has {found} open finding{found === 1 ? "" : "s"} on your book.</p>
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
          <span className="flex flex-wrap items-center gap-2 text-meta text-ink-2">Delete {c.agent.name} and close its findings?
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
      <p className="mb-4 text-body text-ink">{agent.role}</p>
      {agent.id === "ranking" && <p className="mb-4 text-body text-ink-2">Change how it ranks on <Link className="underline" href="/triage#tune" onClick={onClose}>Today&apos;s list, Tune the ranking</Link>: a weight per kind of signal and your list size.</p>}
      {agent.canTurnOff ? (
        <p className="mb-4 flex flex-wrap gap-2">
          <button type="button" className={off ? btnPrimary : btn} onClick={() => { setRosterOn(advisorId, agent.id, off); setDone((d) => [...d, off ? `${agent.name} is on again.` : `${agent.name} is off for you. The Overview shows it as off; switch it on here any time.`]); }}>
            {off ? "Switch it on" : "Switch it off for me"}
          </button>
        </p>
      ) : (
        <p className="mb-4 text-body text-ink-2">Ask stays on: it is how you reach everything else.</p>
      )}
      <p className="text-meta text-ink-3">It is part of Relay, so it cannot be deleted; switching it off is yours and needs no principal, because it does not supervise anything.</p>
      <p className="mt-4 text-meta"><Link className="underline" href={agent.href} onClick={onClose}>Open what it made</Link></p>
    </SidePanel>
  );
}

/** Make an agent of your own from a template. */
export function CreateAgent({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (id: string) => void }) {
  const { createAgent, customAgents, connections, ruleEdits, book } = useRelay();
  const v = useView();
  const [t, setT] = useState<AgentTemplate | null>(null);
  const [form, setForm] = useState({ name: "", mission: "", value: "", cadence: "daily" as Cadence });
  const [made, setMade] = useState<string | null>(null);
  const madeAgent = useMemo(() => customAgents.find((c) => c.agent.id === made), [customAgents, made]);
  const x: PreviewInput = { advisorId: v.advisor.id, advisorName: v.advisor.name, clients: book.clients, connections, ruleEdits, rules: book.rules };
  const clamp = (tt: AgentTemplate, raw: string): number | string => tt.param.type === "number" ? Math.min(tt.param.max ?? Infinity, Math.max(tt.param.min ?? -Infinity, Number(raw) || 0)) : raw.trim();
  // The draft run over the real book, as the setting changes: nothing is created blind.
  const preview = useMemo(() => (t && String(form.value).trim() ? previewTemplate(t, clamp(t, form.value), x) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, form.value, v.advisor.id, book, connections, ruleEdits]);
  // Words are ordered by what they find on this book; numbers keep their own order.
  const quick = useMemo(() => (t ? t.param.suggestions.map((sv) => ({ v: sv, n: previewTemplate(t, sv, x).fired.length })).sort((p, q) => (t.param.type === "text" ? q.n - p.n : 0)) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, v.advisor.id, book, connections, ruleEdits]);
  const result = madeAgent ? runAgent(madeAgent, x) : null;
  const pick = (y: AgentTemplate) => { setT(y); setForm({ name: y.defaultName, mission: y.what, value: String(y.param.value), cadence: y.cadence }); setMade(null); };
  const close = () => { setT(null); setMade(null); onClose(); };
  const draftRule = t ? t.rule("draft", clamp(t, form.value || String(t.param.value))) : null;
  return (
    <SidePanel open={open} title="Create an agent" sub={`It runs over ${v.advisor.name}'s ${v.clients.length} households in the same sweep as the desks, and its findings go to Supervision.`} onClose={close}>
      {madeAgent && result ? (
        <>
          <Outcome lines={[`Created ${madeAgent.agent.name} and ran it over your ${result.read.households} households${result.read.messages ? ` and ${result.read.messages} captured messages` : ""}: ${result.fired.length} finding${result.fired.length === 1 ? "" : "s"}.`]} />
          <Findings p={result} />
          <p className="mt-4 flex flex-wrap gap-2">
            {result.fired.length > 0
              ? <Link className={btnPrimary} href="/supervision" onClick={close}>Open them on Supervision</Link>
              : <button type="button" className={btnPrimary} onClick={close}>Done: it keeps watching</button>}
            <button type="button" className={btn} onClick={() => { setT(null); setMade(null); }}>Create another</button>
          </p>
          <p className="mt-3 text-meta text-ink-3">It stays on the Agents page under Your agents, where you can edit, switch off or delete it. Kept for this session; in production it is a versioned write to your profile.</p>
        </>
      ) : !t ? (
        <>
          <p className="mb-3 text-body text-ink-2">Pick what it watches. Each is one rule in the engine&apos;s own shape; you set the number or the words and see what it would flag before you create it.</p>
          <ul className="space-y-2">
            {TEMPLATES.map((y) => {
              const n = previewTemplate(y, y.param.value, x).fired.length;
              return (
                <li key={y.id}>
                  <button type="button" className="w-full rounded border border-line p-3 text-left hover:bg-subtle" onClick={() => pick(y)}>
                    <span className="flex items-baseline justify-between gap-2"><span className="text-lead font-medium text-ink">{y.title}</span><span className="shrink-0 text-meta text-ink-3">{n} on your book today</span></span>
                    <span className="mt-0.5 block text-meta text-ink-2">{y.what}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : (
        <>
          <p className="mb-4 text-body text-ink-2">{t.what}</p>
          <Field label={`${t.param.label}${t.param.unit ? ` (${t.param.unit})` : ""}`}>
            <input className={input} type={t.param.type === "number" ? "number" : "text"} min={t.param.min} max={t.param.max} value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          </Field>
          <div className="-mt-2 mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Quick picks">
            {quick.map((q) => (
              <button key={String(q.v)} type="button" aria-pressed={String(q.v) === form.value} onClick={() => setForm({ ...form, value: String(q.v) })}
                className={`rounded border px-2 py-1 text-meta ${String(q.v) === form.value ? "border-ink bg-ink text-surface" : "border-line bg-surface text-ink-2 hover:bg-subtle"}`}>
                {String(q.v)}{t.param.type === "number" && t.param.unit ? ` ${t.param.unit.split(" ")[0]}` : ""} · {q.n}
              </button>
            ))}
          </div>

          <section className="mb-4 rounded border border-agent/30 bg-agent-soft/40 p-3" aria-label="What it would find" aria-live="polite">
            <p className="text-meta font-medium text-agent">Preview on your book, before anything is created</p>
            {draftRule && <p className="mt-1 text-meta text-ink-2">Fires when {explain(draftRule.when, paramMap(draftRule)).replace(/\n\s*/g, " ")}.</p>}
            {preview ? <Findings p={preview} /> : <p className="mt-2 text-body text-ink-2">Set a value to see what it would flag.</p>}
          </section>

          <Field label="Name"><input className={input} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
          <Field label="What it is for"><textarea className={textarea} rows={2} value={form.mission} onChange={(e) => setForm({ ...form, mission: e.target.value })} /></Field>
          <Field label="How often it runs">
            <select className={input} value={form.cadence} onChange={(e) => setForm({ ...form, cadence: e.target.value as Cadence })}>
              {CADENCES.map((k) => <option key={k} value={k}>{CADENCE_WORDS[k]}</option>)}
            </select>
          </Field>
          <p className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={!String(form.value).trim()} onClick={() => {
              const c = fromTemplate(t, { advisorId: v.advisor.id, advisorName: v.advisor.name, name: form.name, mission: form.mission, value: clamp(t, form.value), cadence: form.cadence, n: customAgents.length + 1 });
              createAgent(c, `${v.advisor.name}, Agents`);
              setMade(c.agent.id);
              onCreated(c.agent.id);
            }}>Create and run it</button>
            <button type="button" className={btn} onClick={() => setT(null)}>Choose another</button>
          </p>
          <p className="mt-3 text-meta text-ink-3">Adding a watch only tightens supervision, so it needs no principal. It never sends and never clears its own findings.</p>
        </>
      )}
    </SidePanel>
  );
}

/** What an agent found or would find: each household with the finding in its own words. */
function Findings({ p }: { p: Preview }) {
  return (
    <div className="mt-2">
      <p className="text-body text-ink">{p.fired.length === 0 ? `Nothing fires on your ${p.read.households} households${p.read.messages ? ` or ${p.read.messages} messages` : ""} at this setting.` : `Would flag ${p.fired.length} of ${p.read.households} households${p.read.messages ? ` and ${p.read.messages} messages` : ""}:`}</p>
      {p.fired.length > 0 && (
        <ul className="mt-1.5 space-y-1 text-meta text-ink-2">
          {p.fired.slice(0, 8).map((c) => <li key={c.id} className="flex gap-1.5"><Icon name="alert" size={16} className="mt-px shrink-0 text-caution" /><span>{c.finding}</span></li>)}
          {p.fired.length > 8 && <li className="text-ink-3">and {p.fired.length - 8} more.</li>}
        </ul>
      )}
      {p.cannotEvaluate.length > 0 && <p className="mt-1.5 text-meta text-caution">{p.cannotEvaluate.length} household{p.cannotEvaluate.length === 1 ? "" : "s"} it cannot evaluate: a source it needs is not connected. It says so rather than clear them.</p>}
    </div>
  );
}
