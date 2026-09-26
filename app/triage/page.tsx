"use client";

import Link from "next/link";
import { useState } from "react";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { rank, score, DEFAULT_CAP } from "@/lib/ranking/rank";
import { retrieve } from "@/lib/evidence/retrieve";
import { useRelay } from "@/components/state";
import { CLASS_LABEL, PageTitle, Pill, btn, td, th } from "@/components/ui";

const REASONS = ["Already discussed with client", "Not material for this household", "Wrong household attribute", "Timing not right"];

export default function Triage() {
  const { dismissed, dismiss, restore, accepted } = useRelay();
  const [choosing, setChoosing] = useState<string | null>(null);
  const rows = rank(OPPORTUNITIES, new Set(Object.keys(dismissed)));
  const dismissedRows = OPPORTUNITIES.filter((o) => dismissed[o.id]);

  return (
    <>
      <PageTitle
        title="Book triage"
        sub={`Advisor A, 183 households. Ranked by materiality and trigger class, capped at ${DEFAULT_CAP} a day. One decision per row.`}
      />
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={th}>#</th>
            <th className={th}>Score</th>
            <th className={th}>Trigger</th>
            <th className={th}>Household</th>
            <th className={th}>Why this household, why today</th>
            <th className={th}>Decide</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((o, i) => {
            const h = household(o.householdId)!;
            const refused = retrieve(o).refused;
            const proposable = !refused && (o.action === "fund" || o.action === "trim");
            return (
              <tr key={o.id}>
                <td className={td}>{i + 1}</td>
                <td className={td}>{score(o)}</td>
                <td className={td}>
                  <Pill tone={o.triggerClass === "market_view" ? "neutral" : "accent"}>{CLASS_LABEL[o.triggerClass]}</Pill>
                  <div className="mt-0.5 text-[11px] text-neutral-500">day {o.observedDay}</div>
                </td>
                <td className={td}>
                  <Link className="underline decoration-neutral-400 hover:decoration-accent" href={`/household/${h.id}`}>
                    {h.name}
                  </Link>
                  <div className="text-[11px] text-neutral-500">{h.tier}</div>
                </td>
                <td className={td}>
                  <div className="font-medium">{o.title}</div>
                  <ol className="mt-0.5 flex flex-wrap gap-x-1 text-[11px] text-neutral-600">
                    {o.reasonPath.map((n, k) => (
                      <li key={k}>
                        {k > 0 && <span aria-hidden="true">{"→ "}</span>}
                        <span className="text-neutral-400">{n.kind}</span> {n.label}
                      </li>
                    ))}
                  </ol>
                  <Link className="text-[11px] text-accent underline" href={`/evidence/${o.id}`}>
                    Evidence
                  </Link>
                </td>
                <td className={`${td} whitespace-nowrap`}>
                  <div className="flex flex-col items-start gap-1">
                    {proposable ? (
                      <Link className={btn} href={`/household/${h.id}/proposal?opp=${o.id}`}>
                        {accepted[o.id] ? "Proposal accepted" : "Propose action"}
                      </Link>
                    ) : refused ? (
                      <Link className="text-[11px] text-red-800 underline" href={`/evidence/${o.id}`}>
                        Refused: no supporting evidence
                      </Link>
                    ) : (
                      <span className="text-[11px] text-neutral-500">Review task, no product action</span>
                    )}
                    {choosing === o.id ? (
                      <label className="text-[11px]">
                        <span className="sr-only">Dismiss reason</span>
                        <select
                          autoFocus
                          className="rounded border border-neutral-300 text-[11px]"
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              dismiss(o.id, e.target.value);
                              setChoosing(null);
                            }
                          }}
                        >
                          <option value="" disabled>
                            Reason, required
                          </option>
                          {REASONS.map((r) => (
                            <option key={r}>{r}</option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      <button className={btn} onClick={() => setChoosing(o.id)}>
                        Dismiss
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {dismissedRows.length > 0 && (
        <div className="mt-4 text-xs text-neutral-600">
          <p className="font-medium">Dismissed, with reasons returned upstream as labelled feedback:</p>
          <ul className="mt-1 space-y-0.5">
            {dismissedRows.map((o) => (
              <li key={o.id}>
                {o.title}: {dismissed[o.id]}{" "}
                <button className="underline" onClick={() => restore(o.id)}>
                  Restore
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
