"use client";

// One review desk: what it watches, what it raised, what it needs, how to
// tune it for this advisor, and how to teach it a firm's written policy.
//
// Editing lives here rather than three screens away, because a person who
// wants to change how a desk runs is looking at the desk. Two kinds of change
// are possible and both go through the same change log. Tuning moves a
// cadence or gives the desk an existing rule, under the tighten-only
// invariant. Reading a policy document proposes new rules from its sentences,
// each cited to the sentence, and a person adds the ones that say what the
// firm meant. Nothing here is in force until a person records it.
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRelay } from "@/components/state";
import { explainAgent } from "@/lib/agents/explain";
import { DeskEditor } from "@/components/agent-editor";
import { Grounded } from "@/components/agent-card";
import { Icon } from "@/components/icons";
import { Brief, Card, Legend, More, PageTitle, Pill, Row, Section, StateDot, Trace, Who, btn, btnPrimary, textarea, inputSmall } from "@/components/ui";
import { Desks } from "@/components/desks";
import { ADVISORS_DATA } from "@/lib/data";
import { AGENTS } from "@/lib/compliance/agents";
import { scopeFor, type EditableLayer } from "@/lib/compliance/scope";
import { policyFrom, resolveAgents } from "@/lib/compliance/store";
import { sweep, connectedIds } from "@/lib/compliance/sweep";
import { prepareAll } from "@/lib/compliance/actions";
import { agentStatuses } from "@/lib/compliance/activity";
import { explain, paramMap } from "@/lib/compliance/dsl";
import { readPolicy, toRule, SAMPLE_POLICY, type CandidateRule, type PolicyReading } from "@/lib/compliance/policy-import";
import { CATALOG } from "@/lib/connectors/catalog";

const SEVERITY_LABEL = { note: "Note", flag: "Flag for review", block: "Block" } as const;

export function AgentDetail({ agentId }: { agentId: string }) {
  // The signed-in advisor, from session state: every screen follows the same one.
  const advisorId = useRelay().advisorId;
  const [editingDesk, setEditingDesk] = useState(false);
  const { ruleEdits, editRule, connections, caseDispositions, actionDecisions, book, addRule } = useRelay();
  const scope = useMemo(() => scopeFor(advisorId), [advisorId]);
  const [editing, setEditing] = useState<EditableLayer>(scope.layers[scope.layers.length - 1]);
  const policy = useMemo(() => policyFrom(ruleEdits, scope, undefined, book.rules), [ruleEdits, scope, book.rules]);
  const resolved = useMemo(() => resolveAgents(ruleEdits, scope, undefined, book.rules), [ruleEdits, scope, book.rules]);
  const agent = resolved.agents.find((a) => a.id === agentId) ?? AGENTS.find((a) => a.id === agentId)!;
  const connected = useMemo(() => connectedIds(advisorId, connections), [advisorId, connections]);
  const found = useMemo(() => sweep(advisorId, policy, connections, book.clients, resolved.agents), [advisorId, policy, connections, book.clients, resolved.agents]);
  const open = found.cases.filter((c) => !caseDispositions[c.id]);
  const actions = useMemo(() => prepareAll(open, policy.rules), [open, policy]);
  const status = useMemo(() => agentStatuses([agent], policy, found, actions, open, connected)[0], [agent, policy, found, actions, open, connected]);
  const mine = open.filter((c) => c.agentId === agent.id);
  const rules = policy.rules.filter((r) => agent.ruleIds.includes(r.id));
  const missing = [...new Set(rules.flatMap((r) => r.requires.filter((x) => !connected.includes(x))))];
  const advisor = ADVISORS_DATA.find((a) => a.id === advisorId);
  const pending = actions.filter((a) => a.agentName === agent.name && !actionDecisions[a.id]).length;

  // Reading a policy.
  const [text, setText] = useState("");
  const [docName, setDocName] = useState("policy.md");
  const [reading, setReading] = useState<PolicyReading | null>(null);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [added, setAdded] = useState<Record<string, string>>({});
  const file = useRef<HTMLInputElement>(null);
  const read = (t: string, name: string) => { setText(t); setDocName(name); setReading(readPolicy(t, name)); };
  const onFile = async (f: File) => read(await f.text(), f.name);
  const deskFor = (c: CandidateRule) => resolved.agents.find((a) => a.enabled && a.scope === c.scope);
  const add = (c: CandidateRule) => {
    const desk = deskFor(c);
    if (!desk) return;
    const reason = (reasons[c.id] ?? "").trim() || `From ${docName}, paragraph ${c.paragraph}: "${c.sentence}".`;
    addRule(toRule(c), desk.id, `${editing.label} console, from ${docName}`, reason);
    setAdded((s) => ({ ...s, [c.id]: desk.id }));
  };

  return (
    <>
      <PageTitle icon={status.icon} title={agent.desk} sub={`${agent.name}. ${agent.mirrors}`} />
      <Legend className="-mt-5 mb-6 lg:hidden" />
      <Brief
        name={agent.name}
        icon={status.icon}
        at={agent.lastRunAt}
        says={<>
          I read {status.scanned} for {advisor?.name ?? advisorId} against {status.rulesWatched} rule{status.rulesWatched === 1 ? "" : "s"}{status.rulesEvaluable < status.rulesWatched ? `, ${status.rulesWatched - status.rulesEvaluable} of which I could not evaluate because a source is not connected` : ""}.{" "}
          {mine.length ? <>I raised {mine.length} finding{mine.length === 1 ? "" : "s"}{status.blocking ? `, ${status.blocking} blocking` : ""}, and prepared {status.actionsPrepared} action{status.actionsPrepared === 1 ? "" : "s"}{pending ? `; ${pending} still wait on you` : ""}.</> : "Nothing fired and nothing fell under a confidence floor."}
        </>}
        points={[
          ...mine.slice(0, 3).map((c) => ({ text: `${c.ruleTitle}: ${c.subjectLabel}`, href: "/supervision", tone: (c.severity === "block" && c.reason === "fired" ? "critical" : "caution") as "critical" | "caution" })),
          ...missing.map((m) => ({ text: `${CATALOG.find((c) => c.id === m)?.name ?? m} is not connected, so I report cannot evaluate rather than clear.`, href: "/sources", tone: "caution" as const, icon: "link" as const })),
        ]}
        next={mine.length ? { label: "Open the findings", href: "/supervision" } : missing.length ? { label: "Connect the missing source", href: "/sources" } : { label: "Read a policy into this desk", href: "#policy" }}
        steps={[
          { icon: "eye", who: "agent", title: `Read ${status.scanned}`, detail: `Cadence: ${status.cadenceLabel.toLowerCase()}.` },
          { icon: "rules", who: "agent", title: `Applied ${rules.length} rules`, detail: rules.map((r) => r.title).join("; ") },
          { icon: "shield", who: "agent", title: "Raised what fired and what I was not sure of", detail: "A rule under its confidence floor reaches a person even when it clears." },
          { icon: "people", who: "advisor", title: "Left every disposition to a person", detail: "I never clear my own findings." },
        ]}
      />

      {(() => {
        const x = explainAgent(agent, policy.rules);
        return (
          <section className="mb-6 rounded border border-line p-4" aria-label="What this desk does">
            <p className="text-lead text-ink">{x.role}</p>
            <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-body sm:grid-cols-[6rem_1fr]">
              <dt className="text-ink-3">Reads</dt><dd className="text-ink-2">{x.reads}</dd>
              <dt className="text-ink-3">Checks</dt><dd className="text-ink-2">{x.checks.join("; ")}</dd>
              <dt className="text-ink-3">Prepares</dt><dd className="text-ink-2">{x.prepares.join("; ")}</dd>
              <dt className="text-ink-3">Runs</dt><dd className="text-ink-2">{x.runs}</dd>
              <dt className="text-ink-3">Never</dt><dd className="text-ink-2">{x.never}</dd>
              <dt className="text-ink-3">How</dt><dd className="text-ink-2">{x.method}</dd>
              <dt className="text-ink-3">Built on</dt><dd className="text-ink-2"><Grounded exp={x} /></dd>
            </dl>
            <p className="mt-3 flex flex-wrap gap-2"><button type="button" className={btn} onClick={() => setEditingDesk(true)}>Edit this desk</button><a className="self-center text-meta underline" href="#policy">Read a written policy into it</a></p>
          </section>
        );
      })()}
      <DeskEditor agent={editingDesk ? agent : null} onClose={() => setEditingDesk(false)} />

      <div className="mb-6 flex flex-wrap items-center gap-2 text-body">
        <StateDot state={status.state} />
        <Pill tone={agent.enabled ? "pass" : "neutral"}>{agent.enabled ? "Running" : "Off"}</Pill>
        {agent.authorities.map((x) => <Pill key={x}>{x}</Pill>)}
        <span className="text-ink-3">{status.cadenceLabel}. Last run {agent.lastRunAt}.</span>
      </div>

      <Section title={`Rules this desk watches (${rules.length})`}>
        <p className="mb-3 max-w-2xl text-body text-ink-2">Each rule is data: a stated condition over facts computed from the book, the settings a layer may tighten, what the desk prepares when it fires, and the text it is built on with where that text stands in law today.</p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {rules.map((r) => {
            const gone = r.requires.filter((x) => !connected.includes(x));
            const addedBy = agent.setBy?.rules[r.id];
            const fired = mine.filter((c) => c.ruleId === r.id).length;
            return (
              <section key={r.id} id={`rule-${r.id}`} aria-label={r.title} className={`scroll-mt-20 rounded border p-4 ${gone.length ? "border-caution/40" : "border-line"}`}>
                <header className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="min-w-0 text-lead font-semibold text-ink">{r.title}</h3>
                  <Pill tone={r.severity === "block" ? "fail" : r.severity === "flag" ? "accent" : "neutral"}>{SEVERITY_LABEL[r.severity]}</Pill>
                </header>
                <p className="mt-0.5 text-meta text-ink-3">{r.authority} · {r.citation}{r.mandatory ? " · firm-mandatory" : ""}{book.rules.some((x) => x.id === r.id) ? " · from a policy document" : ""}{addedBy && addedBy !== "firm" ? ` · added by ${scope.layers.find((l) => l.layer === addedBy)?.label ?? addedBy}` : ""}</p>
                <dl className="mt-3 grid gap-x-3 gap-y-1.5 text-body sm:grid-cols-[7rem_1fr]">
                  <dt className="text-ink-3">Fires when</dt><dd className="text-ink">{explain(r.when, paramMap(r)).replace(/\n\s*/g, " ")}</dd>
                  {r.params.length > 0 && <><dt className="text-ink-3">Settings</dt><dd className="text-ink-2">{r.params.map((p) => `${p.label}: ${String(p.value)}${p.min !== undefined && p.max !== undefined ? ` (bounds ${p.min} to ${p.max}${p.stricter ? `, stricter is ${p.stricter}` : ""})` : ""}`).join("; ")}{r.params.some((p) => p.note) && <span className="block text-meta text-ink-3">{r.params.map((p) => p.note).filter(Boolean).join(" ")}</span>}</dd></>}
                  <dt className="text-ink-3">Prepares</dt><dd className="text-ink-2">{explainAgent({ ...agent, ruleIds: [r.id] }, [r]).prepares.join("; ")}</dd>
                  <dt className="text-ink-3">Needs</dt><dd className={gone.length ? "text-caution" : "text-ink-2"}>{r.requires.length ? r.requires.map((x) => `${CATALOG.find((c) => c.id === x)?.name ?? x}${connected.includes(x) ? "" : " (not connected)"}`).join(", ") : "Nothing beyond the book"}</dd>
                  <dt className="text-ink-3">In law</dt><dd className="text-ink-2">{r.status?.text ?? "Not a regulation: a rule the firm or an advisor added."}{r.status?.pending && <span className="block text-caution">Not yet in force: {r.status.pending}</span>}</dd>
                  <dt className="text-ink-3">Source</dt><dd>{r.sources?.length ? r.sources.map((x, i) => <span key={x.url + x.label}>{i > 0 && "; "}<a className="underline decoration-line-strong" href={x.url} target="_blank" rel="noreferrer">{x.label}</a></span>) : <span className="text-ink-3">{book.rules.some((x) => x.id === r.id) ? "The sentence it was read from, in the change log" : "None cited"}</span>}</dd>
                  <dt className="text-ink-3">Today</dt><dd className="text-ink">{gone.length ? "Cannot evaluate until its source is connected." : fired ? `Raised ${fired} for ${advisor?.name ?? "you"}.` : "Nothing fired."}</dd>
                </dl>
                <p className="mt-3"><Link href={`/compliance#${r.id}`} className={btn}>Change this rule</Link></p>
              </section>
            );
          })}
        </div>
      </Section>

      <Section title={mine.length ? `Findings it raised (${mine.length})` : "Findings it raised"}>
        {mine.length === 0 ? <p className="text-body text-ink-2">None open.</p> : (
          <div className="rounded border border-line px-3 sm:px-4">
            {mine.map((c) => (
              <Row key={c.id} icon={c.reason === "fired" ? "alert" : "question"} tone={c.severity === "block" && c.reason === "fired" ? "critical" : "caution"} who="agent" href="/supervision" title={c.ruleTitle} meta={`${c.subjectLabel} · ${c.finding}`} right={<Pill tone={c.reason === "fired" ? (c.severity === "block" ? "fail" : "accent") : "neutral"}>{c.reason === "fired" ? SEVERITY_LABEL[c.severity] : c.reason === "cannot_evaluate" ? "No source" : "Confirm"}</Pill>} />
            ))}
          </div>
        )}
      </Section>

      <Section title={`Tune this desk for ${editing.label}`}>
        <p className="mb-3 flex flex-wrap items-center gap-2 text-body text-ink-2">
          Editing as
          {scope.layers.map((l) => <button key={l.id} type="button" className={editing.id === l.id ? btnPrimary : btn} aria-pressed={editing.id === l.id} onClick={() => setEditing(l)}>{l.label}</button>)}
          <span className="text-ink-3">A lower layer can only tighten; a refused change stays in the log.</span>
        </p>
        <Desks agents={[agent]} rejected={resolved.rejected} rules={policy.rules} connected={connected} editing={editing} layers={scope.layers} onEdit={(e) => editRule({ actor: `${editing.label} console`, target: "agent", ...e })} />
      </Section>

      <Section title="Teach this desk a policy">
        <div id="policy" className="scroll-mt-20">
          <p className="mb-3 max-w-2xl text-body text-ink-2">
            Paste or drop a written supervisory procedure. The reader turns each sentence that carries an obligation into a candidate rule in the same shape the engine runs, cited to the sentence. You add the ones that say what the firm meant; each is in force on the next sweep and lands in the change log in your name.
          </p>
          <div className="grid gap-3 lg:grid-cols-[3fr_2fr]">
            <div>
              <textarea className={`${textarea} min-h-[10rem] font-mono text-meta`} value={text} onChange={(e) => setText(e.target.value)} placeholder="An account whose client is 65 years of age or older with a new third-party contact must be flagged for review (FINRA Rule 2165)." aria-label="Policy text" />
              <p className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} disabled={text.trim().length < 12} onClick={() => read(text, docName)}>Read the policy</button>
                <button type="button" className={btn} onClick={() => file.current?.click()}>Choose a .md or .txt</button>
                <button type="button" className={btn} onClick={() => read(SAMPLE_POLICY, "written-supervisory-procedures-s4.md")}>Use the sample procedure</button>
                <input ref={file} type="file" accept=".md,.txt" className="sr-only" aria-label="Choose a policy file" onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }} />
              </p>
            </div>
            <Card icon="agent" title="What the reader does">
              <ul className="space-y-1 text-body text-ink-2">
                <li>Keeps only sentences with an obligation: must, may not, is required.</li>
                <li>Matches the facts the engines compute, by the words a policy uses for them.</li>
                <li>Reads the number and the comparator beside each fact.</li>
                <li>Takes severity from the verb: a prohibition blocks, a review flags.</li>
                <li>Cites the rule the sentence cites, or the paragraph.</li>
              </ul>
              <p className="mt-2 text-meta text-ink-3">This is the deterministic reader. In production a model reads the sentence more freely; it still only proposes, and what it proposes is still this data.</p>
            </Card>
          </div>

          {reading && (
            <div className="mt-4">
              <Brief
                name="Policy reader"
                icon="document"
                says={<>I read {reading.sentences} sentences in {reading.paragraphs} paragraphs of {reading.documentName} in {reading.ms} ms. {reading.candidates.length} carry an obligation over facts I can evaluate; {reading.skipped.filter((s) => s.why.startsWith("An obligation")).length} carry an obligation I cannot evaluate; the rest are not rules.</>}
                next={reading.candidates.length ? { label: `Review the ${reading.candidates.length} candidates`, href: "#candidates" } : undefined}
              />
              <div id="candidates" className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {reading.candidates.map((c) => {
                  const desk = deskFor(c);
                  const done = added[c.id];
                  const blocked = c.unresolved.length > 0 || !desk;
                  return (
                    <Card key={c.id} icon="rules" title={c.title} sub={<span className="italic">&ldquo;{c.sentence}.&rdquo; Paragraph {c.paragraph}.</span>} tone={done ? "positive" : blocked ? "caution" : "plain"} right={<Pill tone={c.severity === "block" ? "fail" : c.severity === "flag" ? "accent" : "neutral"}>{SEVERITY_LABEL[c.severity]}</Pill>}>
                      <p className="text-body text-ink-2"><span className="font-medium text-ink">Fires when</span> {explain(c.when, paramMap(c)).replace(/\n\s*/g, " ")}</p>
                      <p className="mt-1 text-meta text-ink-3">{c.authority} · {c.citation} · reads {c.scope} facts · confidence {Math.round(c.confidence * 100)}%{c.overlaps.length ? ` · overlaps ${c.overlaps.join(", ")}` : ""}</p>
                      {c.unresolved.length > 0 && <ul className="mt-2 space-y-0.5 text-meta text-caution">{c.unresolved.map((u, i) => <li key={i}>{u}</li>)}</ul>}
                      <Trace steps={c.trace.map((t) => ({ icon: "eye" as const, title: t }))} summary="How it was read" />
                      {done ? (
                        <p className="mt-3 text-body text-positive"><Icon name="check" size={16} className="mr-1 inline align-text-bottom" />Added to {resolved.agents.find((a) => a.id === done)?.desk}. In force on the next sweep; <Link href="/compliance/log" className="underline">in the change log</Link>.</p>
                      ) : (
                        <div className="mt-3">
                          <input className={`${inputSmall} w-full`} value={reasons[c.id] ?? ""} onChange={(e) => setReasons((s) => ({ ...s, [c.id]: e.target.value }))} placeholder="Why this rule, in one line (optional; the sentence is cited either way)" aria-label="Reason" />
                          <p className="mt-2 flex flex-wrap items-center gap-2">
                            <button type="button" className={btnPrimary} disabled={blocked} onClick={() => add(c)}>{desk ? `Add to ${desk.desk}` : "No desk reads these facts"}</button>
                            <span className="text-meta text-ink-3"><Who who="advisor" />Recorded as {editing.label}.</span>
                          </p>
                        </div>
                      )}
                    </Card>
                  );
                })}
              </div>
              {reading.skipped.length > 0 && (
                <More summary={`${reading.skipped.length} sentences read and not proposed, with why`}>
                  <ul className="space-y-1">
                    {reading.skipped.map((s, i) => <li key={i}><span className="text-ink">&ldquo;{s.sentence}.&rdquo;</span> <span className="text-ink-3">{s.why}</span></li>)}
                  </ul>
                </More>
              )}
            </div>
          )}
        </div>
      </Section>
    </>
  );
}
