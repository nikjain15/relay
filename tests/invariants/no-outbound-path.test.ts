import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ACTION_VERBS } from "@/lib/actions";

/**
 * Invariant (PRD §5.3): no path exists from Relay to a client. The import
 * guard (npm run invariant:imports) cannot see globals, so scan the source.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const OUTBOUND = /\bfetch\s*\(|XMLHttpRequest|new WebSocket\b|navigator\.sendBeacon|\bnodemailer\b|\bsmtp\b/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(ts|tsx|js|mjs)$/.test(f))
    .map((f) => join(dir, f));
}

describe("human-gated-outward: no transport in app/ or lib/", () => {
  it("no source file calls fetch, XHR, WebSocket, sendBeacon or SMTP", () => {
    const files = [...sourceFiles("app"), ...sourceFiles("lib")];
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(OUTBOUND.test(readFileSync(join(ROOT, f), "utf8")), `${f} performs transport`).toBe(false);
    }
  });
});

describe("human-gated-outward: no send verb in the action vocabulary", () => {
  const FORBIDDEN = [/send/i, /email/i, /mail/i, /dispatch/i, /post/i, /publish/i, /transmit/i, /notify/i, /sms/i];
  it("every action verb is non-transmitting", () => {
    for (const verb of ACTION_VERBS) {
      for (const re of FORBIDDEN) {
        expect(re.test(verb), `action "${verb}" matches ${re}`).toBe(false);
      }
    }
  });
});
