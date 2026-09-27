// The client research agent.
//
// The question it answers before a conversation is not "what do we know about
// this household" but "what does the advisor not know that they should". So a
// briefing has four parts, kept apart on purpose: what changed since the last
// conversation, what the file observes, what Relay infers from the file and how
// sure it is, and what it could not establish at all. Every claim cites the
// record it came from, down to the field, so a reader can check it in one click
// and nothing can be asserted that the client file does not hold.
//
// The prose is a template over a record. In production a model would draft
// these sentences and the probes below would still decide what may be said,
// what is observed against inferred, and what is missing. The probes are
// deterministic: same file, same briefing.
//
// No model client may be imported here, and nothing here reads a profile or
// the learning loop: a preference cannot change what the advisor is told is
// unknown.
import type { ClientFile } from "@/lib/types";
import { ACCOUNT_INPUTS, CLIENTS, CONNECTORS_DATA, clientFile, SERVICE_REQUESTS } from "@/lib/data";
import type { ConnectionState } from "@/lib/connectors/types";
import { coverageFor } from "@/lib/connectors/coverage";
import { toHousehold } from "@/lib/data";
import { singleNamePct, liquidityMonths } from "@/lib/household-math";
import { paperStatus } from "@/lib/onboarding/status";
import { classify } from "@/lib/servicing/classify";
import { retrieve } from "@/lib/evidence/retrieve";
import { usd, pct } from "@/lib/format";

export type SectionId = "since" | "observed" | "inferred" | "unknown";
export type ClaimKind = "observed" | "inferred";

/** Where a claim came from. `record` is the path inside the client file or the shared data file. */
export interface Citation {
  record: string;
  label: string;
  href?: string;
}

export interface Finding {
  id: string;
  probe: string;
  section: SectionId;
  kind: ClaimKind;
  /** 1 for anything read straight off a record; below 1 for anything inferred, with the floor stated by the probe. */
  confidence: number;
  text: string;
  cites: Citation[];
  /** For an inference: how to turn it into an observation. */
  askThis?: string;
}

export interface Unknown {
  id: string;
  probe: string;
  text: string;
  /** Why it matters before the next conversation. */
  why: string;
  askThis?: string;
  cites: Citation[];
}

export interface Briefing {
  clientId: string;
  name: string;
  lastContact?: { day: number; channel: string; summary: string };
  since: Finding[];
  observed: Finding[];
  inferred: Finding[];
  unknowns: Unknown[];
  /** Questions the advisor can ask, each one traceable to an inference or an unknown. */
  questions: { text: string; from: string }[];
  /** Which records were read and how many claims each supports, so "assembled from" is a number and not a phrase. */
  sources: { record: string; label: string; claims: number }[];
  /** Channels the advisor attests to using that are not captured: what this briefing cannot have seen. */
  blindSpots: string[];
  probesRun: string[];
}

/** Inferred, not observed. One place, so every floor is visible at once. */
export const RESEARCH_CONFIDENCE = {
  /** Read from a note a colleague typed for another purpose. */
  teamNote: 0.7,
  /** A regular expression over a client's own words. */
  textClassification: 0.8,
  /** Arithmetic on the file that assumes the file is complete. */
  fileArithmetic: 0.85,
} as const;

const ago = (d: number) => (d === 0 ? "today" : d === -1 ? "yesterday" : `${-d} days ago`);
const INTENT = /\b(want|wants|would like|plan(s|ning)? to|thinking about|considering|hoping to|mentioned)\b/i;
const HELD_AWAY = /\b(held away|held elsewhere|another firm|at another institution)\b/i;

interface Ctx {
  c: ClientFile;
  path: string;
  cite: (record: string, label: string, href?: string) => Citation;
  since: Finding[];
  observed: Finding[];
  inferred: Finding[];
  unknowns: Unknown[];
  connections: ConnectionState[];
}

type Probe = { id: string; run: (x: Ctx) => void };

const PROBES: Probe[] = [
  {
    id: "last-contact",
    run: (x) => {
      const last = latest(x.c);
      if (!last) {
        x.unknowns.push({ id: "no-contact", probe: "last-contact", text: "No contact is logged for this household.", why: "Anything the client has said is not in the file, so every inference below rests on other people's notes.", cites: [x.cite("contactHistory", "Contact history, empty")] });
        return;
      }
      const i = x.c.contactHistory.indexOf(last);
      x.observed.push(f("last-contact", "observed", 1, `Last contact ${ago(last.day)}, by ${last.channel.toLowerCase()}: ${last.summary}.`, [x.cite(`contactHistory[${i}]`, `Contact, ${ago(last.day)}`)]));
      if (-last.day > 90) {
        x.unknowns.push({ id: "stale-contact", probe: "last-contact", text: `Nothing has been heard from the client in ${-last.day} days.`, why: "Goals, spending and family circumstances in this file are as old as that conversation.", askThis: "What has changed since we last spoke?", cites: [x.cite(`contactHistory[${i}]`, `Contact, ${ago(last.day)}`)] });
      }
    },
  },
  {
    id: "since-last-contact",
    run: (x) => {
      const last = latest(x.c);
      const cut = last ? last.day : -Infinity;
      x.c.opportunities.forEach((o, i) => {
        // observedDay counts days ago; a contact day is negative. Both are put on the same axis here.
        if (-o.observedDay > cut) {
          const ev = retrieve(o);
          x.since.push(f(`since-opp-${o.id}`, "observed", 1, `${o.plainTitle ?? o.title}. Observed ${o.observedDay === 0 ? "today" : o.observedDay === 1 ? "yesterday" : `${o.observedDay} days ago`}${ev.refused ? ", and its evidence is refused" : ""}.`, [x.cite(`opportunities[${i}]`, "Flagged opportunity", `/evidence/${o.id}`)], "since-last-contact"));
        }
      });
      x.c.notes.forEach((n, i) => {
        if (n.day > cut) x.since.push(f(`since-note-${i}`, "observed", 1, `${n.from} noted ${ago(n.day)}: "${n.text}"`, [x.cite(`notes[${i}]`, `Team note, ${ago(n.day)}`)], "since-last-contact"));
      });
      SERVICE_REQUESTS.filter((r) => r.clientId === x.c.id).forEach((r) => {
        const day = -Math.floor(r.receivedHoursAgo / 24);
        if (day > cut) {
          const k = classify(r);
          x.since.push(f(`since-req-${r.id}`, "observed", 1, `Service request ${r.receivedHoursAgo} hours ago by ${r.channel.toLowerCase()}: "${r.text}" Classified ${k.kind.toLowerCase()}${k.callbackRequired ? "; a callback to a number on file is required before it moves" : ""}.`, [x.cite(`service-requests.json#${r.id}`, "Service request", "/servicing")], "since-last-contact"));
        }
      });
      x.c.paperwork.forEach((w, i) => {
        if (w.requestedDay > cut && w.signedDay === undefined) x.since.push(f(`since-paper-${i}`, "observed", 1, `Requested ${ago(w.requestedDay)} and still unsigned: ${w.form}.`, [x.cite(`paperwork[${i}]`, "Paperwork", "/onboarding")], "since-last-contact"));
      });
    },
  },
  {
    id: "goals",
    run: (x) => {
      x.c.goals.forEach((g, i) => {
        if (g.target > 0 && g.funded < g.target) {
          const gap = g.unit === "months" ? `${g.target - g.funded} months short` : `${usd(g.target - g.funded)} short`;
          x.observed.push(f(`goal-${g.strategy}`, "observed", 1, `${g.strategy} is ${gap}: ${g.unit === "months" ? `${g.funded} of ${g.target} months` : `${usd(g.funded)} of ${usd(g.target)}`}. Assumption on file: ${g.assumption}.`, [x.cite(`goals[${i}]`, `${g.strategy} goal`, `/household/${x.c.id}`)]));
        }
      });
      if (x.c.goals.some((g) => g.target === 0 || g.funded === 0 && g.target > 0 && g.strategy === "Legacy")) {
        const g = x.c.goals.find((g) => g.strategy === "Legacy");
        if (g && g.funded === 0 && g.target > 0) {
          x.unknowns.push({ id: "legacy-intent", probe: "goals", text: "The Legacy goal has a target but nothing funding it, and the file records intent only.", why: "A target with no funding plan is a conversation that has not happened yet, or one nobody wrote down.", askThis: "Is the legacy target still what you want, and when would you like to start funding it?", cites: [x.cite(`goals[${x.c.goals.indexOf(g)}]`, "Legacy goal")] });
        }
      }
    },
  },
  {
    id: "holdings",
    run: (x) => {
      const h = toHousehold(x.c);
      const single = singleNamePct(h);
      const cap = x.c.constraints.find((k) => k.kind === "maxSingleName");
      if (single > 0 && cap && single > cap.pct) {
        const i = x.c.holdings.findIndex((k) => k.singleName);
        x.observed.push(f("concentration", "observed", 1, `${pct(single)} of investable assets in one name against the household's own ${cap.pct}% rule.`, [x.cite(`holdings[${i}]`, "Holding"), x.cite(`constraints[${x.c.constraints.indexOf(cap)}]`, "Client rule")]));
      }
      const months = liquidityMonths(h);
      const need = x.c.constraints.find((k) => k.kind === "minLiquidityMonths");
      if (need && months < need.months) {
        x.observed.push(f("liquidity-rule", "observed", 1, `Cash for planned spending covers ${months} months; the household's rule asks for at least ${need.months}.`, [x.cite("holdings", "Holdings"), x.cite(`constraints[${x.c.constraints.indexOf(need)}]`, "Client rule")]));
      }
      x.c.holdings.forEach((k, i) => {
        if (k.earmarked) x.inferred.push(f(`earmark-${i}`, "inferred", RESEARCH_CONFIDENCE.fileArithmetic, `${usd(k.valueUsd)} of cash is spoken for (${k.earmarked}), so it is not counted as available. If that estimate is wrong, the liquidity picture changes.`, [x.cite(`holdings[${i}]`, "Holding, earmark")], undefined, "Is the earmarked amount still right?"));
      });
    },
  },
  {
    id: "people",
    run: (x) => {
      x.c.persons.forEach((p, i) => {
        if (p.age === undefined) x.unknowns.push({ id: `age-${p.id}`, probe: "people", text: `${p.name}'s age is not on file.`, why: "Retirement, distribution and specified-adult rules all turn on age; none can be checked for this person.", cites: [x.cite(`persons[${i}]`, "Person")] });
        if (p.age !== undefined && p.age >= 73) x.observed.push(f(`rmd-${p.id}`, "observed", 1, `${p.name} is ${p.age}, past the age at which required minimum distributions begin (73).`, [x.cite(`persons[${i}]`, "Person, age")]));
      });
      const bens = x.c.persons.filter((p) => p.role === "beneficiary");
      const engaged = x.c.contactHistory.some((e) => /next generation|beneficiar/i.test(e.summary) && !/did not attend/i.test(e.summary));
      if (bens.length && !engaged) {
        x.unknowns.push({ id: "next-gen", probe: "people", text: `${bens.length} beneficiar${bens.length === 1 ? "y is" : "ies are"} on the account and no contact with ${bens.length === 1 ? "them" : "any of them"} is logged.`, why: "The next generation's intentions are not in the file; assets that pass to people we have never spoken to are the retention risk.", askThis: "Would you be comfortable with us meeting the beneficiaries directly?", cites: bens.map((p) => x.cite(`persons[${x.c.persons.indexOf(p)}]`, p.name)) });
      }
    },
  },
  {
    id: "notes-intent",
    run: (x) => {
      x.c.notes.forEach((n, i) => {
        if (INTENT.test(n.text)) {
          x.inferred.push(f(`intent-${i}`, "inferred", RESEARCH_CONFIDENCE.teamNote, `Reading the ${n.from.toLowerCase()}'s note, the client may intend: "${n.text}" This is a colleague's account, not the client's words.`, [x.cite(`notes[${i}]`, `Team note, ${ago(n.day)}`)], undefined, "Confirm what was meant, and whether it has a budget and a date."));
        }
      });
    },
  },
  {
    id: "held-away",
    run: (x) => {
      x.c.opportunities.forEach((o, i) => {
        if (HELD_AWAY.test(`${o.title} ${o.plainTitle ?? ""} ${o.reasonPath.map((n) => n.label).join(" ")}`)) {
          x.unknowns.push({ id: `held-away-${o.id}`, probe: "held-away", text: "Assets exist outside the platform and their size, cost and tax position are not in the file.", why: "Advice on the whole picture is not possible on part of it, and the household's own rules cannot be checked against what we cannot see.", askThis: "Can we see statements for the assets held elsewhere?", cites: [x.cite(`opportunities[${i}]`, "Flagged opportunity", `/evidence/${o.id}`)] });
        }
      });
    },
  },
  {
    id: "supervisory-inputs",
    run: (x) => {
      const a = x.c.supervisory ?? ACCOUNT_INPUTS.accounts.find((k) => k.clientId === x.c.id);
      if (!a) {
        x.unknowns.push({ id: "no-account-inputs", probe: "supervisory-inputs", text: "The firm's systems hold no supervisory record for this account.", why: "Trusted contact, complaints and disbursement flags cannot be checked.", cites: [x.cite("supervisory", "Supervisory record, none")] });
        return;
      }
      if (!a.trustedContactOnFile) x.unknowns.push({ id: "trusted-contact", probe: "supervisory-inputs", text: "No trusted contact is on file.", why: "If capacity or exploitation is ever in question there is nobody the firm may call. FINRA Rule 4512 asks that one be requested.", askThis: "Who would you want us to contact if we could not reach you?", cites: [x.cite("supervisory.trustedContactOnFile", "Supervisory record")] });
      if (a.note) x.inferred.push(f("account-note", "inferred", RESEARCH_CONFIDENCE.teamNote, `The firm's account record carries a note: "${a.note}" Its meaning has not been confirmed with the client.`, [x.cite("supervisory.note", "Supervisory record, note")], undefined, "Confirm the request came from the client and was understood."));
    },
  },
  {
    id: "client-information",
    run: (x) => {
      x.c.paperwork.forEach((w, i) => {
        const s = paperStatus(w);
        if (/client information|refresh|kyc/i.test(w.form) && s.status !== "signed") {
          x.unknowns.push({ id: `kyc-${i}`, probe: "client-information", text: `${w.form} has been open ${s.daysOpen} days${s.status === "escalated" ? " and is escalated" : ""}.`, why: "Until it is returned, the profile the rules are checked against is the old one.", cites: [x.cite(`paperwork[${i}]`, "Paperwork", "/onboarding")] });
        }
      });
    },
  },
  {
    id: "preferences",
    run: (x) => {
      const w = x.c.preferences?.values["contact.window"];
      if (typeof w === "string") x.observed.push(f("contact-window", "observed", 1, `Prefers to be contacted: ${w}.`, [x.cite("preferences.values", "Client preference, contact window", "/profiles")]));
      else x.unknowns.push({ id: "contact-window", probe: "preferences", text: "No preferred contact time is recorded.", why: "The first call lands at a time the client did not choose.", askThis: "When is a good time to reach you?", cites: [x.cite("preferences", "Client preferences")] });
    },
  },
  {
    id: "coverage",
    run: (x) => {
      const report = coverageFor(x.c.advisorId, x.connections, CONNECTORS_DATA.attestations);
      const gaps = report.channels.filter((ch) => ch.attested && ch.status === "gap");
      const partial = report.channels.filter((ch) => ch.attested && ch.status === "partial");
      if (gaps.length) {
        x.unknowns.push({ id: "blind-spots", probe: "coverage", text: `${gaps.length} channel${gaps.length === 1 ? "" : "s"} the advisor uses ${gaps.length === 1 ? "is" : "are"} not captured at all: ${gaps.map((m) => m.channel).join(", ")}. Anything the client said there is not in this briefing.${partial.length ? ` ${partial.length} more (${partial.map((m) => m.channel).join(", ")}) ${partial.length === 1 ? "is" : "are"} captured without a retained copy.` : ""}`, why: "A briefing assembled from captured channels is only as complete as the capture.", cites: [x.cite(`advisors/${x.c.advisorId}.json#connections`, "Connected channels", "/sources")] });
      }
    },
  },
  {
    id: "evidence",
    run: (x) => {
      x.c.opportunities.forEach((o, i) => {
        const ev = retrieve(o);
        if (ev.refused) x.unknowns.push({ id: `refused-${o.id}`, probe: "evidence", text: `"${o.plainTitle ?? o.title}" has no supporting evidence in the corpus.`, why: "It cannot be proposed on or written about until a citation resolves, so do not raise it as a recommendation.", cites: [x.cite(`opportunities[${i}]`, "Flagged opportunity", `/evidence/${o.id}`)] });
        else {
          // Only a disagreement that touches a CITED document is about this
          // opportunity's evidence. One that touches a related, uncited passage
          // is shown on the evidence screen and not asserted here.
          const cited = ev.conflicts.filter((k) => k.sides.some((s) => o.evidenceDocIds.includes(s.docId)));
          if (cited.length) x.inferred.push(f(`conflict-${o.id}`, "inferred", RESEARCH_CONFIDENCE.fileArithmetic, `The evidence behind "${o.plainTitle ?? o.title}" rests on documents that disagree (${cited.map((k) => k.topic.replace(/[.-]/g, " ")).join("; ")}). Retrieval leans on the newer one; that lean is not a decision.`, [x.cite(`opportunities[${i}]`, "Evidence", `/evidence/${o.id}`)], undefined, "Check which view the desk stands behind before quoting either."));
        }
      });
    },
  },
];

function latest(c: ClientFile) {
  return c.contactHistory.reduce<ClientFile["contactHistory"][number] | undefined>((m, e) => (!m || e.day > m.day ? e : m), undefined);
}

function f(id: string, kind: ClaimKind, confidence: number, text: string, cites: Citation[], probe?: string, askThis?: string): Finding {
  return { id, probe: probe ?? id.replace(/-.*$/, ""), section: kind === "observed" ? "observed" : "inferred", kind, confidence, text, cites, askThis };
}

export function brief(clientId: string, connections: ConnectionState[] = CONNECTORS_DATA.connections, clients: ClientFile[] = CLIENTS): Briefing | undefined {
  const c = clients.find((x) => x.id === clientId) ?? (clients === CLIENTS ? clientFile(clientId) : undefined);
  if (!c) return undefined;
  const path = `clients/${c.id}.json`;
  const x: Ctx = {
    c,
    path,
    cite: (record, label, href) => ({ record: record.includes(".json") ? `data/${record}` : `data/${path}#${record}`, label, href }),
    since: [],
    observed: [],
    inferred: [],
    unknowns: [],
    connections,
  };
  for (const p of PROBES) p.run(x);

  const questions = [
    ...x.unknowns.filter((u) => u.askThis).map((u) => ({ text: u.askThis!, from: u.text })),
    ...x.inferred.filter((i) => i.askThis).map((i) => ({ text: i.askThis!, from: i.text })),
  ];
  const tally = new Map<string, { label: string; claims: number }>();
  for (const item of [...x.since, ...x.observed, ...x.inferred, ...x.unknowns]) {
    for (const k of item.cites) {
      // One row per record kind: the client file's notes, its goals, the service queue. Indexes and ids collapse; the kind does not.
      const key = k.record.includes("/clients/") ? k.record.replace(/\[\d+\]/g, "").replace(/\..*$/, "") : k.record.replace(/#.*$/, "");
      const t = tally.get(key) ?? { label: k.label.replace(/,.*$/, ""), claims: 0 };
      t.claims += 1;
      tally.set(key, t);
    }
  }
  const report = coverageFor(c.advisorId, connections, CONNECTORS_DATA.attestations);
  return {
    clientId: c.id,
    name: c.name,
    lastContact: latest(c),
    since: x.since,
    observed: x.observed,
    inferred: x.inferred.sort((a, b) => a.confidence - b.confidence),
    unknowns: x.unknowns,
    questions,
    sources: [...tally.entries()].map(([record, t]) => ({ record, ...t })).sort((a, b) => b.claims - a.claims),
    blindSpots: report.channels.filter((ch) => ch.attested && ch.status === "gap").map((ch) => ch.channel),
    probesRun: PROBES.map((p) => p.id),
  };
}

export function briefAll(connections?: ConnectionState[], clients: ClientFile[] = CLIENTS): Briefing[] {
  return clients.map((c) => brief(c.id, connections, clients)!);
}

export const PROBE_IDS = PROBES.map((p) => p.id);
