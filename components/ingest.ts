"use client";

// Connecting files: one hook, used by the data screen and by any screen that
// wants an inline "connect your own" affordance. A file is read in the browser
// and every record is held to the same validator as a shipped file; nothing
// leaves the page, because there is nowhere to send it.
import { useCallback, useMemo, useState } from "react";
import { useRelay } from "@/components/state";
import { parseCsv } from "@/lib/import/csv";
import { parseXlsx } from "@/lib/import/xlsx";
import { mapClients, mapMessages, mapDocument } from "@/lib/import/map";
import { clientErrors } from "@/lib/data/validate";
import { ADVISORS_DATA, DOCUMENTS, SHELF_DATA } from "@/lib/data";
import type { ClientFile, Doc } from "@/lib/types";

type Rows = Record<string, string>[];

function looksLikeMessages(headers: string[]): boolean {
  const h = headers.map((x) => x.toLowerCase().replace(/[^a-z0-9]/g, ""));
  return h.includes("text") || h.includes("message") || h.includes("body");
}

export function useIngest() {
  const { dataset, addBatch, book } = useRelay();
  const [busy, setBusy] = useState<string | null>(null);
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

  return { onFiles, busy, ctx };
}
