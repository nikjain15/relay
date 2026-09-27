"use client";

// Agents: what ran, when, over what, and what it left for a person.
//
// One card per agent, one line per fact, a dot with a word. The morning's runs
// as a timeline. The other autonomous parts of the system (the research agent,
// retrieval, the rule-change proposer) sit on the same screen because they are
// the same kind of thing: work done before anyone asked, handed to a person.
import { useMemo } from "react";
import Link from "next/link";
import { useRelay } from "@/components/state";
import { Brief, Card, CardGrid, More, PageTitle, Section, StatRow, StateDot, Timeline, btn } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Bars } from "@/components/charts";
import { policyFrom, agentsFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep, connectedIds } from "@/lib/compliance/sweep";
import { prepareAll } from "@/lib/compliance/actions";
import { agentStatuses, activity } from "@/lib/compliance/activity";
import { propose } from "@/lib/compliance/propose";
import { briefAll, PROBE_IDS } from "@/lib/research/brief";
import { corpusStates, corpusConflicts } from "@/lib/evidence/corpus";
import { ADVISORS_DATA } from "@/lib/data";
import { discover, EXTRACTORS } from "@/lib/discovery/discover";

export function AgentsView({ advisorId }: { advisorId: string }) {
  const { ruleEdits, connections, caseDispositions, actionDecisions, proposalDecisions, book, discoveryDecisions } = useRelay();
  const scope = useMemo(() => scopeFor(advisorId), [advisorId]);
  const policy = useMemo(() => policyFrom(ruleEdits, scope, undefined, book.rules), [ruleEdits, scope, book.rules]);
  const agents = useMemo(() => agentsFrom(ruleEdits, undefined, scope, book.rules), [ruleEdits, scope, book.rules]);
  const found = useMemo(() => sweep(advisorId, policy, connections, book.clients, agents), [advisorId, policy, connections, book.clients, agents]);
  const open = found.cases.filter((c) => !caseDispositions[c.id]);
  const actions = useMemo(() => prepareAll(open, policy.rules), [open, policy]);
  const pendingActions = actions.filter((a) => !actionDecisions[a.id]);
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

  return (
    <>
      <PageTitle icon="agent" title="Agents" sub={`${advisor?.name ?? advisorId}. What ran, over what, and what is left for a person. Open any desk to tune it or teach it a policy.`} />
      <Brief
        name="Agent status"
        says={<>{statuses.filter((s) => s.agent.enabled).length + 4} agents are running for {advisor?.name ?? advisorId}. {open.length} findings are open, {pendingActions.length} prepared actions wait on a person, and {openProposals.length} rule change{openProposals.length === 1 ? "" : "s"} wait on a principal.</>}
        points={statuses.filter((s) => s.state !== "clear").slice(0, 3).map((s) => ({ text: `${s.agent.name}: ${s.open} raised${s.blocking ? `, ${s.blocking} blocking` : ""}`, href: `/agents/${s.agent.id}`, tone: (s.state === "blocked" ? "critical" : "caution") as "critical" | "caution" }))}
        next={{ label: "Open the first desk", href: `/agents/${statuses[0]?.agent.id ?? ""}` }}
      />

      <StatRow
        items={[
          { value: statuses.filter((s) => s.agent.enabled).length + 4, label: "Agents running", icon: "agent" },
          { value: open.length, label: "Findings open", icon: "shield", tone: open.some((c) => c.severity === "block" && c.reason === "fired") ? "critical" : open.length ? "plain" : "positive" },
          { value: pendingActions.length, label: "Actions prepared, waiting on you", icon: "check", tone: pendingActions.length ? "plain" : "positive" },
          { value: openProposals.length, label: "Rule changes proposed", icon: "flag", tone: openProposals.length ? "plain" : "positive" },
        ]}
      />

      <Section title="Compliance agents">
        <CardGrid cols={2}>
          {statuses.map((s) => (
            <Card key={s.agent.id} icon={s.icon} title={s.agent.name} sub={`${s.cadenceLabel}. Last run ${s.lastRunAt}.`} right={<StateDot state={s.state} />}>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-[auto_1fr]">
                <dt className="text-ink-3">Read</dt><dd className="text-ink">{s.scanned}</dd>
                <dt className="text-ink-3">Rules</dt><dd className="text-ink">{s.rulesWatched} in force, {s.rulesEvaluable} evaluable{s.rulesOff ? `, ${s.rulesOff} switched off` : ""}</dd>
                <dt className="text-ink-3">Raised</dt><dd className="text-ink">{s.open}{s.blocking ? `, ${s.blocking} blocking` : ""}{s.needsConfirming ? `, ${s.needsConfirming} to confirm` : ""}{s.cannotEvaluate ? `, ${s.cannotEvaluate} not evaluable` : ""}</dd>
                <dt className="text-ink-3">Prepared</dt><dd className="text-ink">{s.actionsPrepared} action{s.actionsPrepared === 1 ? "" : "s"}</dd>
              </dl>
              <p className="mt-2 text-[12px]">
                <Link href={`/agents/${s.agent.id}`} className={btn}>Open, tune, teach a policy</Link>
              </p>
            </Card>
          ))}
        </CardGrid>
      </Section>

      <Section title="The other agents">
        <CardGrid cols={4}>
          <Card icon="search" title="Discovery" sub={`Over every message, note and contact summary. ${EXTRACTORS.length} event kinds.`} right={<StateDot state={openDiscoveries.length ? "attention" : "clear"} />}>
            <p className="text-[13px] text-ink">{openDiscoveries.length} candidate{openDiscoveries.length === 1 ? "" : "s"} waiting, {discoveries.length - openDiscoveries.length} decided.</p>
            <p className="mt-2 text-[12px]"><Link href="/discovery" className="underline">Discoveries</Link></p>
          </Card>
          <Card icon="briefing" title="Research" sub="Before each conversation. Twelve probes." right={<StateDot state={unknowns ? "attention" : "clear"} />}>
            <p className="text-[13px] text-ink">{briefings.length} briefings, {unknowns} things not established.</p>
            <p className="mt-1 text-[12px] text-ink-3">{PROBE_IDS.length} probes: {PROBE_IDS.slice(0, 5).join(", ")}, and more.</p>
            <p className="mt-2 text-[12px]"><Link href="/research" className="underline">Briefings</Link></p>
          </Card>
          <Card icon="library" title="Retrieval" sub="On every opportunity. Cites or refuses." right={<StateDot state={stale || conflicts ? "attention" : "clear"} />}>
            <p className="text-[13px] text-ink">{corpus.filter((d) => d.usable).length} current documents, {stale} past review, {conflicts} disagreement{conflicts === 1 ? "" : "s"}.</p>
            <p className="mt-2 text-[12px]"><Link href="/documents" className="underline">Library</Link></p>
          </Card>
          <Card icon="flag" title="Rule-change proposer" sub="Over 90 days of findings. Stricter only." right={<StateDot state={openProposals.length ? "attention" : "clear"} />}>
            <p className="text-[13px] text-ink">{openProposals.length} proposed, {proposals.observations.length} seen and not proposed.</p>
            <p className="mt-2 text-[12px]"><Link href="/compliance" className="underline">Proposals</Link></p>
          </Card>
        </CardGrid>
      </Section>

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
          {pendingActions.length === 0 && <p className="text-[13px] text-ink-2">Nothing waiting.</p>}
          <p className="mt-3 text-[12px] text-ink-3">
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
