import { describe, it, expect } from "vitest";
import { BASELINE } from "@/lib/compliance/policy";
import { rulesFedBy, sourcesForRule, unservedRules } from "@/lib/compliance/sources";
import { CATALOG } from "@/lib/connectors/catalog";
import { connectorIds, getConnector, listConnectors, producedBy } from "@/lib/connectors/registry";
import { coverageFor } from "@/lib/connectors/coverage";
import { CONNECTORS_DATA } from "@/lib/data";

describe("connector catalog", () => {
  it("has unique, url-safe ids", () => {
    const ids = connectorIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });

  it("declares only read capabilities, so a sending connector cannot be expressed", () => {
    const READ = new Set([
      "ingest_history", "ingest_incremental", "read_metadata",
      "read_participants", "read_attachments", "read_transcript",
    ]);
    for (const c of CATALOG) {
      expect(c.capabilities.length).toBeGreaterThan(0);
      for (const cap of c.capabilities) expect(READ.has(cap), `${c.id} declares ${cap}`).toBe(true);
    }
  });

  it("every connector produces at least one record class and names a supervisory reason", () => {
    for (const c of CATALOG) {
      expect(c.produces.length, c.id).toBeGreaterThan(0);
      expect(c.supervisoryNote.length, c.id).toBeGreaterThan(20);
    }
  });

  it("resolves by id", () => {
    expect(getConnector("microsoft-365")?.channel).toBe("email");
    expect(getConnector("nope")).toBeUndefined();
    expect(listConnectors().length).toBe(CATALOG.length);
  });

  it("aggregates produced record classes across a connected set", () => {
    const produced = producedBy(["microsoft-365", "zoom"]);
    expect(produced.has("email_message")).toBe(true);
    expect(produced.has("meeting_transcript")).toBe(true);
    expect(produced.has("sms_message")).toBe(false);
  });
});

describe("coverage", () => {
  const { connections, attestations } = CONNECTORS_DATA;

  it("flags an attested channel with no connector as a gap, with the exposure named", () => {
    const r = coverageFor("adv-a", connections, attestations);
    const voice = r.channels.find((c) => c.channel === "voice")!;
    expect(voice.status).toBe("gap");
    expect(voice.exposure).toContain("SEC Rule 17a-4 retention");
  });

  it("treats a degraded connector as uncaptured rather than covered", () => {
    const r = coverageFor("adv-a", connections, attestations);
    const sms = r.channels.find((c) => c.channel === "sms")!;
    expect(sms.status).toBe("gap");
    expect(sms.degraded.map((c) => c.id)).toContain("compliant-texting");
  });

  it("marks a fully captured channel covered and keeps completeness below 1 while gaps remain", () => {
    const r = coverageFor("adv-a", connections, attestations);
    expect(r.channels.find((c) => c.channel === "email")!.status).toBe("covered");
    expect(r.defensible).toBe(false);
    expect(r.completeness).toBeGreaterThan(0);
    expect(r.completeness).toBeLessThan(1);
  });

  it("reports an advisor with no gaps as defensible", () => {
    const r = coverageFor("adv-b", connections, attestations);
    const gapChannels = r.gaps.map((g) => g.channel);
    expect(gapChannels).toContain("voice");
    expect(r.defensible).toBe(false);
  });

  it("ignores other advisors' connections", () => {
    const r = coverageFor("adv-b", connections, attestations);
    expect(r.channels.find((c) => c.channel === "meeting")!.connected).toHaveLength(0);
  });
});

describe("the catalog and the rule set agree", () => {
  it("every connector a rule requires exists in the catalog", () => {
    const ids = new Set(CATALOG.map((c) => c.id));
    for (const r of BASELINE) for (const c of r.requires) expect(ids.has(c), `${r.id} requires ${c}`).toBe(true);
  });

  it("no rule is left unservable by the whole catalog", () => {
    // A rule naming a source nothing provides can never fire and never clear,
    // which is worse than one that fires often: it reads as covered.
    expect(unservedRules(CATALOG.map((c) => c.id))).toEqual([]);
  });

  it("derives which rules need a source from the rules themselves", () => {
    // One direction only. The catalog used to carry its own list and the two
    // drifted: the archive omitted a rule that requires it.
    expect(rulesFedBy("archive").map((r) => r.id)).toContain("finra-2210-regime");
    expect(rulesFedBy("nothing-like-this")).toEqual([]);
    for (const r of BASELINE) for (const cid of r.requires) expect(rulesFedBy(cid).map((x) => x.id)).toContain(r.id);
  });

  it("names a rule's sources for the console", () => {
    expect(sourcesForRule("reg-bi-care-evidence")).toContain("custodian-feed");
    expect(sourcesForRule("off-channel-gap")).toEqual([]);
  });
});
