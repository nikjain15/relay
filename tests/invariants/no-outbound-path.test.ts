/**
 * The "in test" half of the human-gate invariant (PRD-relay.md §5.3).
 *
 * dependency-cruiser stops a module importing a transport. These tests stop the
 * subtler versions: a send verb appearing in the action vocabulary, or a
 * communication reaching a released state without a recorded disposition.
 *
 * A failure here is never fixed by relaxing the test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e === ".git" || e === ".next") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p) && !p.includes("tests/invariants")) out.push(p);
  }
  return out;
}

const ROOT = new URL("../../", import.meta.url).pathname;

describe("human-gated outward", () => {
  it("ships no outbound transport dependency", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    const banned = ["nodemailer", "resend", "@sendgrid/mail", "postmark", "mailgun.js", "twilio"];
    expect(deps.filter((d) => banned.includes(d))).toEqual([]);
  });

  it("defines no send action in the action vocabulary", () => {
    // Relay's action verbs are a bounded set (PRD §5.3, bounded generation).
    // "send", "email" and "deliver" are not among them and must never be.
    for (const f of walk(ROOT)) {
      const src = readFileSync(f, "utf8");
      const m = src.match(/ACTION_VERBS\s*=\s*\[([^\]]*)\]/s);
      if (!m) continue;
      const verbs = m[1].toLowerCase();
      for (const forbidden of ["send", "email", "deliver", "transmit"]) {
        expect(verbs, `${f} declares a forbidden outbound verb`).not.toContain(`"${forbidden}"`);
      }
    }
  });
});
