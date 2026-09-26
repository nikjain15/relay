import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Mobile is not a later pass. The first build was unusable on a phone because a
 * wide table forced the whole page sideways and the only navigation was a fixed
 * sidebar. These two scans stop both regressing.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));

const sources = (dir: string) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => /\.tsx$/.test(f))
    .map((f) => join(dir, f));

/** A table must sit inside TableScroll, which scrolls itself instead of the page. */
export function unwrappedTable(src: string): boolean {
  for (const m of src.matchAll(/<table\b/g)) {
    const before = src.slice(0, m.index).trimEnd();
    if (!before.endsWith("<TableScroll>")) return true;
  }
  return false;
}

/** A multi-column grid must name a breakpoint, or it is two columns on a phone. */
export function rigidGrid(src: string): string | undefined {
  return /(?<![a-z:])grid-cols-[2-9]/.exec(src)?.[0];
}

describe("responsive layout", () => {
  const files = [...sources("app"), ...sources("components")];

  it("every table scrolls itself rather than the page", () => {
    for (const f of files) expect(unwrappedTable(readFileSync(join(ROOT, f), "utf8")), f).toBe(false);
  });

  it("no grid is multi-column at phone width without a breakpoint", () => {
    // components/ui.tsx owns the deliberate exceptions: StatRow is two columns by
    // design at phone width, and CardGrid's own class strings carry breakpoints.
    for (const f of files.filter((f) => !f.endsWith("components/ui.tsx"))) {
      expect(rigidGrid(readFileSync(join(ROOT, f), "utf8")), f).toBeUndefined();
    }
  });

  it("the scans catch a planted violation", () => {
    expect(unwrappedTable(`<div><table className="w-full">`)).toBe(true);
    expect(unwrappedTable(`<TableScroll>\n  <table className="w-full">`)).toBe(false);
    expect(rigidGrid(`<div className="grid grid-cols-3 gap-4">`)).toBe("grid-cols-3");
    expect(rigidGrid(`<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">`)).toBeUndefined();
  });

  it("the shell gives the navigation a drawer below the sidebar breakpoint", () => {
    const shell = readFileSync(join(ROOT, "components/shell.tsx"), "utf8");
    expect(shell).toContain("lg:hidden");
    expect(shell).toContain("aria-expanded");
    expect(shell).toContain("Escape");
    const nav = readFileSync(join(ROOT, "components/nav.tsx"), "utf8");
    expect(nav).toContain("hidden w-60");
  });

  it("the document declares a viewport", () => {
    expect(readFileSync(join(ROOT, "app/layout.tsx"), "utf8")).toContain("width=device-width");
  });
});
