"use client";

// Who to call this week, in order, with the reason cited to its record and a
// draft opener. The agent ran over the book before anyone opened the page;
// the advisor spends the hour with the client, not choosing the client.
import Link from "next/link";
import { useMemo } from "react";
import { useView } from "@/components/view";
import { useToday } from "@/components/clock";
import { conversations, type ReasonKind } from "@/lib/growth/next-conversation";
import { POLICY } from "@/lib/data/policy";
import { Brief, More, PageTitle, Pill, Section, StatRow, TableScroll, Who, td, th } from "@/components/ui";
import { Bars } from "@/components/charts";
import { Icon, type IconName } from "@/components/icons";

const KIND: Record<ReasonKind, { label: string; icon: IconName; tone: "fail" | "neutral" | "accent" }> = {
  "held-away": { label: "Money elsewhere", icon: "custodian", tone: "fail" },
  opportunity: { label: "Opportunity", icon: "eye", tone: "accent" },
  paperwork: { label: "Unsigned form", icon: "esign", tone: "neutral" },
  task: { label: "Overdue task", icon: "check", tone: "neutral" },
  quiet: { label: "Quiet", icon: "clock", tone: "neutral" },
};

export default function Conversations() {
  const v = useView();
  const clock = useToday();
  const rows = useMemo(() => conversations(v.clients, v.meetings), [v.clients, v.meetings]);
  const toCall = rows.filter((r) => !r.meetingToday);
  const byKind = (Object.keys(KIND) as ReasonKind[]).map((k) => ({ label: KIND[k].label, value: rows.filter((r) => r.kind === k).length, tone: (k === "held-away" ? "critical" : "plain") as "critical" | "plain" }));
  const name = (id: string) => v.clientOf(id)?.name ?? id;

  return (
    <>
      <PageTitle icon="voice" title="Who to call" sub={`${clock.live ? clock.date : clock.weekday}. One reason per household, the best first, each cited to the record it came from.`} />

      <Brief
        name="Next conversation"
        icon="voice"
        at="day 0, 07:00"
        says={<>I ordered {v.advisor.name}&apos;s {rows.length} households by the one reason each carries this week. {toCall.length} {toCall.length === 1 ? "is" : "are"} not already in today&apos;s calendar{toCall[0] ? `; start with ${name(toCall[0].clientId)}: ${toCall[0].reason.split(":")[0].toLowerCase()}` : ""}. {rows.filter((r) => r.kind === "held-away").length} of the reasons are money held elsewhere, {rows.filter((r) => r.kind === "quiet").length} {rows.filter((r) => r.kind === "quiet").length === 1 ? "is" : "are"} silence past {POLICY.economics.quietAfterDays} days.</>}
        points={toCall.slice(0, 3).map((r) => ({ text: `${name(r.clientId)}: ${r.reason}`, href: r.href, who: "client" as const, tone: r.kind === "held-away" ? ("critical" as const) : ("plain" as const), icon: KIND[r.kind].icon }))}
        next={toCall[0] ? { label: `Open ${name(toCall[0].clientId)}`, href: `/household/${toCall[0].clientId}` } : undefined}
        steps={[
          { icon: "eye", who: "client", title: "Read each household's held-away signals, opportunities, forms, tasks and last contact", detail: `${rows.reduce((n, r) => n + 1 + r.also.length, 0)} reasons across ${rows.length} households.` },
          { icon: "settings", who: "agent", title: "Scored each reason by kind", detail: "Money elsewhere and a material opportunity first, then an escalated form, an overdue task, then silence, which rises with the days." },
          { icon: "calendar", who: "agent", title: "Put households already in today's calendar last", detail: "Meeting prep has them; this list is for the rest of the week." },
          { icon: "people", who: "advisor", title: "Left the call to you", detail: "The opener is a draft. Relay calls and sends nothing." },
        ]}
        note="A model would phrase the opener in production; the reason, its score and its citation stay in code."
      />

      <Section title="Why this week">
        <StatRow items={[{ value: toCall.length, label: "To call this week", icon: "voice" }, { value: rows.filter((r) => r.kind === "held-away").length, label: "About money elsewhere", icon: "custodian", tone: rows.some((r) => r.kind === "held-away") ? "critical" : "plain" }, { value: rows.filter((r) => r.meetingToday).length, label: "Already in today's calendar", icon: "calendar" }, { value: rows.filter((r) => r.kind === "quiet").length, label: "Gone quiet", icon: "clock" }]} />
        <Bars ariaLabel="Households by kind of reason" items={byKind} />
      </Section>

      <Section title="In order">
        <TableScroll>
          <table className="w-full min-w-[52rem] border-collapse text-body">
            <thead>
              <tr>
                <th className={th}>#</th>
                <th className={th}>Household</th>
                <th className={th}>Reason</th>
                <th className={th}>Read from</th>
                <th className={th}>Last contact</th>
                <th className={th}>Also on the file</th>
                <th className={th}>Opener (draft)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.clientId} className={r.meetingToday ? "text-ink-3" : undefined}>
                  <td className={`${td} tabular-nums`}>{i + 1}</td>
                  <td className={td}>
                    <span className="flex items-center gap-2"><Icon name={KIND[r.kind].icon} size={16} className="text-ink-3" /><Link href={`/household/${r.clientId}`} className="underline">{name(r.clientId)}</Link></span>
                    {r.meetingToday && <div className="text-meta leading-4"><Pill tone="accent">{r.meetingToday.time} today</Pill></div>}
                  </td>
                  <td className={`${td} max-w-sm`}><Pill tone={KIND[r.kind].tone}>{KIND[r.kind].label}</Pill> <Link href={r.href} className="underline">{r.reason}</Link></td>
                  <td className={`${td} max-w-xs text-meta leading-4 text-ink-2`}><Who who={r.source.kind === "message" ? "client" : "agent"} label={r.source.kind} /> {r.source.id}</td>
                  <td className={`${td} text-ink-2`}>{r.daysSinceContact === null ? "none" : `${r.daysSinceContact} days ago`}</td>
                  <td className={`${td} max-w-xs text-meta leading-4 text-ink-2`}>{r.also.length ? r.also.slice(0, 3).join("; ") + (r.also.length > 3 ? `; and ${r.also.length - 3} more` : "") : "nothing else"}</td>
                  <td className={`${td} max-w-md text-meta leading-4`}>{r.opener ? <><Who who="agent" label="Drafted" /> {r.opener}</> : <span className="text-ink-3">none</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Section>

      <More summary="What is autonomous here, and what is not">
        Choosing the reason and the order is autonomous, from a fixed score per kind and the records on the file; every reason links to where it was read. What is not autonomous is the call. The opener is a draft the advisor says or sends from their own tools, and a household is never contacted by Relay.
      </More>
    </>
  );
}
