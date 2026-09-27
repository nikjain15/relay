"use client";

// Sources: everything the agents read, connected in three steps.
//
// The book you already have, the tools you already use, the documents and
// policies you already follow. Relay reads all of it in place and writes
// nothing back; the advisor keeps working in their CRM, their custodian
// portal and their planning tool. Each step says what it unlocks, because a
// connector is only worth the trouble if a rule can read it, and a gap is
// only worth closing if a supervisor would ask about it.
import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRelay, type ImportBatch } from "@/components/state";
import { Banner, Brief, Card, Legend, Mark, More, PageTitle, Pill, Section, TableScroll, btn, btnPrimary, td, th } from "@/components/ui";
import { CHANNEL_ICON, Icon } from "@/components/icons";
import { LiveRun } from "@/components/live-run";
import { useIngest } from "@/components/ingest";
import { CATALOG, catalogRank } from "@/lib/connectors/catalog";
import { ListControls, matches, useList } from "@/components/list-controls";
import { coverageFor, type ChannelCoverage } from "@/lib/connectors/coverage";
import type { ChannelKind, ConnectorDefinition } from "@/lib/connectors/types";
import { rulesFedBy } from "@/lib/compliance/sources";
import { AGENTS } from "@/lib/compliance/agents";
import { mapClients, mapMessages } from "@/lib/import/map";
import { sampleBook, CLIENT_COLUMNS, MESSAGE_COLUMNS } from "@/lib/import/sample";
import { clientErrors } from "@/lib/data/validate";
import { ADVISORS_DATA, CONNECTORS_DATA } from "@/lib/data";
import { usd } from "@/lib/format";

export const CHANNEL_LABEL: Record<ChannelKind, string> = {
  email: "Email and calendar", calendar: "Calendar", meeting: "Video meetings", voice: "Phone calls", sms: "Text messages", chat: "Chat",
  social: "Social", crm: "CRM", custodian: "Custodian", portfolio: "Portfolio and reporting", archive: "Archive", esign: "E-signature", planning: "Financial planning",
};
/** Files in public/ are served under the base path on the static site. */
const ASSET = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const STATUS: Record<ChannelCoverage["status"], { label: string; tone: "pass" | "fail" | "neutral" | "accent" }> = {
  covered: { label: "Captured", tone: "pass" }, partial: { label: "Not retained", tone: "fail" }, gap: { label: "Not captured", tone: "fail" }, unused: { label: "Not used", tone: "neutral" },
};
/** The order an advisor thinks in: the tools of the desk first, then the channels a supervisor asks about. */
const ORDER: ChannelKind[] = ["crm", "custodian", "portfolio", "planning", "email", "calendar", "meeting", "voice", "sms", "chat", "social", "archive", "esign"];

function ConnectorRow({ c, advisorId }: { c: ConnectorDefinition; advisorId: string }) {
  const { connections, setConnectorStatus } = useRelay();
  const state = connections.find((s) => s.advisorId === advisorId && s.connectorId === c.id);
  const status = state?.status ?? "available";
  const feeds = [...new Set([c.id, ...(c.satisfies ?? [])].flatMap((id) => rulesFedBy(id)))];
  const desks = [...new Set(feeds.flatMap((r) => AGENTS.filter((a) => a.ruleIds.includes(r.id)).map((a) => a.desk)))];
  return (
    <div className="flex flex-wrap items-start gap-3 border-t border-line py-3 first:border-t-0">
      <Mark text={c.vendor} tone={status === "connected" ? "client" : "plain"} />
      <div className="min-w-0 flex-1">
        <p className="text-body font-medium text-ink">{c.name} <span className="font-normal text-ink-3">{c.vendor}</span></p>
        <p className="mt-0.5 text-body text-ink-2">{c.summary}</p>
        {status === "degraded" && state?.issue && <p className="mt-1 text-body text-critical">{state.issue}</p>}
        {status === "connected" && (
          <p className="mt-1 text-meta text-ink-3">
            {c.retention === "system_of_record" ? "Retained copy" : "Read only, not the retained copy"}
            {state?.recordsIngested ? ` · ${state.recordsIngested.toLocaleString()} records` : ""}{state?.lastIngestAt ? ` · last read ${state.lastIngestAt}` : ""}
          </p>
        )}
        <p className="mt-1 text-meta text-ink-3">
          {feeds.length ? <>Unlocks {feeds.length} rule{feeds.length === 1 ? "" : "s"} on {desks.join(", ")}.</> : "Adds records the research and discovery agents read."}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 max-sm:w-full max-sm:pl-11">
        {status === "connected" && <span className="flex items-center gap-1 text-meta text-positive"><Icon name="check" size={16} />Connected</span>}
        {status === "degraded" && <span className="flex items-center gap-1 text-meta text-critical"><Icon name="alert" size={16} />Degraded</span>}
        <button type="button" className={status === "connected" ? btn : btnPrimary} onClick={() => setConnectorStatus(advisorId, c.id, status === "connected" ? "available" : "connected")}>
          {status === "connected" ? "Disconnect" : status === "degraded" ? "Reconnect" : "Connect"}
        </button>
      </div>
    </div>
  );
}

export function SourcesView() {
  // The signed-in advisor, from session state: every screen follows the same one.
  const advisorId = useRelay().advisorId;
  const { dataset, addBatch, clearDataset, book, connections } = useRelay();
  const [dragOver, setDragOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const { onFiles, busy, ctx } = useIngest();
  const advisor = ADVISORS_DATA.find((a) => a.id === advisorId);
  const report = useMemo(() => coverageFor(advisorId, connections, CONNECTORS_DATA.attestations), [advisorId, connections]);
  const gaps = report.gaps;
  const connectedCount = connections.filter((c) => c.advisorId === advisorId && c.status === "connected").length;
  const byChannel = useMemo(() => ORDER.map((k) => report.channels.find((c) => c.channel === k)!).filter(Boolean), [report]);
  const inUse = byChannel.filter((c) => c.attested || c.status === "covered");
  type Ch = (typeof byChannel)[number];
  const connectorsOf = (ch: Ch) => [...ch.connected, ...ch.degraded, ...ch.available].sort((a, b) => catalogRank(a.id) - catalogRank(b.id));
  const DESK: ChannelKind[] = ["crm", "custodian", "portfolio", "planning"];
  const list = useList<Ch>(byChannel, {
    text: (ch) => `${CHANNEL_LABEL[ch.channel]} ${connectorsOf(ch).map((c) => `${c.name} ${c.vendor}`).join(" ")}`,
    initialFilter: "inuse",
    filters: [
      { id: "inuse", label: "You use", test: (ch) => ch.attested || ch.status === "covered" },
      { id: "gaps", label: "Gaps", test: (ch) => ch.status === "gap" || ch.status === "partial" },
      { id: "tools", label: "Desk tools", test: (ch) => DESK.includes(ch.channel) },
      { id: "channels", label: "Client channels", test: (ch) => !DESK.includes(ch.channel) },
    ],
  });
  // A search for a vendor shows that vendor's row, not the whole channel it sits in.
  const rowsOf = (ch: Ch) => {
    const all = connectorsOf(ch);
    if (!list.query.trim() || matches(CHANNEL_LABEL[ch.channel], list.query)) return all;
    const hit = all.filter((c) => matches(`${c.name} ${c.vendor} ${c.summary}`, list.query));
    return hit.length ? hit : all;
  };

  const generate = useCallback((n: number) => {
    const t0 = performance.now();
    const b = sampleBook(n, 7 + dataset.batches.length);
    const rows = b.clients.map((r) => Object.fromEntries(CLIENT_COLUMNS.map((k) => [k, String(r[k] ?? "")])));
    const r = mapClients(rows, { source: `generated book of ${n}` });
    const msgRows = b.messages.map((m) => Object.fromEntries(MESSAGE_COLUMNS.map((k) => [k, String(m[k] ?? "")])));
    const mm = mapMessages(msgRows, r.clients);
    const seen = { ids: new Set<string>(), personIds: new Set<string>(), oppIds: new Set<string>() };
    const errors: string[] = [];
    const good = r.clients.filter((c) => { const e = clientErrors(c, ctx, seen); errors.push(...e); return e.length === 0; });
    addBatch({ id: `b-${Date.now()}`, fileName: `Generated book, ${n} households, ${mm.attached} messages`, kind: "clients", rows: n, accepted: good.length, errors, warnings: r.warnings.map((w) => `${w.id}: ${w.text}`), at: new Date().toISOString(), ms: Math.round(performance.now() - t0) }, good, []);
  }, [addBatch, ctx, dataset.batches.length]);

  const imported = dataset.clients;
  const points = [
    ...gaps.slice(0, 3).map((g) => ({ text: `${CHANNEL_LABEL[g.channel]}: ${g.finding}`, href: `#channel-${g.channel}`, tone: "critical" as const })),
    ...(imported.length ? [{ text: `${imported.length} households connected from your files this session; every agent has run over them.`, tone: "positive" as const, href: "#run" }] : [{ text: "Connect your own client list and the agents run over it here, in this browser.", href: "#book" }]),
  ];

  return (
    <>
      <PageTitle icon="link" title="Sources" sub="What the agents read: your book, the tools you already use, and the documents you follow. Relay reads in place and never writes back." />
      <Legend className="-mt-5 mb-6 lg:hidden" />
      <Brief
        name="Sources"
        icon="link"
        at="day 0, 06:00"
        says={<>
          I read {connectedCount} connected sources for {advisor?.name ?? advisorId}: {report.channels.filter((c) => c.status === "covered").length} of the {inUse.length} channels you use are captured by a retained copy.{" "}
          {gaps.length ? <>{gaps.length} {gaps.length === 1 ? "is" : "are"} not, and that is where a supervisor looks first.</> : "Nothing you use is uncaptured."}{" "}
          {book.clients.length} households are in the book{imported.length ? `, ${imported.length} of them from your own files` : ""}.
        </>}
        points={points}
        next={gaps.length ? { label: `Close the ${CHANNEL_LABEL[gaps[0].channel].toLowerCase()} gap`, href: `#channel-${gaps[0].channel}` } : { label: "Run every agent over the book", href: "#run" }}
        steps={[
          { icon: "eye", who: "advisor", title: "Read what you attested to using", detail: `${inUse.length} channels, with your notes on each.` },
          { icon: "link", who: "agent", title: "Compared it with what is connected and healthy", detail: `${connectedCount} connected; a degraded source counts as uncaptured for the period it failed.` },
          { icon: "rules", who: "agent", title: "Worked out what each source unlocks", detail: "A rule names the source it needs; a connected source that stands in for it satisfies the rule." },
          { icon: "shield", who: "agent", title: "Named the exposure on every gap", detail: "The regulation a supervisor would cite, per channel." },
        ]}
        note="Vendor names are for demonstration of the integration surface; no affiliation or endorsement is implied. In production each connector is a read-only credentialed integration; here connecting one changes what every agent can read, in this browser."
      />

      <Section title="1. Your book">
        <div id="book" className="grid gap-4 lg:grid-cols-[2fr_1fr]">
          <div
            role="group"
            aria-label="Drop files"
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); void onFiles(e.dataTransfer.files); }}
            className={`rounded border-2 border-dashed p-6 text-center ${dragOver ? "border-ink bg-selected" : "border-line-strong"}`}
          >
            <Icon name="people" size={24} className="mx-auto text-ink-3" />
            <p className="mt-2 text-lead text-ink">Drop your client list, a message export or documents here, or</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" className={btnPrimary} onClick={() => input.current?.click()} disabled={busy !== null}>{busy ? `Reading ${busy}` : "Choose files"}</button>
              <button type="button" className={btn} onClick={() => generate(120)}>Generate a book of 120</button>
              <button type="button" className={btn} onClick={() => generate(1000)}>Generate a book of 1,000</button>
            </div>
            <input ref={input} type="file" multiple accept=".csv,.xlsx,.json,.md,.txt" className="sr-only" aria-label="Choose files" onChange={(e) => { if (e.target.files) void onFiles(e.target.files); e.target.value = ""; }} />
            <p className="mt-3 text-meta text-ink-3">
              .csv or .xlsx exported from your CRM, one household a row; messages one a row naming the household; .md or .txt documents.
              Samples: <a className="underline" href={`${ASSET}/samples/clients.csv`} download>clients.csv</a>, <a className="underline" href={`${ASSET}/samples/messages.csv`} download>messages.csv</a>, <a className="underline" href={`${ASSET}/samples/research-note.md`} download>research-note.md</a>. Files stay in this browser.
            </p>
          </div>
          <Card icon="agent" title="What it unlocks">
            <ul className="space-y-1 text-body text-ink-2">
              <li>Every compliance desk sweeps each household.</li>
              <li>Research briefs each one before you speak.</li>
              <li>Discovery reads every message for what the client said.</li>
              <li>Options and the consequence agent work on the real figures.</li>
            </ul>
            <p className="mt-2 text-meta text-ink-3">{book.clients.length} households in the book now, {book.clients.reduce((n, c) => n + (c.messages?.length ?? 0), 0)} captured messages, {book.documents.length} documents.</p>
          </Card>
        </div>
        <More summary="The columns a household file may carry">
          <p className="mb-1">Headings are matched loosely: &ldquo;Monthly spend&rdquo; and &ldquo;monthlySpendUsd&rdquo; both land. A missing column leaves its field empty and the validator says so.</p>
          <p className="mb-1"><span className="font-medium text-ink">Identity:</span> name, advisorId, tier, archetype, person1, person1Age, person2, person2Age, person3, person3Age.</p>
          <p className="mb-1"><span className="font-medium text-ink">Holdings:</span> cashUsd, coreUsd, treasuryUsd, muniUsd, singleName, singleNameUsd.</p>
          <p className="mb-1"><span className="font-medium text-ink">Rules and goals:</span> maxSingleNamePct, minLiquidityMonths, maxRiskLevel, liquidityTargetMonths, longevityTargetUsd, legacyTargetUsd.</p>
          <p><span className="font-medium text-ink">History:</span> lastContactDaysAgo, lastContactChannel, lastContactSummary, note, contactWindow, trustedContactOnFile, unusualDisbursement, newThirdPartyContact, concentration90, concentration60, concentration30.</p>
        </More>
        {dataset.batches.length > 0 && (
          <div className="mt-4">
            <TableScroll>
              <table className="w-full min-w-[40rem] border-collapse text-body">
                <thead><tr><th className={th}>File</th><th className={th}>Kind</th><th className={th}>Rows</th><th className={th}>Accepted</th><th className={th}>Rejected</th><th className={th}>Read in</th></tr></thead>
                <tbody>
                  {dataset.batches.map((b: ImportBatch) => (
                    <tr key={b.id}>
                      <td className={td}><span className="flex items-center gap-2"><Icon name={b.kind === "document" ? "document" : b.kind === "messages" ? "email" : "people"} size={16} className="text-ink-3" />{b.fileName}</span></td>
                      <td className={td}>{b.kind}</td>
                      <td className={`${td} tabular-nums`}>{b.rows}</td>
                      <td className={`${td} tabular-nums`}><Pill tone={b.accepted ? "pass" : "neutral"}>{b.accepted}</Pill></td>
                      <td className={`${td} tabular-nums`}>{b.errors.length ? <Pill tone="fail">{b.errors.length}</Pill> : <span className="text-ink-3">0</span>}</td>
                      <td className={`${td} tabular-nums text-ink-2`}>{b.ms} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            {dataset.batches.some((b) => b.errors.length || b.warnings.length) && (
              <div className="mt-3 space-y-2">
                {dataset.batches.filter((b) => b.errors.length || b.warnings.length).map((b) => (
                  <Card key={b.id} tone={b.errors.length ? "critical" : "caution"} title={`${b.fileName}: ${b.errors.length} rejected, ${b.warnings.length} warnings`}>
                    <ul className="max-h-48 overflow-y-auto text-meta text-ink-2">
                      {b.errors.slice(0, 30).map((e, i) => <li key={`e${i}`}>{e}</li>)}
                      {b.warnings.slice(0, 30).map((w, i) => <li key={`w${i}`} className="text-ink-3">{w}</li>)}
                    </ul>
                  </Card>
                ))}
              </div>
            )}
            <p className="mt-3 flex flex-wrap items-center gap-2 text-meta text-ink-3">
              <button type="button" className={btn} onClick={clearDataset}>Disconnect everything</button>
              Session only. Reload and the connected files are gone; the shipped book is unchanged.
            </p>
          </div>
        )}
      </Section>

      <Section title="2. Your tools and channels">
        <p className="mb-3 max-w-2xl text-body text-ink-2">
          Relay reads the CRM, custodian, planning and reporting tools you already run, and the channels you talk to clients on. It replaces none of them. {gaps.length > 0 && <>Gaps first: {gaps.length} {gaps.length === 1 ? "channel is" : "channels are"} in use and not fully on the record.</>}
        </p>
        {gaps.length > 0 && (
          <Banner tone="critical" title="The record is not defensible yet">
            Completeness reads {Math.round(report.completeness * 100)} percent, which looks passable. It is not: business conducted on an uncaptured channel cannot be produced on request.
          </Banner>
        )}
        <ListControls label="Tools and channels" placeholder="Search a tool or vendor, for example Salesforce" noun={["channel", "channels"]} list={list} />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {list.shown.map((ch) => (
            <div key={ch.channel} id={`channel-${ch.channel}`} className="scroll-mt-20">
              <Card icon={CHANNEL_ICON[ch.channel]} title={CHANNEL_LABEL[ch.channel]} sub={ch.finding} tone={ch.status === "gap" || ch.status === "partial" ? "critical" : "plain"} right={<Pill tone={STATUS[ch.status].tone}>{STATUS[ch.status].label}</Pill>}>
                {ch.advisorNote && <p className="mb-2 border-l-2 border-line-strong pl-3 text-body italic text-ink-2">{ch.advisorNote}</p>}
                {ch.exposure.length > 0 && <p className="mb-2 text-meta text-ink-2"><span className="font-medium text-ink">Exposure:</span> {ch.exposure.join("; ")}</p>}
                <div>
                  {rowsOf(ch).map((c) => <ConnectorRow key={c.id} c={c} advisorId={advisorId} />)}
                </div>
              </Card>
            </div>
          ))}
        </div>
        <p className="mt-3 text-meta text-ink-3">{CATALOG.length} connectors in the catalogue. Within each kind: the firm&apos;s own workstation first, then the market leaders.</p>
      </Section>

      <Section title="3. Documents and policies">
        <div className="grid gap-3 md:grid-cols-2">
          <Card icon="library" title="Research and product documents" sub="What the agents may quote to a client.">
            <p className="text-body text-ink-2">Drop .md or .txt documents above and they join the corpus retrieval reads. {book.documents.length} documents now; a document past its review date is quoted with a warning, and a withdrawn one never.</p>
            <p className="mt-2 text-meta"><Link href="/documents" className="underline">The library</Link></p>
          </Card>
          <Card icon="rules" title="Written supervisory procedures and policies" sub="What the desks enforce.">
            <p className="text-body text-ink-2">A policy document becomes rules on the desk that applies it. Open a desk, read the policy in, and add each candidate rule with a reason; it is in force on the next sweep.</p>
            <p className="mt-2 text-meta"><Link href={`/agents/${AGENTS[0].id}`} className="underline">Read a policy into a desk</Link></p>
          </Card>
        </div>
      </Section>

      <Section title="Run every agent over the book">
        <div id="run" className="scroll-mt-20">
          {book.clients.length === 0 ? <Banner tone="caution" title="Nothing to run over">Connect a file or generate a book first.</Banner> : <LiveRun clients={book.clients} documents={book.documents} opportunities={book.opportunities} />}
        </div>
      </Section>

      {imported.length > 0 && (
        <More summary={`The ${imported.length} households connected this session`}>
          <TableScroll>
            <table className="w-full min-w-[44rem] border-collapse text-body">
              <thead><tr><th className={th}>Household</th><th className={th}>Advisor</th><th className={th}>Assets</th><th className={th}>Cash cover</th><th className={th}>Flagged on import</th><th className={th}>Messages</th></tr></thead>
              <tbody>
                {imported.slice(0, 200).map((c) => (
                  <tr key={c.id} id={c.id} className="scroll-mt-20 target:bg-selected">
                    <td className={td}>{c.name}<span className="block text-caption text-ink-3">{c.id}</span></td>
                    <td className={`${td} text-ink-2`}>{ADVISORS_DATA.find((a) => a.id === c.advisorId)?.name ?? c.advisorId}</td>
                    <td className={`${td} tabular-nums`}>{usd(c.totalUsd)}</td>
                    <td className={`${td} tabular-nums`}>{c.goals[0]?.funded} of {c.goals[0]?.target} months</td>
                    <td className={td}>{c.opportunities.length ? c.opportunities.map((o) => <span key={o.id} className="mr-1"><Pill tone="accent">{o.plainTitle ?? o.title}</Pill></span>) : <span className="text-ink-3">nothing</span>}</td>
                    <td className={`${td} tabular-nums`}>{c.messages?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          {imported.length > 200 && <p className="mt-2 text-meta text-ink-3">First 200 of {imported.length} shown. All of them are in the book.</p>}
        </More>
      )}
    </>
  );
}
