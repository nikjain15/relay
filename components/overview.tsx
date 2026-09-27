"use client";

// The overview, as an agent briefing.
//
// Two rewrites got this wrong in the same way. The first was a site map: fifteen
// equal cards saying what each screen is. The second led with counts but still
// explained itself in paragraphs. Both treated the advisor as someone who needs
// the product described to them.
//
// What an agent-first product owes them instead is a report: overnight, this is
// what ran, this is what it found, this is what only you can decide. The prose
// that justifies each line is still here, one disclosure away, because the
// argument matters to a reviewer. It is just no longer the first thing read.
import Link from "next/link";
import { useMemo } from "react";
import { useRelay } from "@/components/state";
import { Banner, Card, More, PageTitle, Pill, Row, Section, StatRow, StateDot, Timeline } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Bars, Meter } from "@/components/charts";
import { briefAll } from "@/lib/research/brief";
import { corpusStates } from "@/lib/evidence/corpus";
import { CLIENTS, PROSPECTS, SERVICE_REQUESTS, CONNECTORS_DATA } from "@/lib/data";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { openItems } from "@/lib/onboarding/status";
import { triage } from "@/lib/servicing/classify";
import { todaysMeetings } from "@/lib/meetings/prep";
import { allTasks } from "@/lib/followups";
import { APP } from "@/lib/data/policy";
import { policyFrom, agentsFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import { coverageFor } from "@/lib/connectors/coverage";
import { rank } from "@/lib/ranking/rank";
import { connectedIds } from "@/lib/compliance/sweep";
import { prepareAll, KIND } from "@/lib/compliance/actions";
import { agentStatuses, activity } from "@/lib/compliance/activity";
import { btn, btnPrimary } from "@/components/ui";

export function Overview({ advisorId }: { advisorId: string }) {
  const { ruleEdits, connections, caseDispositions, dismissed, actionDecisions, decideAction } = useRelay();
  const scope = useMemo(() => scopeFor(advisorId), [advisorId]);
  const policy = useMemo(() => policyFrom(ruleEdits, scope), [ruleEdits, scope]);
  const found = useMemo(() => sweep(advisorId, policy, connections), [advisorId, policy, connections]);
  const coverage = useMemo(() => coverageFor(advisorId, connections, CONNECTORS_DATA.attestations), [advisorId, connections]);
  const agents = useMemo(() => agentsFrom(ruleEdits).filter((a) => a.enabled), [ruleEdits]);

  const openCases = found.cases.filter((c) => !caseDispositions[c.id]);
  const actions = useMemo(() => prepareAll(openCases, policy.rules), [openCases, policy]);
  const pending = actions.filter((a) => !actionDecisions[a.id]);
  const connected = useMemo(() => connectedIds(advisorId, connections), [advisorId, connections]);
  const statuses = useMemo(() => agentStatuses(agents, policy, found, actions, openCases, connected), [agents, policy, found, actions, openCases, connected]);
  const blocking = openCases.filter((c) => c.severity === "block" && c.reason === "fired");
  const meetings = todaysMeetings();
  const overdue = allTasks().filter((t) => t.dueDay < 0);
  const service = triage(SERVICE_REQUESTS);
  const paperwork = CLIENTS.flatMap(openItems);
  const escalated = paperwork.filter((w) => w.status === "escalated");
  const flagged = useMemo(() => rank(OPPORTUNITIES, new Set(Object.keys(dismissed))), [dismissed]);
  const channelsWatched = coverage.channels.filter((c) => c.attested || c.status === "covered").length;
  const byAgent = Object.entries(openCases.reduce<Record<string, number>>((acc, c) => ((acc[c.agentName] = (acc[c.agentName] ?? 0) + 1), acc), {})).sort((a, b) => b[1] - a[1]);
  const briefings = useMemo(() => briefAll(connections).filter((b) => CLIENTS.find((c) => c.id === b.clientId)?.advisorId === advisorId), [connections, advisorId]);
  const unknowns = briefings.reduce((s, b) => s + b.unknowns.length, 0);
  const corpus = corpusStates();
  const staleDocs = corpus.filter((d) => d.usable && d.freshness === "stale").length;

  // What only a person can settle, ranked by cost of being wrong rather than by module.
  // The banner below already states the coverage gap, so the findings that restate
  // it are dropped here rather than saying the same thing three times on one screen.
  const coverageRules = new Set(["off-channel-gap", "sec-17a4-completeness"]);
  const decisions = [
    ...blocking
      .filter((c) => !coverageRules.has(c.ruleId))
      .map((c) => ({
        icon: "shield" as const, tone: "critical" as const, href: "/supervision",
        title: c.ruleTitle, meta: `${c.subjectLabel} · ${c.citation}`, right: "Blocking",
      })),
    ...(escalated.length
      ? [{ icon: "esign" as const, tone: "caution" as const, href: "/onboarding",
           title: `${escalated.length} form${escalated.length === 1 ? "" : "s"} past the escalation deadline`,
           meta: escalated.slice(0, 3).map((w) => w.form).join(", "), right: "Escalated" }]
      : []),
    ...(service.filter((r) => r.overdue).length
      ? [{ icon: "clock" as const, tone: "caution" as const, href: "/servicing",
           title: `${service.filter((r) => r.overdue).length} service request${service.filter((r) => r.overdue).length === 1 ? "" : "s"} past target`,
           meta: "Money movement needs a callback to a number on file", right: "Overdue" }]
      : []),
    ...(overdue.length
      ? [{ icon: "check" as const, tone: "caution" as const, href: "/follow-ups",
           title: `${overdue.length} task${overdue.length === 1 ? "" : "s"} overdue`,
           meta: overdue.slice(0, 3).map((t) => t.text).join("; "), right: "Overdue" }]
      : []),
  ];

  // One row per rule rather than one per account. Six rows that read "possible
  // diminished capacity" three times teach an eye to skim past all of them.
  const otherFindings = openCases.filter((c) => !blocking.includes(c) && !coverageRules.has(c.ruleId));
  const grouped = Object.values(
    otherFindings.reduce<Record<string, { key: string; title: string; agent: string; reason: (typeof otherFindings)[number]["reason"]; subjects: string[] }>>((acc, c) => {
      const key = `${c.ruleId}:${c.reason}`;
      const g = (acc[key] ??= {
        key,
        // A clear that only needs an inference confirmed is not a finding, and
        // must not wear the rule's alarming name.
        title: c.reason === "low_confidence" ? `Confirm the inputs behind "${c.ruleTitle}"` : c.ruleTitle,
        agent: c.agentName,
        reason: c.reason,
        subjects: [],
      });
      g.subjects.push(c.subjectLabel);
      return acc;
    }, {}),
  );

  return (
    <>
      <PageTitle title="Overview" sub={`${APP.todayLabel} morning. What ran while you were away, and what only you can decide.`} />

      <StatRow
        items={[
          { value: decisions.length, label: "Need a decision", icon: "agent", tone: decisions.length ? "critical" : "positive" },
          { value: pending.length, label: "Actions prepared for you", icon: "check", tone: pending.length ? "plain" : "positive" },
          { value: flagged.length, label: "Flagged for you today", icon: "list" },
          { value: meetings.length, label: "Meetings, briefed", icon: "calendar" },
        ]}
      />

      <Section title="Agents">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {statuses.map((s) => (
            <Link key={s.agent.id} href="/agents" className="rounded border border-line px-3 py-2.5 hover:bg-subtle">
              <span className="flex items-center gap-2 text-[13px] text-ink"><Icon name={s.icon} size={16} className="text-ink-3" />{s.agent.name}</span>
              <span className="mt-1 block"><StateDot state={s.state} /></span>
              <span className="mt-0.5 block text-[11px] text-ink-3">{s.open} raised · {s.actionsPrepared} prepared · {s.lastRunAt.replace("day 0, ", "")}</span>
            </Link>
          ))}
        </div>
      </Section>

      <Section title="Overnight">
        <div className="rounded border border-line p-4 sm:p-5">
          <p className="flex items-start gap-2 text-[14px] text-ink">
            <Icon name="sweep" size={20} className="mt-0.5 text-ink-3" />
            <span>
              {agents.length} agents swept {found.accountsScanned} accounts, {found.messagesScanned} captured messages and {channelsWatched} channels against{" "}
              {policy.rules.filter((r) => r.enabled).length} rules in force.
            </span>
          </p>
          <p className="mt-2 text-[13px] text-ink-2">
            {openCases.length === 0
              ? "Nothing is waiting on a person."
              : `${openCases.length} finding${openCases.length === 1 ? "" : "s"} raised, ${blocking.length} blocking. Every one is drafted with its citation and the facts the rule read; none of them clears itself.`}
            {found.blockedBy.length > 0 && ` ${found.blockedBy.length} source${found.blockedBy.length === 1 ? "" : "s"} missing, so some rules could not be evaluated at all.`}
            {found.messagesNotSwept.length > 0 && ` ${found.messagesNotSwept.length} captured message${found.messagesNotSwept.length === 1 ? "" : "s"} sat on a degraded source and ${found.messagesNotSwept.length === 1 ? "was" : "were"} not read.`}
          </p>
          <More summary="What the agents are, and what they are not allowed to do">
            Five bundles of rules, each with a cadence: communications surveillance on every draft, record
            completeness and client protection daily, recommendation evidence on every proposal, conduct weekly.
            Detection, classification, evidence assembly and the drafted remediation are autonomous. The
            disposition is not, and a rule whose source is not connected reports that it cannot be evaluated
            rather than reporting a clear.
          </More>
        </div>
      </Section>

      {pending.length > 0 && (
        <Section title="Prepared for you, worst first">
          <div className="rounded border border-line px-3 sm:px-4">
            {pending.slice(0, 6).map((a) => (
              <Row
                key={a.id}
                icon={a.kind === "draft_note" ? "email" : a.kind === "task" ? "check" : a.kind === "schedule" ? "calendar" : a.kind === "callback" ? "voice" : a.kind === "request_form" ? "esign" : a.kind === "connect_source" ? "link" : "block"}
                tone={a.kind === "hold" ? "critical" : "plain"}
                title={a.title}
                meta={`${a.subjectLabel === a.agentName ? a.agentName : `${a.subjectLabel} · ${a.agentName}`} · ${KIND[a.kind].label}`}
                right={
                  <span className="flex gap-1.5">
                    <button type="button" className={btnPrimary} onClick={() => decideAction(a.id, "accepted")}>Accept</button>
                    <button type="button" className={btn} onClick={() => decideAction(a.id, "declined")}>Decline</button>
                  </span>
                }
              />
            ))}
          </div>
          <p className="mt-2 text-[12px] text-ink-3">
            {pending.length > 6 ? `${pending.length - 6} more on ` : "All of them, with the finding behind each, on "}
            <Link href="/supervision" className="underline">Supervision</Link>. Accepting sends nothing; you do.
          </p>
        </Section>
      )}

      <Section title="This morning">
        <Timeline items={activity(statuses).slice(0, 5)} />
      </Section>

      <Section title="By the numbers">
        <div className="grid gap-6 md:grid-cols-3">
          <div>
            <p className="mb-2 text-[12px] text-ink-3">Open findings by agent</p>
            {byAgent.length ? <Bars ariaLabel="Open findings by agent" items={byAgent.map(([agent, n]) => ({ label: agent, value: n, href: "/supervision" }))} /> : <p className="text-[13px] text-ink-2">None open.</p>}
          </div>
          <div>
            <p className="mb-2 text-[12px] text-ink-3">Channels the advisor uses</p>
            <Meter
              ariaLabel="Attested channels by coverage"
              segments={[
                { label: "Captured", value: coverage.channels.filter((c) => c.attested && c.status === "covered").length, tone: "positive" },
                { label: "No retained copy", value: coverage.channels.filter((c) => c.attested && c.status === "partial").length, tone: "caution" },
                { label: "Not captured", value: coverage.gaps.length, tone: "critical" },
              ]}
            />
            <p className="mt-2 text-[12px] text-ink-2">{found.messagesScanned} captured messages swept{found.messagesNotSwept.length ? `, ${found.messagesNotSwept.length} not swept` : ""}.</p>
          </div>
          <div>
            <p className="mb-2 text-[12px] text-ink-3">Briefings and evidence</p>
            <Bars
              ariaLabel="Briefing and corpus figures"
              items={[
                { label: "Things not established across briefings", value: unknowns, href: "/research", tone: unknowns ? "critical" : "plain" },
                { label: "Documents past review date", value: staleDocs, href: "/documents", tone: staleDocs ? "critical" : "plain" },
                { label: "Current documents", value: corpus.filter((d) => d.usable).length, href: "/documents" },
              ]}
            />
          </div>
        </div>
      </Section>

      {!coverage.defensible && (
        <Banner tone="critical" title="The record is not defensible yet">
          {coverage.gaps.map((g) => g.channel).join(", ")} in use with nothing capturing{" "}
          {coverage.gaps.length === 1 ? "it" : "them"}. Business conducted on an uncaptured channel cannot be
          produced on request.{" "}
          <Link href="/connectors" className="underline">
            Close the gaps
          </Link>
          .
        </Banner>
      )}

      <Section title={decisions.length ? "Needs you, worst first" : "Nothing needs you"}>
        {decisions.length === 0 ? (
          <Card tone="positive" icon="check" title="Clear">
            <p className="text-[13px] text-ink-2">
              No blocking finding, no uncaptured channel, no overdue item. The day starts on{" "}
              <Link href="/triage" className="underline">
                today&apos;s list
              </Link>
              .
            </p>
          </Card>
        ) : (
          <div className="rounded border border-line px-3 sm:px-4">
            {decisions.map((d, i) => (
              <Row
                key={`${d.title}-${i}`}
                icon={d.icon}
                tone={d.tone}
                href={d.href}
                title={d.title}
                meta={d.meta}
                right={<Pill tone={d.tone === "critical" ? "fail" : "accent"}>{d.right}</Pill>}
              />
            ))}
          </div>
        )}
      </Section>

      <Section title="Today">
        <div className="rounded border border-line px-3 sm:px-4">
          <Row icon="list" href="/triage" title={`${flagged.length} opportunities flagged for you`}
            meta="Ranked and capped, each with the reason path behind it" right={<Icon name="chevron" size={16} className="text-ink-3" />} />
          <Row icon="calendar" href="/meetings" title={`${meetings.length} meetings, with review packs ready`}
            meta="What changed, the gaps, the decisions and the open items" right={<Icon name="chevron" size={16} className="text-ink-3" />} />
          <Row icon="briefing" href="/research" title={`${briefings.length} briefings assembled, ${unknowns} things not established`}
            meta="Cited to a field, observed kept apart from inferred, the unknowns named" right={<Icon name="chevron" size={16} className="text-ink-3" />} />
          <Row icon="email" href="/communications" title="Draft a client note"
            meta="The recipient counter decides the supervisory regime before anything moves" right={<Icon name="chevron" size={16} className="text-ink-3" />} />
          <Row icon="people" href="/clients" title={`${CLIENTS.length} clients in the book`}
            meta={`${service.length} open service requests, ${paperwork.length} forms outstanding`} right={<Icon name="chevron" size={16} className="text-ink-3" />} />
          <Row icon="plus" href="/pipeline" title={`${PROSPECTS.length} prospects, ranked by warmth of the path in`}
            meta="Relay drafts the introduction; you send it" right={<Icon name="chevron" size={16} className="text-ink-3" />} />
        </div>
      </Section>

      {grouped.length > 0 && (
        <Section title="Also raised, not blocking">
          <div className="rounded border border-line px-3 sm:px-4">
            {grouped.map((g) => (
              <Row
                key={g.key}
                icon={g.reason === "cannot_evaluate" ? "alert" : "eye"}
                tone={g.reason === "cannot_evaluate" ? "caution" : "plain"}
                href="/supervision"
                title={g.title}
                meta={`${g.subjects.length === 1 ? g.subjects[0] : `${g.subjects.length} accounts: ${g.subjects.join(", ")}`} · ${g.agent}`}
                right={<Pill tone={g.reason === "fired" ? "accent" : "neutral"}>{g.reason === "cannot_evaluate" ? "No source" : g.reason === "low_confidence" ? "Confirm" : "Flag"}</Pill>}
              />
            ))}
          </div>
        </Section>
      )}

      <More summary="What Relay will not do, and where that is enforced">
        <ul className="space-y-1.5">
          <li><span className="font-medium text-ink">Never sends.</span> No module can reach an outbound transport. You send, post and submit.</li>
          <li><span className="font-medium text-ink">Never decides eligibility.</span> The model composes language. Eligibility, ranking, the recipient count and the supervisory regime are deterministic code.</li>
          <li><span className="font-medium text-ink">Never clears its own findings.</span> An agent detects and drafts; a principal dispositions.</li>
        </ul>
        Each is enforced by dependency-cruiser and by a test, and each was seen failing on a deliberate violation.
      </More>
    </>
  );
}
