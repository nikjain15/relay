import Link from "next/link";
import { CLIENTS } from "@/lib/data";
import { paperStatus, reminderDraft, escalateAfter, ESCALATE_AFTER_DAYS } from "@/lib/onboarding/status";
import { SEGMENTS } from "@/lib/profile";
import { PageTitle, Pill, Section, TableScroll, td, th } from "@/components/ui";

export default function Onboarding() {
  const rows = CLIENTS.flatMap((c) => c.paperwork.map((w) => ({ c, w, after: escalateAfter(c.id), ...paperStatus(w, 0, escalateAfter(c.id)) })));
  const order = { escalated: 0, due: 1, signed: 2 } as const;
  rows.sort((a, b) => order[a.status] - order[b.status] || b.daysOpen - a.daysOpen);
  const open = rows.filter((r) => r.status !== "signed");
  return (
    <>
      <PageTitle
        title="Paperwork"
        sub={`Every form per client. Unsigned for more than ${ESCALATE_AFTER_DAYS} days escalates to the branch supervisor (illustrative procedure)${SEGMENTS.filter((s) => s.values["paperwork.escalateAfterDays"] !== undefined).map((s) => `; ${s.label}: ${String(s.values["paperwork.escalateAfterDays"])} days`).join("")}. A segment or client can only shorten this. Reminders are drafted; people send them.`}
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
