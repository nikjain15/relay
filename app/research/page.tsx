// Every briefing at once: which households carry the most the advisor does not
// know, and which of those are in today's calendar. The agent ran for all of
// them before anyone opened this page.
import Link from "next/link";
import { briefAll } from "@/lib/research/brief";
import { todaysMeetings, clientName } from "@/lib/meetings/prep";
import { ADVISORS_DATA, CLIENTS } from "@/lib/data";
import { APP } from "@/lib/data/policy";
import { More, PageTitle, Pill, Section, StatRow, TableScroll, td, th } from "@/components/ui";
import { Bars, Meter } from "@/components/charts";
import { Icon } from "@/components/icons";

export default function ResearchIndex() {
  const all = briefAll();
  const meetings = todaysMeetings();
  const today = new Set(meetings.map((m) => m.clientId).filter(Boolean));
  const rows = all
    .map((b) => ({ b, meeting: meetings.find((m) => m.clientId === b.clientId), advisor: CLIENTS.find((c) => c.id === b.clientId)!.advisorId }))
    .sort((a, z) => Number(Boolean(z.meeting)) - Number(Boolean(a.meeting)) || z.b.unknowns.length - a.b.unknowns.length || a.b.name.localeCompare(z.b.name));
  const total = (k: "since" | "observed" | "inferred" | "unknowns") => all.reduce((s, b) => s + b[k].length, 0);
  const byProbe = Object.entries(
    all.flatMap((b) => b.unknowns).reduce<Record<string, number>>((acc, u) => ((acc[u.probe] = (acc[u.probe] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]);
  const label = (id: string) => ADVISORS_DATA.find((a) => a.id === id)?.walkthrough?.label ?? id;

  return (
    <>
      <PageTitle title="Briefings" sub={`${APP.todayLabel}. Today's meetings first, then the most unknown.`} />

      <StatRow
        items={[
          { value: all.length, label: "Households briefed", icon: "briefing" },
          { value: total("since"), label: "Changes since last contact", icon: "trend" },
          { value: total("inferred"), label: "Inferences, each with a confidence", icon: "eye" },
          { value: total("unknowns"), label: "Things not established", icon: "question", tone: total("unknowns") ? "critical" : "positive" },
        ]}
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
          <table className="w-full min-w-[44rem] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={th}>Household</th>
                <th className={th}>Advisor</th>
                <th className={th}>Today</th>
                <th className={th}>Since last contact</th>
                <th className={th}>Observed</th>
                <th className={th}>Inferred</th>
                <th className={th}>Not established</th>
                <th className={th}>Last contact</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ b, meeting, advisor }) => (
                <tr key={b.clientId}>
                  <td className={td}><span className="flex items-center gap-2"><Icon name="briefing" size={16} className="text-ink-3" /><Link href={`/research/${b.clientId}`} className="underline">{clientName(b.clientId)}</Link></span></td>
                  <td className={`${td} text-ink-2`}>{label(advisor)}</td>
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
        <p className="mt-2 text-[12px] text-ink-3">{today.size} of today&apos;s meetings have a briefing above.</p>
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
