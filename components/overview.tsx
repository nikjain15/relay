"use client";

// The overview.
//
// This screen used to be the site map: fifteen equal cards in five rows, which
// is a fair description of the system and a poor place to start a morning. It now
// answers one question first, what needs a decision today, and keeps the full
// journey one click away for anyone who wants the tour.
import Link from "next/link";
import { useMemo } from "react";
import { useRelay } from "@/components/state";
import { Banner, Card, CardGrid, PageTitle, Pill, Section, StatRow, TableScroll, td, th } from "@/components/ui";
import { CLIENTS, PROSPECTS, SERVICE_REQUESTS, CONNECTORS_DATA } from "@/lib/data";
import { DEFAULT_CAP } from "@/lib/ranking/rank";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { openItems, ESCALATE_AFTER_DAYS } from "@/lib/onboarding/status";
import { triage } from "@/lib/servicing/classify";
import { todaysMeetings } from "@/lib/meetings/prep";
import { allTasks } from "@/lib/followups";
import { suggest } from "@/lib/learning/learn";
import { APP } from "@/lib/data/policy";
import { policyFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import { coverageFor } from "@/lib/connectors/coverage";

const F = APP.featured;

interface Stage { href: string; title: string; count: string; what: string }

export function Overview({ advisorId }: { advisorId: string }) {
  const { ruleEdits, connections, caseDispositions } = useRelay();
  const scope = useMemo(() => scopeFor(advisorId), [advisorId]);
  const found = useMemo(() => sweep(advisorId, policyFrom(ruleEdits, scope), connections), [advisorId, ruleEdits, scope, connections]);
  const coverage = useMemo(() => coverageFor(advisorId, connections, CONNECTORS_DATA.attestations), [advisorId, connections]);

  const openFindings = found.cases.filter((c) => !caseDispositions[c.id]);
  const blocking = openFindings.filter((c) => c.severity === "block" && c.reason === "fired");
  const meetings = todaysMeetings();
  const overdue = allTasks().filter((t) => t.dueDay < 0);
  const service = triage(SERVICE_REQUESTS);
  const open = CLIENTS.flatMap(openItems);
  const escalated = open.filter((w) => w.status === "escalated").length;

  const start: Stage[] = [
    { href: "/triage", title: "Today's list", count: `${OPPORTUNITIES.length} flagged`, what: `Overnight alerts, ranked and capped at ${DEFAULT_CAP} a day by default. Each advisor can set their own.` },
    { href: "/meetings", title: "Today's meetings", count: `${meetings.length} across both advisors`, what: "Each one has a review pack: what changed, the gaps, the decisions and the open items." },
    { href: "/supervision", title: "Supervision console", count: `${openFindings.length} open findings`, what: "What the agents found on their own, and every draft waiting for release. Relay dispositions nothing." },
  ];

  const journey: { phase: string; stages: Stage[] }[] = [
    {
      phase: "Before the relationship",
      stages: [
        { href: "/clients", title: "My clients", count: `${CLIENTS.length} clients`, what: "The whole book: cash cushion, flagged items, forms, requests, last contact and today's meetings." },
        { href: "/pipeline", title: "New clients", count: `${PROSPECTS.length} prospects`, what: "Ranked by how warm the path in is. Relay drafts the introduction ask; the advisor sends it." },
        { href: "/onboarding", title: "Paperwork", count: `${open.length} open, ${escalated} escalated`, what: `Every open form per client. Unsigned after ${ESCALATE_AFTER_DAYS} days escalates, shorter for some segments and clients.` },
      ],
    },
    {
      phase: "The daily work",
      stages: [
        { href: `/evidence/${F.opportunityId}`, title: "Why this client", count: "sources cited", what: "The reason, its sources and the client's recent history. Refuses when there is no source." },
        { href: `/household/${F.clientId}`, title: "Client picture", count: `${CLIENTS.length} clients`, what: "Goals, accounts, the family's rules, history, notes, tasks, paperwork and requests." },
        { href: `/household/${F.clientId}/proposal?opp=${F.opportunityId}`, title: "Options", count: "approved products only", what: "What fits the family's rules, and why each other option is blocked." },
        { href: "/communications", title: "Note and audience", count: "counts people", what: "A drafted note and talking points, with the approval rule shown before anything moves." },
      ],
    },
    {
      phase: "Compliance",
      stages: [
        { href: "/connectors", title: "Connected channels", count: `${Math.round(coverage.completeness * 100)}% captured`, what: "Every channel the advisor uses, and what nothing is capturing. Read only: Relay never sends on them." },
        { href: "/compliance", title: "Rules and agents", count: `${policyFrom(ruleEdits, scope).rules.filter((r) => r.enabled).length} rules in force`, what: "FINRA and SEC rules as editable data, with the agents that watch them. A change is live on the next evaluation." },
        { href: "/compliance/log", title: "Change log", count: `${ruleEdits.length} entries`, what: "Who changed which rule, when, at which layer and why. Replayable to any past moment." },
      ],
    },
    {
      phase: "After the advice",
      stages: [
        { href: "/follow-ups", title: "Follow-ups", count: `${overdue.length} overdue tasks`, what: "Approved notes the advisor still has to send, calls to log, and tasks by owner and due date." },
        { href: "/servicing", title: "Service requests", count: `${service.length} open, ${service.filter((r) => r.overdue).length} overdue`, what: "Classified and routed. Money movement needs a callback to a number on file." },
        { href: "/measurement", title: "Measurement", count: "conversion, not volume", what: "How many flagged opportunities become approved client actions." },
      ],
    },
    {
      phase: "Personalized, and learning",
      stages: [
        { href: "/profiles", title: "Preferences", count: "firm, segment, advisor, client", what: "Every setting with where it came from. Preferences: most specific wins. Rules: strictest wins." },
        { href: "/learning", title: "Suggestions", count: `${suggest().filter((s) => !s.heldBack).length} waiting`, what: "Patterns proposed with evidence. The advisor accepts; rules are never learned." },
        { href: "/personas", title: "Who's who", count: "cited composites", what: "Where every client, advisor and figure in the prototype comes from." },
      ],
    },
  ];

  return (
    <>
      <PageTitle
        title="Overview"
        sub={`${APP.todayLabel} morning. What needs a decision, then everything else. All clients and advisors are cited composites; see Who's who.`}
      />

      <StatRow
        items={[
          { value: OPPORTUNITIES.length, label: "Flagged today" },
          { value: meetings.length, label: "Meetings" },
          { value: openFindings.length, label: "Compliance findings", tone: blocking.length ? "critical" : openFindings.length ? "plain" : "positive" },
          { value: overdue.length, label: "Overdue tasks", tone: overdue.length ? "critical" : "positive" },
        ]}
      />

      {!coverage.defensible && (
        <Banner tone="critical" title={`${coverage.gaps.length} ${coverage.gaps.length === 1 ? "channel is" : "channels are"} in use and not on the record`}>
          {coverage.gaps.map((g) => g.channel).join(", ")}. Business conducted on an uncaptured channel cannot be produced on request.{" "}
          <Link href="/connectors" className="underline">
            Close the gaps
          </Link>
          .
        </Banner>
      )}

      <Section title="Start here">
        <CardGrid cols={3}>
          {start.map((s) => (
            <Link key={s.href} href={s.href} className="block rounded border border-line p-4 transition-colors hover:border-ink sm:p-5">
              <span className="block text-[15px] font-semibold">{s.title}</span>
              <span className="mt-1 block text-[12px] text-ink-3">{s.count}</span>
              <span className="mt-2 block text-[13px] text-ink-2">{s.what}</span>
            </Link>
          ))}
        </CardGrid>
      </Section>

      {blocking.length > 0 && (
        <Section title="Blocking, before anything else">
          <TableScroll>
            <table className="w-full min-w-[34rem] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={th}>Finding</th>
                  <th className={th}>Subject</th>
                  <th className={th}>Rule</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {blocking.map((c) => (
                  <tr key={c.id}>
                    <td className={td}>{c.finding}</td>
                    <td className={td}>{c.subjectLabel}</td>
                    <td className={`${td} text-ink-2`}>{c.citation}</td>
                    <td className={td}>
                      <Link href="/supervision" className="underline">
                        Disposition
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        </Section>
      )}

      <Section title="The whole system">
        <p className="mb-3 max-w-2xl text-[13px] text-ink-2">
          Every surface, in the order an advisor meets it. Useful as a tour; not where a working day starts.
        </p>
        <details className="rounded border border-line">
          <summary className="cursor-pointer px-4 py-3 text-[13px] font-medium">
            Show all {journey.reduce((n, p) => n + p.stages.length, 0) + start.length} surfaces
          </summary>
          <div className="space-y-6 border-t border-line p-4">
            {journey.map((p) => (
              <div key={p.phase}>
                <h3 className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-ink-3">{p.phase}</h3>
                <CardGrid cols={3}>
                  {p.stages.map((s) => (
                    <Link key={s.href} href={s.href} className="block rounded border border-line p-4 transition-colors hover:border-ink">
                      <span className="block text-[14px] font-semibold">{s.title}</span>
                      <span className="mt-1 block text-[12px] text-ink-3">{s.count}</span>
                      <span className="mt-2 block text-[13px] text-ink-2">{s.what}</span>
                    </Link>
                  ))}
                </CardGrid>
              </div>
            ))}
          </div>
        </details>
      </Section>

      <Card title="What Relay will not do" sub="The same boundary the architecture enforces, not a policy statement">
        <ul className="space-y-1 text-[13px] text-ink-2">
          <li>
            <Pill>Never sends</Pill> No module in the app can reach an outbound transport. The advisor sends, posts and submits.
          </li>
          <li>
            <Pill>Never decides eligibility</Pill> The model composes language. Eligibility, ranking, the recipient count and the supervisory
            regime are deterministic code.
          </li>
          <li>
            <Pill>Never clears itself</Pill> An agent detects and drafts the finding. A principal dispositions it.
          </li>
        </ul>
      </Card>
    </>
  );
}
