"use client";

import Link from "next/link";
import { useState } from "react";
import { ADVISORS_DATA } from "@/lib/data";
import { allTasks, dueLabel } from "@/lib/followups";
import { clientName } from "@/lib/meetings/prep";
import { useRelay } from "@/components/state";
import { AgentBar, PageTitle, Pill, Section, TableScroll, Who, btn, td, th } from "@/components/ui";
import { Icon } from "@/components/icons";
import { policyFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import { prepareAll, KIND } from "@/lib/compliance/actions";
import { APP } from "@/lib/data/policy";

export default function FollowUps() {
  const { queue, markSent, log, addLog, ruleEdits, connections, caseDispositions, actionDecisions, book } = useRelay();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const accepted = (() => {
    const policy = policyFrom(ruleEdits, scopeFor(APP.defaultAdvisorId));
    const open = sweep(APP.defaultAdvisorId, policy, connections, book.clients).cases.filter((c) => !caseDispositions[c.id]);
    return prepareAll(open, policy.rules).filter((a) => actionDecisions[a.id]?.decision === "accepted");
  })();
  const approved = queue.filter((q) => q.disposition === "approved");
  const tasks = allTasks();
  return (
    <>
      <PageTitle title="Follow-ups" sub="What the team owes after the advice. Relay never sends: the advisor sends approved notes and logs what happened." />
      <AgentBar
        name="Follow-up"
        icon="check"
        read={`${queue.length} notes in the review queue, ${accepted.length} accepted agent actions and ${tasks.length} tasks across the book`}
        left={[`${approved.length} approved notes waiting for you to send`, `${accepted.length} accepted actions with an owner`, `${tasks.filter((t) => t.dueDay < 0).length} tasks overdue`]}
        steps={[
          { icon: "shield", who: "agent", title: "Read the supervision queue for approved notes", detail: "A note reaches here only after a principal approved it." },
          { icon: "agent", who: "agent", title: "Collected the actions a person accepted from the agents", detail: "Each with the actor who carries it out and its due date." },
          { icon: "list", who: "agent", title: "Ordered every open task, overdue first", detail: "From the tasks on each client file." },
          { icon: "people", who: "advisor", title: "Left sending and logging to the advisor", detail: "Relay marks nothing sent; you do, and it records that you said so." },
        ]}
      />
      <Section title="Approved notes waiting for you to send">
        {approved.length === 0 ? (
          <p className="text-ink-2">
            None yet. Approve a note in the <Link className="underline" href="/supervision">compliance check</Link> and it appears here.
          </p>
        ) : (
          <ul className="grid max-w-4xl gap-2">
            {approved.map((q) => (
              <li key={q.id} className="rounded border border-line p-3">
                <p className="font-medium"><Who who="advisor" />{clientName(q.householdId)}: {q.recipients} {q.recipients === 1 ? "person" : "people"}, {q.regime}</p>
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
      <Section title="Accepted from the agents">
        {accepted.length === 0 ? (
          <p className="text-ink-2">
            Nothing accepted yet. Each finding on <Link className="underline" href="/supervision">Supervision</Link> carries the actions its agent prepared; accepting one puts it here.
          </p>
        ) : (
          <ul className="grid max-w-4xl gap-2">
            {accepted.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded border border-line p-3">
                <Icon name={a.kind === "draft_note" ? "email" : a.kind === "task" ? "check" : a.kind === "schedule" ? "calendar" : a.kind === "callback" ? "voice" : a.kind === "request_form" ? "esign" : a.kind === "connect_source" ? "link" : "block"} size={20} className="mt-px text-ink-3" />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px]"><Who who="agent" /><Pill tone="neutral">{KIND[a.kind].label}</Pill> {a.title}</span>
                  <span className="mt-0.5 block text-[12px] text-ink-2">{a.subjectLabel} · {a.agentName} · {a.actor}{a.dueInDays !== undefined ? ` · due in ${a.dueInDays} day${a.dueInDays === 1 ? "" : "s"}` : ""}</span>
                  {a.kind === "draft_note" && <span className="mt-1.5 block whitespace-pre-wrap rounded bg-subtle p-2 text-[12px] text-ink">{a.detail}</span>}
                </span>
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
                    <td className={td}><Who who="advisor" label={t.owner === "Advisor" ? "You" : "Team"} />{t.text}</td>
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
