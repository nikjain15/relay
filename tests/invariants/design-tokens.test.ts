import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * One design system (docs/DESIGN-SYSTEM.md). Components use token names only,
 * so a colour changes in one place; and the walkthrough mockup carries the
 * same tokens as the prototype, so the two never drift apart.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const PALETTE = /(?<![\w-])(?:[a-z]+:)*(?:text|bg|border|ring|decoration|outline|fill|stroke)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}\b/;
const HEX = /#[0-9a-fA-F]{3,8}\b/;

export function offending(src: string): string | undefined {
  return PALETTE.exec(src)?.[0] ?? HEX.exec(src)?.[0];
}

const files = (dir: string) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => /\.tsx?$/.test(f))
    .map((f) => join(dir, f));

export const tokens = (css: string) => Object.fromEntries([...css.matchAll(/(--[a-z0-9-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));

describe("design system", () => {
  it("app/ and components/ use design tokens only: no raw palette class, no hex colour", () => {
    for (const f of [...files("app"), ...files("components")]) expect(offending(readFileSync(join(ROOT, f), "utf8")), f).toBeUndefined();
  });

  it("the scan catches a planted palette class and a planted hex colour", () => {
    expect(offending(`<p className="hover:text-red-700">`)).toBe("hover:text-red-700");
    expect(offending(`style={{ color: "#e60000" }}`)).toBe("#e60000");
  });

  it("the walkthrough mockup declares every prototype token with the same value", () => {
    const app = tokens(readFileSync(join(ROOT, "app/tokens.css"), "utf8"));
    const html = readFileSync(join(ROOT, "docs/mockups/relay-wireframes.html"), "utf8");
    const light = tokens(html.slice(html.indexOf(":root {"), html.indexOf("}", html.indexOf(":root {"))));
    expect(Object.keys(app).length).toBeGreaterThan(10);
    for (const [k, v] of Object.entries(app)) expect(light[k], k).toBe(v);
  });
});
