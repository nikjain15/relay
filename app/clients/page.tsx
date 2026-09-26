import Link from "next/link";
import { ADVISORS_DATA, CLIENTS, SERVICE_REQUESTS } from "@/lib/data";
import { liquidityMonths } from "@/lib/household-math";
import { openItems } from "@/lib/onboarding/status";
import { meetingFor } from "@/lib/meetings/prep";
import { usd } from "@/lib/format";
import { PageTitle, Pill, Section, TableScroll, td, th } from "@/components/ui";

export default function Clients() {
  return (
    <>
      <PageTitle title="My clients" sub="Every client in the book, with what needs attention. All figures come from data/clients." />
      {ADVISORS_DATA.map((a) => {
        const mine = CLIENTS.filter((c) => c.advisorId === a.id);
        return (
          <Section key={a.id} title={`${a.walkthrough?.label ?? a.name} (${mine.length} shown of ${a.walkthrough?.households ?? "?"})`}>
            <TableScroll>
              <table className="w-full min-w-[34rem] max-w-6xl border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Client</th>
                    <th className={th}>Tier</th>
                    <th className={`${th} text-right`}>Assets</th>
                    <th className={th}>Cash cushion</th>
                    <th className={th}>Needs attention</th>
                    <th className={th}>Last contact</th>
                    <th className={th}>Today</th>
                  </tr>
                </thead>
                <tbody>
                  {mine.length === 0 && (
                    <tr>
                      <td className={td} colSpan={7}>No clients yet.</td>
                    </tr>
                  )}
                  {mine.map((c) => {
                    const liq = c.goals.find((g) => g.strategy === "Liquidity");
                    const months = liquidityMonths(c);
                    const paper = openItems(c);
                    const escalated = paper.filter((w) => w.status === "escalated").length;
                    const reqs = SERVICE_REQUESTS.filter((r) => r.clientId === c.id).length;
                    const last = c.contactHistory.reduce<(typeof c.contactHistory)[number] | undefined>((m, e) => (!m || e.day > m.day ? e : m), undefined);
                    const mtg = meetingFor(c.id);
                    return (
                      <tr key={c.id}>
                        <td className={td}>
                          <Link className="font-medium underline" href={`/household/${c.id}`}>{c.name}</Link>
                          <div className="text-xs text-ink-2">{c.archetype}, {c.persons.length} {c.persons.length === 1 ? "person" : "people"}</div>
                        </td>
                        <td className={td}>{c.tier}</td>
                        <td className={`${td} text-right`}>{usd(c.totalUsd)}</td>
                        <td className={td}>
                          {liq ? <Pill tone={months < liq.target ? "fail" : "pass"}>{`${months} of ${liq.target} months`}</Pill> : "No target"}
                        </td>
                        <td className={td}>
                          <div className="flex flex-wrap gap-1">
                            {c.opportunities.length > 0 && <Pill tone="accent">{`${c.opportunities.length} flagged`}</Pill>}
                            {paper.length > 0 && <Pill tone={escalated ? "fail" : "neutral"}>{`${paper.length} form${paper.length > 1 ? "s" : ""}${escalated ? `, ${escalated} escalated` : ""}`}</Pill>}
                            {reqs > 0 && <Pill>{`${reqs} request${reqs > 1 ? "s" : ""}`}</Pill>}
                          </div>
                        </td>
                        <td className={td}>{last ? `${last.channel}, ${-last.day} days ago` : "None logged"}</td>
                        <td className={td}>
                          {mtg ? <Link className="text-accent underline" href={`/meetings/${c.id}`}>{`${mtg.time} ${mtg.title}`}</Link> : ""}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          </Section>
        );
      })}
    </>
  );
}
