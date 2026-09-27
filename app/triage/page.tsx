"use client";

import Link from "next/link";
import { useState } from "react";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { rank, score } from "@/lib/ranking/rank";
import { resolveProfile, sourceLabel } from "@/lib/profile";
import { retrieve } from "@/lib/evidence/retrieve";
import { ADVISORS_DATA, clientFile } from "@/lib/data";
import { APP, POLICY } from "@/lib/data/policy";
import { useRelay } from "@/components/state";
import { CLASS_LABEL, NODE_LABEL, PageTitle, Pill, TableScroll, btn, btnPrimary, td, th } from "@/components/ui";
import { Icon, CLASS_ICON } from "@/components/icons";

const REASONS = POLICY.triage.dismissReasons;

export default function Triage() {
  const { dismissed, dismiss, restore, accepted, overlay } = useRelay();
  const [choosing, setChoosing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [advisorId, setAdvisorId] = useState(APP.defaultAdvisorId);
  // Falls back to the first advisor if app.json names one that is not in the data.
  const advisor = ADVISORS_DATA.find((a) => a.id === advisorId) ?? ADVISORS_DATA[0];
  const day = advisor.walkthrough ?? { meetings: [], alertsOvernight: 0 };
  const mine = OPPORTUNITIES.filter((o) => clientFile(o.householdId)?.advisorId === advisor.id);
  const prof = resolveProfile({ advisorId: advisor.id }, overlay);
  const cap = prof.values["triage.dailyCap"];
  const weights = prof.values["triage.classWeights"];
  const rows = rank(mine, new Set(Object.keys(dismissed)), cap, weights);
  const lastContact = (hid: string) => {
    const h = clientFile(hid)?.contactHistory ?? [];
    const last = h.reduce<(typeof h)[number] | undefined>((m, e) => (!m || e.day > m.day ? e : m), undefined);
    return last ? `${last.channel}, ${-last.day} days ago` : "No contact logged";
  };
  const dismissedRows = OPPORTUNITIES.filter((o) => dismissed[o.id]);

  return (
    <>
      <PageTitle title="Today's list" sub={`Capped at ${cap}. One decision per row.`} />
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Advisor">
        {ADVISORS_DATA.map((a) => (
          <button key={a.id} className={a.id === advisor.id ? btnPrimary : btn} aria-pressed={a.id === advisor.id} onClick={() => setAdvisorId(a.id)}>
            {a.walkthrough?.label ?? a.name}
          </button>
        ))}
      </div>
      <div className="mb-4 grid max-w-5xl gap-2 rounded border border-line p-3 md:grid-cols-[auto_1fr]">
        <div className="flex gap-5 text-ink-2">
          <span><strong className="text-lg text-ink">{day.meetings.length}</strong> meetings</span>
          <span><strong className="text-lg text-ink">{day.alertsOvernight}</strong> alerts overnight</span>
          <span><strong className="text-lg text-ink">{rows.length}</strong> on your list</span>
        </div>
        <div className="flex flex-wrap gap-2 md:justify-end">
          {day.meetings.map((m) => (
            <Link key={m.time} href={m.clientId ? `/meetings/${m.clientId}` : m.prospectId ? "/pipeline" : "/meetings"} className="rounded border border-line px-2 py-0.5 text-xs hover:border-accent">
              <strong>{m.time}</strong> {m.title}
            </Link>
          ))}
        </div>
        <p className="text-xs text-ink-2 md:col-span-2">{advisor.name}: {advisor.role}. {advisor.book}.</p>
        <p className="text-xs text-ink-2 md:col-span-2">
          Personalized: list of {cap} ({sourceLabel(prof.provenance["triage.dailyCap"])}); signal weights ({sourceLabel(prof.provenance["triage.classWeights"])}).{" "}
          <Link className="underline" href={`/profiles?advisor=${advisor.id}`}>Settings</Link> &middot; <Link className="underline" href="/learning">Suggestions</Link>
        </p>
      </div>
      <TableScroll>
        <table className="w-full min-w-[34rem] border-collapse">
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
                  <td className={td}>{score(o, weights)}</td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1.5"><Icon name={CLASS_ICON[o.triggerClass]} size={16} className="text-ink-3" /><Pill tone={o.triggerClass === "market_view" ? "neutral" : "accent"}>{CLASS_LABEL[o.triggerClass]}</Pill></span>
                    <div className="mt-0.5 text-xs text-ink-2">seen day {o.observedDay} of the feed</div>
                  </td>
                  <td className={td}>
                    <Link className="underline decoration-line-strong hover:decoration-accent" href={`/household/${h.id}`}>
                      {h.name}
                    </Link>
                    <div className="text-xs text-ink-2">{h.tier}</div>
                    <div className="text-xs text-ink-2">{lastContact(h.id)}</div>
                  </td>
                  <td className={td}>
                    <div className="font-medium">{o.plainTitle ?? o.title}</div>
                    <ol className="mt-0.5 flex flex-wrap gap-x-1 text-xs text-ink-2">
                      {o.reasonPath.map((n, k) => (
                        <li key={k}>
                          {k > 0 && <span aria-hidden="true">{"→ "}</span>}
                          <span className="text-ink-3">{NODE_LABEL[n.kind] ?? n.kind}:</span> {n.label}
                        </li>
                      ))}
                    </ol>
                    <Link className="text-xs text-accent underline" href={`/evidence/${o.id}`}>
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
                        <Link className="text-xs text-critical underline" href={`/evidence/${o.id}`}>
                          Refused: no supporting evidence
                        </Link>
                      ) : (
                        <span className="text-xs text-ink-2">Review task, no product action</span>
                      )}
                      {choosing === o.id ? (
                        <div className="flex flex-col items-start gap-1">
                          <label className="text-xs">
                            <span className="sr-only">Dismiss reason</span>
                            <select autoFocus className="rounded border border-line text-xs" value={reason} onChange={(e) => setReason(e.target.value)}>
                              <option value="" disabled>
                                Reason, required
                              </option>
                              {REASONS.map((r) => (
                                <option key={r}>{r}</option>
                              ))}
                            </select>
                          </label>
                          <div className="flex gap-1">
                            <button
                              className={btn}
                              disabled={!reason}
                              onClick={() => {
                                dismiss(o.id, reason);
                                setChoosing(null);
                                setReason("");
                              }}
                            >
                              Dismiss with this reason
                            </button>
                            <button className={btn} onClick={() => { setChoosing(null); setReason(""); }}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button className={btn} onClick={() => { setChoosing(o.id); setReason(""); }}>
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
      </TableScroll>
      {dismissedRows.length > 0 && (
        <div className="mt-4 text-xs text-ink-2">
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
