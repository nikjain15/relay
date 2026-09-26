import { describe, it, expect } from "vitest";
import { AGENTS, agentOwning, agentsForScope, queue, runAgent, runScope, uncoveredMandatoryRules } from "@/lib/compliance/agents";
import { BASELINE, resolvePolicy } from "@/lib/compliance/policy";
import { accountFacts, communicationFacts, coverageFacts, proposalFacts, INFERRED } from "@/lib/compliance/facts";
import { agentsFrom, appendEdit, changeLog, editsAsOf, policyFrom, SEED_EDITS, toLayers, type RuleEdit } from "@/lib/compliance/store";
import { coverageFor } from "@/lib/connectors/coverage";
import { CLIENTS, CONNECTORS_DATA, SERVICE_REQUESTS } from "@/lib/data";

const ALL = ["microsoft-365", "archive", "custodian-feed", "salesforce-fsc", "zoom", "compliant-texting", "esign"];

describe("fact adapters", () => {
  it("classify a draft's text and count unsourced figures", () => {
    const f = communicationFacts({
      draftId: "d-1",
      draft: "This will return 8% a year. Your balance is $250,000.",
      channel: "email",
      channelApproved: true,
      recipientCount30d: 3,
      principalApproved: false,
      reviewed: false,
      containsRecommendation: true,
      machineDrafted: true,
      sources: ["Balance $250,000"],
      citedTitles: [],
    });
    expect(f.facts.containsProjection).toBe(true);
    expect(f.facts.unsourcedFigures).toBe(1);
    expect(f.facts.citationCount).toBe(0);
    // Text classification is an inference, so it cannot clear on its own.
    expect(f.confidence.containsProjection).toBe(INFERRED.textClassification);
  });

  it("leave concentration undefined when the custodian feed is not connected", () => {
    const client = CLIENTS[0];
    const on = accountFacts({ client, custodianConnected: true, trustedContactOnFile: true, complaintLogged: false });
    const off = accountFacts({ client, custodianConnected: false, trustedContactOnFile: true, complaintLogged: false });
    expect(off.facts.concentrationPct).toBeUndefined();
    expect(off.facts.instrument).toBeUndefined();
    // Undefined, not zero: a missing feed must not read as a clean account.
    if (on.facts.concentrationPct !== undefined) expect(on.facts.concentrationPct).toBeGreaterThan(0);
  });

  it("read a grievance out of an inbound request and keep the excerpt", () => {
    const client = CLIENTS.find((c) => SERVICE_REQUESTS.some((r) => r.clientId === c.id)) ?? CLIENTS[0];
    const f = accountFacts({
      client,
      requests: [{ id: "sr-x", clientId: client.id, receivedHoursAgo: 2, channel: "email", text: "This is unacceptable, I was misled about the fees." }],
      custodianConnected: true,
      trustedContactOnFile: true,
      complaintLogged: false,
    });
    expect(f.facts.complaintLanguage).toBe(true);
    expect(String(f.facts.complaintExcerpt)).toContain("unacceptable");
  });

  it("turn a coverage report into facts the rules can read", () => {
    const report = coverageFor("adv-a", CONNECTORS_DATA.connections, CONNECTORS_DATA.attestations);
    const f = coverageFacts(report);
    expect(f.scope).toBe("coverage");
    expect(Array.isArray(f.facts.gapChannels)).toBe(true);
    expect(f.facts.defensible).toBe(false);
    expect(f.confidence).toEqual({});
  });

  it("proposal facts carry the care-obligation record", () => {
    const f = proposalFacts({ proposalId: "p-1", clientId: "hh-renner", productId: "prod-1", alternativesConsidered: 0, costsCompared: false, basisRecorded: false, isRecommendation: true });
    expect(f.scope).toBe("proposal");
    expect(f.facts.alternativesConsidered).toBe(0);
  });
});

describe("agents", () => {
  const policy = resolvePolicy([]);

  it("every rule in the catalog is watched by exactly one enabled agent", () => {
    for (const r of BASELINE) {
      const owners = AGENTS.filter((a) => a.enabled && a.ruleIds.includes(r.id));
      expect(owners.length, r.id).toBe(1);
    }
  });

  it("no agent claims a rule that does not exist", () => {
    const ids = new Set(BASELINE.map((r) => r.id));
    for (const a of AGENTS) for (const r of a.ruleIds) expect(ids.has(r), `${a.id} claims ${r}`).toBe(true);
  });

  it("warn when a mandatory rule is left unwatched", () => {
    expect(uncoveredMandatoryRules(policy)).toEqual([]);
    const orphan = resolvePolicy([], [...BASELINE, { ...BASELINE[0], id: "orphan-rule", mandatory: true, enabled: true }]);
    expect(uncoveredMandatoryRules(orphan)).toContain("orphan-rule");
  });

  it("raise a case for the coverage gaps, pending a human", () => {
    const report = coverageFor("adv-a", CONNECTORS_DATA.connections, CONNECTORS_DATA.attestations);
    const runs = runScope(policy, { ...coverageFacts(report), availableConnectors: ALL });
    const cases = queue(runs);
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.every((c) => c.disposition === "pending")).toBe(true);
    expect(cases[0].citation.length).toBeGreaterThan(8);
    expect(cases[0].reason).toBe("fired");
  });

  it("route an inferred clear to a human as low confidence, not as a finding", () => {
    const agent = AGENTS.find((a) => a.id === "client-protection")!;
    const run = runAgent(agent, policy, {
      scope: "account",
      subject: "hh-x",
      subjectLabel: "Test",
      facts: { complaintLanguage: false, complaintLogged: false },
      confidence: { complaintLanguage: 0.4 },
      availableConnectors: ALL,
    });
    const low = run.cases.find((c) => c.reason === "low_confidence");
    expect(low).toBeDefined();
    expect(low!.finding).toContain("40 percent");
  });

  it("say which connector is missing rather than clearing", () => {
    const agent = AGENTS.find((a) => a.id === "recommendation-evidence")!;
    const run = runAgent(agent, policy, {
      ...proposalFacts({ proposalId: "p-1", clientId: "c", productId: "p", alternativesConsidered: 3, costsCompared: true, basisRecorded: true, isRecommendation: true }),
      availableConnectors: [],
    });
    expect(run.blockedBy).toContain("custodian-feed");
    expect(run.cases[0].reason).toBe("cannot_evaluate");
  });

  it("sort blocking above uncertain", () => {
    const report = coverageFor("adv-a", CONNECTORS_DATA.connections, CONNECTORS_DATA.attestations);
    const cases = queue(runScope(policy, { ...coverageFacts(report), availableConnectors: ALL }));
    const reasons = cases.map((c) => c.reason);
    expect(reasons.indexOf("fired")).toBeLessThanOrEqual(reasons.lastIndexOf("fired"));
    if (reasons.includes("low_confidence")) expect(reasons.indexOf("fired")).toBeLessThan(reasons.indexOf("low_confidence"));
  });

  it("only run agents whose scope matches the facts", () => {
    expect(agentsForScope("coverage").map((a) => a.id)).toEqual(["record-completeness"]);
    expect(agentOwning("finra-2210-regime")?.id).toBe("communications-surveillance");
  });
});

describe("the change log is the state", () => {
  it("the seeded log is what produces the effective policy", () => {
    const policy = policyFrom(SEED_EDITS, { segmentId: "wealth-advice-center", advisorId: "adv-a" });
    // e-001 raised the marketing rule to block at firm level.
    expect(policy.rules.find((r) => r.id === "sec-marketing-206-4-1")!.severity).toBe("block");
    // e-003 tightened the 2210 threshold to 15 for the pooled segment.
    const t = policy.rules.find((r) => r.id === "finra-2210-regime")!.params.find((p) => p.key === "threshold")!;
    expect(t.value).toBe(15);
    // e-004 tried to loosen concentration from 25 to 35 and was refused.
    expect(policy.rules.find((r) => r.id === "finra-2111-suitability")!.params.find((p) => p.key === "maxConcentration")!.value).toBe(25);
    expect(policy.rejected.some((r) => r.field === "maxConcentration" && r.layer === "advisor")).toBe(true);
  });

  it("a segment edit does not reach another segment", () => {
    const other = policyFrom(SEED_EDITS, { segmentId: "private-wealth", advisorId: "adv-b" });
    expect(other.rules.find((r) => r.id === "finra-2210-regime")!.params.find((p) => p.key === "threshold")!.value).toBe(25);
  });

  it("replaying to a timestamp reproduces the policy as it stood", () => {
    const before = policyFrom(SEED_EDITS, { segmentId: "wealth-advice-center", advisorId: "adv-a" }, "2026-09-20T00:00:00Z");
    expect(before.rules.find((r) => r.id === "finra-2210-regime")!.params.find((p) => p.key === "threshold")!.value).toBe(25);
    expect(editsAsOf(SEED_EDITS, "2026-09-20T00:00:00Z")).toHaveLength(2);
  });

  it("an appended edit is in force immediately, with no rebuild", () => {
    const { edits, policy } = appendEdit(SEED_EDITS, {
      actor: "Test principal",
      target: "rule",
      layer: "firm",
      layerId: "firm",
      ruleId: "finra-2111-suitability",
      field: "severity",
      from: "flag",
      to: "block",
      reason: "Test",
    });
    expect(edits).toHaveLength(SEED_EDITS.length + 1);
    expect(policy.rules.find((r) => r.id === "finra-2111-suitability")!.severity).toBe("block");
  });

  it("agent edits fold the same way", () => {
    const edits: RuleEdit[] = [
      { id: "a-1", at: "2026-09-25T10:00:00Z", actor: "T", target: "agent", layer: "firm", layerId: "firm", agentId: "conduct", field: "enabled", from: "true", to: "false", reason: "Cycle closed" },
      { id: "a-2", at: "2026-09-25T10:05:00Z", actor: "T", target: "agent", layer: "firm", layerId: "firm", agentId: "client-protection", field: "addRule", from: "", to: "reg-s-p-safeguards", reason: "Own the privacy rule here" },
    ];
    const agents = agentsFrom(edits);
    expect(agents.find((a) => a.id === "conduct")!.enabled).toBe(false);
    expect(agents.find((a) => a.id === "client-protection")!.ruleIds).toContain("reg-s-p-safeguards");
    // Folding must not mutate the catalog it reads.
    expect(AGENTS.find((a) => a.id === "client-protection")!.ruleIds).not.toContain("reg-s-p-safeguards");
  });

  it("the console's log view marks the refused entry", () => {
    const rows = changeLog(SEED_EDITS);
    expect(rows).toHaveLength(SEED_EDITS.length);
    expect(rows[0].edit.id).toBe("e-004");
    expect(rows.find((r) => r.edit.id === "e-004")!.rejected).toBe(true);
    expect(rows.find((r) => r.edit.id === "e-003")!.rejected).toBe(false);
  });

  it("layers fold in order, firm before segment before advisor", () => {
    const layers = toLayers(editsAsOf(SEED_EDITS), { segmentId: "wealth-advice-center", advisorId: "adv-a" });
    expect(layers.map((l) => l.layer)).toEqual(["firm", "segment", "advisor"]);
  });

  it("every seeded edit gives a reason", () => {
    for (const e of SEED_EDITS) expect(e.reason.length, e.id).toBeGreaterThan(20);
  });
});
