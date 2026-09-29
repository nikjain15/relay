"use client";

// The overview, as the morning inbox.
//
// Four rewrites got this wrong in the same way: each showed everything the
// agents did, and an advisor opening it could not tell what to do first. This
// one is the agents' briefing in the order a person works: what they read
// overnight in one breath; the few things only you can decide; what they
// prepared, grouped by household, each opening beside the list with the whole
// draft and the reasoning; and, folded away, what else ran and ran clean.
// Nothing here vanishes when acted on: a decision stays on screen as a
// recorded outcome with a link to where it went.
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRelay } from "@/components/state";
import { useView } from "@/components/view";
import { MORNING } from "@/lib/agents/roster";
import { useToday } from "@/components/clock";
import { Brief, Legend, More, PageTitle, Pill, Row, Section, StateDot, btn, btnPrimary } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { ActionPanel, ACTION_ICON, type TraceStep } from "@/components/action-panel";
import { briefAll } from "@/lib/research/brief";
import { corpusStates } from "@/lib/evidence/corpus";
import { discover } from "@/lib/discovery/discover";
import { propose } from "@/lib/compliance/propose";
import { simulable } from "@/lib/simulate/simulate";
import { connectedIds } from "@/lib/compliance/sweep";
import { sourceLabel } from "@/lib/profile";
import { KIND, type PreparedAction } from "@/lib/compliance/actions";
import { agentStatuses } from "@/lib/compliance/activity";
import { explain, paramMap } from "@/lib/compliance/dsl";

export function Overview() {
  const { connections, actionDecisions, discoveryDecisions, proposalDecisions, book, ruleEdits, rosterOff } = useRelay();
  // Everything "yours" comes from the one advisor view every screen reads, so a count here is the count on the screen it links to.
  const v = useView();
  const { advisor, policy, found, openCases, actions, pendingActions: pending, coverage, blocking, meetings, overdueTasks: overdue, serviceOverdue, escalated, list: flagged } = v;
  const today = useToday();
  const advisorId = advisor.id;
  const mine = v.clients;
  const agents = useMemo(() => v.agents.filter((a) => a.enabled), [v.agents]);
  // The compute figure is real and so differs between the static export and the
  // browser; it is printed only once the browser has run the engines itself.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // The rest of the overnight run, timed. These engines run here in the browser on the
  // book as it stands, so the figure is real compute and not a label.
  const run = useMemo(() => {
    const t0 = performance.now();
    const briefings = briefAll(connections, book.clients).filter((b) => mine.some((c) => c.id === b.clientId));
    const candidates = discover(book.clients, book.documents).filter((k) => k.advisorId === advisorId && !discoveryDecisions[k.id]);
    const proposals = propose(policy, found.cases, ruleEdits).proposals.filter((p) => !proposalDecisions[p.id]);
    const corpus = corpusStates();
    const simulableOpps = mine.flatMap((c) => simulable(c));
    return { briefings, candidates, proposals, corpus, simulableOpps, ms: Math.max(1, Math.round(performance.now() - t0)) };
  }, [advisorId, policy, found, connections, book, mine, discoveryDecisions, proposalDecisions, ruleEdits]);
  const { briefings, candidates, proposals, corpus, simulableOpps } = run;

  const decided = actions.filter((a) => actionDecisions[a.id]);
  const connected = useMemo(() => connectedIds(advisorId, connections), [advisorId, connections]);
  const statuses = useMemo(() => agentStatuses(agents, policy, found, actions, openCases, connected), [agents, policy, found, actions, openCases, connected]);
  const rankingProfile = v.profile;
  const unknowns = briefings.reduce((s, b) => s + b.unknowns.length, 0);
  const staleDocs = corpus.filter((d) => d.usable && d.freshness === "stale").length;
  const channelsWatched = coverage.channels.filter((c) => c.attested || c.status === "covered").length;
  const recordsRead = found.accountsScanned + found.messagesScanned + corpus.filter((d) => d.usable).length + mine.reduce((s, c) => s + c.notes.length + c.contactHistory.length, 0);

  // A gap is a channel nothing reads; a partial one is read but has no retained copy. They are not the same claim.
  const uncaptured = coverage.gaps.filter((g) => g.status === "gap");
  const unretained = coverage.gaps.filter((g) => g.status === "partial");

  // What only a person can settle, ranked by cost of being wrong.
  const coverageRules = new Set(["off-channel-gap", "sec-17a4-completeness"]);
  const decisions = [
    ...(!coverage.defensible ? [{ icon: "link" as const, tone: "critical" as const, href: "/sources", title: uncaptured.length ? `${uncaptured.length} channel${uncaptured.length === 1 ? "" : "s"} you use ${uncaptured.length === 1 ? "is" : "are"} not captured` : `${unretained.length} channel${unretained.length === 1 ? "" : "s"} captured without a retained copy`, meta: `${uncaptured.length ? `${uncaptured.map((g) => g.channel).join(", ")}: business conducted there cannot be produced on request.` : ""}${uncaptured.length && unretained.length ? " " : ""}${unretained.length ? `${unretained.map((g) => g.channel).join(", ").replace(/^./, (x) => x.toUpperCase())} ${unretained.length === 1 ? "is" : "are"} read but not retained.` : ""}`, right: "Connect" }] : []),
    ...blocking.filter((c) => !coverageRules.has(c.ruleId)).map((c) => ({ icon: "shield" as const, tone: "critical" as const, href: "/supervision", title: c.ruleTitle, meta: `${c.subjectLabel} · ${c.citation}`, right: "Disposition" })),
    ...(escalated.length ? [{ icon: "esign" as const, tone: "caution" as const, href: "/onboarding", title: `${escalated.length} form${escalated.length === 1 ? "" : "s"} past the escalation deadline`, meta: escalated.slice(0, 3).map((w) => w.form).join(", "), right: "Chase" }] : []),
    ...(serviceOverdue.length ? [{ icon: "clock" as const, tone: "caution" as const, href: "/servicing", title: `${serviceOverdue.length} service request${serviceOverdue.length === 1 ? "" : "s"} past target`, meta: serviceOverdue.slice(0, 3).map((r) => `${v.clientOf(r.clientId)?.name ?? r.clientId}: ${r.kind}${r.callbackRequired ? ", callback first" : ""}`).join("; "), right: serviceOverdue.some((r) => r.callbackRequired) ? "Call back" : "Open" }] : []),
    ...(overdue.length ? [{ icon: "check" as const, tone: "caution" as const, href: "/follow-ups", title: `${overdue.length} task${overdue.length === 1 ? "" : "s"} overdue`, meta: overdue.slice(0, 3).map((t) => t.text).join("; "), right: "Open" }] : []),
  ];

  // Prepared actions, grouped by who they are about, worst first inside each group.
  const groups = useMemo(() => {
    const by = new Map<string, PreparedAction[]>();
    for (const a of pending) by.set(a.subjectLabel, [...(by.get(a.subjectLabel) ?? []), a]);
    const weight = (a: PreparedAction) => (a.kind === "hold" ? 3 : a.kind === "draft_note" ? 2 : 1);
    return [...by.entries()].map(([subject, list]) => ({ subject, list: list.sort((x, y) => weight(y) - weight(x)) })).sort((x, y) => Math.max(...y.list.map(weight)) - Math.max(...x.list.map(weight)) || y.list.length - x.list.length);
  }, [pending]);
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? groups : groups.slice(0, 4);
  const [open, setOpen] = useState<PreparedAction | null>(null);
  const close = useCallback(() => setOpen(null), []);

  /** The reasoning behind a prepared action, from the case it came from and the rule as resolved. */
  const traceFor = (a: PreparedAction): TraceStep[] => {
    const c = openCases.find((k) => k.id === a.caseId);
    const rule = policy.rules.find((r) => r.id === a.ruleId);
    if (!c || !rule) return [];
    const facts = Object.entries(c.evidence).filter(([, v]) => v !== undefined && v !== "").slice(0, 6).map(([k, v]) => `${k} = ${Array.isArray(v) ? v.join(", ") : String(v)}`).join("; ");
    return [
      { icon: "eye", who: mine.some((k) => k.id === c.subject) ? "client" : "agent", title: `Read ${c.subjectLabel}`, detail: facts || "No facts recorded." },
      { icon: "rules", who: "agent", title: `Applied ${rule.title}`, detail: <span className="whitespace-pre-line">{explain(rule.when, paramMap(rule))}</span> },
      { icon: (c.reason === "fired" ? "alert" : "question") as IconName, title: c.reason === "fired" ? `Fired at ${c.severity}, confidence ${Math.round(c.confidence * 100)}%` : c.reason === "cannot_evaluate" ? "Could not evaluate: a source is not connected" : `Not sure enough to clear: confidence ${Math.round(c.confidence * 100)}% under the floor`, detail: c.finding, tone: c.reason === "fired" ? "critical" : "caution" },
      { icon: ACTION_ICON[a.kind] ?? "check", who: "agent", title: `Prepared: ${KIND[a.kind].label}`, detail: a.detail.length > 220 ? `${a.detail.slice(0, 220)}...` : a.detail },
      { icon: "people", who: "advisor", title: `Waits for ${KIND[a.kind].actor.toLowerCase()}`, detail: `${a.actor} acts once it is accepted. Relay sends and writes nothing.`, tone: "positive" },
    ];
  };

  // What each morning agent on the roster did today. Names, icons and links come from lib/agents/roster.ts, the one list every page counts.
  const ran: Record<string, { state: "clear" | "attention" | "blocked" | "off"; line: string }> = {
    onboarding: { state: escalated.length ? "attention" : "clear", line: `${escalated.length} form${escalated.length === 1 ? "" : "s"} past the escalation deadline, reminders drafted` },
    consequence: { state: "clear", line: `${simulableOpps.length} proposals carried to the morning after` },
    discovery: { state: candidates.length ? "attention" : "clear", line: `${candidates.length} opportunities found in what clients said` },
    research: { state: unknowns ? "attention" : "clear", line: `${briefings.length} briefings, ${unknowns} things not established` },
    retrieval: { state: staleDocs ? "attention" : "clear", line: `${corpus.filter((d) => d.usable).length} documents, ${staleDocs} past review` },
    proposer: { state: proposals.length ? "attention" : "clear", line: `${proposals.length} rule changes proposed to a principal` },
    meetings: { state: "clear", line: `${meetings.length} meetings today, review packs built` },
    ranking: { state: "clear", line: `${flagged.length} ranked by ${sourceLabel(rankingProfile.provenance["triage.classWeights"]).toLowerCase()} weights; tune them` },
  };
  // An agent the advisor switched off shows as off, and says so.
  const off = rosterOff[advisorId] ?? [];
  const others = MORNING.map((a) => ({ id: a.id, name: a.name, icon: a.icon as IconName, href: off.includes(a.id) ? "/agents" : a.href, ...(off.includes(a.id) ? { state: "off" as const, line: "Switched off by you" } : ran[a.id] ?? { state: "off" as const, line: "Did not run" }) }));
  const clean = statuses.filter((s) => s.state === "clear").length + others.filter((o) => o.state === "clear").length;
  const firstName = (advisor?.name ?? "").split(" ")[0];

  return (
    <>
      <PageTitle icon="home" title={`${today.weekday} morning${firstName ? `, ${firstName}` : ""}`} sub={`${today.live ? `${today.date}, ${today.time}. ` : ""}What the agents did while you were away, and the few things only you can decide.`} />
      <Legend className="-mt-5 mb-6 lg:hidden" />

      <Brief
        name="Overnight"
        at="day 0, 06:40"
        says={<>
          {agents.length + others.filter((o) => o.state !== "off").length} agents read {recordsRead.toLocaleString()} records across {found.accountsScanned} households, {found.messagesScanned} captured messages, {channelsWatched} channels and {corpus.filter((d) => d.usable).length} documents, against {policy.rules.filter((r) => r.enabled).length} rules{mounted ? `, in ${run.ms} ms` : ""}.{" "}
          {decisions.length ? <><span className="font-medium">{decisions.length} thing{decisions.length === 1 ? "" : "s"} need{decisions.length === 1 ? "s" : ""} you</span>, worst first below. </> : "Nothing needs a decision from you. "}
          {pending.length ? <>{pending.length} actions are drafted and waiting; accepting one sends nothing, you do.</> : "Nothing is waiting on you."}{" "}
          {flagged.length ? <>{flagged.length} opportunities are on <Link href="/triage" className="underline">today&apos;s list</Link>.</> : null}
        </>}
        points={[
          ...(meetings.length ? [{ text: `${meetings.length} meetings today; the first is ${meetings[0].time} ${meetings[0].title}. Review packs are built.`, href: "/meetings", icon: "calendar" as IconName }] : []),
          ...(candidates.length ? [{ text: `${candidates.length} things clients said that look like opportunities, each cited to the sentence.`, href: "/discovery", tone: "caution" as const }] : []),
          ...(proposals.length ? [{ text: `${proposals.length} rule change${proposals.length === 1 ? "" : "s"} proposed to a principal, tighten only.`, href: "/compliance", icon: "flag" as IconName }] : []),
        ]}
        next={decisions.length ? { label: `Start with: ${decisions[0].title}`, href: decisions[0].href } : pending.length ? { label: "Review what the agents prepared", onClick: () => setOpen(pending[0]) } : { label: "Open today's list", href: "/triage" }}
        note="Detection, evidence, the drafted remediation and the consequences are the agents'. The decision is not: nothing here sends, writes to a record, clears its own finding or loosens a rule."
      />

      <Section title={`1. Decide now${decisions.length ? ` (${decisions.length})` : ""}`}>
        {decisions.length === 0 ? (
          <p className="text-body text-ink-2">No blocking finding, no uncaptured channel, no overdue item.</p>
        ) : (
          <div className="rounded border border-line px-3 sm:px-4">
            {decisions.map((d, i) => (
              <Row key={`${d.title}-${i}`} icon={d.icon} tone={d.tone} who="advisor" href={d.href} title={d.title} meta={d.meta} right={<span className="flex items-center gap-2"><Pill tone={d.tone === "critical" ? "fail" : "accent"}>{d.tone === "critical" ? "Blocking" : "Overdue"}</Pill><span className={btn}>{d.right}</span></span>} />
            ))}
          </div>
        )}
      </Section>

      <Section title={`2. Review what the agents prepared${pending.length ? ` (${pending.length})` : ""}`}>
        {pending.length === 0 ? (
          <p className="text-body text-ink-2">Nothing waiting. {decided.length ? `${decided.length} decided this session.` : ""}</p>
        ) : (
          <div className="space-y-3">
            {visible.map((g) => (
              <div key={g.subject} className="rounded border border-line px-3 sm:px-4">
                <p className="flex items-center gap-2 border-b border-line py-2 text-meta text-ink-3"><Icon name={mine.some((c) => c.name === g.subject) ? "people" : "agent"} size={16} />{g.subject} · {g.list.length} prepared</p>
                {g.list.map((a) => (
                  <Row
                    key={a.id}
                    icon={ACTION_ICON[a.kind] ?? "check"}
                    tone={a.kind === "hold" ? "critical" : "plain"}
                    who="agent"
                    title={a.title}
                    meta={`${a.agentName} · ${KIND[a.kind].label} · ${KIND[a.kind].actor} acts`}
                    right={<button type="button" className={btnPrimary} onClick={() => setOpen(a)}>Review</button>}
                  />
                ))}
              </div>
            ))}
            {groups.length > 4 && (
              <p className="text-meta"><button type="button" className={btn} onClick={() => setShowAll((v) => !v)}>{showAll ? "Show fewer" : `Show ${groups.length - 4} more households`}</button></p>
            )}
          </div>
        )}
        {decided.length > 0 && (
          <div className="mt-3 rounded border border-line px-3 sm:px-4">
            {decided.map((a) => {
              const d = actionDecisions[a.id];
              return <Row key={a.id} icon={d.decision === "accepted" ? "check" : "block"} tone={d.decision === "accepted" ? "positive" : "plain"} who="advisor" title={a.title} meta={d.decision === "accepted" ? "Recorded. Nothing was sent; you act." : `Declined: ${d.reason ?? ""}`} right={<button type="button" className={btn} onClick={() => setOpen(a)}>Open</button>} />;
            })}
          </div>
        )}
        <p className="mt-2 text-meta text-ink-3">Every finding with what its agent prepared is on <Link href="/supervision" className="underline">Supervision</Link>.</p>
      </Section>

      <Section title={`3. What else ran, ${clean} of ${statuses.length + others.length} clean`}>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3" aria-label="Agents">
          {[...statuses.map((s) => ({ id: s.agent.id, name: s.agent.name, icon: s.icon, state: s.state, line: `${s.open} raised · ${s.actionsPrepared} prepared`, href: `/agents/${s.agent.id}` })), ...others].map((a) => (
            <li key={a.id}>
              <Link href={a.href} className="flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-2 text-meta text-ink hover:bg-selected">
                <Icon name={a.icon} size={16} className="shrink-0 text-agent" />
                <span className="min-w-0 flex-1"><span className="block">{a.name}</span><span className="block truncate text-ink-3">{a.line}</span></span>
                <StateDot state={a.state} />
              </Link>
            </li>
          ))}
        </ul>
        <More summary="What Relay will not do, and where that is enforced">
          <ul className="space-y-1.5">
            <li><span className="font-medium text-ink">Never sends.</span> No module can reach an outbound transport. You send, post and submit.</li>
            <li><span className="font-medium text-ink">Never decides eligibility.</span> Eligibility, ranking, the recipient count, the supervisory regime and every consequence are deterministic code.</li>
            <li><span className="font-medium text-ink">Never clears its own findings.</span> An agent detects and drafts; a principal dispositions.</li>
          </ul>
          Each is enforced by dependency-cruiser and by a test, and each was seen failing on a deliberate violation.
        </More>
      </Section>

      <ActionPanel action={open} trace={traceFor} onClose={close} />
    </>
  );
}
