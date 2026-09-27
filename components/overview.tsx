"use client";

// The overview, as an agent console.
//
// Three rewrites got this wrong in the same way. The first was a site map. The
// second led with counts but explained itself in paragraphs. The third was an
// agent briefing that still ended in six rows of CRM navigation, and read as an
// advisor tool with agents bolted on.
//
// This one is the system's own report, in the order a person needs it: what the
// agents read and did while nobody was looking, with the compute it took; what
// only a person can decide; what is prepared and waiting; and under every line,
// on demand, how the agent got there. The book, the rules and the settings are
// one click away in the navigation and are not restated here.
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRelay } from "@/components/state";
import { Banner, Legend, More, PageTitle, Pill, Row, Section, StateDot, Timeline, Trace, btn, btnPrimary } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { Bars, Meter } from "@/components/charts";
import { briefAll } from "@/lib/research/brief";
import { corpusStates } from "@/lib/evidence/corpus";
import { discover } from "@/lib/discovery/discover";
import { propose } from "@/lib/compliance/propose";
import { simulable } from "@/lib/simulate/simulate";
import { SERVICE_REQUESTS, CONNECTORS_DATA } from "@/lib/data";
import { openItems } from "@/lib/onboarding/status";
import { triage } from "@/lib/servicing/classify";
import { todaysMeetings } from "@/lib/meetings/prep";
import { allTasks } from "@/lib/followups";
import { APP } from "@/lib/data/policy";
import { policyFrom, agentsFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep, connectedIds } from "@/lib/compliance/sweep";
import { coverageFor } from "@/lib/connectors/coverage";
import { rank } from "@/lib/ranking/rank";
import { prepareAll, KIND } from "@/lib/compliance/actions";
import { agentStatuses, activity } from "@/lib/compliance/activity";
import { explain, paramMap } from "@/lib/compliance/dsl";

const ACTION_ICON: Record<string, IconName> = { draft_note: "email", task: "check", schedule: "calendar", callback: "voice", request_form: "esign", connect_source: "link", hold: "block" };

export function Overview({ advisorId }: { advisorId: string }) {
  const { ruleEdits, connections, caseDispositions, dismissed, actionDecisions, decideAction, discoveryDecisions, proposalDecisions, book } = useRelay();
  const scope = useMemo(() => scopeFor(advisorId), [advisorId]);
  // The compute figure is real and so differs between the static export and the
  // browser; it is printed only once the browser has run the engines itself.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const policy = useMemo(() => policyFrom(ruleEdits, scope), [ruleEdits, scope]);
  const mine = useMemo(() => book.clients.filter((c) => c.advisorId === advisorId), [book.clients, advisorId]);

  const agents = useMemo(() => agentsFrom(ruleEdits, undefined, scope).filter((a) => a.enabled), [ruleEdits, scope]);

  // The overnight run, timed. Every engine runs here in the browser on the
  // book as it stands, so the figure is real compute and not a label.
  const run = useMemo(() => {
    const t0 = performance.now();
    const found = sweep(advisorId, policy, connections, book.clients, agents);
    const briefings = briefAll(connections, book.clients).filter((b) => mine.some((c) => c.id === b.clientId));
    const candidates = discover(book.clients, book.documents).filter((k) => k.advisorId === advisorId && !discoveryDecisions[k.id]);
    const proposals = propose(policy, found.cases, ruleEdits).proposals.filter((p) => !proposalDecisions[p.id]);
    const corpus = corpusStates();
    const simulableOpps = mine.flatMap((c) => simulable(c));
    return { found, briefings, candidates, proposals, corpus, simulableOpps, ms: Math.max(1, Math.round(performance.now() - t0)) };
  }, [advisorId, policy, connections, book, mine, discoveryDecisions, proposalDecisions, ruleEdits, agents]);
  const { found, briefings, candidates, proposals, corpus, simulableOpps } = run;

  const coverage = useMemo(() => coverageFor(advisorId, connections, CONNECTORS_DATA.attestations), [advisorId, connections]);
  const openCases = found.cases.filter((c) => !caseDispositions[c.id]);
  const actions = useMemo(() => prepareAll(openCases, policy.rules), [openCases, policy]);
  const pending = actions.filter((a) => !actionDecisions[a.id]);
  const connected = useMemo(() => connectedIds(advisorId, connections), [advisorId, connections]);
  const statuses = useMemo(() => agentStatuses(agents, policy, found, actions, openCases, connected), [agents, policy, found, actions, openCases, connected]);
  const blocking = openCases.filter((c) => c.severity === "block" && c.reason === "fired");
  const meetings = todaysMeetings();
  const overdue = allTasks().filter((t) => t.dueDay < 0);
  const service = triage(SERVICE_REQUESTS);
  const escalated = mine.flatMap(openItems).filter((w) => w.status === "escalated");
  const flagged = useMemo(() => rank(book.opportunities.filter((o) => mine.some((c) => c.id === o.householdId)), new Set(Object.keys(dismissed))), [dismissed, book, mine]);
  const unknowns = briefings.reduce((s, b) => s + b.unknowns.length, 0);
  const staleDocs = corpus.filter((d) => d.usable && d.freshness === "stale").length;
  const channelsWatched = coverage.channels.filter((c) => c.attested || c.status === "covered").length;
  const recordsRead = found.accountsScanned + found.messagesScanned + corpus.filter((d) => d.usable).length + mine.reduce((s, c) => s + c.notes.length + c.contactHistory.length, 0);

  // The whole agent layer in one row, compliance agents and the rest alike.
  const others: { id: string; name: string; icon: IconName; state: "clear" | "attention" | "blocked" | "off"; line: string; href: string }[] = [
    { id: "research", name: "Research", icon: "briefing", state: unknowns ? "attention" : "clear", line: `${briefings.length} briefings, ${unknowns} unknown`, href: "/research" },
    { id: "retrieval", name: "Retrieval", icon: "library", state: staleDocs ? "attention" : "clear", line: `${corpus.filter((d) => d.usable).length} documents, ${staleDocs} past review`, href: "/documents" },
    { id: "discovery", name: "Discovery", icon: "search", state: candidates.length ? "attention" : "clear", line: `${candidates.length} candidates waiting`, href: "/discovery" },
    { id: "proposer", name: "Rule proposer", icon: "flag", state: proposals.length ? "attention" : "clear", line: `${proposals.length} changes proposed`, href: "/compliance" },
    { id: "consequence", name: "Consequences", icon: "hourglass", state: "clear", line: `${simulableOpps.length} proposals carried to the morning after`, href: "/simulate" },
  ];

  // What only a person can settle, ranked by cost of being wrong.
  const coverageRules = new Set(["off-channel-gap", "sec-17a4-completeness"]);
  const decisions = [
    ...blocking.filter((c) => !coverageRules.has(c.ruleId)).map((c) => ({ icon: "shield" as const, tone: "critical" as const, href: "/supervision", title: c.ruleTitle, meta: `${c.subjectLabel} · ${c.citation}`, right: "Blocking" })),
    ...(escalated.length ? [{ icon: "esign" as const, tone: "caution" as const, href: "/onboarding", title: `${escalated.length} form${escalated.length === 1 ? "" : "s"} past the escalation deadline`, meta: escalated.slice(0, 3).map((w) => w.form).join(", "), right: "Escalated" }] : []),
    ...(service.filter((r) => r.overdue).length ? [{ icon: "clock" as const, tone: "caution" as const, href: "/servicing", title: `${service.filter((r) => r.overdue).length} service request${service.filter((r) => r.overdue).length === 1 ? "" : "s"} past target`, meta: "Money movement needs a callback to a number on file", right: "Overdue" }] : []),
    ...(overdue.length ? [{ icon: "check" as const, tone: "caution" as const, href: "/follow-ups", title: `${overdue.length} task${overdue.length === 1 ? "" : "s"} overdue`, meta: overdue.slice(0, 3).map((t) => t.text).join("; "), right: "Overdue" }] : []),
  ];

  const byAgent = Object.entries(openCases.reduce<Record<string, number>>((acc, c) => ((acc[c.agentName] = (acc[c.agentName] ?? 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]);
  const otherFindings = openCases.filter((c) => !blocking.includes(c) && !coverageRules.has(c.ruleId));
  const grouped = Object.values(
    otherFindings.reduce<Record<string, { key: string; title: string; agent: string; reason: (typeof otherFindings)[number]["reason"]; subjects: string[] }>>((acc, c) => {
      const key = `${c.ruleId}:${c.reason}`;
      const g = (acc[key] ??= { key, title: c.reason === "low_confidence" ? `Confirm the inputs behind "${c.ruleTitle}"` : c.ruleTitle, agent: c.agentName, reason: c.reason, subjects: [] });
      g.subjects.push(c.subjectLabel);
      return acc;
    }, {}),
  );

  /** The reasoning behind a prepared action, from the case it came from and the rule as resolved. */
  const traceFor = (a: (typeof actions)[number]) => {
    const c = openCases.find((k) => k.id === a.caseId);
    const rule = policy.rules.find((r) => r.id === a.ruleId);
    if (!c || !rule) return [];
    const facts = Object.entries(c.evidence).filter(([, v]) => v !== undefined && v !== "").slice(0, 6).map(([k, v]) => `${k} = ${Array.isArray(v) ? v.join(", ") : String(v)}`).join("; ");
    return [
      { icon: "eye" as const, who: (mine.some((k) => k.id === c.subject) ? "client" : "agent") as "client" | "agent", title: `Read ${c.subjectLabel}`, detail: facts || "No facts recorded." },
      { icon: "rules" as const, who: "agent" as const, title: `Applied ${rule.title}`, detail: <span className="whitespace-pre-line">{explain(rule.when, paramMap(rule))}</span> },
      { icon: (c.reason === "fired" ? "alert" : "question") as IconName, title: c.reason === "fired" ? `Fired at ${c.severity}, confidence ${Math.round(c.confidence * 100)}%` : c.reason === "cannot_evaluate" ? "Could not evaluate: a source is not connected" : `Not sure enough to clear: confidence ${Math.round(c.confidence * 100)}% under the floor`, detail: c.finding, tone: (c.reason === "fired" ? "critical" : "caution") as "critical" | "caution" },
      { icon: ACTION_ICON[a.kind] ?? "check", who: "agent" as const, title: `Prepared: ${KIND[a.kind].label}`, detail: a.detail.length > 220 ? `${a.detail.slice(0, 220)}...` : a.detail },
      { icon: "people" as const, who: "advisor" as const, title: `Waits for ${KIND[a.kind].actor.toLowerCase()}`, detail: `${a.actor} acts once it is accepted. Relay sends and writes nothing.`, tone: "positive" as const },
    ];
  };

  return (
    <>
      <PageTitle title="Overview" sub={`${APP.todayLabel} morning. What ran while you were away, and what only you can decide.`} />
      <Legend className="-mt-5 mb-6 lg:hidden" />

      <section className="mb-8 rounded border border-line bg-subtle p-4 sm:p-5" aria-label="Overnight run">
        <p className="flex items-start gap-2 text-[14px] text-ink">
          <Icon name="agent" size={20} className="mt-0.5 text-ink-3" />
          <span>
            <span className="font-medium">{agents.length + others.length} agents ran over the book.</span>{" "}
            {recordsRead.toLocaleString()} records read across {found.accountsScanned} households, {found.messagesScanned} captured messages, {channelsWatched} channels and {corpus.filter((d) => d.usable).length} documents, against {policy.rules.filter((r) => r.enabled).length} rules in force{mounted ? `, in ${run.ms} ms of compute` : ""}.
          </span>
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { value: decisions.length, label: "Need a decision", icon: "alert" as IconName, tone: decisions.length ? "text-critical" : "text-positive" },
            { value: pending.length, label: "Actions prepared, waiting on you", icon: "check" as IconName, tone: "text-ink" },
            { value: openCases.length, label: `Findings, ${blocking.length} blocking`, icon: "shield" as IconName, tone: blocking.length ? "text-critical" : "text-ink" },
            { value: flagged.length, label: "Opportunities on today's list", icon: "list" as IconName, tone: "text-ink" },
          ].map((s) => (
            <div key={s.label} className="rounded border border-line bg-surface px-3 py-3">
              <div className="flex items-baseline gap-1.5">
                <Icon name={s.icon} size={16} className="translate-y-px text-ink-3" />
                <p className={`text-2xl font-light leading-none ${s.tone}`}>{s.value}</p>
              </div>
              <p className="mt-1.5 text-[11px] text-ink-3">{s.label}</p>
            </div>
          ))}
        </div>
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Agents">
          {[...statuses.map((s) => ({ id: s.agent.id, name: s.agent.name, icon: s.icon, state: s.state, line: `${s.open} raised · ${s.actionsPrepared} prepared`, href: "/agents" })), ...others].map((a) => (
            <li key={a.id}>
              <Link href={a.href} className="flex items-center gap-2 rounded border border-line bg-surface px-2.5 py-1.5 text-[12px] text-ink hover:bg-selected">
                <Icon name={a.icon} size={16} className="text-ink-3" />
                <span>{a.name}</span>
                <StateDot state={a.state} />
                <span className="hidden text-ink-3 md:inline">{a.line}</span>
              </Link>
            </li>
          ))}
        </ul>
        <More summary="What the agents may and may not do">
          Detection, classification, evidence assembly, the drafted remediation and the consequences of a
          proposed action are autonomous. The disposition is not: nothing here sends, schedules, writes to a
          record, clears its own finding or loosens a rule. A rule whose source is not connected reports that
          it cannot be evaluated rather than reporting a clear.
        </More>
      </section>

      {!coverage.defensible && (
        <Banner tone="critical" title="The record is not defensible yet">
          {coverage.gaps.map((g) => g.channel).join(", ")} in use with nothing capturing {coverage.gaps.length === 1 ? "it" : "them"}. Business conducted on an uncaptured channel cannot be produced on request.{" "}
          <Link href="/connectors" className="underline">Close the gaps</Link>.
        </Banner>
      )}

      <Section title={decisions.length ? "Needs you, worst first" : "Nothing needs you"}>
        {decisions.length === 0 ? (
          <p className="text-[13px] text-ink-2">No blocking finding, no uncaptured channel, no overdue item. The day starts on <Link href="/triage" className="underline">today&apos;s list</Link>.</p>
        ) : (
          <div className="rounded border border-line px-3 sm:px-4">
            {decisions.map((d, i) => (
              <Row key={`${d.title}-${i}`} icon={d.icon} tone={d.tone} who="advisor" href={d.href} title={d.title} meta={d.meta} right={<Pill tone={d.tone === "critical" ? "fail" : "accent"}>{d.right}</Pill>} />
            ))}
          </div>
        )}
      </Section>

      {pending.length > 0 && (
        <Section title="Prepared for you, worst first">
          <div className="rounded border border-line px-3 sm:px-4">
            {pending.slice(0, 6).map((a) => (
              <Row
                key={a.id}
                icon={ACTION_ICON[a.kind] ?? "check"}
                tone={a.kind === "hold" ? "critical" : "plain"}
                who="agent"
                title={a.title}
                meta={`${a.subjectLabel === a.agentName ? a.agentName : `${a.subjectLabel} · ${a.agentName}`} · ${KIND[a.kind].label}`}
                right={
                  <span className="flex gap-1.5">
                    <button type="button" className={btnPrimary} onClick={() => decideAction(a.id, "accepted")}>Accept</button>
                    <button type="button" className={btn} onClick={() => decideAction(a.id, "declined")}>Decline</button>
                  </span>
                }
              >
                <Trace steps={traceFor(a)} />
              </Row>
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">
            {pending.length > 6 ? `${pending.length - 6} more on ` : "All of them, with the finding behind each, on "}
            <Link href="/supervision" className="underline">Supervision</Link>. Accepting sends nothing; you do.
          </p>
        </Section>
      )}

      <Section title="What the other agents left">
        <div className="rounded border border-line px-3 sm:px-4">
          <Row icon="hourglass" href="/simulate" title={`${simulableOpps.length} proposals carried through to the morning after`} meta="Every option graded on Liquidity, concentration, the sweep and what a supervisor will ask, before anyone acts" right={<Icon name="chevron" size={16} className="text-ink-3" />} />
          <Row icon="search" href="/discovery" tone={candidates.length ? "caution" : "plain"} title={`${candidates.length} opportunities found in what clients said`} meta="Each cited to its sentence, with a confidence; you accept or decline" right={<Icon name="chevron" size={16} className="text-ink-3" />} />
          <Row icon="briefing" href="/research" tone={unknowns ? "caution" : "plain"} title={`${briefings.length} briefings, ${unknowns} things not established`} meta="Observed kept apart from inferred; every claim cites a field" right={<Icon name="chevron" size={16} className="text-ink-3" />} />
          <Row icon="flag" href="/compliance" tone={proposals.length ? "caution" : "plain"} title={`${proposals.length} rule changes proposed to a principal`} meta="Tighten only, each with the findings behind it" right={<Icon name="chevron" size={16} className="text-ink-3" />} />
          <Row icon="calendar" href="/meetings" title={`${meetings.length} meetings today, review packs built`} meta="What changed, the gaps, the decisions and the open items" right={<Icon name="chevron" size={16} className="text-ink-3" />} />
        </div>
      </Section>

      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <Section title="This morning">
          <Timeline items={activity(statuses).slice(0, 6)} />
        </Section>
        <Section title="By the numbers">
          <p className="mb-2 text-[12px] text-ink-3">Open findings by agent</p>
          {byAgent.length ? <Bars ariaLabel="Open findings by agent" items={byAgent.map(([agent, n]) => ({ label: agent, value: n, href: "/supervision" }))} /> : <p className="text-[13px] text-ink-2">None open.</p>}
          <p className="mb-2 mt-5 text-[12px] text-ink-3">Channels the advisor uses</p>
          <Meter
            ariaLabel="Attested channels by coverage"
            segments={[
              { label: "Captured", value: coverage.channels.filter((c) => c.attested && c.status === "covered").length, tone: "positive" },
              { label: "No retained copy", value: coverage.channels.filter((c) => c.attested && c.status === "partial").length, tone: "caution" },
              { label: "Not captured", value: coverage.gaps.length, tone: "critical" },
            ]}
          />
          <p className="mt-2 text-[12px] text-ink-2">{found.messagesScanned} captured messages swept{found.messagesNotSwept.length ? `, ${found.messagesNotSwept.length} not swept` : ""}.</p>
        </Section>
      </div>

      {grouped.length > 0 && (
        <Section title="Also raised, not blocking">
          <div className="rounded border border-line px-3 sm:px-4">
            {grouped.map((g) => (
              <Row key={g.key} icon={g.reason === "cannot_evaluate" ? "alert" : "eye"} tone={g.reason === "cannot_evaluate" ? "caution" : "plain"} href="/supervision" title={g.title}
                meta={`${g.subjects.length === 1 ? g.subjects[0] : `${g.subjects.length} accounts: ${g.subjects.join(", ")}`} · ${g.agent}`}
                right={<Pill tone={g.reason === "fired" ? "accent" : "neutral"}>{g.reason === "cannot_evaluate" ? "No source" : g.reason === "low_confidence" ? "Confirm" : "Flag"}</Pill>} />
            ))}
          </div>
        </Section>
      )}

      <More summary="What Relay will not do, and where that is enforced">
        <ul className="space-y-1.5">
          <li><span className="font-medium text-ink">Never sends.</span> No module can reach an outbound transport. You send, post and submit.</li>
          <li><span className="font-medium text-ink">Never decides eligibility.</span> The model composes language. Eligibility, ranking, the recipient count, the supervisory regime and every consequence are deterministic code.</li>
          <li><span className="font-medium text-ink">Never clears its own findings.</span> An agent detects and drafts; a principal dispositions.</li>
        </ul>
        Each is enforced by dependency-cruiser and by a test, and each was seen failing on a deliberate violation.
      </More>
    </>
  );
}
