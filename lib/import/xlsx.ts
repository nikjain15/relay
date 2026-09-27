// A minimal .xlsx reader with no dependency.
//
// An .xlsx file is a zip of XML parts. The browser can inflate a zip entry on
// its own (DecompressionStream with "deflate-raw"), and it can parse XML on
// its own, so the whole reader is: walk the zip's central
// directory, inflate the parts we need, read the shared strings, read the
// first worksheet's cells. Formulas are ignored in favour of their cached
// values, dates come through as Excel serials (the mapper does not need
// them), and merged cells are read as their top-left value. That is enough
// for a client book exported from a spreadsheet, and it keeps the promise
// that nothing leaves the browser: no upload, no library, no network.

interface Entry { name: string; method: number; compressedSize: number; offset: number }

function u16(b: DataView, o: number) { return b.getUint16(o, true); }
function u32(b: DataView, o: number) { return b.getUint32(o, true); }

/** The central directory, read from the end of the file. */
function entries(buf: ArrayBuffer): Entry[] {
  const view = new DataView(buf);
  const bytes = new Uint8Array(buf);
  // End of central directory record: signature 0x06054b50, searched backwards past the comment.
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 65557); i--) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("Not a zip file (no central directory), so not an .xlsx");
  const count = u16(view, eocd + 10);
  let p = u32(view, eocd + 16);
  const out: Entry[] = [];
  const dec = new TextDecoder();
  for (let i = 0; i < count; i++) {
    if (u32(view, p) !== 0x02014b50) throw new Error("Corrupt zip central directory");
    const method = u16(view, p + 10);
    const compressedSize = u32(view, p + 20);
    const nameLen = u16(view, p + 28), extraLen = u16(view, p + 30), commentLen = u16(view, p + 32);
    const offset = u32(view, p + 42);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));
    out.push({ name, method, compressedSize, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflate(buf: ArrayBuffer, e: Entry): Promise<string> {
  const view = new DataView(buf);
  if (u32(view, e.offset) !== 0x04034b50) throw new Error(`Corrupt zip entry ${e.name}`);
  const nameLen = u16(view, e.offset + 26), extraLen = u16(view, e.offset + 28);
  const start = e.offset + 30 + nameLen + extraLen;
  const data = new Uint8Array(buf, start, e.compressedSize);
  if (e.method === 0) return new TextDecoder().decode(data);
  if (e.method !== 8) throw new Error(`Unsupported zip compression ${e.method} in ${e.name}`);
  const ds = new DecompressionStream("deflate-raw");
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return await new Response(stream).text();
}

/** Column letters to a zero-based index: A=0, Z=25, AA=26. */
function col(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

const decode = (x: string) => x.replace(/&(amp|lt|gt|quot|apos|#x[0-9a-fA-F]+|#\d+);/g, (m, e: string) =>
  e === "amp" ? "&" : e === "lt" ? "<" : e === "gt" ? ">" : e === "quot" ? '"' : e === "apos" ? "'" : String.fromCodePoint(e[1] === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));
const attr = (tag: string, name: string) => new RegExp(`(?:^|\\s)${name}="([^"]*)"`).exec(tag)?.[1];
/** Every <t> inside a fragment, joined: a shared string may be split into runs. */
const runs = (xml: string) => Array.from(xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g), (m) => decode(m[1])).join("");

/** The first worksheet as rows of strings, with the first row as the header. Plain pattern matching over the XML, so it runs in a browser and in Node alike. */
export async function parseXlsx(buf: ArrayBuffer): Promise<{ headers: string[]; rows: Record<string, string>[]; sheet: string }> {
  const list = entries(buf);
  const find = (name: string) => list.find((e) => e.name === name);
  const workbook = find("xl/workbook.xml");
  if (!workbook) throw new Error("No xl/workbook.xml: not an .xlsx workbook");
  const wb = await inflate(buf, workbook);
  const firstSheet = /<sheet\b[^>]*\/?>/.exec(wb)?.[0] ?? "";
  const sheetName = attr(firstSheet, "name") ?? "Sheet1";
  const rid = attr(firstSheet, "r:id");
  let target = "xl/worksheets/sheet1.xml";
  const rels = find("xl/_rels/workbook.xml.rels");
  if (rels && rid) {
    for (const m of (await inflate(buf, rels)).matchAll(/<Relationship\b[^>]*\/?>/g)) {
      if (attr(m[0], "Id") === rid) target = "xl/" + (attr(m[0], "Target") ?? "").replace(/^\/?xl\//, "").replace(/^\//, "");
    }
  }
  const strings: string[] = [];
  const ss = find("xl/sharedStrings.xml");
  if (ss) for (const m of (await inflate(buf, ss)).matchAll(/<si>([\s\S]*?)<\/si>/g)) strings.push(runs(m[1]));
  const sheetEntry = find(target);
  if (!sheetEntry) throw new Error(`Worksheet ${target} not found`);
  const sheet = await inflate(buf, sheetEntry);
  const grid: string[][] = [];
  for (const row of sheet.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const cells: string[] = [];
    for (const c of row[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const tag = c[1], body = c[2] ?? "";
      const ref = attr(tag, "r") ?? "";
      const t = attr(tag, "t");
      const v = /<v>([\s\S]*?)<\/v>/.exec(body)?.[1] ?? "";
      let value = decode(v);
      if (t === "s") value = strings[Number(v)] ?? "";
      else if (t === "inlineStr") value = runs(body);
      else if (t === "b") value = v === "1" ? "true" : "false";
      cells[col(ref)] = value;
    }
    grid.push(Array.from(cells, (x) => x ?? ""));
  }
  const nonEmpty = grid.filter((r) => r.some((x) => x.trim() !== ""));
  if (nonEmpty.length === 0) return { headers: [], rows: [], sheet: sheetName };
  const headers = nonEmpty[0].map((h) => h.trim());
  return {
    headers,
    rows: nonEmpty.slice(1).map((r) => Object.fromEntries(headers.map((h, i) => [h, (r[i] ?? "").trim()]))),
    sheet: sheetName,
  };
}
