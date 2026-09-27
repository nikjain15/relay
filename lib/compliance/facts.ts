// Adapters: the advisor's actual records in, a flat fact bag out.
//
// The rules are generic; this file is where they meet this firm's workflow. A
// rule says "recipientCount30d over the threshold". Only an adapter knows that
// the count comes from prior distributions in the archive, that a meeting
// summary is an inference and not an observation, and that a missing custodian
// feed means concentration is unknown rather than zero.
//
// Two disciplines hold here. Nothing is invented: a fact the records do not
// support is left undefined, and the engine then returns cannot_evaluate rather
// than a clear. And anything inferred carries a confidence below 1, which is
// what routes it to a human instead of clearing silently.
//
// Deterministic. No model client may be imported here.
import type { ClientFile, ServiceRequest } from "@/lib/types";
import type { CapturedMessage } from "@/lib/data";
import type { CoverageReport } from "@/lib/connectors/coverage";
import type { FactBag, Scope } from "@/lib/compliance/types";
import { figures } from "@/lib/policy/checks";

export interface FactSet {
  scope: Scope;
  /** What the findings are about: an advisor id, a client id, a draft id. */
  subject: string;
  subjectLabel: string;
  facts: FactBag;
  /** Below 1 for anything inferred rather than observed. */
  confidence: Record<string, number>;
}

/** Inferred, not observed. Kept in one place so every floor is visible at once. */
export const INFERRED = {
  /** Language classification over free text. A model may propose it; a human disposes. */
  textClassification: 0.8,
  /** Derived from a meeting transcript, which may be partial. */
  transcript: 0.75,
  /** Read from a note an advisor typed for another purpose. */
  advisorNote: 0.7,
} as const;

const PROJECTION = /\b(will (return|earn|grow|outperform|yield)|expected return|guarantee[ds]?|projected|target return)\b/i;
const TESTIMONIAL = /\b(client(s)? (say|said|love|rave)|best advisor|testimonial|endorse[sd]?)\b/i;
const GRIEVANCE = /\b(unacceptable|misled|not what (i|we) (was|were) told|lost money because|complain(t|ing)?|unhappy with|demand)\b/i;
const RECOMMENDATION = /\b(recommend|suggest|suitable|you should|i'd suggest|we should (move|place|sell|buy))\b/i;
const OUTSIDE_BUSINESS = /\b(advisory board|board of|sit on the board|my (consulting|side) (work|business)|outside (business|role|directorship)|my own (company|firm|fund))\b/i;
const SENSITIVE = /\b(\d{3}-\d{2}-\d{4}|account (number|no\.?) ?[:#]? ?\d{4,}|routing number)\b/i;

/**
 * A client-facing draft. Called by the review screen on every keystroke-free
 * save, so it does no work a screen cannot afford.
 */
export function communicationFacts(input: {
  draftId: string;
  draft: string;
  channel: string;
  channelApproved: boolean;
  recipientCount30d: number;
  clientId?: string;
  templateId?: string;
  regime?: string;
  principalApproved: boolean;
  reviewed: boolean;
  containsRecommendation: boolean;
  machineDrafted: boolean;
  /** Figures the draft is allowed to use: the proposal, the household, cited passages. */
  sources: string[];
  citedTitles: string[];
  capacity?: "broker_dealer" | "investment_adviser" | "dual";
}): FactSet {
  const allowed = new Set(input.sources.flatMap(figures));
  const unsourced = figures(input.draft).filter((f) => !allowed.has(f));
  const cited = input.citedTitles.filter((t) => input.draft.includes(`[Source: ${t}`));
  return {
    scope: "communication",
    subject: input.draftId,
    subjectLabel: "Client draft",
    facts: {
      recipientCount30d: input.recipientCount30d,
      channel: input.channel,
      channelApproved: input.channelApproved,
      clientId: input.clientId ?? "",
      templateId: input.templateId ?? "",
      regime: input.regime ?? "",
      principalApproved: input.principalApproved,
      reviewed: input.reviewed,
      containsRecommendation: input.containsRecommendation,
      machineDrafted: input.machineDrafted,
      containsProjection: PROJECTION.test(input.draft),
      containsTestimonial: TESTIMONIAL.test(input.draft),
      containsSensitiveData: SENSITIVE.test(input.draft),
      unsourcedFigures: unsourced.length,
      citationCount: cited.length,
      capacity: input.capacity ?? "dual",
    },
    confidence: {
      containsProjection: INFERRED.textClassification,
      containsTestimonial: INFERRED.textClassification,
      containsSensitiveData: INFERRED.textClassification,
    },
  };
}

/** Record completeness, straight off the coverage report. Observed, so confidence is 1. */
export function coverageFacts(report: CoverageReport): FactSet {
  const gaps = report.channels.filter((c) => c.status === "gap");
  const partial = report.channels.filter((c) => c.status === "partial");
  return {
    scope: "coverage",
    subject: report.advisorId,
    subjectLabel: "Record completeness",
    facts: {
      advisorId: report.advisorId,
      gapChannels: gaps.map((c) => c.channel),
      partialChannels: partial.map((c) => c.channel),
      gapCount: gaps.length,
      partialCount: partial.length,
      completeness: Math.round(report.completeness * 100) / 100,
      defensible: report.defensible,
    },
    confidence: {},
  };
}

/** A recommendation about to be released: is the care-obligation record complete. */
export function proposalFacts(input: {
  proposalId: string;
  clientId: string;
  productId: string;
  alternativesConsidered: number;
  costsCompared: boolean;
  basisRecorded: boolean;
  isRecommendation: boolean;
}): FactSet {
  return {
    scope: "proposal",
    subject: input.proposalId,
    subjectLabel: "Recommendation record",
    facts: {
      clientId: input.clientId,
      productId: input.productId,
      alternativesConsidered: input.alternativesConsidered,
      costsCompared: input.costsCompared,
      basisRecorded: input.basisRecorded,
      isRecommendation: input.isRecommendation,
    },
    confidence: {},
  };
}

function oldestAge(client: ClientFile): number | undefined {
  const ages = client.persons.map((p) => p.age).filter((a): a is number => typeof a === "number");
  return ages.length ? Math.max(...ages) : undefined;
}

function largestConcentration(client: ClientFile): { instrument: string; pct: number } | undefined {
  if (!client.totalUsd) return undefined;
  const single = client.holdings.filter((h) => h.singleName);
  if (single.length === 0) return undefined;
  const top = single.reduce((a, b) => (b.valueUsd > a.valueUsd ? b : a));
  return { instrument: top.name, pct: Math.round((top.valueUsd / client.totalUsd) * 1000) / 10 };
}

/**
 * The account itself: concentration, the specified-adult picture, whether an
 * inbound message reads as a grievance that was never logged.
 *
 * `custodianConnected` is passed rather than assumed. Without the feed,
 * concentration is left undefined and the engine says so, which is the honest
 * answer and the one a supervisor can act on.
 */
export function accountFacts(input: {
  client: ClientFile;
  requests?: ServiceRequest[];
  custodianConnected: boolean;
  unusualDisbursement?: boolean;
  newThirdPartyContact?: boolean;
  trustedContactOnFile: boolean;
  complaintLogged: boolean;
  /** The custodian's prior valuations of the largest single name, oldest first. Day 0 is never stored; it is the client file. */
  history?: { day: number; pct: number }[];
}): FactSet {
  const { client } = input;
  const conc = input.custodianConnected ? largestConcentration(client) : undefined;
  const age = oldestAge(client);
  const grievance = (input.requests ?? []).find((r) => GRIEVANCE.test(r.text));
  const facts: FactBag = {
    clientId: client.id,
    trustedContactOnFile: input.trustedContactOnFile,
    complaintLogged: input.complaintLogged,
    complaintLanguage: Boolean(grievance),
    unusualDisbursement: input.unusualDisbursement ?? false,
    newThirdPartyContact: input.newThirdPartyContact ?? false,
    channel: grievance?.channel ?? "",
  };
  if (grievance) facts.complaintExcerpt = grievance.text.slice(0, 160);
  if (age !== undefined) facts.clientAge = age;
  if (conc) {
    facts.instrument = conc.instrument;
    facts.concentrationPct = conc.pct;
    const ceiling = client.constraints.find((k) => k.kind === "maxSingleName");
    if (ceiling) {
      facts.concentrationCeilingPct = ceiling.pct;
      facts.concentrationHeadroomPts = Math.round((ceiling.pct - conc.pct) * 10) / 10;
    }
    // A trend needs the past and the present on one axis. The present is the
    // file, so a stored "today" could never disagree with it.
    const past = (input.history ?? []).filter((h) => h.day < 0).sort((a, b) => a.day - b.day);
    if (past.length) {
      const series = [...past, { day: 0, pct: conc.pct }];
      facts.concentrationHistory = series.map((h) => `day ${h.day}: ${h.pct}%`);
      facts.concentrationDriftPts = Math.round((conc.pct - past[0].pct) * 10) / 10;
    }
  }
  return {
    scope: "account",
    subject: client.id,
    subjectLabel: client.name,
    facts,
    confidence: {
      complaintLanguage: INFERRED.textClassification,
      unusualDisbursement: INFERRED.advisorNote,
      newThirdPartyContact: INFERRED.advisorNote,
    },
  };
}

/**
 * A captured message, from the corpus the connectors ingested rather than a
 * draft an advisor submitted. Same rules, same engine: the surveillance agent
 * reads what was actually said on a captured channel, in both directions.
 * A message on a source that is not connected and healthy never reaches here;
 * the sweep counts it as not swept instead.
 */
export function messageFacts(m: CapturedMessage, input: { obaOnFile: boolean; complaintLogged: boolean; channelApproved: boolean }): FactSet {
  const facts: FactBag = {
    messageId: m.id,
    advisorId: m.advisorId,
    clientId: m.clientId ?? "",
    channel: m.channel,
    direction: m.direction,
    channelApproved: input.channelApproved,
    recipientCount30d: 1,
    principalApproved: false,
    reviewed: false,
    machineDrafted: false,
    containsRecommendation: m.direction === "outbound" && RECOMMENDATION.test(m.text),
    containsProjection: m.direction === "outbound" && PROJECTION.test(m.text),
    containsTestimonial: m.direction === "outbound" && TESTIMONIAL.test(m.text),
    containsSensitiveData: SENSITIVE.test(m.text),
    complaintLanguage: m.direction === "inbound" && GRIEVANCE.test(m.text),
    complaintLogged: input.complaintLogged,
    outsideBusinessLanguage: m.direction === "outbound" && OUTSIDE_BUSINESS.test(m.text),
    obaOnFile: input.obaOnFile,
    excerpt: m.text.slice(0, 140),
    capacity: "dual",
  };
  if (facts.complaintLanguage) facts.complaintExcerpt = m.text.slice(0, 160);
  // Only a positive classification is an inference here. Over a corpus, treating
  // every negative as uncertain queues every clean message for a person, which
  // is the queue nobody reads. A negative is sampled instead, under Rule 3110's
  // sample rate, which is the production answer to "did the classifier miss one".
  const classified = ["containsProjection", "containsTestimonial", "containsSensitiveData", "containsRecommendation", "complaintLanguage", "outsideBusinessLanguage"];
  return {
    scope: "communication",
    subject: m.id,
    // "Smith: email sent 2 days ago", the way an advisor names a message, not "Captured email, outbound, smith, day -2".
    subjectLabel: `${m.clientId ? m.clientId.replace(/^hh-/, "").split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("-") : "No client named"}: ${m.channel} ${m.direction === "outbound" ? "sent" : "received"} ${m.day === 0 ? "today" : m.day === -1 ? "yesterday" : `${-m.day} days ago`}`,
    facts,
    confidence: Object.fromEntries(classified.filter((k) => facts[k] === true).map((k) => [k, INFERRED.textClassification])),
  };
}
