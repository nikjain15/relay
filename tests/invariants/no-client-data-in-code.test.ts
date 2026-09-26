import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLIENTS, PROSPECTS, ADVISORS_DATA, SHELF_DATA, DOCUMENTS, SERVICE_REQUESTS } from "@/lib/data";

/**
 * Data separation (R-18): every client, advisor, prospect, product and
 * document lives in data/. Code may read it, never spell it. A name or id
 * literal in app/, components/ or lib/ fails here, so editing data/ is always
 * enough to change what the app shows. Advisor names are role labels
 * ("Advisor A"), so they are not scanned; advisor ids are.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const IDS = new Set([
  ...CLIENTS.flatMap((c) => [c.id, ...c.opportunities.map((o) => o.id)]),
  ...SHELF_DATA.map((p) => p.id),
  ...DOCUMENTS.map((d) => d.id),
  ...ADVISORS_DATA.map((a) => a.id),
  ...PROSPECTS.map((p) => p.id),
  ...SERVICE_REQUESTS.map((r) => r.id),
]);
const QUOTED = /["'`]([a-z]+-[a-z0-9-]+)["'`]/g;
const NAMES = [
  ...CLIENTS.flatMap((c) => [c.name, ...c.persons.map((p) => p.name)]),
  ...PROSPECTS.map((p) => p.label),
].filter((n) => n.length > 3);

export function offending(src: string): string | undefined {
  for (const m of src.matchAll(QUOTED)) if (IDS.has(m[1])) return m[0];
  return NAMES.find((n) => new RegExp(`\\b${n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(src));
}

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(ts|tsx)$/.test(f))
    .map((f) => join(dir, f))
    .filter((f) => f !== join("lib", "data", "index.ts"));
}

describe("data separation: no client data in code", () => {
  it("app/, components/ and lib/ hold no client, advisor or prospect names and no data id literals", () => {
    const files = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")];
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) expect(offending(readFileSync(join(ROOT, f), "utf8")), `${f} hard-codes data`).toBeUndefined();
  });

  it("the scan catches a planted id and a planted name", () => {
    expect(offending(`const x = "hh-renner";`)).toBe(`"hh-renner"`);
    expect(offending(`<p>${CLIENTS[0].persons[0].name}</p>`)).toBeDefined();
  });
});
