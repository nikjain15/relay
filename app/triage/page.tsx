"use client";

import Link from "next/link";
import { useState } from "react";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { rank, score } from "@/lib/ranking/rank";
import { resolveProfile, sourceLabel } from "@/lib/profile";
import { retrieve } from "@/lib/evidence/retrieve";
import { ADVISORS_DATA, CLIENTS, toHousehold } from "@/lib/data";
import { APP, POLICY } from "@/lib/data/policy";
import { useRelay } from "@/components/state";
import { Brief, CLASS_LABEL, NODE_LABEL, PageTitle, Pill, TableScroll, btn, btnPrimary, td, th } from "@/components/ui";
import { Icon, CLASS_ICON } from "@/components/icons";
import { RankingTuner } from "@/components/ranking-tuner";

const REASONS = POLICY.triage.dismissReasons;

export default function Triage() {
  const { dismissed, dismiss, restore, accepted, overlay, book } = useRelay();
  const shipped = new Set(OPPORTUNITIES.map((o) => o.id));
  const clientOf = (id: string) => book.clients.find((c) => c.id === id);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [advisorId, setAdvisorId] = useState(APP.defaultAdvisorId);
  // Falls back to the first advisor if app.json names one that is not in the data.
  const advisor = ADVISORS_DATA.find((a) => a.id === advisorId) ?? ADVISORS_DATA[0];
  const day = advisor.walkthrough ?? { meetings: [], alertsOvernight: 0 };
  const mine = book.opportunities.filter((o) => clientOf(o.householdId)?.advisorId === advisor.id);
  const prof = resolveProfile({ advisorId: advisor.id }, overlay);
  const cap = prof.values["triage.dailyCap"];
  const weights = prof.values["triage.classWeights"];
  const rows = rank(mine, new Set(Object.keys(dismissed)), cap, weights);
  const lastContact = (hid: string) => {
    const h = clientOf(hid)?.contactHistory ?? [];
    const last = h.reduce<(typeof h)[number] | undefined>((m, e) => (!m || e.day > m.day ? e : m), undefined);
    return last ? `${last.channel}, ${-last.day} days ago` : "No contact logged";
  };
  const dismissedRows = book.opportunities.filter((o) => dismissed[o.id]);

  return (
    <>
      <PageTitle icon="list" title="Today's list" sub={`Capped at ${cap}. One decision per row, ranked by materiality times the weight you give each kind of signal.`} />
      <Brief
        name="Ranking"
        icon="list"
        at="day 0, 06:45"
        says={<>I ranked {mine.length} opportunities for {advisor.name} and kept the top {rows.length}, capped at {cap} by your preferences. {day.meetings.length} meetings today and {day.alertsOvernight} alerts overnight. {rows[0] ? <>First: {rows[0].plainTitle ?? rows[0].title} for {clientOf(rows[0].householdId)?.name ?? rows[0].householdId}.</> : null}</>}
        points={rows.slice(0, 3).map((o) => ({ text: `${clientOf(o.householdId)?.name ?? o.householdId}: ${o.plainTitle ?? o.title}`, href: `/evidence/${o.id}`, who: "client" as const }))}
        next={rows[0] ? { label: "Why this client, cited", href: `/evidence/${rows[0].id}` } : undefined}
        note="The score is materiality times your weight for the kind of signal, shown on each row; a model never ranks. Tune the weights below. Dismissing with a reason feeds the learning loop."
      />
      <div className="mb-3 flex flex-wrap items-center gap-2" role="group" aria-label="Advisor">
        {ADVISORS_DATA.map((a) => (
          <button key={a.id} className={a.id === advisor.id ? btnPrimary : btn} aria-pressed={a.id === advisor.id} onClick={() => setAdvisorId(a.id)}>
            {a.name}
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
          <a className="underline" href="#tune">Tune the ranking</a> &middot; <Link className="underline" href={`/profiles?advisor=${advisor.id}`}>Settings</Link> &middot; <Link className="underline" href="/learning">Suggestions</Link>
        </p>
      </div>
      <RankingTuner advisorId={advisor.id} advisorName={advisor.name} opportunities={mine} dismissed={new Set(Object.keys(dismissed))} titleOf={(o) => `${clientOf(o.householdId)?.name ?? o.householdId}, ${o.plainTitle ?? o.title}`} />
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
              const h = household(o.householdId) ?? toHousehold(clientOf(o.householdId)!);
              const refused = retrieve(o, book.documents).refused;
              const isShipped = shipped.has(o.id) && CLIENTS.some((c) => c.id === h.id);
              const clientHref = isShipped ? `/household/${h.id}` : `/sources#${h.id}`;
              const proposable = !refused && (o.action === "fund" || o.action === "trim");
              return (
                <tr key={o.id}>
                  <td className={td}>{i + 1}</td>
                  <td className={td}>
                    <span className="font-medium tabular-nums">{score(o, weights)}</span>
                    <div className="mt-0.5 whitespace-nowrap text-xs text-ink-2 tabular-nums" title={`Materiality ${o.materiality} times the ${CLASS_LABEL[o.triggerClass].toLowerCase()} weight ${(weights[o.triggerClass] ?? 1).toFixed(2)}`}>{o.materiality} &times; {(weights[o.triggerClass] ?? 1).toFixed(2)}</div>
                  </td>
                  <td className={td}>
                    <span className="inline-flex items-center gap-1.5"><Icon name={CLASS_ICON[o.triggerClass]} size={16} className="text-ink-3" /><Pill tone={o.triggerClass === "market_view" ? "neutral" : "accent"}>{CLASS_LABEL[o.triggerClass]}</Pill></span>
                    <div className="mt-0.5 text-xs text-ink-2">seen day {o.observedDay} of the feed</div>
                  </td>
                  <td className={td}>
                    <Link className="underline decoration-line-strong hover:decoration-accent" href={clientHref}>
                      {h.name}
                    </Link>
                    {!isShipped && <span className="ml-1 align-middle"><Pill tone="neutral">Connected</Pill></span>}
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
                    {isShipped ? (
                      <Link className="text-xs text-accent underline" href={`/evidence/${o.id}`}>
                        Evidence
                      </Link>
                    ) : (
                      <span className="text-xs text-ink-2">{refused ? "No document in the corpus supports this" : `Cites ${o.evidenceDocIds.length} document${o.evidenceDocIds.length === 1 ? "" : "s"}`}</span>
                    )}
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <div className="flex flex-col items-start gap-1">
                      {proposable && !isShipped ? (
                        <span className="text-xs text-ink-2">Options run on the shipped book; a connected household is evaluated on Supervision and in its briefing</span>
                      ) : proposable ? (
                        <Link className={btn} href={`/household/${h.id}/proposal?opp=${o.id}`}>
                          {accepted[o.id] ? "Proposal accepted" : "Propose action"}
                        </Link>
                      ) : refused && isShipped ? (
                        <Link className="text-xs text-critical underline" href={`/evidence/${o.id}`}>
                          Refused: no supporting evidence
                        </Link>
                      ) : refused ? (
                        <span className="text-xs text-critical">Refused: no supporting evidence</span>
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
