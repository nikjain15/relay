import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Screens read "your" data from one place: useView() over the session book
 * (lib/view/advisor-view.ts). Before it existed the Overview counted one
 * advisor while Meetings, Follow-ups, Service requests, Paperwork, Prospects
 * and Households counted the whole firm, and several screens read the static
 * files so a household connected on Sources never reached them. This scan
 * stops a screen going back to its own copy.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const sources = (dir: string) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" }).filter((f) => /\.tsx?$/.test(f)).map((f) => join(dir, f));

/** Per-advisor collections a screen must take from the view, never read directly. */
const SCOPED = [/\bSERVICE_REQUESTS\b/, /\bPROSPECTS\b/, /\ballTasks\(/, /\btodaysMeetings\(/, /\brankProspects\(/, /\bAPP\.defaultAdvisorId\b/];
/** The static client list is for building routes and the session book itself, not for a screen's counts. */
const STATIC_CLIENTS = /\bCLIENTS\b/;
const ALLOWED_CLIENTS = new Set([
  "components/state.tsx", // builds the session book from it
  "components/palette.tsx", // links only to routes that exist statically
  "app/research/[id]/page.tsx", // generateStaticParams
  "app/meetings/[id]/page.tsx", // generateStaticParams
  "app/how-it-works/page.tsx", // describes the shipped sample
  "app/triage/view.tsx", // whether a static evidence page exists for a row
]);
const ALLOWED_SCOPED = new Set(["components/state.tsx", "components/communications.tsx"]);

export function bypasses(file: string, src: string): string[] {
  const out: string[] = [];
  const code = src.replace(/^\s*(\/\/|\*|\/\*).*$/gm, "");
  if (!ALLOWED_SCOPED.has(file)) for (const re of SCOPED) if (re.test(code)) out.push(re.source);
  if (!ALLOWED_CLIENTS.has(file) && STATIC_CLIENTS.test(code)) out.push("CLIENTS");
  return out;
}

describe("one view per advisor", () => {
  it("no screen reads a per-advisor collection or the static client list directly", () => {
    for (const f of [...sources("app"), ...sources("components")].filter((f) => f !== "components/view.tsx")) {
      expect(bypasses(f, readFileSync(join(ROOT, f), "utf8")), f).toEqual([]);
    }
  });
  it("the scan catches a planted bypass", () => {
    expect(bypasses("app/x/page.tsx", "const list = triage(SERVICE_REQUESTS);")).not.toEqual([]);
    expect(bypasses("app/x/page.tsx", "const rows = CLIENTS.flatMap((c) => c.tasks);")).not.toEqual([]);
    expect(bypasses("app/x/page.tsx", "const m = todaysMeetings();")).not.toEqual([]);
  });
});
