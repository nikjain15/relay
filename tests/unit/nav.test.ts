import { describe, it, expect } from "vitest";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AREAS, currentArea, isActive } from "@/components/nav";

/**
 * Navigation is grouped by the question being asked, not by module. The tests
 * that matter here are that every link goes somewhere, that nothing is
 * unreachable, and that a phone opens on the area the route belongs to.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Turns /household/hh-renner into app/household/[id]/page.tsx if that exists. */
function routeExists(href: string): boolean {
  const path = href.split("?")[0];
  const segments = path.split("/").filter(Boolean);
  let dir = join(ROOT, "app");
  for (const s of segments) {
    if (existsSync(join(dir, s))) {
      dir = join(dir, s);
      continue;
    }
    const dynamic = readdirSync(dir, { withFileTypes: true }).find((e) => e.isDirectory() && /^\[.+\]$/.test(e.name));
    if (!dynamic) return false;
    dir = join(dir, dynamic.name);
  }
  return existsSync(join(dir, "page.tsx"));
}

const links = AREAS.flatMap((a) => a.links);

describe("navigation", () => {
  it("every link resolves to a route that exists", () => {
    for (const l of links) expect(routeExists(l.href), l.href).toBe(true);
  });

  it("every page is reachable from the nav", () => {
    const pages = readdirSync(join(ROOT, "app"), { recursive: true, encoding: "utf8" })
      .filter((f) => f.endsWith("page.tsx"))
      .map((f) => "/" + f.replace(/\/?page\.tsx$/, ""))
      .map((p) => (p === "/" ? "/" : p));
    const linked = new Set(links.map((l) => l.href.split("?")[0]));
    for (const p of pages) {
      // A dynamic route is reachable through a link to one of its instances, or
      // through a link to the list it hangs off.
      const prefix = p.includes("[") ? p.slice(0, p.indexOf("[")) : "";
      const hit = p.includes("[")
        ? [...linked].some((l) => l.startsWith(prefix) || l === prefix.replace(/\/$/, ""))
        : linked.has(p);
      expect(hit, p).toBe(true);
    }
  });

  it("holds the agents first and stays small enough to scan", () => {
    expect(AREAS[0].area).toBe("Agents");
    expect(AREAS).toHaveLength(7);
    for (const a of AREAS) expect(a.links.length, a.area).toBeLessThanOrEqual(6);
  });

  it("marks exactly one link active per route", () => {
    for (const l of links) {
      const path = l.href.split("?")[0];
      expect(links.filter((x) => isActive(x.href, path)).length, path).toBe(1);
    }
  });

  it("does not confuse a client picture with its proposal page", () => {
    expect(isActive("/household/hh-renner", "/household/hh-renner/proposal")).toBe(false);
    expect(isActive("/household/hh-renner/proposal", "/household/hh-renner/proposal")).toBe(true);
  });

  it("opens on the area the route belongs to", () => {
    expect(currentArea("/")).toBe("Agents");
    expect(currentArea("/connectors")).toBe("Rules");
    expect(currentArea("/compliance/log")).toBe("Rules");
    expect(currentArea("/supervision")).toBe("Decisions");
    // An unknown route falls back to the first area rather than nothing.
    expect(currentArea("/nowhere")).toBe("Agents");
  });
});
