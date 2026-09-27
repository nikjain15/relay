import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { AGENTS } from "@/lib/compliance/agents";
import { ROSTER, AGENT_COUNT, MORNING_COUNT, inWords } from "@/lib/agents/roster";

/**
 * The product said 14, 15 and 16 agents on different pages at once. Every
 * count now comes from lib/agents/roster.ts and AGENTS; these checks stop a
 * hard-coded count coming back, in code or in the README.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const read = (p: string) => readFileSync(join(ROOT, p), "utf8");

describe("one agent roster", () => {
  it("counts the desks and the roster once", () => {
    expect(AGENT_COUNT).toBe(AGENTS.length + ROSTER.length);
    expect(MORNING_COUNT).toBeLessThanOrEqual(AGENT_COUNT);
    expect(new Set(ROSTER.map((a) => a.id)).size).toBe(ROSTER.length);
  });

  it("the README states the same number", () => {
    expect(read("README.md").toLowerCase()).toContain(`${inWords(AGENT_COUNT).toLowerCase()} agents`);
  });

  it("no screen hard-codes an agent count", () => {
    const files = ["components/overview.tsx", "components/agents-view.tsx", "components/about.tsx", "app/features/page.tsx", "app/how-it-works/page.tsx", "app/architecture/page.tsx"];
    for (const f of files) {
      const src = read(f);
      expect(/\b(Eight|Ten|Twelve|Fourteen|Fifteen|Sixteen|Eighteen) (more )?agents\b/i.test(src), f).toBe(false);
      expect(/\.length \+ \d+\b[^;]*agents/.test(src), f).toBe(false);
    }
  });
});
