import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ICON_NAMES, CHANNEL_ICON } from "@/components/icons";
import { AREAS } from "@/components/nav";

/**
 * The icon set is drawn in one file to one grid. These hold the properties that
 * make it a system rather than a pile of glyphs, and that keep it inside the
 * design system's branding boundary.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const SRC = readFileSync(join(ROOT, "components/icons.tsx"), "utf8");

describe("icon set", () => {
  it("draws every icon with no colour of its own", () => {
    // currentColor only: an icon inherits the token the text around it uses, so
    // it cannot introduce a colour the design system has not approved.
    expect(SRC).toContain('stroke="currentColor"');
    expect(/#[0-9a-fA-F]{3,8}\b/.exec(SRC)).toBeNull();
    expect(/\b(?:rgba?|hsla?|oklch)\(/.exec(SRC)).toBeNull();
    // No fills: the set is strokes on one grid. `fill="none"` is the only fill.
    expect([...SRC.matchAll(/fill="([^"]*)"/g)].map((m) => m[1])).toEqual(["none"]);
  });

  it("uses one grid and one stroke weight", () => {
    expect(SRC).toContain('viewBox="0 0 24 24"');
    expect(SRC).toContain("strokeWidth={1.5}");
    expect(SRC).toContain('strokeLinecap="round"');
    // One <svg> in the file: every glyph is a path set, not its own document.
    expect(SRC.match(/<svg/g)).toHaveLength(1);
  });

  it("is decorative unless given a label", () => {
    // An icon alone never carries meaning (WCAG 2.2 AA, design system principle 3).
    expect(SRC).toContain('aria-hidden={label ? undefined : true}');
    expect(SRC).toContain('role={label ? "img" : undefined}');
  });

  it("carries no firm's brand mark", () => {
    // The design system's boundary: inspired by the institutional idiom, never branded.
    for (const banned of ["keys", "logo", "wordmark", "brand"]) {
      expect(SRC.toLowerCase().split("\n").filter((l) => l.includes(`"${banned}`)).length, banned).toBe(0);
    }
  });

  it("gives every channel kind an icon that exists", () => {
    for (const [channel, icon] of Object.entries(CHANNEL_ICON)) {
      expect(ICON_NAMES, `${channel} maps to ${icon}`).toContain(icon);
    }
  });

  it("gives every navigation link an icon that exists", () => {
    for (const area of AREAS) {
      for (const link of area.links) expect(ICON_NAMES, `${link.label}`).toContain(link.icon);
    }
  });

  it("carries no glyph that nothing references", () => {
    // A drawn set earns its coherence by staying small. Anything unreferenced is
    // dead weight that will drift out of the house style unnoticed.
    const used = new Set<string>([...Object.values(CHANNEL_ICON), ...AREAS.flatMap((a) => a.links.map((l) => l.icon))]);
    const sources = readdirSync(join(ROOT, "components"), { recursive: true, encoding: "utf8" })
      .concat(readdirSync(join(ROOT, "app"), { recursive: true, encoding: "utf8" }).map((f) => `../app/${f}`))
      .filter((f) => /\.tsx?$/.test(f) && !f.endsWith("icons.tsx"))
      .map((f) => readFileSync(join(ROOT, "components", f), "utf8"))
      .join("\n");
    const unused = ICON_NAMES.filter((n) => !used.has(n) && !new RegExp(`"${n}"`).test(sources));
    expect(unused, "icons nothing references").toEqual([]);
  });
});
