"use client";

import Link from "next/link";
import { useState } from "react";
import { household } from "@/lib/fixtures/households";
import { opportunity } from "@/lib/fixtures/opportunities";
import { runChecks } from "@/lib/policy/checks";
import { useRelay, type Disposition } from "@/components/state";
import { PageTitle, Pill, Section, btn, td, th } from "@/components/ui";

export default function Supervision() {
  const { queue, dispose } = useRelay();
  const [comment, setComment] = useState<Record<string, string>>({});

  if (queue.length === 0) {
    return (
      <>
        <PageTitle title="Supervision console" sub="Every client-facing artifact is dispositioned here before any human releases it." />
        <p>
          The queue is empty. Submit a draft from <Link className="underline" href="/communications">Client communications</Link>.
        </p>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Supervision console" sub="The principal sees the same objects the advisor saw: draft, proposal, evidence, recipient count and regime, and each automated check." />
      {queue.map((q) => {
        const h = household(q.householdId)!;
        const o = opportunity(q.opportunityId)!;
        const checks = runChecks({ draft: q.draft, sources: q.sources, citedTitles: q.citedTitles, recipients: q.recipients, recordedRegime: q.regime });
        const allPass = checks.every((c) => c.pass);
        const act = (d: Disposition) => dispose(q.id, d, comment[q.id]);
        return (
          <Section key={q.id} title={`${q.id}: ${h.name}, ${o.title}`}>
            <div className="grid gap-4 xl:grid-cols-2">
              <pre className="whitespace-pre-wrap rounded border border-neutral-300 bg-neutral-50 p-3 font-sans">{q.draft}</pre>
              <div>
                <p className="mb-2">
                  <Pill tone={q.recipients > 25 ? "fail" : "pass"}>{q.regime}</Pill>{" "}
                  <span className="text-xs">
                    {q.recipients} retail investors across {q.batchSize} {q.batchSize === 1 ? "household" : "households"}
                  </span>
                </p>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className={th}>Check</th>
                      <th className={th}>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {checks.map((c) => (
                      <tr key={c.id}>
                        <td className={td}>{c.label}</td>
                        <td className={td}>
                          <Pill tone={c.pass ? "pass" : "fail"}>{c.pass ? "Pass" : "Fail"}</Pill> <span className="text-[11px]">{c.detail}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-xs">
                  <Link className="underline" href={`/household/${h.id}/proposal?opp=${o.id}`}>Proposal and rationale record</Link>
                  {" · "}
                  <Link className="underline" href={`/evidence/${o.id}`}>Evidence</Link>
                </p>
                {q.disposition ? (
                  <p className="mt-3" role="status">
                    Dispositioned: <strong>{q.disposition}</strong>
                    {q.comment ? `, "${q.comment}"` : ""}. Written to the audit record.
                  </p>
                ) : (
                  <div className="mt-3 space-y-2">
                    <label className="block text-xs">
                      Comment
                      <input
                        className="mt-0.5 block w-full rounded border border-neutral-300 px-2 py-1"
                        value={comment[q.id] ?? ""}
                        onChange={(e) => setComment((s) => ({ ...s, [q.id]: e.target.value }))}
                      />
                    </label>
                    <div className="flex gap-2">
                      <button className={btn} disabled={!allPass} onClick={() => act("approved")} title={allPass ? "" : "A failing check blocks approval"}>
                        Approve
                      </button>
                      <button className={btn} onClick={() => act("returned")}>
                        Return with comment
                      </button>
                      <button className={btn} onClick={() => act("blocked")}>
                        Block
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Section>
        );
      })}
    </>
  );
}
