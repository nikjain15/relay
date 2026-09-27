import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { brief, briefAll, PROBE_IDS, RESEARCH_CONFIDENCE } from "@/lib/research/brief";
import { CLIENTS, CONNECTORS_DATA, clientFile } from "@/lib/data";

/**
 * The research agent: every claim cites a record that exists, observed and
 * inferred are kept apart with a confidence on every inference, and what
 * could not be established is named rather than omitted.
 */
const ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** Resolve a citation like data/clients/hh-renner.json#notes[0] and return the value it points at. */
function resolve(record: string): unknown {
  const [file, path] = record.split("#");
  const data = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
  if (!path) return data;
  if (!file.includes("/clients/") && !file.includes("/advisors/")) {
    // Shared files: the fragment is an id inside the file.
    const list = Array.isArray(data) ? data : [];
    return list.find((x: { id?: string }) => x.id === path) ?? data;
  }
  let cur: unknown = data;
  for (const seg of path.replace(/\[([^\]]+)\]/g, ".$1").split(".")) {
    if (cur === undefined || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[seg];
  }
  return cur;
}

describe("client research agent", () => {
  const all = briefAll();

  it("briefs every client and runs every probe", () => {
    expect(all).toHaveLength(CLIENTS.length);
    for (const b of all) expect(b.probesRun).toEqual(PROBE_IDS);
    expect(PROBE_IDS.length).toBeGreaterThanOrEqual(11);
  });

  it("every claim cites at least one record, and every cited record resolves to a value in data/", () => {
    for (const b of all) {
      for (const x of [...b.since, ...b.observed, ...b.inferred, ...b.unknowns]) {
        expect(x.cites.length, `${b.clientId} ${x.id}`).toBeGreaterThan(0);
        for (const k of x.cites) expect(resolve(k.record), `${b.clientId} ${x.id} cites ${k.record}`).toBeDefined();
      }
    }
  });

  it("observed claims carry confidence 1; inferred claims carry a named floor below 1 and a question", () => {
    const floors = new Set<number>(Object.values(RESEARCH_CONFIDENCE));
    for (const b of all) {
      for (const x of [...b.since, ...b.observed]) expect(x.confidence).toBe(1);
      for (const x of b.inferred) {
        expect(x.confidence).toBeLessThan(1);
        expect(floors.has(x.confidence), `${x.id} uses a floor from RESEARCH_CONFIDENCE`).toBe(true);
        expect(x.askThis, `${x.id} says how to confirm it`).toBeTruthy();
      }
      for (let i = 1; i < b.inferred.length; i++) expect(b.inferred[i - 1].confidence).toBeLessThanOrEqual(b.inferred[i].confidence);
    }
  });

  it("a colleague's note becomes an inference, never an observation, and says whose account it is", () => {
    const b = brief("hh-renner")!;
    const intent = b.inferred.find((x) => x.id.startsWith("intent-"))!;
    expect(intent.confidence).toBe(RESEARCH_CONFIDENCE.teamNote);
    expect(intent.text).toMatch(/colleague's account, not the client's words/);
    expect(b.observed.some((x) => /renovation/i.test(x.text))).toBe(false);
  });

  it("what changed since the last conversation is exactly what is dated after it", () => {
    const c = clientFile("hh-renner")!;
    const b = brief(c.id)!;
    const last = Math.max(...c.contactHistory.map((e) => e.day));
    expect(b.lastContact?.day).toBe(last);
    // Recomputed here from the file, independently of the probe.
    const expected = c.opportunities.filter((o) => -o.observedDay > last).length + c.notes.filter((n) => n.day > last).length + c.paperwork.filter((w) => w.requestedDay > last && w.signedDay === undefined).length;
    const requests = b.since.filter((x) => x.id.startsWith("since-req-")).length;
    expect(b.since.length - requests).toBe(expected);
  });

  it("names what it could not establish: a refused citation, a missing trusted contact, an uncaptured channel, silence", () => {
    const pell = brief("hh-pell")!;
    expect(pell.unknowns.map((u) => u.id)).toEqual(expect.arrayContaining(["refused-opp-pell-market", "stale-contact"]));
    const brandvold = brief("hh-brandvold")!;
    expect(brandvold.unknowns.map((u) => u.id)).toEqual(expect.arrayContaining(["trusted-contact", "held-away-opp-brandvold-held-away", "blind-spots"]));
    for (const b of all) for (const u of b.unknowns) expect(u.why.length, u.id).toBeGreaterThan(20);
  });

  it("does not mistake off-platform proceeds for unknown held-away assets", () => {
    const b = brief("hh-renner")!;
    expect(b.unknowns.some((u) => u.id.startsWith("held-away"))).toBe(false);
  });

  it("only asserts a disagreement about an opportunity when a CITED document is a side of it", () => {
    const b = brief("hh-renner")!;
    expect(b.inferred.some((x) => x.id === "conflict-opp-renner-concentration")).toBe(true);
    expect(b.inferred.some((x) => x.id === "conflict-opp-renner-property")).toBe(false);
  });

  it("blind spots are channels attested as used and captured by nothing; connecting a source removes it", () => {
    const before = brief("hh-renner")!;
    expect(before.blindSpots).toContain("sms");
    const fixed = CONNECTORS_DATA.connections.map((s) => (s.connectorId === "compliant-texting" && s.advisorId === "adv-a" ? { ...s, status: "connected" as const } : s));
    const after = brief("hh-renner", fixed)!;
    expect(after.blindSpots).not.toContain("sms");
  });

  it("never infers capacity from age, and states the distribution age as a rule rather than a judgement", () => {
    for (const b of all) {
      for (const x of [...b.observed, ...b.inferred, ...b.unknowns]) expect(x.text).not.toMatch(/diminished|capacity|exploit/i);
    }
    const ol = brief("hh-okafor-lind")!;
    expect(ol.observed.some((x) => /required minimum distributions begin \(73\)/.test(x.text))).toBe(true);
  });

  it("every question traces to an inference or an unknown", () => {
    for (const b of all) {
      const fromTexts = new Set([...b.inferred, ...b.unknowns].map((x) => x.text));
      for (const q of b.questions) expect(fromTexts.has(q.from), q.text).toBe(true);
    }
  });

  it("holds no em-dash and no invented specific in any sentence", () => {
    for (const b of all) for (const x of [...b.since, ...b.observed, ...b.inferred, ...b.unknowns]) expect(x.text).not.toMatch(/—/);
  });
});
