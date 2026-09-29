"use client";

// Two agents for the advisor's own economics: what each household holds
// elsewhere, and where the hours go against where the revenue comes from.
// Every figure is cited to a record or to the illustrative schedule in
// data/policy.json, and the screen says which. Nothing here is client-facing.
import Link from "next/link";
import { useMemo } from "react";
import { useView } from "@/components/view";
import { heldAway, walletTotals, HELD_AWAY_PATTERNS } from "@/lib/growth/held-away";
import { bookEconomics, economicsTotals } from "@/lib/growth/economics";
import { POLICY } from "@/lib/data/policy";
import { usd } from "@/lib/format";
import { Brief, More, PageTitle, Pill, Section, StatRow, TableScroll, Who, td, th } from "@/components/ui";
import { Meter } from "@/components/charts";

export default function WalletShare() {
  const v = useView();
  const rows = useMemo(() => heldAway(v.clients), [v.clients]);
  const totals = walletTotals(rows);
  const econ = useMemo(() => bookEconomics(v.clients, v.serviceRequests, v.meetings), [v.clients, v.serviceRequests, v.meetings]);
  const et = economicsTotals(econ);
  const E = POLICY.economics;
  const withSignals = rows.filter((r) => r.signals.length);
  const name = (id: string) => v.clientOf(id)?.name ?? id;

  return (
    <>
      <PageTitle icon="custodian" title="Wallet share" sub="What each household holds elsewhere, cited to the record that says so, and your hours against your revenue. For you, never for a client." />

      <Brief
        name="Held-away money"
        icon="custodian"
        at="day 0, 06:50"
        says={<>I read every message, note, contact summary and opportunity on {v.advisor.name}&apos;s {v.clients.length} households for money that is not on the platform. {withSignals.length} household{withSignals.length === 1 ? " holds" : "s hold"} something elsewhere: {usd(totals.heldAwayStatedUsd)} where a record states the amount, and {totals.unstated} signal{totals.unstated === 1 ? "" : "s"} with no amount stated. Against {usd(totals.onPlatformUsd)} on the platform, your wallet share is {totals.walletSharePct}% at most; unstated amounts would lower it.</>}
        points={withSignals.slice(0, 3).map((r) => ({ text: `${name(r.clientId)}: ${r.signals[0].label.toLowerCase()}${r.signals[0].amountUsd ? `, about ${usd(r.signals[0].amountUsd)}` : ", amount not stated"}. "${r.signals[0].source.excerpt}"`, href: `#${r.clientId}`, who: "client" as const, tone: "caution" as const }))}
        next={withSignals[0] ? { label: `Open the ${name(withSignals[0].clientId)} conversation`, href: "/conversations" } : undefined}
        steps={[
          { icon: "eye", who: "client", title: "Read what the client wrote, what the team noted, and each opportunity's reason path", detail: `${v.clients.reduce((n, c) => n + (c.messages?.length ?? 0) + c.notes.length + c.contactHistory.length + c.opportunities.length, 0)} records.` },
          { icon: "search", who: "agent", title: `Matched ${HELD_AWAY_PATTERNS.length} kinds of held-away signal`, detail: HELD_AWAY_PATTERNS.map((p) => p.label.toLowerCase()).join("; ") + "." },
          { icon: "chart", who: "agent", title: "Read the amount where a record states one", detail: "A stated amount counts once even when two records name it. No amount is ever estimated." },
          { icon: "people", who: "advisor", title: "Left the conversation to you", detail: "Each signal names the conversation it opens; Who to call orders them." },
        ]}
        note="A model would read the sentence in production; what counts, what is cited and that no figure is invented stay in code."
      />

      <Section title="Wallet share across the book">
        <Meter ariaLabel="On the platform against stated held-away money" segments={[{ label: "On the platform", value: totals.onPlatformUsd, tone: "plain" }, { label: "Held away, stated", value: totals.heldAwayStatedUsd, tone: "caution" }]} />
        <StatRow items={[{ value: `${totals.walletSharePct}%`, label: "Wallet share, at most", icon: "custodian" }, { value: usd(totals.heldAwayStatedUsd), label: "Held away, stated", icon: "chart", tone: totals.heldAwayStatedUsd ? "critical" : "plain" }, { value: totals.unstated, label: "Signals with no amount", icon: "question" }, { value: withSignals.length, label: "Households with money elsewhere", icon: "people" }]} />
      </Section>

      <Section title="Every household">
        <TableScroll>
          <table className="w-full min-w-[48rem] border-collapse text-body">
            <thead>
              <tr>
                <th className={th}>Household</th>
                <th className={`${th} text-right`}>On the platform</th>
                <th className={`${th} text-right`}>Held away, stated</th>
                <th className={`${th} text-right`}>Wallet share</th>
                <th className={th}>Signals, each cited</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.clientId} id={r.clientId}>
                  <td className={td}><Link href={`/household/${r.clientId}`} className="underline">{name(r.clientId)}</Link></td>
                  <td className={`${td} text-right tabular-nums`}>{usd(r.onPlatformUsd)}</td>
                  <td className={`${td} text-right tabular-nums ${r.heldAwayStatedUsd ? "text-critical" : "text-ink-3"}`}>{r.heldAwayStatedUsd ? usd(r.heldAwayStatedUsd) : "none stated"}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.walletSharePct}%{r.unstated ? <span className="text-ink-3"> or less</span> : ""}</td>
                  <td className={`${td} max-w-lg`}>
                    {r.signals.length ? (
                      <ul className="space-y-1.5">
                        {r.signals.map((s) => (
                          <li key={s.kind}>
                            <Pill tone={s.amountUsd ? "fail" : "neutral"}>{s.label}</Pill>{s.amountUsd ? <span className="ml-1 tabular-nums">{usd(s.amountUsd)}</span> : <span className="ml-1 text-ink-3">amount not stated</span>}
                            <div className="text-meta leading-4 text-ink-2"><Who who={s.source.kind === "message" ? "client" : "agent"} label={s.source.kind} /> &quot;{s.source.excerpt}&quot; <span className="text-ink-3">({s.source.id}, {Math.round(s.confidence * 100)}%)</span></div>
                            <div className="text-meta leading-4 text-ink-3">{s.conversation}</div>
                          </li>
                        ))}
                      </ul>
                    ) : <span className="text-ink-3">Nothing on file says money is elsewhere.</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Section>

      <div id="economics" />
      <Brief
        name="Book economics"
        icon="chart"
        at="day 0, 06:55"
        says={<>Across {v.advisor.name}&apos;s {econ.length} households I estimate {usd(et.revenueUsd)} a year at the illustrative schedule, against {et.hours} hours of recorded work in the last {et.windowDays} days: {et.revenuePerHour === null ? "no hours on file" : `${usd(et.revenuePerHour)} an hour`}. {et.underServed.length} household{et.underServed.length === 1 ? " pays" : "s pay"} above the median and {et.underServed.length === 1 ? "has" : "have"} not been spoken to in {E.quietAfterDays} days; {et.timeHeavy.length} take{et.timeHeavy.length === 1 ? "s" : ""} more than one and a half times the median hours for less than the median revenue.</>}
        points={[
          ...et.underServed.slice(0, 2).map((r) => ({ text: `${name(r.clientId)}: about ${usd(r.revenueUsd)} a year, ${r.daysSinceContact === null ? "no contact on file" : `last contact ${r.daysSinceContact} days ago`}. Under-served.`, href: "/conversations", tone: "critical" as const, who: "client" as const })),
          ...et.timeHeavy.slice(0, 2).map((r) => ({ text: `${name(r.clientId)}: ${r.hours} hours for about ${usd(r.revenueUsd)} a year. Time-heavy; look at what the hours went to.`, href: `/household/${r.clientId}`, tone: "caution" as const, who: "client" as const })),
        ]}
        note="Fee rates and hours per kind of work are placeholders in data/policy.json. A firm's own schedule and time records replace them; the arithmetic and the flags stay."
      />

      <Section title="Hours against revenue, by household">
        <TableScroll>
          <table className="w-full min-w-[48rem] border-collapse text-body">
            <thead>
              <tr>
                <th className={th}>Household</th>
                <th className={th}>Tier</th>
                <th className={`${th} text-right`}>Assets</th>
                <th className={`${th} text-right`}>Rate</th>
                <th className={`${th} text-right`}>Revenue a year</th>
                <th className={`${th} text-right`}>Hours, {E.windowDays} days</th>
                <th className={`${th} text-right`}>Per hour</th>
                <th className={th}>Last contact</th>
                <th className={th}>Flag</th>
              </tr>
            </thead>
            <tbody>
              {econ.map((r) => (
                <tr key={r.clientId}>
                  <td className={td}><Link href={`/household/${r.clientId}`} className="underline">{name(r.clientId)}</Link></td>
                  <td className={`${td} text-ink-2`}>{r.tier}</td>
                  <td className={`${td} text-right tabular-nums`}>{usd(r.totalUsd)}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.feeBps} bps</td>
                  <td className={`${td} text-right tabular-nums`}>{usd(r.revenueUsd)}</td>
                  <td className={`${td} text-right tabular-nums`} title={`${r.contacts} contacts, ${r.meetingsToday} meetings today, ${r.requests} requests, ${r.openTasks} open tasks`}>{r.hours}</td>
                  <td className={`${td} text-right tabular-nums`}>{r.revenuePerHour === null ? <span className="text-ink-3">no hours</span> : usd(r.revenuePerHour)}</td>
                  <td className={`${td} text-ink-2`}>{r.daysSinceContact === null ? "none" : `${r.daysSinceContact} days ago`}</td>
                  <td className={td}>{r.underServed ? <Pill tone="fail">under-served</Pill> : r.timeHeavy ? <Pill>time-heavy</Pill> : <span className="text-ink-3">in proportion</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <p className="mt-2 text-meta text-ink-3">Hours = contacts in the window at {E.hoursPerContact} each, meetings today at {E.hoursPerMeeting}, open service requests at {E.hoursPerServiceRequest}, open tasks at {E.hoursPerOpenTask}. Rates by tier: {Object.entries(E.feeBpsByTier).map(([t, b]) => `${t} ${b} bps`).join(", ")}. Illustrative.</p>
      </Section>

      <More summary="What is autonomous here, and what is not">
        Reading the records, matching the signals and the arithmetic are autonomous, and every figure on this screen is cited to a record or to the schedule in data/policy.json. What is not autonomous is any figure the records do not state: an unstated held-away amount stays unstated, and the wallet share reads as a ceiling. Nothing here is shown to a client, no fee changes, and no household is recommended for anything; the advisor reads the arithmetic and decides.
      </More>
    </>
  );
}
