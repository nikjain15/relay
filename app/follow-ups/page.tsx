"use client";

import Link from "next/link";
import { useState } from "react";
import { ADVISORS_DATA } from "@/lib/data";
import { allTasks, dueLabel } from "@/lib/followups";
import { clientName } from "@/lib/meetings/prep";
import { useRelay } from "@/components/state";
import { PageTitle, Pill, Section, TableScroll, btn, td, th } from "@/components/ui";

export default function FollowUps() {
  const { queue, markSent, log, addLog } = useRelay();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const approved = queue.filter((q) => q.disposition === "approved");
  const tasks = allTasks();
  return (
    <>
      <PageTitle title="Follow-ups" sub="What the team owes after the advice. Relay never sends: the advisor sends approved notes and logs what happened." />
      <Section title="Approved notes waiting for you to send">
        {approved.length === 0 ? (
          <p className="text-ink-2">
            None yet. Approve a note in the <Link className="underline" href="/supervision">compliance check</Link> and it appears here.
          </p>
        ) : (
          <ul className="grid max-w-4xl gap-2">
            {approved.map((q) => (
              <li key={q.id} className="rounded border border-line p-3">
                <p className="font-medium">{clientName(q.householdId)}: {q.recipients} {q.recipients === 1 ? "person" : "people"}, {q.regime}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {q.sentByAdvisor ? (
                    <Pill tone="pass">Sent by you</Pill>
                  ) : (
                    <button className={btn} onClick={() => { markSent(q.id); addLog({ clientId: q.householdId, what: "Approved note sent by the advisor" }); }}>
                      I sent it from my email
                    </button>
                  )}
                  <button className={btn} onClick={() => addLog({ clientId: q.householdId, what: "Call logged before the note" })}>Log a call</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="Tasks, overdue first">
        <TableScroll>
          <table className="w-full min-w-[34rem] max-w-5xl border-collapse">
            <thead>
              <tr>
                <th className={th}>Done</th>
                <th className={th}>Task</th>
                <th className={th}>Client</th>
                <th className={th}>Owner</th>
                <th className={th}>Due</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => {
                const key = t.clientId + t.text;
                return (
                  <tr key={key} className={done[key] ? "text-ink-3 line-through" : ""}>
                    <td className={td}>
                      <input type="checkbox" aria-label={`Mark done: ${t.text}`} checked={!!done[key]} onChange={(e) => setDone((s) => ({ ...s, [key]: e.target.checked }))} />
                    </td>
                    <td className={td}>{t.text}</td>
                    <td className={td}>
                      <Link className="underline" href={`/household/${t.clientId}`}>{t.clientName}</Link>
                      <div className="text-xs text-ink-2">{ADVISORS_DATA.find((a) => a.id === t.advisorId)?.walkthrough?.label}</div>
                    </td>
                    <td className={td}>{t.owner}</td>
                    <td className={td}>{t.dueDay < 0 ? <Pill tone="fail">{dueLabel(t.dueDay)}</Pill> : dueLabel(t.dueDay)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      </Section>
      <Section title="Activity logged this session">
        {log.length === 0 ? (
          <p className="text-ink-2">Nothing logged yet.</p>
        ) : (
          <ul className="list-inside list-disc">
            {log.map((e, i) => (
              <li key={i}>{clientName(e.clientId)}: {e.what}</li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-ink-2">In production this writes to the CRM (PRD FR-19). Here it lasts for the session.</p>
      </Section>
    </>
  );
}
