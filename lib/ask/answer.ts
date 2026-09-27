// Ask: a question in plain words, an answer from the records, cited.
//
// An advisor mid-morning does not open six screens to learn one thing about
// one household. They ask. This module answers from the same data every screen
// reads: the book, the sweep's findings, the prepared actions, the rules, the
// agents, the connected sources, today's meetings. Every answer names the
// records it read and links to the screen that shows them, so it can be
// checked rather than trusted.
//
// This is the deterministic version: intent is matched by words, the answer is
// assembled from figures the engines computed, and the phrasing is fixed. In
// production a model would read the question and phrase the answer; it would
// still take every figure from here, and it would still decide nothing.
//
// Deterministic. No model client may be imported here.
import type { ClientFile, Doc } from "@/lib/types";
import type { Case, AgentDefinition } from "@/lib/compliance/agents";
import type { PreparedAction } from "@/lib/compliance/actions";
import type { ResolvedPolicy } from "@/lib/compliance/policy";
import type { ConnectionState } from "@/lib/connectors/types";
import { explain, paramMap } from "@/lib/compliance/dsl";
import { coverageFor } from "@/lib/connectors/coverage";
import { CATALOG } from "@/lib/connectors/catalog";
import { liquidityMonths, singleNamePct, singleNameUsd } from "@/lib/household-math";
import { meetingFor, todaysMeetings } from "@/lib/meetings/prep";
import { openItems } from "@/lib/onboarding/status";
import { corpusStates } from "@/lib/evidence/corpus";
import { CONNECTORS_DATA, ADVISORS_DATA } from "@/lib/data";
import { usd, pct } from "@/lib/format";

export interface Cite { label: string; record: string; href?: string }
export interface Answer {
  text: string;
  cites: Cite[];
  /** Where to go next. */
  links: { label: string; href: string }[];
  /** What answered it: the engine or the record, in words. */
  via: string;
  /** Under 1 when the answer rests on an inference or a partial read. */
  confidence: number;
  followUps: string[];
}

export interface AskContext {
  advisorId: string;
  clients: ClientFile[];
  documents: Doc[];
  cases: Case[];
  actions: PreparedAction[];
  policy: ResolvedPolicy;
  agents: AgentDefinition[];
  connections: ConnectionState[];
}

const rec = (c: ClientFile, field: string): string => `data/clients/${c.id}.json#${field}`;
const days = (d: number) => (d === 0 ? "today" : d === -1 ? "yesterday" : `${-d} days ago`);
const surname = (name: string) => name.replace(/\b(family|household)\b/gi, "").replace(/^[A-Z]\.\s*/, "").trim();

/** The household a question is about, by any word of its name. */
export function householdIn(q: string, clients: ClientFile[]): ClientFile | undefined {
  // Possessives and hyphens split: "Smith's goals" names Smith, "Lee-Park" names Lee and Park.
  const words: string[] = q.toLowerCase().replace(/['\u2019]s\b/g, "").match(/[a-z]+/g) ?? [];
  let best: { c: ClientFile; len: number } | undefined;
  for (const c of clients) {
    const all = surname(c.name).toLowerCase().split(/[\s-]+/).filter(Boolean);
    // A two-letter surname counts when it is the whole name; otherwise short parts are initials.
    const parts = all.filter((p) => p.length > 2 || all.length === 1);
    for (const p of parts) if (words.includes(p) && (!best || p.length > best.len)) best = { c, len: p.length };
  }
  return best?.c;
}

const has = (q: string, re: RegExp) => re.test(q);

/** Singular and plural nouns for a prepared action, so a count reads as English. */
const ACTION_NOUN: Record<PreparedAction["kind"], [string, string]> = {
  hold: ["hold", "holds"], callback: ["callback", "callbacks"], request_form: ["form request", "form requests"], task: ["task", "tasks"],
  draft_note: ["drafted note", "drafted notes"], schedule: ["meeting to schedule", "meetings to schedule"], connect_source: ["source to connect", "sources to connect"],
};

/** Not captured (nothing reads it) and not retained (read, no retained copy) are different claims. */
function captureLine(gaps: { channel: string; status: string }[]): string {
  const none = gaps.filter((g) => g.status === "gap").map((g) => g.channel);
  const partial = gaps.filter((g) => g.status === "partial").map((g) => g.channel);
  if (!none.length && !partial.length) return "every channel you use is captured";
  return [
    none.length ? `${none.length} channel${none.length === 1 ? "" : "s"} you use not captured (${none.join(", ")})` : "",
    partial.length ? `${partial.length} captured without a retained copy (${partial.join(", ")})` : "",
  ].filter(Boolean).join(", and ");
}

export function answer(question: string, ctx: AskContext): Answer {
  const q = question.trim().toLowerCase();
  const advisor = ADVISORS_DATA.find((a) => a.id === ctx.advisorId);
  const mine = ctx.clients.filter((c) => c.advisorId === ctx.advisorId);
  const done = (a: Partial<Answer> & { text: string }): Answer => ({ cites: [], links: [], via: "the book", confidence: 1, followUps: [], ...a });

  const tips = suggestions(ctx.clients, ctx.advisorId);
  if (!q) return done({ text: "Ask about a household by name, about what needs you today, about a desk, a rule, a source or a document.", followUps: tips.slice(0, 4) });

  // Anything that asks Relay to act on the outside world.
  if (has(q, /\b(send|email|text|post|submit|execute|trade|transfer|wire|book (it|the)|schedule it)\b/) && !has(q, /\bwhat|why|which|how many|when\b/)) {
    return done({ text: "Relay never sends, trades, posts or writes to a record. It prepares; you act from your own tools. The drafted note or task is on the supervision queue for you to accept.", links: [{ label: "Supervision", href: "/supervision" }], via: "the never-sends invariant" });
  }

  const c = householdIn(q, ctx.clients);
  if (c) return aboutHousehold(q, c, ctx);

  if (has(q, /\bmeeting|calendar|who am i (seeing|meeting)\b/)) {
    const m = todaysMeetings(ctx.advisorId);
    return done({ text: m.length ? `${m.length} today: ${m.map((x) => `${x.time} ${x.title}${x.purpose ? ` (${x.purpose})` : ""}`).join("; ")}. Review packs are built for each client meeting.` : "No meetings today.", links: [{ label: "Meetings", href: "/meetings" }], via: "today's calendar", cites: [{ label: "Calendar", record: `data/advisors/${ctx.advisorId}.json#walkthrough.meetings` }], followUps: m.filter((x) => x.clientId).slice(0, 2).map((x) => `What changed for ${ctx.clients.find((k) => k.id === x.clientId)?.name ?? "the client"} since we last spoke?`) });
  }

  // Today, in order.
  if (has(q, /\b(what (should|do) i|first|start|priorit|today|this morning|needs? (me|you)|worst)\b/)) {
    const blocking = ctx.cases.filter((k) => k.severity === "block" && k.reason === "fired");
    const gaps = coverageFor(ctx.advisorId, ctx.connections, CONNECTORS_DATA.attestations).gaps;
    const meetings = todaysMeetings(ctx.advisorId);
    const parts = [
      blocking.length ? `${blocking.length} blocking finding${blocking.length === 1 ? "" : "s"}: ${blocking.slice(0, 2).map((k) => `${k.ruleTitle} on ${k.subjectLabel}`).join("; ")}` : "no blocking finding",
      captureLine(gaps),
      `${ctx.actions.length} prepared action${ctx.actions.length === 1 ? "" : "s"} waiting`,
      meetings.length ? `${meetings.length} meetings, the first at ${meetings[0].time}` : "no meetings",
    ];
    return done({ text: `In order: ${parts.join("; ")}.`, links: [{ label: "The morning inbox", href: "/" }, { label: "Supervision", href: "/supervision" }], via: "the sweep, the coverage report and today's calendar", cites: blocking.slice(0, 2).map((k) => ({ label: k.ruleTitle, record: `data/compliance/rules.json#${k.ruleId}`, href: `/compliance#${k.ruleId}` })), followUps: ["Which findings are blocking?", "What did the agents prepare?", "Who am I meeting today?"] });
  }

  if (has(q, /\b(finding|blocking|flag|raised|open cases?|compliance issue)/) && !has(q, /\bmeeting/)) {
    const by = new Map<string, number>();
    for (const k of ctx.cases) by.set(k.agentName, (by.get(k.agentName) ?? 0) + 1);
    const blocking = ctx.cases.filter((k) => k.severity === "block" && k.reason === "fired");
    return done({ text: ctx.cases.length ? `${ctx.cases.length} open finding${ctx.cases.length === 1 ? "" : "s"}, ${blocking.length} blocking. By desk: ${[...by.entries()].map(([a, n]) => `${a} ${n}`).join(", ")}. ${blocking.length ? `Blocking: ${blocking.map((k) => `${k.ruleTitle} (${k.subjectLabel})`).join("; ")}.` : ""}` : "No open findings.", links: [{ label: "Supervision", href: "/supervision" }], via: "the sweep", cites: blocking.map((k) => ({ label: k.ruleTitle, record: `data/compliance/rules.json#${k.ruleId}`, href: `/compliance#${k.ruleId}` })), followUps: ["What did the agents prepare?", "Which sources are not connected?"] });
  }

  if (has(q, /\b(prepar\w*|draft\w*|actions?|waiting on me|to accept)\b/)) {
    const by = new Map<PreparedAction["kind"], number>();
    for (const a of ctx.actions) by.set(a.kind, (by.get(a.kind) ?? 0) + 1);
    return done({ text: ctx.actions.length ? `${ctx.actions.length} prepared and waiting: ${[...by.entries()].map(([k, n]) => `${n} ${n === 1 ? ACTION_NOUN[k][0] : ACTION_NOUN[k][1]}`).join(", ")}. Accepting sends nothing; you act.` : "Nothing prepared is waiting.", links: [{ label: "Review them", href: "/" }], via: "the prepared actions on every open finding", followUps: ["Which findings are blocking?"] });
  }

  const agent = ctx.agents.find((a) => q.includes(a.name.toLowerCase()) || q.includes(a.desk.toLowerCase()) || a.authorities.some((x) => q.includes(x.toLowerCase())));
  if (agent) {
    const mineCases = ctx.cases.filter((k) => k.agentId === agent.id);
    const rules = ctx.policy.rules.filter((r) => agent.ruleIds.includes(r.id));
    return done({ text: `${agent.desk} (${agent.name}) mirrors ${agent.mirrors.toLowerCase()} It runs ${agent.cadence.replace("_", " ")} over ${rules.length} rule${rules.length === 1 ? "" : "s"}: ${rules.map((r) => r.title).join("; ")}. ${mineCases.length ? `${mineCases.length} open finding${mineCases.length === 1 ? "" : "s"}.` : "Nothing open."}`, links: [{ label: `Open the desk`, href: `/agents/${agent.id}` }], via: "the agent catalogue and the sweep", cites: [{ label: agent.desk, record: `data/compliance/agents.json#${agent.id}`, href: `/agents/${agent.id}` }], followUps: [`How do I make ${agent.name.toLowerCase()} run more often?`, "Can I add a rule from our policy?"] });
  }

  if (has(q, /\b(add a rule|policy|procedure|tune|edit (an|the) agent|change (a|the) desk|more often|cadence)\b/)) {
    return done({ text: "Open a desk and use Tune to run it more often or give it another rule of its scope; a lower layer can only tighten. To add rules from a written policy, paste the document on the same page: each sentence with an obligation becomes a candidate rule cited to the sentence, and you add the ones the firm meant.", links: [{ label: "Agent status", href: "/agents" }, { label: "Rules and agents", href: "/compliance" }], via: "the change log and the policy reader" });
  }

  const rule = ctx.policy.rules.find((r) => q.includes(r.title.toLowerCase().slice(0, 24)) || (r.citation.match(/\d{4}|\d\(\d\)-\d/) && q.includes(r.citation.match(/\d{4}|\d\(\d\)-\d/)![0])));
  if (rule) {
    return done({ text: `${rule.title} (${rule.authority}, ${rule.citation}) fires when ${explain(rule.when, paramMap(rule)).replace(/\n\s*/g, " ")}. Severity ${rule.severity}${rule.mandatory ? ", firm-mandatory" : ""}${rule.requires.length ? `; needs ${rule.requires.join(", ")}` : ""}.`, links: [{ label: "The rule", href: `/compliance#${rule.id}` }], via: "the rule as resolved for this advisor", cites: [{ label: rule.title, record: `data/compliance/rules.json#${rule.id}`, href: `/compliance#${rule.id}` }] });
  }

  if (has(q, /\b(connect|source|channel|captur|gap|integrat|crm|custodian|redtail|salesforce|schwab|fidelity|orion)/)) {
    const report = coverageFor(ctx.advisorId, ctx.connections, CONNECTORS_DATA.attestations);
    const connected = ctx.connections.filter((s) => s.advisorId === ctx.advisorId && s.status === "connected").map((s) => CATALOG.find((k) => k.id === s.connectorId)?.name ?? s.connectorId);
    const named = CATALOG.find((k) => q.includes(k.name.toLowerCase()) || q.includes(k.vendor.toLowerCase().split(" ")[0]));
    const namedLine = named ? ` ${named.name} (${named.vendor}) reads ${named.summary.toLowerCase().replace(/\.$/, "")}; ${ctx.connections.some((s) => s.advisorId === ctx.advisorId && s.connectorId === named.id && s.status === "connected") ? "it is connected." : "it is in the catalogue and not connected."}` : "";
    return done({ text: `${connected.length} sources connected: ${connected.join(", ")}. ${captureLine(report.gaps).replace(/^./, (x) => x.toUpperCase())}.${namedLine} Relay reads in place and writes nothing back.`, links: [{ label: "Sources", href: "/sources" }], via: "the coverage report", cites: [{ label: "Connections", record: `data/advisors/${ctx.advisorId}.json#connections`, href: "/sources" }] });
  }

  if (has(q, /\b(documents?|cite|quote|research notes?|library|stale|review date|one-?pager)\b/)) {
    const states = corpusStates();
    const stale = states.filter((d) => d.usable && d.freshness === "stale");
    return done({ text: `${states.filter((d) => d.usable).length} documents may be quoted; ${stale.length} past review date${stale.length ? ` (${stale.map((d) => d.doc.title).join("; ")})` : ""}. A note cites only passages from current documents.`, links: [{ label: "The library", href: "/documents" }], via: "the corpus states", cites: stale.map((d) => ({ label: d.doc.title, record: `data/documents/${d.doc.id}.json`, href: `/documents/${d.doc.id}` })) });
  }

  if (has(q, /\b(how many|book|households|clients)\b/)) {
    const total = mine.reduce((s, k) => s + k.totalUsd, 0);
    const quiet = mine.filter((k) => -Math.max(...k.contactHistory.map((e) => e.day), -9999) > 90);
    return done({ text: `${mine.length} households in ${advisor?.name ?? "your"}'s book on screen, ${usd(total)} in total. ${quiet.length} not spoken to in 90 days${quiet.length ? `: ${quiet.map((k) => k.name).join(", ")}` : ""}.`, links: [{ label: "Households", href: "/clients" }], via: "the book", followUps: quiet.slice(0, 2).map((k) => `When did I last speak to ${surname(k.name)}?`) });
  }

  if (has(q, /\b(what can you|help|how do i|what do you)\b/)) {
    return done({ text: "Ask about a household by name (cash cover, concentration, last contact, findings, forms, what they said), about today (what first, meetings, findings, prepared actions), about a desk or a rule, about sources, or about documents. Every answer cites the record it read.", followUps: tips.slice(0, 5) });
  }

  return done({ text: `I could not match that to a household, a desk, a rule or a source. I answer from the records, so name one: for example "${tips[1]}".`, confidence: 0, followUps: tips.slice(0, 4), via: "nothing yet" });
}

function aboutHousehold(q: string, c: ClientFile, ctx: AskContext): Answer {
  const base = { links: [{ label: `${c.name} household`, href: `/household/${c.id}` }, { label: "Briefing", href: `/research/${c.id}` }] };
  const done = (a: Partial<Answer> & { text: string }): Answer => ({ cites: [], via: "the client file", confidence: 1, followUps: [], ...base, ...a });
  const liq = c.goals.find((g) => g.strategy === "Liquidity");
  const months = liquidityMonths(c);
  const cap = c.constraints.find((k) => k.kind === "maxSingleName");
  const capPct = cap?.kind === "maxSingleName" ? cap.pct : undefined;
  const last = [...c.contactHistory].sort((a, b) => b.day - a.day)[0];
  const cases = ctx.cases.filter((k) => k.subject === c.id);

  if (has(q, /\b(cash|liquidity|cover|months|reserve)\b/)) {
    return done({ text: `${c.name}: Liquidity covers ${months} months of ${usd(c.monthlySpendUsd)} a month spending${liq?.unit === "months" ? `, against a ${liq.target}-month target${months < liq.target ? `, so ${liq.target - months} months short` : ", met"}` : ""}.`, cites: [{ label: "Holdings", record: rec(c, "holdings") }, { label: "Liquidity goal", record: rec(c, "goals[0]") }, { label: "Spending", record: rec(c, "monthlySpendUsd") }], via: "household arithmetic over the holdings", followUps: [`What are the options for ${surname(c.name)}?`] });
  }
  if (has(q, /\b(concentrat\w*|single name|single-name|stocks?|positions?|holdings?)\b/)) {
    const sn = singleNameUsd(c) ? singleNamePct(c) : 0;
    const name = c.holdings.find((h) => h.singleName)?.name;
    return done({ text: singleNameUsd(c) ? `${c.name}: ${pct(sn)} of the household in one name${name ? ` (${name})` : ""}${capPct !== undefined ? `, against the family's ${capPct}% rule${sn > capPct ? `, so ${pct(sn - capPct)} over` : ", within it"}` : ""}.` : `${c.name} holds no single-name position.`, cites: [{ label: "Holdings", record: rec(c, "holdings") }, ...(capPct !== undefined ? [{ label: "Concentration rule", record: rec(c, "constraints") }] : [])], via: "household arithmetic over the holdings", followUps: [`What are the options for ${surname(c.name)}?`, `Any findings on ${surname(c.name)}?`] });
  }
  if (has(q, /\b(changed|what'?s new|anything new|happened|updates?)\b/)) {
    const notes = [...c.notes].sort((a, b) => b.day - a.day).slice(0, 2);
    const opps = c.opportunities.slice(0, 2);
    return done({ text: `Since ${last ? days(last.day) : "the file was opened"}: ${[...opps.map((o) => `${o.plainTitle ?? o.title} (seen day ${o.observedDay} of the feed)`), ...notes.map((n) => `${n.from} noted ${days(n.day)}: "${n.text.slice(0, 90)}${n.text.length > 90 ? "..." : ""}"`)].join("; ") || "nothing new on file"}.`, cites: [...opps.map((o, i) => ({ label: o.plainTitle ?? o.title, record: rec(c, `opportunities[${i}]`), href: `/evidence/${o.id}` })), ...notes.map((n) => ({ label: `Note, ${days(n.day)}`, record: rec(c, `notes[${c.notes.indexOf(n)}]`) }))], via: "the research agent's briefing inputs", followUps: [`Any findings on ${surname(c.name)}?`] });
  }
  if (has(q, /\b(last (spoke|spoken|talk\w*|contact\w*|call\w*|met)|when did|since we)\b/)) {
    return done({ text: last ? `Last contact with ${c.name} was ${days(last.day)} by ${last.channel}: ${last.summary}` : `No contact is logged for ${c.name}.`, cites: last ? [{ label: "Contact history", record: rec(c, `contactHistory[${c.contactHistory.indexOf(last)}]`) }] : [], via: "the contact history", followUps: [`What changed for ${surname(c.name)} since we last spoke?`] });
  }
  if (has(q, /\b(meeting|today|agenda)\b/)) {
    const m = meetingFor(c.id);
    return done({ text: m ? `${m.time} ${m.title}${m.purpose ? `: ${m.purpose}` : ""}. The review pack is built.` : `No meeting with ${c.name} today.`, links: m ? [{ label: "Review pack", href: `/meetings/${c.id}` }, ...base.links] : base.links, cites: [{ label: "Calendar", record: `data/advisors/${c.advisorId}.json#walkthrough.meetings` }], via: "today's calendar" });
  }
  if (has(q, /\b(finding|flag|compliance|issue|block|raised)/)) {
    return done({ text: cases.length ? `${cases.length} open finding${cases.length === 1 ? "" : "s"} on ${c.name}: ${cases.map((k) => `${k.ruleTitle} (${k.agentName}, ${k.reason === "fired" ? k.severity : k.reason.replace("_", " ")})`).join("; ")}.` : `No open finding on ${c.name}.`, links: [{ label: "Supervision", href: "/supervision" }, ...base.links], cites: cases.map((k) => ({ label: k.ruleTitle, record: `data/compliance/rules.json#${k.ruleId}`, href: `/compliance#${k.ruleId}` })), via: "the sweep", confidence: cases.some((k) => k.confidence < 1) ? Math.min(...cases.map((k) => k.confidence)) : 1 });
  }
  if (has(q, /\b(forms?|paperwork|sign\w*|unsigned|documents?)\b/)) {
    const items = openItems(c);
    return done({ text: items.length ? `${items.length} open for ${c.name}: ${items.map((w) => `${w.form} (${w.status}, requested ${days(-w.daysOpen)})`).join("; ")}.` : `No open paperwork for ${c.name}.`, links: [{ label: "Paperwork", href: "/onboarding" }, ...base.links], cites: [{ label: "Paperwork", record: rec(c, "paperwork") }], via: "the paperwork status" });
  }
  if (has(q, /\b(said|say\w*|mention\w*|messages?|wrote|asked|emailed|texted)\b/)) {
    const msgs = (c.messages ?? []).filter((m) => m.direction === "inbound").sort((a, b) => b.day - a.day).slice(0, 3);
    return done({ text: msgs.length ? `${c.name} wrote: ${msgs.map((m) => `"${m.text.slice(0, 110)}${m.text.length > 110 ? "..." : ""}" (${m.channel}, ${days(m.day)})`).join("; ")}.` : `No captured inbound message from ${c.name} on a connected source.`, links: [{ label: "Discovery", href: "/discovery" }, ...base.links], cites: msgs.map((m) => ({ label: `${m.channel}, ${days(m.day)}`, record: rec(c, `messages[${(c.messages ?? []).indexOf(m)}]`) })), via: "captured messages on connected sources", followUps: [`What changed for ${surname(c.name)} since we last spoke?`] });
  }
  if (has(q, /\b(goals?|legacy|longevity|retire\w*|plan)\b/)) {
    return done({ text: `${c.name}'s goals: ${c.goals.map((g) => `${g.strategy} ${g.unit === "months" ? `${g.funded} of ${g.target} months` : `${usd(g.funded)} of ${usd(g.target)}`}`).join("; ")}.`, cites: c.goals.map((g, i) => ({ label: `${g.strategy} goal`, record: rec(c, `goals[${i}]`) })), via: "the goals on file" });
  }
  if (has(q, /\b(options?|proposals?|recommend\w*|what (can|should) (we|i) do|fund|trim)\b/)) {
    const opp = c.opportunities.find((o) => o.action === "fund" || o.action === "trim");
    return done({ text: opp ? `For ${opp.plainTitle ?? opp.title}, the approved shelf is checked against ${c.constraints.length} household rules and each option is carried to the morning after. Open Options for the after-tax income, cost and access of each.` : `No fundable or trimmable opportunity is on file for ${c.name}.`, links: opp ? [{ label: "Options", href: `/household/${c.id}/proposal?opp=${opp.id}` }, { label: "Before you act", href: "/simulate" }] : base.links, cites: opp ? [{ label: opp.plainTitle ?? opp.title, record: rec(c, `opportunities[${c.opportunities.indexOf(opp)}]`), href: `/evidence/${opp.id}` }] : [], via: "the constraint engine and the consequence agent" });
  }
  // The one-paragraph picture.
  const sn = singleNameUsd(c) ? pct(singleNamePct(c)) : "none";
  return done({
    text: `${c.name}: ${c.persons.map((p) => `${p.name}${p.age ? `, ${p.age}` : ""}`).join(" and ")}. ${c.tier}, ${usd(c.totalUsd)}. Liquidity covers ${months} months${liq?.unit === "months" ? ` of ${liq.target} wanted` : ""}; single name ${sn}${capPct !== undefined ? ` against ${capPct}%` : ""}. ${c.opportunities.length ? `On the list: ${c.opportunities.map((o) => o.plainTitle ?? o.title).join("; ")}.` : ""} ${cases.length ? `${cases.length} open finding${cases.length === 1 ? "" : "s"}.` : ""} ${last ? `Last contact ${days(last.day)} by ${last.channel}.` : ""}`.replace(/\s+/g, " ").trim(),
    cites: [{ label: "Client file", record: `data/clients/${c.id}.json` }],
    via: "the client file, the sweep and household arithmetic",
    followUps: [`How much cash cover does ${surname(c.name)} have?`, `What did ${surname(c.name)} say recently?`, `Any findings on ${surname(c.name)}?`],
  });
}

/** Questions worth asking, written from the book on screen so no name lives in code. */
export function suggestions(clients: ClientFile[], advisorId?: string): string[] {
  const mine = clients.filter((c) => !advisorId || c.advisorId === advisorId);
  const named = (i: number) => surname(mine[i % Math.max(1, mine.length)]?.name ?? "the client");
  return [
    "What should I do first today?",
    `How much cash cover does ${named(0)} have?`,
    `Any findings on ${named(1)}?`,
    "Which channels are not captured?",
    "What does the marketing review desk watch?",
    `What did ${named(2)} say recently?`,
    "Who am I meeting today?",
  ];
}
