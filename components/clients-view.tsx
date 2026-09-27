"use client";

// Households: the book as the agents see it, with the advisor's own list one
// drop away and a dossier one click away.
//
// The first version was a table of clients, which is what every CRM already
// is. What an agent layer adds is on this screen instead: connect the list
// you have, and for any household ask the research agent to read everything
// the firm holds plus the public record, cite it, check the sources against
// each other, and draft the note a person files.
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { useRelay } from "@/components/state";
import { useView } from "@/components/view";
import { useIngest } from "@/components/ingest";
import { Icon } from "@/components/icons";
import { Brief, Legend, More, PageTitle, Pill, Row, Section, TableScroll, Timeline, Who, btn, btnPrimary, td, th } from "@/components/ui";
import { liquidityMonths } from "@/lib/household-math";
import { openItems } from "@/lib/onboarding/status";
import { dossier, type Dossier, type DossierItem } from "@/lib/research/dossier";
import { usd } from "@/lib/format";
import { APP } from "@/lib/data/policy";

function Cites({ cites }: { cites: DossierItem["cites"] }) {
  return (
    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-ink-3">
      <Icon name="link" size={16} />
      {cites.map((k, i) => (
        <span key={i}>
          {k.href ? <Link href={k.href} className="text-ink-2 underline decoration-line-strong">{k.label}</Link> : <span className="text-ink-2">{k.label}</span>}
          <code className="ml-1 break-all">{k.record}</code>
        </span>
      ))}
    </span>
  );
}

function DossierPanel({ d, onFile, filed }: { d: Dossier; onFile: () => void; filed: boolean }) {
  return (
    <div className="mt-3 rounded border border-line bg-subtle p-4">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-2">
        <span className="flex items-center gap-1.5 text-ink"><Icon name="briefing" size={16} className="text-ink-3" />Dossier: {d.clientName}</span>
        <span>{d.counts.read} records read from {d.counts.sources} sources</span>
        <span className={d.counts.notOnFile ? "text-caution" : ""}>{d.counts.notOnFile} not on file</span>
        <span className={d.counts.contradicted ? "text-critical" : ""}>{d.counts.contradicted} contradictions</span>
        <span className="text-positive">{d.counts.corroborated} corroborated</span>
      </div>

      {d.checks.length > 0 && (
        <div className="mb-4 rounded border border-line bg-surface px-3">
          {d.checks.map((c) => (
            <Row key={c.id} icon={c.check?.verdict === "corroborates" ? "check" : c.check?.verdict === "contradicts" ? "conflict" : "alert"} tone={c.check?.verdict === "corroborates" ? "positive" : c.check?.verdict === "contradicts" ? "critical" : "caution"} title={c.text} meta={<>{c.check?.why} <span className="text-ink-3">Confidence {Math.round(c.confidence * 100)}%.</span><Cites cites={c.cites} /></>} right={<Pill tone={c.check?.verdict === "corroborates" ? "pass" : c.check?.verdict === "contradicts" ? "fail" : "accent"}>{c.check?.verdict === "corroborates" ? "Corroborates the file" : c.check?.verdict === "contradicts" ? "Sources disagree" : "Not on file"}</Pill>} />
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {d.sections.map((s) => (
          <details key={s.source} open={s.source === "public" || s.source === "crm"} className="rounded border border-line bg-surface">
            <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 text-[13px] text-ink">
              <Icon name={s.icon} size={16} className="text-ink-3" />
              <Who who={s.source === "documents" || s.source === "public" ? "agent" : "client"} />
              <span className="flex-1">{s.title}</span>
              <span className="text-[12px] text-ink-3">{s.items.length}</span>
            </summary>
            <p className="px-3 text-[11px] text-ink-3">{s.via}</p>
            <ul className="px-3 pb-2">
              {s.gap && <li className="py-2 text-[13px] text-ink-2">{s.gap}</li>}
              {s.items.map((it) => (
                <li key={it.id} className="border-t border-line py-2 text-[13px] text-ink">
                  {it.text}
                  {it.confidence < 1 && <span className="ml-1 text-[11px] text-ink-3">Confidence {Math.round(it.confidence * 100)}%</span>}
                  <Cites cites={it.cites} />
                </li>
              ))}
            </ul>
          </details>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div>
          <p className="mb-1 text-[12px] text-ink-3">Could not establish</p>
          {d.unknowns.length === 0 ? <p className="text-[13px] text-ink-2">Nothing outstanding.</p> : (
            <ul className="space-y-1 text-[13px] text-ink-2">
              {d.unknowns.map((u, i) => <li key={i} className="flex gap-2"><Icon name="question" size={16} className="mt-0.5 shrink-0 text-ink-3" /><span><span className="text-ink">{u.text}</span> {u.why}</span></li>)}
            </ul>
          )}
        </div>
        <div>
          <p className="mb-1 text-[12px] text-ink-3"><Who who="agent" />Drafted for the CRM, <Who who="advisor" label="you file it" /></p>
          <p className="rounded border border-line bg-surface p-3 text-[13px] text-ink-2">{d.draftNote}</p>
          <p className="mt-2 flex items-center gap-2">
            <button type="button" className={btnPrimary} disabled={filed} onClick={onFile}>{filed ? "Filed to the record" : "File as a team note"}</button>
            <span className="text-[12px] text-ink-3">{filed ? "It now appears in this household's briefing and file for the session." : "A person files it; the agent writes nothing. In production, a CRM write through the connector."}</span>
          </p>
        </div>
      </div>

      <details className="mt-3 text-[12px]">
        <summary className="cursor-pointer text-ink-3 underline decoration-line">How the agent got there</summary>
        <div className="mt-2"><Timeline items={d.trace.map((t) => ({ at: `step ${t.n}`, icon: t.icon, title: t.title, meta: t.detail }))} /></div>
      </details>
    </div>
  );
}

export function ClientsView() {
  const { book, connections, dataset, addNote, notesAdded } = useRelay();
  // The signed-in advisor's households as the session holds them: the same list every other screen counts.
  const v = useView();
  const clients = v.clients;
  const { onFiles, busy } = useIngest();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [ran, setRan] = useState<Record<string, { d: Dossier; ms: number }>>({});
  const research = (id: string) => {
    const c = book.clients.find((x) => x.id === id);
    if (!c) return;
    const t0 = performance.now();
    const d = dossier(c, connections, book.documents);
    setRan((r) => ({ ...r, [id]: { d, ms: Math.max(1, Math.round(performance.now() - t0)) } }));
    setOpen(id);
  };
  const connected = dataset.clients.filter((c) => c.advisorId === v.advisor.id).length;
  const stats = useMemo(() => {
    const silent = clients.filter((c) => { const last = Math.max(...c.contactHistory.map((e) => e.day), -9999); return -last > 90; }).length;
    const pub = clients.reduce((s, c) => s + (c.publicRecord?.length ?? 0), 0);
    return { silent, pub, forms: v.paperwork.length };
  }, [clients, v.paperwork]);

  return (
    <>
      <PageTitle icon="people" title="Households" sub="The book as the agents read it. Connect your own list; ask for a dossier on any household." />
      <Legend className="-mt-5 mb-6 lg:hidden" />

      <Brief
        name="Book"
        icon="people"
        at="day 0, 06:30"
        says={<>I read {v.advisor.name}&apos;s {clients.length} households{connected ? `, ${connected} of them connected from your files this session` : ""}. {stats.silent ? `${stats.silent} ${stats.silent === 1 ? "has" : "have"} not been spoken to in 90 days.` : "Every household has been spoken to in the last 90 days."} {stats.forms} forms are open and {stats.pub} public-record items are on file, unverified until you confirm them. Ask me to research any household and I read the file, the CRM, every captured message, the firm&apos;s documents and the public record, and draft the note you file.</>}
        points={clients.filter((c) => { const last = Math.max(...c.contactHistory.map((e) => e.day), -9999); return -last > 90; }).slice(0, 3).map((c) => ({ text: `${c.name}: last contact ${-Math.max(...c.contactHistory.map((e) => e.day))} days ago.`, who: "client" as const, tone: "caution" as const, href: `#${c.id}` }))}
        next={{ label: busy ? `Reading ${busy}` : "Connect your client list", onClick: () => input.current?.click() }}
      />
      <input ref={input} type="file" multiple accept=".csv,.xlsx,.json,.md,.txt" className="sr-only" aria-label="Connect a client list" onChange={(e) => { if (e.target.files?.length) void onFiles(e.target.files); e.target.value = ""; }} />
      <section className="mb-6" aria-label="About connecting">
        <More summary="What connecting does, and what the dossier reads">
          A .csv or .xlsx of households is read in this browser and every row is held to the shipped validator;
          nothing is uploaded, because there is nowhere to upload to. A dossier reads the client file, the CRM
          copies in it, every captured message on a connected source, the firm&apos;s documents through the same
          retrieval the evidence layer uses, and the public record. The public record is shipped as data here and
          would be a read-only search connector in production; the agent never treats it as fact.
        </More>
      </section>

      {[v.advisor].map((a) => {
        const mine = clients;
        return (
          <Section key={a.id} title={`${a.name} (${mine.length} shown of ${a.walkthrough?.households ?? "?"})`}>
            <TableScroll>
              <table className="w-full min-w-[34rem] border-collapse">
                <thead>
                  <tr>
                    <th className={th}>Household</th>
                    <th className={th}>Tier</th>
                    <th className={`${th} text-right`}>Assets</th>
                    <th className={th}>Cash cushion</th>
                    <th className={th}>Needs attention</th>
                    <th className={th}>Last contact</th>
                    <th className={th}>Today</th>
                    <th className={th}>Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {mine.length === 0 && <tr><td className={td} colSpan={8}>No households yet.</td></tr>}
                  {mine.map((c) => {
                    const liq = c.goals.find((g) => g.strategy === "Liquidity");
                    const months = liquidityMonths(c);
                    const paper = openItems(c);
                    const escalated = paper.filter((w) => w.status === "escalated").length;
                    const reqs = v.serviceRequests.filter((r) => r.clientId === c.id).length;
                    const last = c.contactHistory.reduce<(typeof c.contactHistory)[number] | undefined>((m, e) => (!m || e.day > m.day ? e : m), undefined);
                    const mtg = v.meetings.find((m) => m.clientId === c.id);
                    const r = ran[c.id];
                    const filed = (notesAdded[c.id] ?? []).some((n) => n.from === "Research agent");
                    return (
                      <>
                        <tr key={c.id} id={c.id}>
                          <td className={td}>
                            <Link className="font-medium underline" href={`/household/${c.id}`}>{c.name}</Link>
                            <div className="text-xs text-ink-2">{c.archetype}, {c.persons.length} {c.persons.length === 1 ? "person" : "people"}</div>
                          </td>
                          <td className={td}>{c.tier}</td>
                          <td className={`${td} text-right`}>{usd(c.totalUsd)}</td>
                          <td className={td}>{liq ? <Pill tone={months < liq.target ? "fail" : "pass"}>{`${months} of ${liq.target} months`}</Pill> : "No target"}</td>
                          <td className={td}>
                            <div className="flex flex-wrap gap-1">
                              {c.opportunities.length > 0 && <Pill tone="accent">{`${c.opportunities.length} flagged`}</Pill>}
                              {paper.length > 0 && <Pill tone={escalated ? "fail" : "neutral"}>{`${paper.length} form${paper.length > 1 ? "s" : ""}${escalated ? `, ${escalated} escalated` : ""}`}</Pill>}
                              {reqs > 0 && <Pill>{`${reqs} request${reqs > 1 ? "s" : ""}`}</Pill>}
                              {(c.publicRecord?.some((p) => !p.matches)) && <Pill tone="accent">Public record not on file</Pill>}
                            </div>
                          </td>
                          <td className={td}>{last ? `${last.channel}, ${-last.day} days ago` : "None logged"}</td>
                          <td className={td}>{mtg ? <Link className="underline" href={`/meetings/${c.id}`}>{mtg.time} {mtg.title}</Link> : ""}</td>
                          <td className={td}>
                            <span className="flex flex-col gap-1">
                              <button type="button" className={btn} onClick={() => (r && open === c.id ? setOpen(null) : research(c.id))}>{r && open === c.id ? "Hide dossier" : r ? "Show dossier" : "Research"}</button>
                              {r && <span className="text-[11px] text-ink-3">{r.d.counts.read} read in {r.ms} ms</span>}
                              <span className="flex flex-wrap gap-x-2 text-[11px]">
                                <Link href={`/research/${c.id}`} className="underline">Briefing</Link>
                                {c.opportunities.some((o) => o.action === "fund" || o.action === "trim") && <Link href={`/household/${c.id}/proposal?opp=${c.opportunities.find((o) => o.action === "fund" || o.action === "trim")!.id}`} className="underline">Options</Link>}
                                {mtg && <Link href={`/meetings/${c.id}`} className="underline">Pack</Link>}
                                {c.opportunities[0] && <Link href={`/evidence/${c.opportunities[0].id}`} className="underline">Why</Link>}
                              </span>
                            </span>
                          </td>
                        </tr>
                        {r && open === c.id && (
                          <tr key={`${c.id}-dossier`}>
                            <td className={td} colSpan={8}>
                              <DossierPanel d={r.d} filed={filed} onFile={() => addNote(c.id, { from: "Research agent", day: 0, text: r.d.draftNote })} />
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          </Section>
        );
      })}
      <p className="text-[12px] text-ink-3">The featured household for the demo is {book.clients.find((c) => c.id === APP.featured.clientId)?.name ?? "not in the book"}.</p>
    </>
  );
}
