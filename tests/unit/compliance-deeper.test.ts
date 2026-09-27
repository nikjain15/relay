import { describe, it, expect } from "vitest";
import { policyFrom, SEED_EDITS, toLayers, type RuleEdit } from "@/lib/compliance/store";
import { resolvePolicy, BASELINE } from "@/lib/compliance/policy";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import { accountFacts, messageFacts } from "@/lib/compliance/facts";
import { evaluateRule } from "@/lib/compliance/engine";
import { propose, guard, type Proposal } from "@/lib/compliance/propose";
import { replay, replayAll } from "@/lib/compliance/replay";
import { CONNECTORS_DATA, HISTORY, MESSAGES, SNAPSHOTS, clientFile, type CapturedMessage } from "@/lib/data";
import { singleNamePct } from "@/lib/household-math";
import { toHousehold } from "@/lib/data";

const ALL = CONNECTORS_DATA.connections;
const A = "adv-a";
const policyA = () => policyFrom(SEED_EDITS, scopeFor(A));

describe("suitability drift over time, not at a point", () => {
  it("day 0 of the trend is the client file, and the drift is recomputed here from data alone", () => {
    const c = clientFile("hh-thornbury")!;
    const now = Math.round(singleNamePct(toHousehold(c)) * 10) / 10;
    const past = SNAPSHOTS.series.find((s) => s.clientId === c.id)!.concentrationPct;
    const drift = Math.round((now - past[0].pct) * 10) / 10;
    const facts = accountFacts({ client: c, custodianConnected: true, trustedContactOnFile: true, complaintLogged: false, history: past });
    expect(facts.facts.concentrationPct).toBe(now);
    expect(facts.facts.concentrationDriftPts).toBe(drift);
    expect(facts.facts.concentrationHeadroomPts).toBe(Math.round((80 - now) * 10) / 10);
    expect((facts.facts.concentrationHistory as string[]).at(-1)).toBe(`day 0: ${now}%`);
  });

  it("fires on a position rising toward its own ceiling, and not on one that is flat above it", () => {
    const found = sweep(A, policyA(), ALL);
    const drift = found.cases.filter((c) => c.ruleId === "finra-2111-drift");
    expect(drift.map((c) => c.subject).sort()).toEqual(["hh-abernathy", "hh-thornbury"]);
    expect(drift.find((c) => c.subject === "hh-thornbury")!.finding).toMatch(/risen 9\.1 points in 90 days to 77\.1% against the household's 80% ceiling/);
    expect(drift.find((c) => c.subject === "hh-abernathy")!.finding).toMatch(/risen 6\.6 points in 90 days to 38% against the household's 30% ceiling/);
    // Renner is at 71 against 25: breached, not drifting. The point-in-time rule owns that.
    expect(found.cases.some((c) => c.ruleId === "finra-2111-suitability" && c.subject === "hh-renner")).toBe(true);
  });

  it("without a history the drift rule has no fact to read and stays silent, never firing on a guess", () => {
    const c = clientFile("hh-thornbury")!;
    const rule = policyA().rules.find((r) => r.id === "finra-2111-drift")!;
    const facts = accountFacts({ client: c, custodianConnected: true, trustedContactOnFile: true, complaintLogged: false });
    const v = evaluateRule(rule, { facts: facts.facts, availableConnectors: ["custodian-feed"] });
    expect(v.outcome).toBe("clear");
    expect(facts.facts.concentrationDriftPts).toBeUndefined();
  });

  it("the drift threshold can only be tightened from below the firm", () => {
    const loosen: RuleEdit = { id: "x", at: "2026-09-25T00:00:00Z", actor: "t", target: "rule", layer: "advisor", layerId: A, ruleId: "finra-2111-drift", field: "driftPoints", from: "5", to: "8", reason: "t" };
    const tighten: RuleEdit = { ...loosen, id: "y", to: "3" };
    expect(policyFrom([...SEED_EDITS, loosen], scopeFor(A)).rejected.some((r) => r.ruleId === "finra-2111-drift")).toBe(true);
    const p = policyFrom([...SEED_EDITS, tighten], scopeFor(A));
    expect(p.rules.find((r) => r.id === "finra-2111-drift")!.params.find((x) => x.key === "driftPoints")!.value).toBe(3);
  });
});

describe("surveillance over the captured corpus, not just drafts", () => {
  it("sweeps every message on a healthy source and reports the ones on a degraded source as not swept", () => {
    const found = sweep(A, policyA(), ALL);
    const mine = MESSAGES.messages.filter((m) => m.advisorId === A);
    expect(found.messagesScanned + found.messagesNotSwept.length).toBe(mine.length);
    expect(found.messagesNotSwept.map((m) => m.connectorId)).toEqual(["compliant-texting"]);
    expect(found.channelsScanned).toEqual(["email"]);
  });

  it("finds a projection in an outbound email the advisor never submitted for review, and a complaint in an inbound text", () => {
    const a = sweep(A, policyA(), ALL).cases;
    const projection = a.find((c) => c.ruleId === "sec-marketing-206-4-1" && c.subject === "msg-001");
    expect(projection?.reason).toBe("fired");
    expect(projection?.severity).toBe("block");
    expect(a.find((c) => c.ruleId === "finra-3110-correspondence" && c.subject === "msg-001")?.reason).toBe("fired");
    const b = sweep("adv-b", policyFrom(SEED_EDITS, scopeFor("adv-b")), ALL).cases;
    // The complaint rule reads mail records and the pooled advisor's texting source is healthy, so an inbound text is read.
    const complaint = b.find((c) => c.ruleId === "complaint-identification-4513");
    expect(complaint?.subject).toBe("msg-003");
    expect(complaint?.evidence.complaintExcerpt).toMatch(/not what I was told/);
  });

  it("does not queue every clean message as an uncertain clear", () => {
    const found = sweep(A, policyA(), ALL);
    const clean = ["msg-005", "msg-007"];
    expect(found.cases.filter((c) => clean.includes(c.subject))).toEqual([]);
    const m: CapturedMessage = { id: "m-t", advisorId: A, connectorId: "microsoft-365", channel: "email", direction: "outbound", day: -1, text: "See you Thursday." };
    const f = messageFacts(m, { obaOnFile: false, complaintLogged: false, channelApproved: true });
    expect(Object.keys(f.confidence)).toEqual([]);
    const hot = messageFacts({ ...m, text: "This fund will return 8% a year." }, { obaOnFile: false, complaintLogged: false, channelApproved: true });
    expect(hot.confidence.containsProjection).toBeLessThan(1);
  });

  it("outside business language is a fact whether or not its rule is in force; the rule decides", () => {
    const f = messageFacts(MESSAGES.messages.find((m) => m.id === "msg-002")!, { obaOnFile: false, complaintLogged: false, channelApproved: true });
    expect(f.facts.outsideBusinessLanguage).toBe(true);
    const off = policyA().rules.find((r) => r.id === "outside-business-3270")!;
    expect(off.enabled).toBe(false);
    expect(sweep(A, policyA(), ALL).cases.some((c) => c.ruleId === "outside-business-3270")).toBe(false);
    const on: RuleEdit = { id: "on", at: "2026-09-26T00:00:00Z", actor: "t", target: "rule", layer: "firm", layerId: "firm", ruleId: "outside-business-3270", field: "enabled", from: "false", to: "true", reason: "t" };
    const withRule = sweep(A, policyFrom([...SEED_EDITS, on], scopeFor(A)), ALL);
    expect(withRule.cases.find((c) => c.ruleId === "outside-business-3270")?.subject).toBe("msg-002");
  });

  it("a message on an inbound channel never trips an outbound-content rule", () => {
    const inbound = messageFacts({ id: "m-i", advisorId: A, connectorId: "microsoft-365", channel: "email", direction: "inbound", day: -1, text: "Your fund will return 9% a year, right?" }, { obaOnFile: false, complaintLogged: false, channelApproved: true });
    expect(inbound.facts.containsProjection).toBe(false);
  });
});

describe("the proposer drafts rule changes for a principal, stricter only", () => {
  const run = () => propose(policyA(), sweep(A, policyA(), ALL).cases, SEED_EDITS);

  it("proposes enabling an off rule whose language keeps appearing, tightening a threshold that is cleared near the line, and raising a rule that is never cleared", () => {
    const p = run();
    expect(p.proposals.map((x) => x.id).sort()).toEqual([
      "p-enable-outside-business-3270",
      "p-raise-senior-investor-2165",
      "p-tighten-finra-2210-regime-threshold-private-wealth",
    ]);
    const tighten = p.proposals.find((x) => x.id.startsWith("p-tighten"))!;
    expect(tighten).toMatchObject({ layer: "segment", layerId: "private-wealth", field: "threshold", from: "25", to: "20" });
    expect(tighten.evidence.map((e) => e.id).sort()).toEqual(["h-003", "h-004", "h-005"]);
    for (const x of p.proposals) expect(x.evidence.length).toBeGreaterThanOrEqual(2);
  });

  it("never proposes a loosening: the always-cleared pattern becomes an observation that says why it stops there", () => {
    const p = run();
    expect(p.observations.map((o) => o.ruleId)).toEqual(["finra-2111-suitability"]);
    expect(p.observations[0].refusal).toMatch(/only propose in the stricter direction/);
    expect(p.proposals.some((x) => x.ruleId === "finra-2111-suitability")).toBe(false);
  });

  it("every proposal survives the resolver in its own scope, so a principal can accept it as written", () => {
    for (const x of run().proposals) {
      const probe: RuleEdit = { id: "probe", at: "2026-09-26T00:00:00Z", actor: "t", target: "rule", layer: x.layer, layerId: x.layerId, ruleId: x.ruleId, field: x.field, from: x.from, to: x.to, reason: "t" };
      const scope = { segmentId: x.layer === "segment" ? x.layerId : undefined, advisorId: x.layer === "advisor" ? x.layerId : undefined };
      const resolved = resolvePolicy(toLayers([...SEED_EDITS, probe], scope), BASELINE);
      expect(resolved.rejected.some((r) => r.ruleId === x.ruleId && r.field === x.field), x.id).toBe(false);
    }
  });

  it("a proposal that would loosen is dropped by the guard, even if a learner produced it", () => {
    // No learner drafts a loosening, so the guard is fed one directly: it, not the learners, is the invariant.
    const base: Proposal = { id: "p-x", ruleId: "finra-2210-regime", ruleTitle: "t", layer: "segment", layerId: "private-wealth", field: "threshold", from: "25", to: "20", rationale: "t", evidence: [], learner: "planted" };
    expect(guard([base], SEED_EDITS).map((p) => p.id)).toEqual(["p-x"]);
    expect(guard([{ ...base, id: "p-loosen", to: "30" }], SEED_EDITS)).toEqual([]);
    expect(guard([{ ...base, id: "p-soften", field: "severity", from: "block", to: "flag" }], SEED_EDITS)).toEqual([]);
    expect(guard([{ ...base, id: "p-off", ruleId: "finra-2210-regime", field: "enabled", from: "true", to: "false" }], SEED_EDITS)).toEqual([]);
    // And a history that would tempt a move in the wrong direction produces nothing from the learners either.
    const planted = HISTORY.findings.map((f) => (f.ruleId === "finra-2210-regime" ? { ...f, facts: { ...f.facts, recipientCount30d: 30 } } : f));
    expect(propose(policyA(), [], SEED_EDITS, planted).proposals.some((x) => x.ruleId === "finra-2210-regime")).toBe(false);
  });

  it("accepting a proposal is an ordinary edit: the change log carries it and the next evaluation uses it", () => {
    const p = run().proposals.find((x) => x.id === "p-enable-outside-business-3270")!;
    const accepted: RuleEdit = { id: "e-accept", at: "2026-09-26T00:00:00Z", actor: "Principal", target: "rule", layer: p.layer, layerId: p.layerId, ruleId: p.ruleId, field: p.field, from: p.from, to: p.to, reason: p.rationale };
    const after = sweep(A, policyFrom([...SEED_EDITS, accepted], scopeFor(A)), ALL);
    expect(after.cases.some((c) => c.ruleId === "outside-business-3270")).toBe(true);
    // And the proposer stops proposing what is now in force.
    expect(propose(policyFrom([...SEED_EDITS, accepted], scopeFor(A)), after.cases, [...SEED_EDITS, accepted]).proposals.some((x) => x.id === p.id)).toBe(false);
  });
});

describe("replaying a past disposition against the rules as they stood", () => {
  it("reproduces every recorded outcome from the log and the stored facts", () => {
    const all = replayAll(SEED_EDITS);
    expect(all).toHaveLength(HISTORY.findings.length);
    for (const r of all) expect(r.reproduces, r.finding.id).toBe(true);
  });

  it("shows the one finding that would come out differently today, and names the edit that changed it", () => {
    const all = replayAll(SEED_EDITS);
    const drifted = all.filter((r) => !r.sameOutcomeNow);
    expect(drifted.map((r) => r.finding.id)).toEqual(["h-001"]);
    const r = drifted[0];
    expect(r.then.verdict?.outcome).toBe("flag");
    expect(r.now.verdict?.outcome).toBe("block");
    expect(r.changed).toEqual([{ field: "severity", then: "flag", now: "block" }]);
    expect(r.between.map((e) => e.id)).toEqual(["e-001"]);
  });

  it("a finding raised before an edit is replayed without it, one raised after is replayed with it", () => {
    const before = replay(HISTORY.findings.find((f) => f.id === "h-001")!, SEED_EDITS);
    const after = replay(HISTORY.findings.find((f) => f.id === "h-002")!, SEED_EDITS);
    expect(before.then.rule?.severity).toBe("flag");
    expect(after.then.rule?.severity).toBe("block");
    expect(after.between).toEqual([]);
  });

  it("an undo in the session changes the replay, because the log is the state", () => {
    const withoutE1 = SEED_EDITS.filter((e) => e.id !== "e-001");
    const r = replay(HISTORY.findings.find((f) => f.id === "h-002")!, withoutE1);
    expect(r.then.verdict?.outcome).toBe("flag");
    expect(r.reproduces).toBe(false);
  });
});
