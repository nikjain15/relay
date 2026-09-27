import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The static site is served under a base path (/relay on GitHub Pages). A raw
 * <a href="/agents/x"> skips it and lands on a 404, so an internal link is a
 * next/link Link, a hash, an external page opened in a new tab, or a file in
 * public/ prefixed with the base path (ASSET). Audit 2026-09-27: every brief's
 * primary button ("Open the first desk", "Start with") was dead on the live site.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const files = (dir: string) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => /\.tsx$/.test(f))
    .map((f) => join(dir, f));

export function rawInternalAnchors(src: string): string[] {
  const bad: string[] = [];
  for (const m of src.matchAll(/<a\b[^>]*>/g)) {
    const tag = m[0];
    if (!/\bhref=/.test(tag)) continue;
    if (/target="_blank"/.test(tag)) continue;
    if (/href="#/.test(tag) || /href=\{`#/.test(tag)) continue;
    if (/href=\{`\$\{ASSET\}/.test(tag)) continue;
    bad.push(tag.slice(0, 80));
  }
  return bad;
}

describe("links survive the base path", () => {
  it("app/ and components/ route internal links through next/link", () => {
    for (const f of [...files("app"), ...files("components")]) expect(rawInternalAnchors(readFileSync(join(ROOT, f), "utf8")), f).toEqual([]);
  });

  it("the scan catches a planted raw internal anchor and a relative public file", () => {
    expect(rawInternalAnchors(`<a href={next.href} className="x">Go</a>`)).toHaveLength(1);
    expect(rawInternalAnchors(`<a href="/agents/x">Go</a>`)).toHaveLength(1);
    expect(rawInternalAnchors(`<a className="underline" href="samples/clients.csv" download>`)).toHaveLength(1);
    expect(rawInternalAnchors(`<a href="#main">Skip</a>`)).toEqual([]);
    expect(rawInternalAnchors(`<a href={s.url} target="_blank" rel="noreferrer">`)).toEqual([]);
    expect(rawInternalAnchors(`<a href={\`\${ASSET}/samples/clients.csv\`} download>`)).toEqual([]);
  });
});
