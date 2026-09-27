"use client";

import Link from "next/link";
import { useView } from "@/components/view";
import { paperStatus, reminderDraft, escalateAfter, ESCALATE_AFTER_DAYS } from "@/lib/onboarding/status";
import { SEGMENTS } from "@/lib/profile";
import { AgentBar, PageTitle, Pill, Section, TableScroll, Who, td, th } from "@/components/ui";

export default function Onboarding() {
  // The signed-in advisor's households, from the same view the Overview counts "past the escalation deadline" from.
  const v = useView();
  const rows = v.clients.flatMap((c) => c.paperwork.map((w) => ({ c, w, after: escalateAfter(c.id), ...paperStatus(w, 0, escalateAfter(c.id)) })));
  const order = { escalated: 0, due: 1, signed: 2 } as const;
  rows.sort((a, b) => order[a.status] - order[b.status] || b.daysOpen - a.daysOpen);
  const open = rows.filter((r) => r.status !== "signed");
  return (
    <>
      <PageTitle
        icon="esign"
        title="Paperwork"
        sub={`Every form per client. Unsigned for more than ${ESCALATE_AFTER_DAYS} days escalates to the branch supervisor (illustrative procedure)${SEGMENTS.filter((s) => s.values["paperwork.escalateAfterDays"] !== undefined).map((s) => `; ${s.label}: ${String(s.values["paperwork.escalateAfterDays"])} days`).join("")}. A segment or client can only shorten this. Reminders are drafted; people send them.`}
      />
      <AgentBar
        name="Paperwork"
        icon="esign"
        read={`${rows.length} forms across ${v.advisor.name}'s ${v.clients.length} client files, against each household's escalation threshold`}
        left={[`${open.filter((r) => r.status === "escalated").length} escalated to the branch supervisor`, `${open.filter((r) => r.status === "due").length} reminders drafted`, `${rows.length - open.length} signed and closed`]}
        steps={[
          { icon: "esign", who: "client", title: "Read every form on every file", detail: "Requested day, signed day, and any note the team left." },
          { icon: "settings", who: "agent", title: "Resolved the escalation threshold per household", detail: `Firm ${ESCALATE_AFTER_DAYS} days; a segment or a client can only shorten it.` },
          { icon: "alert", who: "agent", title: "Escalated what has been open longer than that", detail: "To the branch supervisor, with the form and the days open." },
          { icon: "email", who: "agent", title: "Drafted a reminder for each open form", detail: "In the client's preferred channel, where the file records one." },
          { icon: "people", who: "advisor", title: "Left the sending, and the chasing, to a person", detail: "A reminder leaves only when someone sends it." },
        ]}
      />
      <p className="mb-3">
        <Pill tone="fail">{open.filter((r) => r.status === "escalated").length} escalated</Pill>{" "}
        <Pill>{open.filter((r) => r.status === "due").length} due</Pill>{" "}
        <Pill tone="pass">{rows.length - open.length} signed</Pill>
      </p>
      <Section title="Open and recently signed">
        <TableScroll>
          <table className="w-full min-w-[34rem] max-w-6xl border-collapse">
            <thead>
              <tr>
                <th className={th}>Client</th>
                <th className={th}>Form</th>
                <th className={th}>Status</th>
                <th className={`${th} text-right`}>Days open</th>
                <th className={th}>Next step (draft)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ c, w, status, daysOpen }) => (
                <tr key={c.id + w.form}>
                  <td className={td}>
                    <Link className="underline" href={`/household/${c.id}`}>
                      {c.name}
                    </Link>
                  </td>
                  <td className={td}>
                    {w.form}
                    {w.note && <div className="text-xs text-ink-2">{w.note}</div>}
                  </td>
                  <td className={td}>
                    <Pill tone={status === "escalated" ? "fail" : status === "signed" ? "pass" : "neutral"}>{status}</Pill>
                  </td>
                  <td className={`${td} text-right`}>{daysOpen}</td>
                  <td className={`${td} max-w-md text-xs`}>
                    {status !== "signed" && <Who who="agent" label="Drafted" />}
                    {status === "signed"
                      ? "Signed."
                      : status === "escalated"
                        ? `Escalated to the branch supervisor. ${reminderDraft(c, w)}`
                        : reminderDraft(c, w)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Section>
    </>
  );
}
