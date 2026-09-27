"use client";

// Connect data: drop a spreadsheet, a message export or a document, and the
// book grows in this browser. Every record is held to the same validator as a
// shipped file, every failure is named by row, and nothing leaves the page:
// there is no upload, because there is no server to upload to.
import { useCallback, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRelay, type ImportBatch } from "@/components/state";
import { Banner, Card, More, PageTitle, Pill, Section, StatRow, TableScroll, btn, btnPrimary, td, th } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Bars } from "@/components/charts";
import { LiveRun } from "@/components/live-run";
import { parseCsv } from "@/lib/import/csv";
import { parseXlsx } from "@/lib/import/xlsx";
import { mapClients, mapMessages, mapDocument } from "@/lib/import/map";
import { sampleBook, CLIENT_COLUMNS, MESSAGE_COLUMNS } from "@/lib/import/sample";
import { clientErrors } from "@/lib/data/validate";
import { ADVISORS_DATA, DOCUMENTS, SHELF_DATA } from "@/lib/data";
import type { ClientFile, Doc } from "@/lib/types";
import { usd } from "@/lib/format";

type Rows = Record<string, string>[];

function looksLikeMessages(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return h.includes("text") || h.includes("message") || h.includes("body");
}

export function DataView() {
  const { dataset, addBatch, clearDataset, book } = useRelay();
  const [busy, setBusy] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const ctx = useMemo(() => ({ docIds: new Set([...DOCUMENTS, ...dataset.documents].map((d) => d.id)), productIds: new Set(SHELF_DATA.map((p) => p.id)), advisorIds: new Set(ADVISORS_DATA.map((a) => a.id)) }), [dataset.documents]);

  // One drop may carry a book and its messages together, so every file in a
  // drop reads the book as the earlier files in the same drop left it, not as
  // the screen last rendered it.
  const ingestRows = useCallback((fileName: string, rows: Rows, headers: string[], t0: number, working: ClientFile[]) => {
    if (looksLikeMessages(headers)) {
      const targets = working.map((c) => ({ ...c, messages: [...(c.messages ?? [])] }));
      const r = mapMessages(rows, targets);
      const changed = targets.filter((c) => (c.messages?.length ?? 0) !== (working.find((x) => x.id === c.id)?.messages?.length ?? 0));
      for (const c of changed) working.splice(working.findIndex((x) => x.id === c.id), 1, c);
      addBatch({ id: `b-${Date.now()}-${fileName}`, fileName, kind: "messages", rows: rows.length, accepted: r.attached, errors: r.unmatched.map((u) => `Row ${u.row}: ${u.text}`), warnings: [], at: new Date().toISOString(), ms: Math.round(performance.now() - t0) }, changed, []);
      return;
    }
    const r = mapClients(rows, { source: fileName });
    const seen = { ids: new Set<string>(), personIds: new Set<string>(), oppIds: new Set<string>() };
    const errors: string[] = [];
    const good: ClientFile[] = [];
    for (const c of r.clients) {
      const e = clientErrors(c, ctx, seen);
      if (e.length) errors.push(...e); else good.push(c);
    }
    for (const c of good) { const i = working.findIndex((x) => x.id === c.id); if (i >= 0) working.splice(i, 1, c); else working.push(c); }
    addBatch({ id: `b-${Date.now()}-${fileName}`, fileName, kind: "clients", rows: rows.length, accepted: good.length, errors, warnings: r.warnings.map((w) => `${w.id}: ${w.text}`), at: new Date().toISOString(), ms: Math.round(performance.now() - t0) }, good, []);
  }, [addBatch, ctx]);

  const ingestFile = useCallback(async (file: File, working: ClientFile[]) => {
    const t0 = performance.now();
    const name = file.name;
    setBusy(name);
    try {
      if (/\.xlsx$/i.test(name)) {
        const { headers, rows } = await parseXlsx(await file.arrayBuffer());
        ingestRows(name, rows, headers, t0, working);
      } else if (/\.csv$/i.test(name)) {
        const { headers, rows } = parseCsv(await file.text());
        ingestRows(name, rows, headers, t0, working);
      } else if (/\.json$/i.test(name)) {
        const parsed = JSON.parse(await file.text());
        const list = (Array.isArray(parsed) ? parsed : [parsed]) as (ClientFile | Doc)[];
        const clients = list.filter((x): x is ClientFile => "holdings" in x);
        const docs = list.filter((x): x is Doc => "passages" in x);
        const seen = { ids: new Set<string>(), personIds: new Set<string>(), oppIds: new Set<string>() };
        const errors: string[] = [];
        const good = clients.filter((c) => { const e = clientErrors(c, ctx, seen); errors.push(...e); return e.length === 0; });
        for (const c of good) { const i = working.findIndex((x) => x.id === c.id); if (i >= 0) working.splice(i, 1, c); else working.push(c); }
        addBatch({ id: `b-${Date.now()}-${name}`, fileName: name, kind: "records", rows: list.length, accepted: good.length + docs.length, errors, warnings: [], at: new Date().toISOString(), ms: Math.round(performance.now() - t0) }, good, docs);
      } else if (/\.(md|txt)$/i.test(name)) {
        const d = mapDocument(name, await file.text());
        addBatch({ id: `b-${Date.now()}-${name}`, fileName: name, kind: "document", rows: d.passages.length, accepted: 1, errors: [], warnings: [], at: new Date().toISOString(), ms: Math.round(performance.now() - t0) }, [], [d]);
      } else {
        addBatch({ id: `b-${Date.now()}-${name}`, fileName: name, kind: "records", rows: 0, accepted: 0, errors: [`Not a file type this reads: .csv, .xlsx, .json, .md or .txt`], warnings: [], at: new Date().toISOString(), ms: 0 }, [], []);
      }
    } catch (e) {
      addBatch({ id: `b-${Date.now()}-${name}`, fileName: name, kind: "records", rows: 0, accepted: 0, errors: [e instanceof Error ? e.message : String(e)], warnings: [], at: new Date().toISOString(), ms: Math.round(performance.now() - t0) }, [], []);
    } finally {
      setBusy(null);
    }
  }, [addBatch, ctx, ingestRows]);

  const onFiles = useCallback(async (files: FileList | File[]) => {
    // Households before messages, whatever order the files arrived in, so a message can name a household from the same drop.
    const list = Array.from(files).sort((a, b) => Number(/message/i.test(a.name)) - Number(/message/i.test(b.name)));
    const working: ClientFile[] = [...book.clients];
    for (const f of list) await ingestFile(f, working);
  }, [ingestFile, book.clients]);

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
  const byAdvisor = ADVISORS_DATA.map((a) => ({ label: a.walkthrough?.label ?? a.name, value: imported.filter((c) => c.advisorId === a.id).length }));
  const tiers = ["$50M+", "$5M+", "$500K to $5M", "Wealth Advice Center"].map((t) => ({ label: t, value: imported.filter((c) => c.tier === t).length }));

  return (
    <>
      <PageTitle title="Connect data" sub="Drop a book, a message export or a document. It stays in this browser, and every agent runs over it." />

      <StatRow
        items={[
          { value: book.clients.length, label: `Households in the book, ${imported.length} connected`, icon: "people" },
          { value: book.clients.reduce((n, c) => n + (c.messages?.length ?? 0), 0), label: "Captured messages", icon: "email" },
          { value: book.documents.length, label: `Documents, ${dataset.documents.length} connected`, icon: "library" },
          { value: book.opportunities.length, label: "Opportunities on the list", icon: "list" },
        ]}
      />

      <Section title="Connect">
        <div
          role="group"
          aria-label="Drop files"
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); void onFiles(e.dataTransfer.files); }}
          className={`rounded border-2 border-dashed p-6 text-center ${dragOver ? "border-ink bg-selected" : "border-line-strong"}`}
        >
          <Icon name="link" size={24} className="mx-auto text-ink-3" />
          <p className="mt-2 text-[14px] text-ink">Drop files here, or</p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button type="button" className={btnPrimary} onClick={() => input.current?.click()} disabled={busy !== null}>{busy ? `Reading ${busy}` : "Choose files"}</button>
            <button type="button" className={btn} onClick={() => generate(120)}>Generate a book of 120</button>
            <button type="button" className={btn} onClick={() => generate(1000)}>Generate a book of 1,000</button>
          </div>
          <input ref={input} type="file" multiple accept=".csv,.xlsx,.json,.md,.txt" className="sr-only" aria-label="Choose files" onChange={(e) => { if (e.target.files) void onFiles(e.target.files); e.target.value = ""; }} />
          <p className="mt-3 text-[12px] text-ink-3">
            .csv or .xlsx of households (one row each), .csv or .xlsx of messages (one row each, naming the household), .md or .txt documents, or .json records.
            Samples: <a className="underline" href="samples/clients.csv" download>clients.csv</a>, <a className="underline" href="samples/messages.csv" download>messages.csv</a>, <a className="underline" href="samples/research-note.md" download>research-note.md</a>.
          </p>
        </div>
        <More summary="The columns a household file may carry, and what happens to each">
          <p className="mb-2">Headings are matched loosely: &ldquo;Monthly spend&rdquo; and &ldquo;monthlySpendUsd&rdquo; both land. A column that is missing leaves its field empty and the validator says so.</p>
          <p className="mb-1"><span className="font-medium text-ink">Identity:</span> name, advisorId, tier, archetype, person1, person1Age, person2, person2Age, person3, person3Age.</p>
          <p className="mb-1"><span className="font-medium text-ink">Holdings:</span> cashUsd, coreUsd, treasuryUsd, muniUsd, singleName, singleNameUsd. Total assets are the sum; Liquidity months are computed, never typed.</p>
          <p className="mb-1"><span className="font-medium text-ink">Rules and goals:</span> maxSingleNamePct, minLiquidityMonths, maxRiskLevel, liquidityTargetMonths, longevityTargetUsd, legacyTargetUsd.</p>
          <p className="mb-1"><span className="font-medium text-ink">History and the firm&apos;s record:</span> lastContactDaysAgo, lastContactChannel, lastContactSummary, note, contactWindow, trustedContactOnFile, unusualDisbursement, newThirdPartyContact, concentration90, concentration60, concentration30.</p>
          <p className="mt-2">Opportunities are not a column. They are detected from each record by the same thresholds the product uses, and cited to the corpus. Messages carry clientId, channel, direction, daysAgo and text.</p>
        </More>
      </Section>

      {dataset.batches.length > 0 && (
        <Section title="What was connected">
          <TableScroll>
            <table className="w-full min-w-[40rem] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={th}>File</th>
                  <th className={th}>Kind</th>
                  <th className={th}>Rows</th>
                  <th className={th}>Accepted</th>
                  <th className={th}>Rejected</th>
                  <th className={th}>Read in</th>
                </tr>
              </thead>
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
                  <ul className="max-h-48 overflow-y-auto text-[12px] text-ink-2">
                    {b.errors.slice(0, 30).map((e, i) => <li key={`e${i}`}>{e}</li>)}
                    {b.warnings.slice(0, 30).map((w, i) => <li key={`w${i}`} className="text-ink-3">{w}</li>)}
                    {b.errors.length + b.warnings.length > 60 && <li className="text-ink-3">and {b.errors.length + b.warnings.length - 60} more</li>}
                  </ul>
                  <p className="mt-2 text-[11px] text-ink-3">A rejected row is held to exactly the rules a shipped file is held to, and is not in the book until it passes.</p>
                </Card>
              ))}
            </div>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" className={btn} onClick={clearDataset}>Disconnect everything</button>
            <span className="text-[12px] text-ink-3">Session only. Reload the page and the connected data is gone; the shipped book is unchanged.</span>
          </div>
        </Section>
      )}

      {imported.length > 0 && (
        <div className="grid gap-8 md:grid-cols-2">
          <Section title="Connected households by advisor">
            <Bars ariaLabel="Connected households by advisor" items={byAdvisor} />
          </Section>
          <Section title="By tier">
            <Bars ariaLabel="Connected households by tier" items={tiers} />
          </Section>
        </div>
      )}

      <Section title="Run every agent over the book">
        {book.clients.length === 0 ? (
          <Banner tone="caution" title="Nothing to run over">Connect a file or generate a book first.</Banner>
        ) : (
          <LiveRun clients={book.clients} documents={book.documents} opportunities={book.opportunities} />
        )}
      </Section>

      {imported.length > 0 && (
        <Section title="Connected households">
          <TableScroll>
            <table className="w-full min-w-[44rem] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={th}>Household</th>
                  <th className={th}>Advisor</th>
                  <th className={th}>Assets</th>
                  <th className={th}>Cash cover</th>
                  <th className={th}>Flagged on import</th>
                  <th className={th}>Messages</th>
                </tr>
              </thead>
              <tbody>
                {imported.slice(0, 200).map((c) => (
                  <tr key={c.id} id={c.id} className="scroll-mt-20 target:bg-selected">
                    <td className={td}><span className="flex items-center gap-2"><Icon name="people" size={16} className="text-ink-3" />{c.name}</span><span className="block text-[11px] text-ink-3">{c.id}</span></td>
                    <td className={`${td} text-ink-2`}>{ADVISORS_DATA.find((a) => a.id === c.advisorId)?.walkthrough?.label ?? c.advisorId}</td>
                    <td className={`${td} tabular-nums`}>{usd(c.totalUsd)}</td>
                    <td className={`${td} tabular-nums`}>{c.goals[0]?.funded} of {c.goals[0]?.target} months</td>
                    <td className={td}>{c.opportunities.length ? c.opportunities.map((o) => <span key={o.id} className="mr-1"><Pill tone="accent">{o.plainTitle ?? o.title}</Pill></span>) : <span className="text-ink-3">nothing</span>}</td>
                    <td className={`${td} tabular-nums`}>{c.messages?.length ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
          {imported.length > 200 && <p className="mt-2 text-[12px] text-ink-3">First 200 of {imported.length} shown. All of them are in the book.</p>}
        </Section>
      )}

      <More summary="What this proves, and what it does not">
        It proves that a book of any size arrives in the shape the engines need, that every record is held to the same
        validator as a shipped file, and that every agent runs over it in this browser in the time shown. It does not
        prove a live connection to a CRM or a custodian: that is a connector with credentials, and this prototype has no
        server to hold them. The connector layer on{" "}
        <Link href="/connectors" className="underline">Connected channels</Link> is the contract such a connection would
        satisfy; a file is the same records arriving by a different road. Nothing here is uploaded: there is nowhere to
        upload to.{" "}
        Column reading goes through one alias table, so a new column is one line.
      </More>
    </>
  );
}
