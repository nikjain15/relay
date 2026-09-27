import { describe, it, expect } from "vitest";
import { deflateRawSync } from "node:zlib";
import { parseCsv, toCsv } from "@/lib/import/csv";
import { parseXlsx } from "@/lib/import/xlsx";
import { mapClients, mapMessages, mapDocument, field } from "@/lib/import/map";
import { sampleBook, sampleCsv, CLIENT_COLUMNS, MESSAGE_COLUMNS } from "@/lib/import/sample";
import { clientErrors } from "@/lib/data/validate";
import { ADVISORS_DATA, DOCUMENTS, SHELF_DATA, toHousehold } from "@/lib/data";
import { liquidityMonths, singleNamePct } from "@/lib/household-math";
import { sweep } from "@/lib/compliance/sweep";
import { policyFrom, SEED_EDITS } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { CONNECTORS_DATA } from "@/lib/data";
import { briefAll } from "@/lib/research/brief";
import { retrieve } from "@/lib/evidence/retrieve";
import { POLICY } from "@/lib/data/policy";

/**
 * Connecting data: a file becomes records held to exactly the rules a shipped
 * file is held to, with no dependency and no byte leaving the browser. The
 * .xlsx reader is exercised against a workbook built here by hand, stored and
 * deflated, because a reader that has only been run on files it was written
 * against has not been tested.
 */
const ctx = { docIds: new Set(DOCUMENTS.map((d) => d.id)), productIds: new Set(SHELF_DATA.map((p) => p.id)), advisorIds: new Set(ADVISORS_DATA.map((a) => a.id)) };
const fresh = () => ({ ids: new Set<string>(), personIds: new Set<string>(), oppIds: new Set<string>() });

describe("csv", () => {
  it("reads quoted fields, doubled quotes, CRLF and a BOM, and round-trips", () => {
    const t = parseCsv('﻿name,note\r\n"Smith, J","He said ""fine"""\r\nLee,plain\n');
    expect(t.headers).toEqual(["name", "note"]);
    expect(t.rows).toEqual([{ name: "Smith, J", note: 'He said "fine"' }, { name: "Lee", note: "plain" }]);
    const again = parseCsv(toCsv(t.headers, t.rows));
    expect(again.rows).toEqual(t.rows);
  });
});

/** A minimal .xlsx: a zip with the workbook, its rels, shared strings and one sheet. `deflate` chooses the compression method. */
function xlsx(rows: string[][], deflate: boolean): ArrayBuffer {
  const strings: string[] = [];
  const sIdx = (s: string) => { let i = strings.indexOf(s); if (i < 0) { strings.push(s); i = strings.length - 1; } return i; };
  const colName = (i: number) => String.fromCharCode(65 + i);
  const sheet = `<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((r, ri) => `<row r="${ri + 1}">${r.map((v, ci) => (/^-?\d+(\.\d+)?$/.test(v) ? `<c r="${colName(ci)}${ri + 1}"><v>${v}</v></c>` : `<c r="${colName(ci)}${ri + 1}" t="s"><v>${sIdx(v)}</v></c>`)).join("")}</row>`).join("")}</sheetData></worksheet>`;
  const parts: [string, string][] = [
    ["xl/workbook.xml", `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Book" sheetId="1" r:id="rId1"/></sheets></workbook>`],
    ["xl/_rels/workbook.xml.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`],
    ["xl/sharedStrings.xml", `<?xml version="1.0"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">${strings.map((s) => `<si><t>${s.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</t></si>`).join("")}</sst>`],
    ["xl/worksheets/sheet1.xml", sheet],
  ];
  const enc = new TextEncoder();
  const local: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const le16 = (n: number) => [n & 255, (n >> 8) & 255];
  const le32 = (n: number) => [n & 255, (n >> 8) & 255, (n >> 16) & 255, (n >>> 24) & 255];
  for (const [name, text] of parts) {
    const raw = enc.encode(text);
    const data = deflate ? new Uint8Array(deflateRawSync(raw)) : raw;
    const n = enc.encode(name);
    const method = deflate ? 8 : 0;
    const head = new Uint8Array([...le32(0x04034b50), ...le16(20), ...le16(0), ...le16(method), ...le16(0), ...le16(0), ...le32(0), ...le32(data.length), ...le32(raw.length), ...le16(n.length), ...le16(0), ...n]);
    local.push(head, data);
    central.push(new Uint8Array([...le32(0x02014b50), ...le16(20), ...le16(20), ...le16(0), ...le16(method), ...le16(0), ...le16(0), ...le32(0), ...le32(data.length), ...le32(raw.length), ...le16(n.length), ...le16(0), ...le16(0), ...le16(0), ...le16(0), ...le32(0), ...le32(offset), ...n]));
    offset += head.length + data.length;
  }
  const cd = central.reduce((s, x) => s + x.length, 0);
  const eocd = new Uint8Array([...le32(0x06054b50), ...le16(0), ...le16(0), ...le16(parts.length), ...le16(parts.length), ...le32(cd), ...le32(offset), ...le16(0)]);
  const all = [...local, ...central, eocd];
  const out = new Uint8Array(all.reduce((s, x) => s + x.length, 0));
  let p = 0;
  for (const x of all) { out.set(x, p); p += x.length; }
  return out.buffer;
}

describe("xlsx", () => {
  const rows = [["name", "monthlySpendUsd", "cashUsd", "coreUsd", "note"], ["Okonkwo", "9000", "45000", "1200000", "Thinking about retiring next year"], ["Vance & Co", "22000", "0", "3400000", ""]];
  it("reads a stored workbook", async () => {
    const t = await parseXlsx(xlsx(rows, false));
    expect(t.sheet).toBe("Book");
    expect(t.headers).toEqual(rows[0]);
    expect(t.rows[0]).toEqual({ name: "Okonkwo", monthlySpendUsd: "9000", cashUsd: "45000", coreUsd: "1200000", note: "Thinking about retiring next year" });
    expect(t.rows[1].name).toBe("Vance & Co");
  });
  it("reads a deflated workbook through DecompressionStream", async () => {
    const t = await parseXlsx(xlsx(rows, true));
    expect(t.rows).toHaveLength(2);
    expect(t.rows[1].coreUsd).toBe("3400000");
  });
  it("refuses a file that is not a workbook", async () => {
    await expect(parseXlsx(new TextEncoder().encode("name,x\n1,2").buffer as ArrayBuffer)).rejects.toThrow(/not an \.xlsx/);
  });
});

describe("mapping rows to records", () => {
  it("reads headings loosely and computes what a spreadsheet cannot be trusted to carry", () => {
    const r = mapClients([{ Household: "Okonkwo", "Monthly spend": "$9,000", Cash: "45,000", Core: "1,200,000", "Single stock": "Employer stock", "Single stock USD": "600,000", "Concentration limit": "20", "Last contact": "200", Note: "Thinking about retiring next year", "Trusted contact": "no" }], { source: "t.csv" });
    const c = r.clients[0];
    expect(c.id).toBe("hh-okonkwo");
    expect(c.totalUsd).toBe(1_845_000);
    expect(c.goals[0].funded).toBe(liquidityMonths(toHousehold(c)));
    expect(c.goals[0].funded).toBe(5);
    expect(Math.round(singleNamePct(toHousehold(c)))).toBe(33);
    expect(c.supervisory.trustedContactOnFile).toBe(false);
    expect(c.opportunities.map((o) => o.id)).toEqual(["opp-okonkwo-liquidity", "opp-okonkwo-concentration", "opp-okonkwo-review"]);
    expect(c.opportunities.every((o) => o.evidenceDocIds.every((d) => ctx.docIds.has(d)))).toBe(true);
    expect(clientErrors(c, ctx, fresh())).toEqual([]);
    expect(field({ "Monthly Spend USD": "1" }, "monthlySpendUsd")).toBe("1");
  });

  it("names what it could not read rather than guessing", () => {
    const r = mapClients([{ name: "Empty" }], { source: "t.csv" });
    expect(r.warnings.map((w) => w.text)).toEqual(expect.arrayContaining([expect.stringMatching(/No person columns/), expect.stringMatching(/No holdings columns/), expect.stringMatching(/No monthly spend/)]));
    expect(clientErrors(r.clients[0], ctx, fresh()).length).toBeGreaterThan(0);
  });

  it("attaches messages by id or by household name and reports the rest", () => {
    const r = mapClients([{ name: "Okonkwo", cashUsd: "1", coreUsd: "1", monthlySpendUsd: "1" }], { source: "t" });
    const m = mapMessages([{ clientId: "Okonkwo", channel: "sms", direction: "inbound", daysAgo: "3", text: "Hello" }, { clientId: "hh-okonkwo", channel: "email", direction: "out", daysAgo: "1", text: "Reply" }, { clientId: "Nobody", text: "x" }], r.clients);
    expect(m.attached).toBe(2);
    expect(m.unmatched).toEqual([{ row: 4, text: 'No client "Nobody"' }]);
    expect(r.clients[0].messages.map((x) => x.connectorId)).toEqual(["compliant-texting", "microsoft-365"]);
  });

  it("turns a Markdown file into a document with passages, on the corpus clock", () => {
    const d = mapDocument("Holding cash after a sale.md", "# Holding cash after a sale\n\nFirst passage, long enough to count as a passage.\n\nSecond passage, also long enough to count.\n");
    expect(d).toMatchObject({ id: "doc-holding-cash-after-a-sale", title: "Holding cash after a sale", kind: "research note", day: POLICY.retrieval.corpusDay, status: "current" });
    expect(d.passages).toHaveLength(2);
  });
});

describe("a generated book runs through every engine", () => {
  const csv = sampleCsv(200, 3);
  const rows = parseCsv(csv.clients).rows;
  const r = mapClients(rows, { source: "sample" });
  mapMessages(parseCsv(csv.messages).rows, r.clients);

  it("is deterministic and passes the validator row for row", () => {
    expect(sampleBook(5, 3)).toEqual(sampleBook(5, 3));
    expect(CLIENT_COLUMNS.length).toBeGreaterThan(20);
    expect(MESSAGE_COLUMNS).toEqual(["clientId", "channel", "direction", "daysAgo", "text"]);
    const seen = fresh();
    expect(r.clients.flatMap((c) => clientErrors(c, ctx, seen))).toEqual([]);
    expect(r.clients).toHaveLength(200);
  });

  it("every agent raises something on it, and cites only documents that exist", () => {
    const cases = ADVISORS_DATA.flatMap((a) => sweep(a.id, policyFrom(SEED_EDITS, scopeFor(a.id)), CONNECTORS_DATA.connections, r.clients).cases);
    expect(cases.length).toBeGreaterThan(50);
    expect(new Set(cases.map((c) => c.ruleId)).size).toBeGreaterThanOrEqual(4);
    const briefs = briefAll(CONNECTORS_DATA.connections, r.clients);
    expect(briefs).toHaveLength(200);
    for (const o of r.clients.flatMap((c) => c.opportunities)) expect(retrieve(o).refused).toBe(false);
  });
});
