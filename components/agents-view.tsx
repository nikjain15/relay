"use client";

// Agents: what ran, when, over what, and what it left for a person.
//
// One card per agent, one line per fact, a dot with a word. The morning's runs
// as a timeline. The other autonomous parts of the system (the research agent,
// retrieval, the rule-change proposer) sit on the same screen because they are
// the same kind of thing: work done before anyone asked, handed to a person.
import { useEffect, useMemo, useState } from "react";
import type React from "react";
import { ListControls, matches, useList } from "@/components/list-controls";
import { TEMPLATES } from "@/lib/agents/templates";
import { heldAway, walletTotals } from "@/lib/growth/held-away";
import { bookEconomics, economicsTotals } from "@/lib/growth/economics";
import { conversations } from "@/lib/growth/next-conversation";
import { usd } from "@/lib/format";
import { previewTemplate } from "@/lib/agents/preview";
import type { AgentDefinition } from "@/lib/compliance/agents";
import type { RosterAgent } from "@/lib/agents/roster";
import { ON_REQUEST } from "@/lib/agents/roster";
import { explainAgent, explainRoster } from "@/lib/agents/explain";
import { AgentCard } from "@/components/agent-card";
import { DeskEditor, CustomEditor, RosterEditor, CreateAgent } from "@/components/agent-editor";
import { Icon, type IconName } from "@/components/icons";
import Link from "next/link";
import { useRelay } from "@/components/state";
import { useView } from "@/components/view";
import { MORNING } from "@/lib/agents/roster";
import { Brief, CardGrid, More, PageTitle, Section, StatRow, Timeline, btn, btnPrimary } from "@/components/ui";
import { Bars } from "@/components/charts";
import { connectedIds } from "@/lib/compliance/sweep";
import { agentStatuses, activity } from "@/lib/compliance/activity";
import { propose } from "@/lib/compliance/propose";
import { briefAll } from "@/lib/research/brief";
import { corpusStates, corpusConflicts } from "@/lib/evidence/corpus";
import { ADVISORS_DATA } from "@/lib/data";
import { discover } from "@/lib/discovery/discover";

export function AgentsView() {
  // The signed-in advisor, from session state: every screen follows the same one.
  const advisorId = useRelay().advisorId;
  const { ruleEdits, connections, proposalDecisions, book, discoveryDecisions } = useRelay();
  const v = useView();
  const { policy, agents, found, actions, pendingActions } = v;
  const { customAgents, agentRequests, decideAgentRequest, rosterOff } = useRelay();
  const [desk, setDesk] = useState<AgentDefinition | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  const [roster, setRoster] = useState<RosterAgent | null>(null);
  const [creating, setCreating] = useState(false);
  const [template, setTemplate] = useState<string | null>(null);
  const create = (id?: string) => { setTemplate(id ?? null); setCreating(true); };
  const [tab, setTab] = useState<"yours" | "desks" | "morning" | "asked" | "all">("yours");
  const mineCustom = customAgents.filter((c) => c.advisorId === advisorId);
  const requests = agentRequests.filter((r) => r.advisorId === advisorId);
  const off = rosterOff[advisorId] ?? [];
  const open = v.openCases;
  const connected = useMemo(() => connectedIds(advisorId, connections), [advisorId, connections]);
  const statuses = useMemo(() => agentStatuses(agents, policy, found, actions, open, connected), [agents, policy, found, actions, open, connected]);
  const proposals = useMemo(() => propose(policy, open, ruleEdits), [policy, open, ruleEdits]);
  const openProposals = proposals.proposals.filter((p) => !proposalDecisions[p.id]);
  const briefings = useMemo(() => briefAll(connections, book.clients).filter((b) => book.clients.find((c) => c.id === b.clientId)?.advisorId === advisorId), [connections, advisorId, book.clients]);
  const discoveries = useMemo(() => discover(book.clients, book.documents).filter((k) => k.advisorId === advisorId), [book, advisorId]);
  const openDiscoveries = discoveries.filter((k) => !discoveryDecisions[k.id]);
  const unknowns = briefings.reduce((s, b) => s + b.unknowns.length, 0);
  const corpus = corpusStates();
  const stale = corpus.filter((d) => d.usable && d.freshness === "stale").length;
  const conflicts = corpusConflicts().length;
  const advisor = ADVISORS_DATA.find((a) => a.id === advisorId);

  const feed = activity(statuses, [
    { at: "day 0, 06:30", icon: "briefing", title: `Research agent briefed ${briefings.length} households`, meta: `${unknowns} things it could not establish, each with why.`, tone: unknowns ? "caution" : "positive", href: "/research" },
    { at: "day 0, 06:05", icon: "library", title: `Retrieval reviewed ${corpus.length} documents`, meta: `${stale} past review date, ${conflicts} open disagreement${conflicts === 1 ? "" : "s"}.`, tone: stale || conflicts ? "caution" : "positive", href: "/documents" },
    { at: "day 0, 06:40", icon: "search", title: `Discovery read ${book.clients.reduce((n, c) => n + (c.messages?.length ?? 0) + c.notes.length + c.contactHistory.length, 0)} records for what clients said`, meta: `${discoveries.length} candidate opportunities, each cited to its sentence; ${openDiscoveries.length} waiting on a person.`, tone: openDiscoveries.length ? "caution" : "positive", href: "/discovery" },
    { at: "day 0, 06:35", icon: "flag", title: `Proposer read ${proposals.findingsRead} findings from ${proposals.windowDays} days`, meta: `${openProposals.length} rule change${openProposals.length === 1 ? "" : "s"} waiting on a principal, ${proposals.observations.length} seen and not proposed.`, tone: openProposals.length ? "caution" : "positive", href: "/compliance" },
  ]);

  const wallet = walletTotals(heldAway(v.clients));
  const econ = economicsTotals(bookEconomics(v.clients, v.serviceRequests, v.meetings));
  const calls = conversations(v.clients, v.meetings);
  const rosterToday: Record<string, { state: "clear" | "attention"; line: string }> = {
    "held-away": { state: wallet.withSignals ? "attention" : "clear", line: `${wallet.withSignals} household${wallet.withSignals === 1 ? "" : "s"} with money elsewhere, ${usd(wallet.heldAwayStatedUsd)} stated and ${wallet.unstated} amount${wallet.unstated === 1 ? "" : "s"} unstated; wallet share ${wallet.walletSharePct}%.` },
    economics: { state: econ.underServed.length ? "attention" : "clear", line: `${usd(econ.revenueUsd)} estimated a year over ${econ.hours} hours in ${econ.windowDays} days; ${econ.underServed.length} under-served, ${econ.timeHeavy.length} time-heavy.` },
    conversation: { state: "clear", line: calls[0] ? `${calls.length} households ordered; first is ${calls[0].clientName}, ${calls[0].reason.split(":")[0].toLowerCase()}.` : "Nobody to call." },
    research: { state: unknowns ? "attention" : "clear", line: `${briefings.length} briefings, ${unknowns} things not established.` },
    retrieval: { state: stale || conflicts ? "attention" : "clear", line: `${corpus.filter((d) => d.usable).length} current documents, ${stale} past review, ${conflicts} disagreement${conflicts === 1 ? "" : "s"}.` },
    discovery: { state: openDiscoveries.length ? "attention" : "clear", line: `${openDiscoveries.length} candidate${openDiscoveries.length === 1 ? "" : "s"} waiting, ${discoveries.length - openDiscoveries.length} decided.` },
    consequence: { state: "clear", line: "Every option on every proposal carried to the morning after." },
    proposer: { state: openProposals.length ? "attention" : "clear", line: `${openProposals.length} proposed, ${proposals.observations.length} seen and not proposed.` },
    meetings: { state: "clear", line: `${v.meetings.length} meetings today, review packs built.` },
    onboarding: { state: v.escalated.length ? "attention" : "clear", line: `${v.escalated.length} form${v.escalated.length === 1 ? "" : "s"} past the escalation deadline, a reminder drafted for each open form.` },
    ranking: { state: "clear", line: `${v.list.length} on today's list, by ${v.profile.provenance["triage.classWeights"]?.includes("tuned") ? "your tuned" : "the firm's"} weights.` },
  };

  // What each template would flag on this book today, shown before anything is created.
  const templateCounts = useMemo(() => Object.fromEntries(TEMPLATES.map((t) => [t.id, previewTemplate(t, t.param.value, { advisorId, advisorName: advisor?.name ?? advisorId, clients: book.clients, connections, ruleEdits, rules: book.rules }).fired.length])), [advisorId, advisor?.name, book, connections, ruleEdits]);

  // Every agent on one list, so one search finds a desk by the regulation it
  // applies and an advisor's own agent by the word it watches for.
  type Entry = { id: string; group: "desks" | "yours" | "morning" | "asked"; name: string; text: string; needs: boolean; off: boolean; card: React.ReactNode };
  const entries: Entry[] = [
    ...statuses.filter((s) => !s.agent.id.startsWith("custom-")).map((s): Entry => {
      const exp = explainAgent(s.agent, policy.rules);
      return {
        id: s.agent.id, group: "desks", name: s.agent.name, needs: s.state !== "clear", off: !s.agent.enabled,
        text: `${s.agent.name} ${s.agent.desk} ${s.agent.mission} ${s.agent.authorities.join(" ")} ${exp.checks.join(" ")} ${exp.grounded.map((g) => g.label).join(" ")}`,
        card: <AgentCard name={s.agent.name} icon={s.icon} kind="Compliance desk" exp={exp} state={s.state}
          today={<>Last run {s.lastRunAt}. Read {s.scanned}. Raised {s.open}{s.blocking ? `, ${s.blocking} blocking` : ""}{s.needsConfirming ? `, ${s.needsConfirming} to confirm` : ""}. Prepared {s.actionsPrepared} action{s.actionsPrepared === 1 ? "" : "s"}.</>}
          actions={<><Link href={`/agents/${s.agent.id}`} className={btn}>Open: rules and findings</Link><button type="button" className={btn} onClick={() => setDesk(s.agent)}>Edit</button></>} />,
      };
    }),
    ...mineCustom.map((c): Entry => {
      const st = statuses.find((x) => x.agent.id === c.agent.id);
      const hits = open.filter((k) => k.agentId === c.agent.id);
      return {
        id: c.agent.id, group: "yours", name: c.agent.name, needs: hits.length > 0, off: !c.agent.enabled,
        text: `${c.agent.name} ${c.agent.mission} ${c.rule.title} ${String(c.rule.params[0]?.value ?? "")}`,
        card: <AgentCard name={c.agent.name} icon="agent" kind="Your agent" exp={explainAgent(c.agent, policy.rules)} state={c.agent.enabled ? (st?.state ?? "clear") : "off"}
          today={c.agent.enabled ? <>{hits.length ? <>Raised {hits.length} on your book: {hits.slice(0, 4).map((k) => k.subjectLabel.split(":")[0]).join(", ")}{hits.length > 4 ? ` and ${hits.length - 4} more` : ""}.</> : "Ran over your book; nothing fired."} Prepared {st?.actionsPrepared ?? 0} action{st?.actionsPrepared === 1 ? "" : "s"}.</> : "Switched off."}
          actions={<>{hits.length > 0 && <Link href="/supervision" className={btn}>See its findings</Link>}<button type="button" className={btn} onClick={() => setCustom(c.agent.id)}>Edit</button></>} />,
      };
    }),
    ...MORNING.map((a): Entry => ({
      id: a.id, group: "morning", name: a.name, needs: !off.includes(a.id) && rosterToday[a.id]?.state === "attention", off: off.includes(a.id),
      text: `${a.name} ${a.role} ${a.reads} ${a.checks.join(" ")} ${a.basis.map((b) => b.label).join(" ")}`,
      card: <AgentCard name={a.name} icon={a.icon as IconName} kind="Runs on your book" exp={explainRoster(a)} state={off.includes(a.id) ? "off" : rosterToday[a.id]?.state ?? "clear"} today={off.includes(a.id) ? "Switched off by you." : rosterToday[a.id]?.line ?? "Ran."}
        actions={<><Link href={a.href} className={btn}>Open</Link><button type="button" className={btn} onClick={() => setRoster(a)}>Edit</button></>} />,
    })),
    ...ON_REQUEST.map((a): Entry => ({
      id: a.id, group: "asked", name: a.name, needs: false, off: off.includes(a.id),
      text: `${a.name} ${a.role} ${a.reads} ${a.checks.join(" ")} ${a.basis.map((b) => b.label).join(" ")}`,
      card: <AgentCard name={a.name} icon={a.icon as IconName} kind="Runs when you ask" exp={explainRoster(a)} state={off.includes(a.id) ? "off" : "clear"} today={off.includes(a.id) ? "Switched off by you." : "Ready."}
        actions={<><Link href={a.href} className={btn}>Open</Link><button type="button" className={btn} onClick={() => setRoster(a)}>Edit</button></>} />,
    })),
  ];
  const TABS = [
    { id: "yours", title: "Your agents" },
    { id: "desks", title: "Compliance desks" },
    { id: "morning", title: "Every morning" },
    { id: "asked", title: "When you ask" },
    { id: "all", title: "All" },
  ] as const;
  // The filters and the count line work inside the open tab; the tabs count what the search matches.
  const inTab = tab === "all" ? entries : entries.filter((e) => e.group === tab);
  const list = useList<Entry>(inTab, {
    text: (e) => e.text,
    filters: [
      { id: "needs", label: "Needs you", test: (e) => e.needs },
      { id: "off", label: "Switched off", test: (e) => e.off },
    ],
    sorts: [
      { id: "set", label: "As set up", compare: () => 0 },
      { id: "needs", label: "Needs you first", compare: (a, b) => Number(b.needs) - Number(a.needs) },
      { id: "name", label: "Name, A to Z", compare: (a, b) => a.name.localeCompare(b.name) },
    ],
  });
  // A search looks across every agent, so typing moves to All.
  useEffect(() => { if (list.query.trim()) setTab("all"); }, [list.query]);

  // The next step is the desk that most needs the advisor, named, never "the first one" on the page.
  const urgent = [...statuses].filter((st) => st.agent.enabled && st.open > 0).sort((a, b) => b.blocking - a.blocking || b.open - a.open)[0];

  return (
    <>
      <PageTitle icon="agent" title="Agents" sub={`${advisor?.name ?? advisorId}. What ran, over what, and what is left for a person. Open any desk to tune it or teach it a policy.`} action={<button type="button" className={btnPrimary} onClick={() => create()}>Create an agent</button>} />
      <Brief
        name="Agent status"
        says={<>{statuses.filter((s) => s.agent.enabled).length + MORNING.filter((a) => !off.includes(a.id)).length} agents are running for {advisor?.name ?? advisorId}. {open.length} findings are open, {pendingActions.length} prepared actions wait on a person, and {openProposals.length} rule change{openProposals.length === 1 ? "" : "s"} wait on a principal.</>}
        points={statuses.filter((s) => s.state !== "clear").slice(0, 3).map((s) => ({ text: `${s.agent.name}: ${s.open} raised${s.blocking ? `, ${s.blocking} blocking` : ""}`, href: `/agents/${s.agent.id}`, tone: (s.state === "blocked" ? "critical" : "caution") as "critical" | "caution" }))}
        next={urgent
          ? { label: `Open ${urgent.agent.name}: ${urgent.blocking ? `${urgent.blocking} blocking` : `${urgent.open} to review`}`, href: `/agents/${urgent.agent.id}` }
          : { label: "Create an agent", onClick: () => create() }}
        note="Every card below says what the agent is for, what it reads, what it checks, what it prepares and what it never does. Edit any of them; create your own."
      />

      <StatRow
        items={[
          { value: statuses.filter((s) => s.agent.enabled).length + MORNING.filter((a) => !off.includes(a.id)).length, label: "Agents running", icon: "agent" },
          { value: open.length, label: "Findings open", icon: "shield", tone: open.some((c) => c.severity === "block" && c.reason === "fired") ? "critical" : open.length ? "plain" : "positive" },
          { value: pendingActions.length, label: "Actions prepared, waiting on you", icon: "check", tone: pendingActions.length ? "plain" : "positive" },
          { value: openProposals.length, label: "Rule changes proposed", icon: "flag", tone: openProposals.length ? "plain" : "positive" },
        ]}
      />

      <section className="mb-8 rounded border border-line p-4" aria-label="How an agent works here">
        <p className="mb-3 text-body font-medium text-ink">How every agent here works</p>
        <ol className="grid gap-3 text-body sm:grid-cols-4">
          {[
            ["eye", "Reads", "Only what it is pointed at: your book, captured messages, proposals or documents. It writes nothing back."],
            ["rules", "Checks", "Its rules, which you can read in plain words on every card. Every check is arithmetic or a stated condition."],
            ["check", "Prepares", "A finding with its evidence and the next step: a task, a drafted note, a hold. Nothing is sent."],
            ["people", "You decide", "Every finding waits on a person. Tighten a desk yourself; loosening one needs a principal."],
          ].map(([icon, t, d]) => (
            <li key={t} className="flex gap-2"><Icon name={icon as IconName} size={16} className="mt-0.5 shrink-0 text-agent" /><span><span className="font-medium text-ink">{t}.</span> <span className="text-ink-2">{d}</span></span></li>
          ))}
        </ol>
      </section>

      {requests.filter((r) => r.status === "pending").length > 0 && (
        <Section title={`Waiting on a principal (${requests.filter((r) => r.status === "pending").length})`}>
          <ul className="divide-y divide-line rounded border border-line">
            {requests.filter((r) => r.status === "pending").map((r) => (
              <li key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0 text-body">
                  <p className="text-ink">{r.summary}</p>
                  <p className="mt-0.5 text-ink-2">Why: {r.reason}</p>
                </div>
                <span className="flex gap-2">
                  <button type="button" className={btnPrimary} onClick={() => decideAgentRequest(r.id, true, "Principal")}>Approve, as principal</button>
                  <button type="button" className={btn} onClick={() => decideAgentRequest(r.id, false, "Principal")}>Refuse</button>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-meta text-ink-3">In production only a registered principal sees these buttons. Each decision goes in the change log with who made it.</p>
        </Section>
      )}
      {requests.some((r) => r.status !== "pending") && (
        <p className="-mt-4 mb-8 text-meta text-ink-2">
          {requests.filter((r) => r.status !== "pending").map((r) => `${r.status === "approved" ? "Approved" : "Refused"}: ${r.summary}`).join(" ")}{" "}
          <Link className="underline" href="/compliance/log">Change log</Link>
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Agents by kind">
        {TABS.map((g) => (
          <button key={g.id} type="button" role="tab" aria-selected={tab === g.id} className={`${tab === g.id ? btnPrimary : btn} gap-1.5`} onClick={() => setTab(g.id)}>
            {g.title}<span className="tabular-nums opacity-70">{entries.filter((e) => (g.id === "all" || e.group === g.id) && (!list.query.trim() || matches(e.text, list.query))).length}</span>
          </button>
        ))}
      </div>
      <ListControls label="Agents" placeholder="Search agents, rules or regulations, for example 2111" noun={["agent", "agents"]} list={list} allLabel="Any state" />
      {(() => {
        const rows = list.shown.filter((e) => tab === "all" || e.group === tab);
        return (
          <section className="mb-10" role="tabpanel" aria-label={TABS.find((g) => g.id === tab)?.title}>
            {tab === "yours" && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded border border-agent/30 bg-agent-soft/40 p-4">
                <p className="min-w-0 flex-1 text-body text-ink">{mineCustom.length ? `${mineCustom.length} agent${mineCustom.length === 1 ? "" : "s"} you made, running in the same sweep as the desks.` : "Watch something the desks do not. Pick a template, set the number or the words, and see what it would flag on your book before you create it."}</p>
                <button type="button" className={btnPrimary} onClick={() => create()}>Create an agent</button>
              </div>
            )}
            {tab === "yours" && mineCustom.length === 0 && !list.query.trim() && (
              <CardGrid cols={2}>
                {TEMPLATES.map((t) => (
                  <button key={t.id} type="button" onClick={() => create(t.id)} className="rounded border border-line p-4 text-left hover:bg-subtle">
                    <span className="flex items-baseline justify-between gap-2"><span className="text-lead font-semibold text-ink">{t.title}</span><span className="shrink-0 text-meta text-ink-3">{templateCounts[t.id]} on your book today</span></span>
                    <span className="mt-1 block text-body text-ink-2">{t.what}</span>
                    <span className="mt-2 block text-meta text-agent">Start from this template</span>
                  </button>
                ))}
              </CardGrid>
            )}
            {rows.length === 0 && !(tab === "yours" && mineCustom.length === 0 && !list.query.trim()) && <p className="text-body text-ink-2">None match. <button type="button" className="underline" onClick={list.reset}>Show all</button></p>}
            {tab === "all"
              ? TABS.filter((g) => g.id !== "all").map((g) => {
                  const inG = rows.filter((e) => e.group === g.id);
                  return inG.length ? <div key={g.id} className="mb-8"><h2 className="mb-3 text-brief font-semibold text-ink">{g.title} ({inG.length})</h2><CardGrid cols={2}>{inG.map((e) => <div key={e.id} className="contents">{e.card}</div>)}</CardGrid></div> : null;
                })
              : <CardGrid cols={2}>{rows.map((e) => <div key={e.id} className="contents">{e.card}</div>)}</CardGrid>}
          </section>
        );
      })()}

      <DeskEditor agent={desk ? v.agents.find((a) => a.id === desk.id) ?? null : null} onClose={() => setDesk(null)} />
      <CustomEditor id={custom} onClose={() => setCustom(null)} />
      <RosterEditor agent={roster} onClose={() => setRoster(null)} />
      <CreateAgent open={creating} template={template} onClose={() => { setCreating(false); setTemplate(null); }} onCreated={() => setTab("yours")} />

      <div className="grid gap-8 lg:grid-cols-2">
        <Section title="This morning">
          <Timeline items={feed} />
        </Section>
        <Section title="Prepared actions by kind">
          <Bars
            ariaLabel="Prepared actions by kind"
            items={Object.entries(pendingActions.reduce<Record<string, number>>((acc, a) => ((acc[a.kind] = (acc[a.kind] ?? 0) + 1), acc), {}))
              .sort((a, b) => b[1] - a[1])
              .map(([k, n]) => ({ label: k.replace(/_/g, " "), value: n, href: "/supervision" }))}
          />
          {pendingActions.length === 0 && <p className="text-body text-ink-2">Nothing waiting.</p>}
          <p className="mt-3 text-meta text-ink-3">
            <Icon name="block" size={16} className="mr-1 inline align-text-bottom" />
            None of these is sent, scheduled or written anywhere by an agent. Each waits for a person on{" "}
            <Link href="/supervision" className="underline">Supervision</Link>.
          </p>
        </Section>
      </div>

      <More summary="What an agent is here">
        A bundle of rules, a scope, a cadence and an owner, run over the book on its cadence. Detection, classification,
        evidence, the drafted finding, the drafted remediation and the prepared actions are autonomous. Disposition is
        not: anything that fired, anything under its confidence floor, and anything a rule could not evaluate reaches a
        person. The research agent, retrieval and the proposer follow the same rule: they assemble, cite and propose,
        and never decide.
      </More>
    </>
  );
}
