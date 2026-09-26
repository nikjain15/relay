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
// Any reference to fetch (not only a call: `window.fetch`, `["fetch"]`), XHR, sockets,
// server-sent events, beacons, SMTP, a dynamic import of a transport, or a form
// or link that posts to another host. A string-built name ("fe" + "tch") can
// defeat any scan; the Content-Security-Policy in next.config.ts is the runtime
// guard behind this one (connect-src and form-action 'self').
export const OUTBOUND =
  /\bfetch\b|XMLHttpRequest|\bWebSocket\b|\bEventSource\b|sendBeacon|\bnodemailer\b|\bsmtp\b|import\(\s*["'](node:)?(https?|net|tls|dgram|http2)["']|\b(action|formAction)=\{?["'`]https?:/i;

function sourceFiles(dir: string): string[] {
  return readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => /\.(ts|tsx|js|mjs)$/.test(f))
    .map((f) => join(dir, f));
}

describe("human-gated-outward: no transport in app/, components/ or lib/", () => {
  it("no source file calls fetch, XHR, WebSocket, sendBeacon or SMTP", () => {
    const files = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")];
    expect(files.length).toBeGreaterThan(0);
    for (const f of files) {
      expect(OUTBOUND.test(readFileSync(join(ROOT, f), "utf8")), `${f} performs transport`).toBe(false);
    }
  });
});

describe("the outbound scan catches planted transports", () => {
  it.each([
    [`fetch("https://x.example")`],
    [`const f = window.fetch; f(u)`],
    [`(globalThis as any)["fetch"](u)`],
    [`new EventSource("https://x.example")`],
    [`new WebSocket(u)`],
    [`navigator.sendBeacon(u, d)`],
    [`await import("node:https")`],
    [`<form action="https://x.example/collect" method="post" />`],
  ])("%s", (src) => expect(OUTBOUND.test(src)).toBe(true));
});

describe("runtime guard: the browser may only talk to this origin", () => {
  it("next.config.ts sends connect-src and form-action 'self', and noindex", async () => {
    const { default: config } = await import("../../next.config");
    const rules = await config.headers!();
    const all = rules.flatMap((r) => r.headers);
    const csp = all.find((h) => h.key === "Content-Security-Policy")?.value ?? "";
    expect(csp).toMatch(/connect-src 'self'/);
    expect(csp).toMatch(/form-action 'self'/);
    expect(all.find((h) => h.key === "X-Robots-Tag")?.value).toMatch(/noindex/);
  });
});

describe("human-gated-outward: no send verb in the action vocabulary", () => {
  const FORBIDDEN = [/send/i, /email/i, /mail/i, /dispatch/i, /post/i, /publish/i, /transmit/i, /notify/i, /sms/i, /release/i, /deliver/i, /forward/i, /reply/i, /message/i, /share/i];
  it("every action verb is non-transmitting", () => {
    for (const verb of ACTION_VERBS) {
      for (const re of FORBIDDEN) {
        expect(re.test(verb), `action "${verb}" matches ${re}`).toBe(false);
      }
    }
  });
});
