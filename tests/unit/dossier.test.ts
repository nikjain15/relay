import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CLIENTS, CONNECTORS_DATA } from "@/lib/data";
import { dossier, DOSSIER_CONFIDENCE } from "@/lib/research/dossier";
import { APP } from "@/lib/data/policy";

/**
 * The dossier agent: every source the advisor has on one household, each claim
 * cited, the public record checked against the file and never promoted to fact.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const featured = CLIENTS.find((c) => c.id === APP.featured.clientId)!;

describe("dossier", () => {
  it("cites every item to a record that exists, or to a public locator", () => {
    for (const c of CLIENTS) {
      const d = dossier(c);
      for (const s of d.sections) for (const it of s.items) {
        expect(it.cites.length, it.id).toBeGreaterThan(0);
        for (const k of it.cites) {
          if (k.record.startsWith("public://")) continue;
          const [file, field] = k.record.split("#");
          const json = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
          const ok = file.startsWith("data/documents/")
            ? json.passages.some((x: { id: string }) => x.id === field)
            : file === "data/service-requests.json"
              ? json.some((x: { id: string }) => x.id === field)
              : field.split(/[[.]/)[0] in json;
          expect(ok, `${it.id} cites ${k.record}`).toBe(true);
        }
      }
    }
  });

  it("never treats the public record as fact: every public item carries a confidence under 1 and a check against the file", () => {
    for (const c of CLIENTS) {
      const d = dossier(c);
      const pub = d.sections.find((s) => s.source === "public")!;
      for (const it of pub.items) {
        expect(it.confidence).toBeLessThan(1);
        expect(it.check).toBeDefined();
        expect(["corroborates", "not on file"]).toContain(it.check!.verdict);
      }
      expect(pub.via).toMatch(/search connector/);
    }
  });

  it("marks a public item that matches a field as corroborating and one that matches nothing as not on file", () => {
    const d = dossier(featured);
    const verdicts = d.checks.map((c) => c.check!.verdict);
    expect(verdicts).toContain("corroborates");
    expect(verdicts).toContain("not on file");
    const board = d.checks.find((c) => c.text.includes("advisory board"))!;
    expect(board.check!.verdict).toBe("not on file");
    expect(board.check!.why).toMatch(/held-away/);
    expect(board.confidence).toBe(DOSSIER_CONFIDENCE.publicRecord);
  });

  it("reads only messages on a connected source and names the channel it could not read", () => {
    const c = CLIENTS.find((x) => (x.messages ?? []).some((m) => !CONNECTORS_DATA.connections.some((s) => s.advisorId === x.advisorId && s.connectorId === m.connectorId && s.status === "connected")))!;
    const d = dossier(c);
    const msgs = d.sections.find((s) => s.source === "messages")!;
    expect(msgs.items.length).toBeLessThan((c.messages ?? []).length);
    expect(d.unknowns.some((u) => u.text.startsWith("What was said on"))).toBe(true);
  });

  it("does not ask who the Legacy goal is for when the goal already says", () => {
    const d = dossier(featured); // "education trust for three grandchildren"
    expect(d.unknowns.some((u) => u.text.startsWith("Who the Legacy"))).toBe(false);
  });

  it("drafts a note a person can file, and says the public items are unverified", () => {
    const d = dossier(featured);
    expect(d.draftNote).toMatch(/Dossier assembled by the research agent/);
    expect(d.draftNote).toMatch(/advisory board/);
    expect(d.draftNote).toMatch(/unverified/);
    expect(d.trace.at(-1)!.title).toBe("Drafted a CRM note");
  });

  it("reads a connected household with no public record and says nothing was found rather than nothing exists", () => {
    const bare = { ...featured, id: "hh-test", name: "Test", publicRecord: undefined, messages: [], notes: [], contactHistory: [] };
    const d = dossier(bare);
    expect(d.sections.find((s) => s.source === "public")!.gap).toMatch(/Nothing found/);
    expect(d.unknowns.some((u) => u.why.includes("not the same as nothing existing"))).toBe(true);
    expect(d.unknowns.some((u) => u.text.includes("last spoken"))).toBe(true);
  });
});
