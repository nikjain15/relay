// Stress run (audit R-21, area D). Generates 1,000 clients, 50 advisors and
// 20,000 behavior events in memory, writes the fixture to the OS temp folder
// (never to data/, never committed), swaps it into the loaded data, then times
// the resolver, the learning loop, ranking and server renders of the busiest
// pages, and exercises malformed data and empty states.
// Usage: npm run stress
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { performance } from "node:perf_hooks";
import { renderToString } from "react-dom/server";
import type { ReactElement } from "react";
import { ADVISORS_DATA, ALL_OPPORTUNITIES, CLIENTS, PROSPECTS, SERVICE_REQUESTS, SNAPSHOTS, MESSAGES, HISTORY, CONNECTORS_DATA, ADVISOR_INPUTS, toHousehold } from "@/lib/data";
import { briefAll } from "@/lib/research/brief";
import { retrieve } from "@/lib/evidence/retrieve";
import { sweep } from "@/lib/compliance/sweep";
import { propose } from "@/lib/compliance/propose";
import { replayAll } from "@/lib/compliance/replay";
import { policyFrom, SEED_EDITS } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import ResearchPage from "@/app/research/page";
import DocumentsPage from "@/app/documents/page";
import BriefingPage from "@/app/research/[id]/page";
import { HOUSEHOLDS } from "@/lib/fixtures/households";
import type { Advisor } from "@/lib/data/advisor";
import { ADVISOR_PROFILES, resolveProfile } from "@/lib/profile";
import { EVENTS, suggest, type BehaviorEvent } from "@/lib/learning/learn";
import { rank } from "@/lib/ranking/rank";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { validate } from "@/lib/data/validate";
import { reviewPack } from "@/lib/meetings/prep";
import { allTasks } from "@/lib/followups";
import type { ClientFile, TriggerClass } from "@/lib/types";
import { StateProvider } from "@/components/state";
import ClientsPage from "@/app/clients/page";
import OnboardingPage from "@/app/onboarding/page";
import JourneyPage from "@/app/page";
import ServicingPage from "@/app/servicing/page";
import MeetingsPage from "@/app/meetings/page";
import FollowUpsPage from "@/app/follow-ups/page";
import TriagePage from "@/app/triage/page";
import HouseholdPage from "@/app/household/[id]/page";
import ReviewPackPage from "@/app/meetings/[id]/page";

const N_CLIENTS = 1000, N_ADVISORS = 50, N_EVENTS = 20_000;
const CLASSES: TriggerClass[] = ["life_event", "external_event", "household_threshold", "plan_service_event", "market_view"];
const rows: { what: string; ms: number; note?: string }[] = [];
const problems: string[] = [];
const time = <T,>(what: string, f: () => T, note?: (r: T) => string): T => {
  const t = performance.now();
  const r = f();
  rows.push({ what, ms: Math.round((performance.now() - t) * 10) / 10, note: note?.(r) });
  return r;
};
const render = (el: ReactElement) => renderToString(<StateProvider>{el}</StateProvider>);
let seed = 42;
const rnd = () => ((seed = (seed * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31);

// 1. Generate.
const template = CLIENTS.find((c) => c.walkthrough)!;
const advisors: Advisor[] = Array.from({ length: N_ADVISORS }, (_, a) => ({
  ...ADVISORS_DATA[a % ADVISORS_DATA.length],
  id: `adv-s${a}`,
  name: `Advisor S${a}`,
  walkthrough: { ...ADVISORS_DATA[0].walkthrough!, label: `Advisor S${a}`, meetings: [] },
}));
const clients: ClientFile[] = Array.from({ length: N_CLIENTS }, (_, i) => {
  const spend = 5_000 + Math.floor(rnd() * 80) * 1_000;
  const cashMonths = Math.floor(rnd() * 30);
  const core = 1_000_000 + Math.floor(rnd() * 50) * 100_000;
  const cash = cashMonths * spend;
  const id = `hh-s${i}`;
  // Unicode names and very long text, on purpose.
  const name = i % 7 === 0 ? `Ødegård-李-${i}` : `Stress ${i}`;
  return {
    ...template,
    id, name, advisorId: `adv-s${i % N_ADVISORS}`,
    totalUsd: core + cash, monthlySpendUsd: spend,
    hardPart: i % 11 === 0 ? "A very long note about this family's situation. ".repeat(200) : template.hardPart,
    persons: [{ id: `p-s${i}-1`, name: `${name} A`, role: "primary" }, { id: `p-s${i}-2`, name: `${name} B`, role: "spouse" }],
    holdings: [{ name: "Core", productId: "prod-core-model", valueUsd: core, singleName: false }, { name: "Cash", productId: "prod-mmf", valueUsd: cash, singleName: false }],
    goals: [{ strategy: "Liquidity", funded: cashMonths, target: 24, unit: "months", assumption: "24 months" }],
    constraints: [{ kind: "maxRiskLevel", level: 3 }, { kind: "minLiquidityMonths", months: 12 }],
    contactHistory: [], notes: [], tasks: i % 3 ? [{ text: `Task ${i}`, owner: "Advisor", dueDay: (i % 20) - 10 }] : [],
    paperwork: i % 4 ? [{ form: `Form ${i}`, requestedDay: -(i % 30) }] : [],
    preferences: { version: 1, values: {} },
    walkthrough: undefined,
    opportunities: Array.from({ length: 2 }, (_, k) => ({
      ...template.opportunities[0],
      id: `opp-s${i}-${k}`, householdId: id, inflowUsd: undefined, outflowUsd: undefined,
      action: k ? "review" : "fund", strategy: "Liquidity",
      triggerClass: CLASSES[(i + k) % 5], materiality: Math.floor(rnd() * 100),
      evidenceDocIds: ["doc-liquidity-note"], evidenceExpectedMissing: undefined,
    })),
  } as ClientFile;
});
const events: BehaviorEvent[] = Array.from({ length: N_EVENTS }, (_, e) => {
  const c = clients[Math.floor(rnd() * N_CLIENTS)];
  const day = -Math.floor(rnd() * 45);
  const t = e % 6;
  if (t === 0) return { day, advisorId: c.advisorId, clientId: c.id, type: "triage_decision", triggerClass: CLASSES[e % 5], decision: rnd() < 0.8 ? "dismissed" : "acted", reason: "Not material for this household" };
  if (t === 1) return { day, advisorId: c.advisorId, type: "day_end", worked: Math.floor(rnd() * 8) };
  if (t === 2) return { day, advisorId: c.advisorId, clientId: c.id, type: "option_chosen", chosen: rnd() < 0.8 ? "cheapest" : "other" };
  if (t === 3) return { day, advisorId: c.advisorId, clientId: c.id, type: "draft_edited", change: rnd() < 0.8 ? "shortened" : "unchanged" };
  if (t === 4) return { day, advisorId: c.advisorId, clientId: c.id, type: "pack_opened", firstSection: "decisions" };
  return { day, advisorId: c.advisorId, clientId: c.id, type: "client_response", channel: rnd() < 0.8 ? "call" : "email", responded: rnd() < 0.7 };
});
const dir = mkdtempSync(join(tmpdir(), "relay-stress-"));
writeFileSync(join(dir, "fixture.json"), JSON.stringify({ advisors, clients, events }));
console.log(`Fixture: ${dir}/fixture.json (${N_CLIENTS} clients, ${N_ADVISORS} advisors, ${N_EVENTS} events; not in the repo)`);

// 2. Swap it into the loaded data (in memory only).
const saved = { clients: [...CLIENTS], advisors: [...ADVISORS_DATA], profiles: [...ADVISOR_PROFILES], events: [...EVENTS] };
CLIENTS.splice(0, CLIENTS.length, ...clients);
HOUSEHOLDS.splice(0, HOUSEHOLDS.length, ...clients.map(toHousehold));
ALL_OPPORTUNITIES.splice(0, ALL_OPPORTUNITIES.length, ...clients.flatMap((c) => c.opportunities));
ADVISORS_DATA.splice(0, ADVISORS_DATA.length, ...advisors, { ...ADVISORS_DATA[0], id: "adv-empty", name: "Advisor with no clients", walkthrough: { ...ADVISORS_DATA[0].walkthrough!, label: "Advisor with no clients", meetings: [] } });
ADVISOR_PROFILES.splice(0, ADVISOR_PROFILES.length, ...ADVISORS_DATA.map((a, i) => ({ advisorId: a.id, segmentId: i % 2 ? "wealth-advice-center" : "private-wealth", version: 1, learning: true, values: {} })));
EVENTS.splice(0, EVENTS.length, ...events);
PROSPECTS.splice(0, PROSPECTS.length);
SERVICE_REQUESTS.splice(0, SERVICE_REQUESTS.length);
// The compliance data the deeper agents read points at the shipped clients; swap in fixture-scale equivalents.
SNAPSHOTS.series.splice(0, SNAPSHOTS.series.length);
HISTORY.findings.splice(0, HISTORY.findings.length);
ADVISOR_INPUTS.advisors.splice(0, ADVISOR_INPUTS.advisors.length, ...advisors.map((a) => ({ advisorId: a.id, obaOnFile: false })));
MESSAGES.messages.splice(0, MESSAGES.messages.length, ...clients.flatMap((c, i) => Array.from({ length: 2 }, (_, k) => ({
  id: `msg-s${i}-${k}`, advisorId: c.advisorId, clientId: c.id, connectorId: "microsoft-365", channel: "email",
  direction: k ? ("inbound" as const) : ("outbound" as const), day: -(i % 30),
  text: i % 9 === 0 ? "This fund will return 8% a year, I'd suggest we place it all there." : `Message ${i} ${k}. `.repeat(1 + (i % 40)),
}))));
const stressConnections = advisors.flatMap((a) => [{ connectorId: "microsoft-365", advisorId: a.id, status: "connected" as const }, { connectorId: "custodian-feed", advisorId: a.id, status: "connected" as const }]);
CONNECTORS_DATA.connections.splice(0, CONNECTORS_DATA.connections.length, ...stressConnections);

// 3. Time the engines.
// app.json still points at the shipped demo client and advisor, which the fixture replaces; those are the only expected errors.
time("validate() over the fixture", () => validate().filter((e) => !e.startsWith("app.json")), (e) => {
  if (e.length) problems.push(`validate() on a well-formed fixture: ${e.length} errors, first: ${e[0]}`);
  return `${e.length} unexpected errors`;
});
time(`resolveProfile for ${N_CLIENTS} clients`, () => clients.map((c) => resolveProfile({ clientId: c.id })));
time(`suggest() over ${N_EVENTS} events`, () => suggest({ events }), (s) => `${s.length} suggestions`);
time(`rank, each of ${N_ADVISORS} advisors`, () => advisors.map((a) => { const p = resolveProfile({ advisorId: a.id }).values; return rank(clients.filter((c) => c.advisorId === a.id).flatMap((c) => c.opportunities), new Set(), p["triage.dailyCap"], p["triage.classWeights"]); }), (r) => `${r.reduce((s, x) => s + x.length, 0)} rows`);
time(`evaluateAll, every opportunity (${N_CLIENTS * 2})`, () => clients.flatMap((c) => c.opportunities.map((o) => evaluateAll(o, toHousehold(c)))), (r) => `${r.flat().length} candidates`);
time(`reviewPack for ${N_CLIENTS} clients`, () => clients.map((c) => reviewPack(c.id)));
time("allTasks()", () => allTasks(), (t) => `${t.length} tasks`);
time(`retrieve, every opportunity (${N_CLIENTS * 2})`, () => clients.flatMap((c) => c.opportunities.map((o) => retrieve(o))), (r) => `${r.filter((x) => !x.refused).length} with evidence`);
time(`brief() for ${N_CLIENTS} clients`, () => briefAll(), (b) => `${b.reduce((s, x) => s + x.unknowns.length, 0)} unknowns`);
time(`sweep, each of ${N_ADVISORS} advisors, ${N_CLIENTS * 2} messages`, () => advisors.map((a) => sweep(a.id, policyFrom(SEED_EDITS, scopeFor(a.id)), CONNECTORS_DATA.connections)), (r) => `${r.reduce((s, x) => s + x.cases.length, 0)} cases, ${r.reduce((s, x) => s + x.messagesScanned, 0)} messages swept`);
time("propose() with an empty history", () => propose(policyFrom(SEED_EDITS, scopeFor(advisors[0].id)), [], SEED_EDITS), (p) => `${p.proposals.length} proposals`);
time("replayAll() with an empty history", () => replayAll(SEED_EDITS), (r) => `${r.length} replays`);

// 4. Time server renders of the busiest pages.
const pages: [string, () => ReactElement | Promise<ReactElement>][] = [
  ["/ (journey)", () => <JourneyPage />],
  ["/clients", () => <ClientsPage />],
  ["/onboarding", () => <OnboardingPage />],
  ["/servicing", () => <ServicingPage />],
  ["/meetings", () => <MeetingsPage />],
  ["/follow-ups", () => <FollowUpsPage />],
  ["/triage", () => <TriagePage />],
  ["/household/[unicode, long text]", () => HouseholdPage({ params: Promise.resolve({ id: "hh-s0" }) })],
  ["/research (1000 briefings)", () => <ResearchPage />],
  ["/research/[unicode, long text]", () => BriefingPage({ params: Promise.resolve({ id: "hh-s0" }) })],
  ["/documents", () => <DocumentsPage />],
];
for (const [name, el] of pages) {
  try {
    const node = await el();
    time(`render ${name}`, () => render(node), (h) => `${Math.round(h.length / 1024)} KB`);
  } catch (e) {
    problems.push(`render ${name}: ${(e as Error).message}`);
  }
}

// 5. Empty states: an advisor with no clients; a client with no opportunities, paperwork, meetings or tasks.
const empty = { ...clients[1], id: "hh-empty", opportunities: [], paperwork: [], tasks: [], contactHistory: [], notes: [] } as ClientFile;
CLIENTS.push(empty);
HOUSEHOLDS.push(toHousehold(empty));
for (const [name, f] of [
  ["household page, empty client", () => HouseholdPage({ params: Promise.resolve({ id: "hh-empty" }) })],
  ["review pack, empty client", () => ReviewPackPage({ params: Promise.resolve({ id: "hh-empty" }) })],
] as const) {
  try { render(await f()); } catch (e) { problems.push(`${name}: ${(e as Error).message}`); }
}
try {
  const html = render(<ClientsPage />);
  if (!html.includes("Advisor with no clients")) problems.push("clients page: the advisor with no clients is missing");
  if (!html.includes("No clients yet")) problems.push("clients page: an advisor with no clients shows an empty table with no message");
} catch (e) { problems.push(`clients page with an empty advisor: ${(e as Error).message}`); }

// 6. Malformed data: each must be reported by validate(), never crash it.
const baseline = new Set(validate());
const bad: [string, (c: ClientFile) => void][] = [
  ["missing field", (c) => { delete (c as Partial<ClientFile>).monthlySpendUsd; }],
  ["bad advisor id", (c) => { c.advisorId = "adv-nope"; }],
  ["bad client id", (c) => { c.id = "HH Nope é"; }],
  ["no persons", (c) => { c.persons = []; }],
];
for (const [name, mutate] of bad) {
  const c = structuredClone(clients[2]);
  mutate(c);
  CLIENTS.splice(2, 1, c);
  try {
    const e = validate().filter((x) => !baseline.has(x));
    if (!e.length) problems.push(`malformed (${name}): validate() did not report it`);
  } catch (err) {
    problems.push(`malformed (${name}): validate() threw ${(err as Error).message}`);
  }
  CLIENTS.splice(2, 1, clients[2]);
}

// 7. Restore and report.
CLIENTS.splice(0, CLIENTS.length, ...saved.clients);
ADVISORS_DATA.splice(0, ADVISORS_DATA.length, ...saved.advisors);
ADVISOR_PROFILES.splice(0, ADVISOR_PROFILES.length, ...saved.profiles);
EVENTS.splice(0, EVENTS.length, ...saved.events);
console.log("\n| Step | ms | Result |\n|---|---:|---|");
for (const r of rows) console.log(`| ${r.what} | ${r.ms} | ${r.note ?? ""} |`);
const slow = rows.filter((r) => r.ms > 2000);
for (const r of slow) problems.push(`slow: ${r.what} took ${r.ms} ms`);
console.log(problems.length ? `\nProblems:\n- ${problems.join("\n- ")}` : "\nNo problems.");
process.exit(problems.length ? 1 : 0);
