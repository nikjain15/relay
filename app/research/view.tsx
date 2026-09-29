"use client";

// Every briefing at once: which households carry the most the advisor does not
// know, and which of those are in today's calendar. The agent ran for all of
// them before anyone opened this page.
import Link from "next/link";
import { useMemo } from "react";
import { briefAll } from "@/lib/research/brief";
import { useRelay } from "@/components/state";
import { useView } from "@/components/view";
import { useToday } from "@/components/clock";
import { Brief, More, PageTitle, Pill, Section, TableScroll, td, th } from "@/components/ui";
import { Bars, Meter } from "@/components/charts";
import { Icon } from "@/components/icons";

export default function ResearchIndex() {
  // The signed-in advisor's households as the session holds them (connected sources, filed notes), and their calendar.
  const { connections, book } = useRelay();
  const v = useView();
  const clock = useToday();
  const all = useMemo(() => briefAll(connections, book.clients).filter((b) => v.clients.some((c) => c.id === b.clientId)), [connections, book.clients, v.clients]);
  const meetings = v.meetings;
  const today = new Set(meetings.map((m) => m.clientId).filter(Boolean));
  const clientName = (id: string) => v.clientOf(id)?.name ?? id;
  const rows = all
    .map((b) => ({ b, meeting: meetings.find((m) => m.clientId === b.clientId) }))
    .sort((a, z) => Number(Boolean(z.meeting)) - Number(Boolean(a.meeting)) || z.b.unknowns.length - a.b.unknowns.length || a.b.name.localeCompare(z.b.name));
  const total = (k: "since" | "observed" | "inferred" | "unknowns") => all.reduce((s, b) => s + b[k].length, 0);
  const byProbe = Object.entries(
    all.flatMap((b) => b.unknowns).reduce<Record<string, number>>((acc, u) => ((acc[u.probe] = (acc[u.probe] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageTitle icon="briefing" title="Briefings" sub={`${clock.live ? clock.date : clock.weekday}. Today's meetings first, then the most unknown.`} />

      <Brief
        name="Research"
        icon="briefing"
        at="day 0, 06:30"
        says={<>I briefed all {all.length} of {v.advisor.name}&apos;s households before anyone opened this page: {total("since")} things changed since you last spoke to each, {total("inferred")} things I inferred with a confidence, and {total("unknowns")} I could not establish and say so. Today&apos;s meetings are first.</>}
        points={rows.filter((r) => r.meeting).slice(0, 3).map((r) => ({ text: `${r.meeting!.time} ${r.b.name}: ${r.b.since.length} changed since you spoke, ${r.b.unknowns.length} not established.`, href: `/research/${r.b.clientId}`, who: "client" as const, icon: "calendar" as const }))}
        next={rows[0] ? { label: `Open the ${rows[0].b.name} briefing`, href: `/research/${rows[0].b.clientId}` } : undefined}
        note="A model would phrase a briefing; it would not decide what is observed and what is inferred. Every claim cites a field."
      />

      <Section title="Claims across the book">
        <Meter
          ariaLabel="Claims by kind across all briefings"
          segments={[
            { label: "Observed", value: total("observed") + total("since"), tone: "plain" },
            { label: "Inferred", value: total("inferred"), tone: "caution" },
            { label: "Not established", value: total("unknowns"), tone: "critical" },
          ]}
        />
      </Section>

      <Section title="Every household">
        <TableScroll>
          <table className="w-full min-w-[44rem] border-collapse text-body">
            <thead>
              <tr>
                <th className={th}>Household</th>
                <th className={th}>Today</th>
                <th className={th}>Since last contact</th>
                <th className={th}>Observed</th>
                <th className={th}>Inferred</th>
                <th className={th}>Not established</th>
                <th className={th}>Last contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, meeting }) => (
                <tr key={b.clientId}>
                  <td className={td}><span className="flex items-center gap-2"><Icon name="briefing" size={16} className="text-ink-3" /><Link href={`/research/${b.clientId}`} className="underline">{clientName(b.clientId)}</Link></span></td>
                  <td className={td}>{meeting ? <Pill tone="accent">{meeting.time} {meeting.title}</Pill> : <span className="text-ink-3">no meeting</span>}</td>
                  <td className={`${td} tabular-nums`}>{b.since.length}</td>
                  <td className={`${td} tabular-nums`}>{b.observed.length}</td>
                  <td className={`${td} tabular-nums`}>{b.inferred.length}</td>
                  <td className={`${td} tabular-nums ${b.unknowns.length ? "text-critical" : "text-positive"}`}>{b.unknowns.length}</td>
                  <td className={`${td} text-ink-2`}>{b.lastContact ? `${-b.lastContact.day} days ago` : "none"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Section>

      <Section title="What is most often missing">
        <Bars ariaLabel="Unknowns by probe" items={byProbe.map(([probe, n]) => ({ label: probe.replace(/-/g, " "), value: n, tone: "critical" as const }))} />
        <p className="mt-2 text-meta text-ink-3">{today.size} of today&apos;s meetings have a briefing above.</p>
      </Section>

      <More summary="What is autonomous here, and what is not">
        Assembling the briefing is autonomous: eleven probes run over the client file, the service queue, the firm&apos;s
        account record, the connected channels and the evidence corpus, and every claim is cited to a field. What is not
        autonomous is any contact with the client. Nothing here is drafted for a client or sent; the advisor takes it
        into the room. And an inference is never promoted to an observation by the system: only a conversation, logged
        in the file, does that.
      </More>
    </>
  );
}
