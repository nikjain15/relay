import { describe, it, expect } from "vitest";
import { CATALOG } from "@/lib/connectors/catalog";
import { connectorIds, connectorsFeedingRule, getConnector, listConnectors, producedBy } from "@/lib/connectors/registry";
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
      expect(c.feedsRules.length, c.id).toBeGreaterThan(0);
    }
  });

  it("resolves by id and by rule", () => {
    expect(getConnector("microsoft-365")?.channel).toBe("email");
    expect(getConnector("nope")).toBeUndefined();
    expect(connectorsFeedingRule("off-channel-gap").length).toBeGreaterThan(3);
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
