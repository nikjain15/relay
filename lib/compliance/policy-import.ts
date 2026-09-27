// A policy document in, candidate rules out.
//
// A firm's written policy is where its rules already live. This module reads
// one and proposes rules in the same shape the engine runs: a sentence that
// carries an obligation, the facts it names, the comparator and the number, the
// severity its verb implies, the authority it cites. Every candidate is shown
// beside the sentence it came from, and nothing is in force until a person adds
// it to a desk, which appends to the same change log every other change uses.
//
// This is the deterministic version. It reads through a vocabulary of the facts
// the engines actually compute, so it can only propose a rule the engine can
// evaluate. In production a model would read the sentence more freely; it would
// still only propose, and the rule it proposed would still be this data.
//
// Deterministic. No model client may be imported here.
import type { Condition, Comparator, RuleDefinition, Scope, Severity } from "@/lib/compliance/types";
import { BASELINE } from "@/lib/compliance/policy";
import { factsUsed } from "@/lib/compliance/dsl";

export interface FactSpec {
  key: string;
  scope: Scope;
  type: "number" | "boolean";
  label: string;
  /** Phrases a policy uses for this fact. Longest match wins; matching is case-insensitive. */
  phrases: string[];
  /** For a number: what the figure is measured in, so a threshold reads back correctly. */
  unit?: "%" | "years" | "people" | "count" | "points";
  /** For a number with no comparator word: which way a threshold usually reads. */
  defaultCmp?: Comparator;
}

/** The facts the engines compute, in the words a policy uses for them. Adding a fact the engine can read is one entry. */
export const FACT_VOCABULARY: FactSpec[] = [
  { key: "clientAge", scope: "account", type: "number", label: "Client age", phrases: ["years of age", "years old", "aged", "age of", "age", "senior investor", "senior client", "senior"], unit: "years", defaultCmp: "gte" },
  { key: "newThirdPartyContact", scope: "account", type: "boolean", label: "New third-party contact", phrases: ["new third-party contact", "new third party contact", "third-party contact", "third party contact", "new contact on the account"] },
  { key: "trustedContactOnFile", scope: "account", type: "boolean", label: "Trusted contact on file", phrases: ["trusted contact person", "trusted contact"] },
  { key: "unusualDisbursement", scope: "account", type: "boolean", label: "Unusual disbursement", phrases: ["unusual disbursement", "unusual withdrawal", "unusual money movement", "disbursement"] },
  { key: "concentrationPct", scope: "account", type: "number", label: "Largest single-name concentration", phrases: ["single-name concentration", "single name concentration", "single-name position", "single name position", "single position", "single security", "single issuer", "one security", "one issuer", "concentration"], unit: "%", defaultCmp: "gt" },
  { key: "concentrationDriftPts", scope: "account", type: "number", label: "Concentration drift", phrases: ["drifted", "drift"], unit: "points", defaultCmp: "gte" },
  { key: "complaintLanguage", scope: "account", type: "boolean", label: "Complaint language present", phrases: ["complaint language", "grievance", "complaint"] },
  { key: "complaintLogged", scope: "account", type: "boolean", label: "Complaint logged", phrases: ["logged in the complaint log", "complaint log", "logged"] },
  { key: "recipientCount30d", scope: "communication", type: "number", label: "Retail investors reached in 30 days", phrases: ["retail investors", "retail recipients", "recipients", "households in 30 days"], unit: "people", defaultCmp: "gt" },
  { key: "principalApproved", scope: "communication", type: "boolean", label: "Principal approval", phrases: ["principal approval", "approved by a principal", "principal-approved", "principal approved", "pre-approval", "pre-approved"] },
  { key: "containsProjection", scope: "communication", type: "boolean", label: "Performance projection", phrases: ["performance projection", "projected return", "projection", "forecast", "expected return"] },
  { key: "containsTestimonial", scope: "communication", type: "boolean", label: "Testimonial", phrases: ["testimonial", "endorsement"] },
  { key: "containsRecommendation", scope: "communication", type: "boolean", label: "Recommendation in the text", phrases: ["recommendation", "recommends"] },
  { key: "containsSensitiveData", scope: "communication", type: "boolean", label: "Sensitive data in the text", phrases: ["account number", "social security number", "sensitive data", "personal data", "nonpublic personal information"] },
  { key: "channelApproved", scope: "communication", type: "boolean", label: "Channel approved", phrases: ["approved channel", "unapproved channel", "channel that is not approved"] },
  { key: "outsideBusinessLanguage", scope: "communication", type: "boolean", label: "Outside business language", phrases: ["outside business activity", "outside business", "directorship", "advisory board"] },
  { key: "obaOnFile", scope: "communication", type: "boolean", label: "Outside business activity on file", phrases: ["oba on file", "disclosed on the oba form", "disclosed on file"] },
  { key: "machineDrafted", scope: "communication", type: "boolean", label: "Drafted by a model", phrases: ["machine-drafted", "machine drafted", "generated by a model", "drafted by a model", "ai-generated", "ai generated", "generated text", "generative"] },
  { key: "citationCount", scope: "communication", type: "number", label: "Sources cited", phrases: ["cited sources", "sources cited", "citations", "citation"], unit: "count", defaultCmp: "lt" },
  { key: "unsourcedFigures", scope: "communication", type: "boolean", label: "Unsourced figures", phrases: ["unsourced figure", "figure without a source", "figures without a source", "unsourced"] },
  { key: "reviewed", scope: "communication", type: "boolean", label: "Reviewed", phrases: ["supervisory review", "reviewed by a supervisor", "reviewed by a principal"] },
  { key: "alternativesConsidered", scope: "proposal", type: "number", label: "Alternatives considered", phrases: ["reasonably available alternatives", "alternatives considered", "alternatives"], unit: "count", defaultCmp: "lt" },
  { key: "costsCompared", scope: "proposal", type: "boolean", label: "Costs compared", phrases: ["cost comparison", "costs compared", "costs are compared"] },
  { key: "basisRecorded", scope: "proposal", type: "boolean", label: "Basis recorded", phrases: ["basis for the recommendation", "basis recorded", "documented basis"] },
  { key: "completeness", scope: "coverage", type: "number", label: "Channel completeness", phrases: ["channel completeness", "completeness", "channel coverage", "captured channels"], unit: "%", defaultCmp: "lt" },
];

const OBLIGATION = /\b(must not|may not|must|shall not|shall|should not|should|is required|are required|requires?|prohibited|never|is not permitted|are not permitted|no [a-z -]+ without|held for review|is held|is blocked|is flagged|escalat(e|ed|es)|flag(ged|s)? for review)\b/i;
const CITATION = /\b(FINRA (?:Rule )?\d{4}(?:\([a-z0-9]+\))*|SEC Rule [\dA-Za-z().-]+|Rule 206\(4\)-\d|Reg(?:ulation)? (?:BI|S-P|Best Interest)|Regulatory Notice \d{2}-\d{2})\b/;
const NEGATION = /\b(no|not|without|missing|absent|lacks|lacking|never|unlogged|undisclosed|fails to|is not|are not|has no|have no)\b/i;
const NUMBER = /(\d+(?:\.\d+)?)\s*(%|percent|per cent|years|points|pts)?/i;

const CMP_WORDS: { re: RegExp; cmp: Comparator }[] = [
  { re: /\b(at least|or more|or over|or older|and over|and older|and above|minimum of|no fewer than|not less than)\b/i, cmp: "gte" },
  { re: /\b(at most|no more than|up to|or fewer|or under|or less|maximum of|not more than)\b/i, cmp: "lte" },
  { re: /\b(more than|over|above|exceeds?|exceeding|greater than|in excess of|beyond)\b/i, cmp: "gt" },
  { re: /\b(fewer than|less than|under|below|short of)\b/i, cmp: "lt" },
];

export interface CandidateRule extends RuleDefinition {
  /** The sentence the rule was read from, verbatim. */
  sentence: string;
  /** Which paragraph of the document, one-based. */
  paragraph: number;
  /** How sure the reader is that the rule says what the sentence says. Under 1 whenever a default was used. */
  confidence: number;
  /** What the reader could not settle. A candidate with any of these cannot be added until a person edits it. */
  unresolved: string[];
  /** The facts it read, in the order they appear. */
  factKeys: string[];
  /** Baseline rules that already read the same facts, if any. */
  overlaps: string[];
  /** Why each part was read the way it was. */
  trace: string[];
}

export interface PolicyReading {
  documentName: string;
  paragraphs: number;
  sentences: number;
  candidates: CandidateRule[];
  /** Sentences with an obligation that named no fact the engines compute, and sentences with no obligation at all. */
  skipped: { sentence: string; why: string }[];
  ms: number;
}

const slug = (s: string) => s.toLowerCase().replace(/\.[a-z]+$/, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32) || "policy";
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function sentencesOf(text: string): { sentence: string; paragraph: number }[] {
  const out: { sentence: string; paragraph: number }[] = [];
  // A paragraph is a blank-line block; inside it, a line is never joined to
  // the next, so a heading without a full stop stays a heading.
  const paras = text.split(/\n\s*\n|\r\n\s*\r\n/).map((p) => p.trim()).filter(Boolean);
  paras.forEach((p, i) => {
    for (const line of p.split(/\r?\n/)) {
      const clean = line.replace(/^#+\s*/, "").replace(/\s+/g, " ").trim();
      for (const s of clean.split(/(?<=[.;])\s+(?=[A-Z])/)) {
        const t = s.trim().replace(/[.;]$/, "");
        if (t.length >= 12) out.push({ sentence: t, paragraph: i + 1 });
      }
    }
  });
  return out;
}

/** Facts named in a sentence, each with where its phrase sits. Longest phrase wins a span; a span is claimed once. */
function factsIn(sentence: string): { spec: FactSpec; at: number; phrase: string }[] {
  const lower = sentence.toLowerCase();
  const claimed: [number, number][] = [];
  const hits: { spec: FactSpec; at: number; phrase: string }[] = [];
  const all = FACT_VOCABULARY.flatMap((spec) => spec.phrases.map((phrase) => ({ spec, phrase }))).sort((a, b) => b.phrase.length - a.phrase.length);
  for (const { spec, phrase } of all) {
    let from = 0;
    for (;;) {
      const at = lower.indexOf(phrase, from);
      if (at < 0) break;
      const end = at + phrase.length;
      const wordStart = at === 0 || !/[a-z0-9]/.test(lower[at - 1]);
      const wordEnd = end === lower.length || !/[a-z0-9]/.test(lower[end]);
      const free = !claimed.some(([s, e]) => at < e && end > s);
      if (wordStart && wordEnd && free && !hits.some((h) => h.spec.key === spec.key)) {
        claimed.push([at, end]);
        hits.push({ spec, at, phrase });
      }
      from = end;
    }
  }
  return hits.sort((a, b) => a.at - b.at);
}

function severityOf(sentence: string): { severity: Severity; why: string } {
  if (/\b(must not|may not|shall not|prohibited|not permitted|held for review|is held|blocked?|does not go out|may not be sent|withheld)\b/i.test(sentence)) return { severity: "block", why: "a prohibition or a hold reads as block" };
  if (/\b(flag|flagged|review|escalate|escalated|report|reported|supervisor|principal)\b/i.test(sentence)) return { severity: "flag", why: "review, escalation or reporting reads as flag" };
  if (/\b(note|noted|log|logged|record|recorded)\b/i.test(sentence)) return { severity: "note", why: "a logging obligation reads as note" };
  return { severity: "flag", why: "no verb named a severity; flag is the default, never block" };
}

function windowAround(sentence: string, at: number, len: number, before = 48, after = 40): string {
  return sentence.slice(Math.max(0, at - before), Math.min(sentence.length, at + len + after));
}

/** Read one sentence into a candidate, or say why it is not one. */
function readSentence(s: { sentence: string; paragraph: number }, docName: string, n: number): CandidateRule | { why: string } {
  const { sentence } = s;
  if (!OBLIGATION.test(sentence)) return { why: "No obligation: nothing must, may not, or is required." };
  const facts = factsIn(sentence);
  if (facts.length === 0) return { why: "An obligation, but it names no fact the engines compute. A person writes this one, or the vocabulary grows." };
  const scopes = [...new Set(facts.map((f) => f.spec.scope))];
  const trace: string[] = [];
  const unresolved: string[] = [];
  let confidence = 1;
  if (scopes.length > 1) unresolved.push(`Names facts from two scopes (${scopes.join(", ")}); one rule reads one scope.`);
  const scope = facts[0].spec.scope;

  const leaves: Condition[] = [];
  const tail: Condition[] = [];
  const params: RuleDefinition["params"] = [];
  const cut = sentence.search(/\b(without|unless)\b/i);
  for (const f of facts) {
    const into = cut >= 0 && f.at > cut ? tail : leaves;
    const near = windowAround(sentence, f.at, f.phrase.length);
    if (f.spec.type === "boolean") {
      const before = sentence.slice(Math.max(0, f.at - 40), f.at);
      const negated = NEGATION.test(before);
      const absent = negated || (cut >= 0 && f.at > cut);
      into.push({ fact: f.spec.key, cmp: "eq", value: !absent });
      trace.push(`"${f.phrase}" is ${f.spec.key}; ${absent ? `"${(negated ? before.trim().split(/\s+/).slice(-3) : sentence.slice(cut).split(/\s+/).slice(0, 1)).join(" ")}" before it reads as absent, so it must be false` : "present reads as true"}.`);
    } else {
      const num = near.match(NUMBER);
      if (!num) {
        unresolved.push(`"${f.phrase}" is a number (${f.spec.label}) but no figure sits near it.`);
        continue;
      }
      const value = Number(num[1]);
      const cmpWord = CMP_WORDS.find((c) => c.re.test(near));
      let cmp: Comparator;
      if (cmpWord) { cmp = cmpWord.cmp; trace.push(`"${near.match(cmpWord.re)![0]}" near ${value} reads as ${cmp}.`); }
      else { cmp = f.spec.defaultCmp ?? "gte"; confidence = Math.min(confidence, 0.75); trace.push(`No comparator word near ${value}; ${f.spec.label} usually reads as ${cmp}, so that is assumed and the confidence is lowered.`); }
      const key = `${f.spec.key}Threshold`;
      into.push({ fact: f.spec.key, cmp, param: key });
      const stricter = cmp === "gt" || cmp === "gte" ? "lower" : "higher";
      params.push({ key, label: `${f.spec.label}${f.spec.unit ? ` (${f.spec.unit})` : ""}`, type: "number", value, stricter, note: `From the policy: "${near.trim()}".` });
    }
  }
  if (leaves.length + tail.length === 0) return { why: unresolved.join(" ") };

  const head = cut >= 0 ? sentence.slice(0, cut) : sentence;
  const ors = (head.match(/\bor\b/gi) ?? []).length;
  const ands = (head.match(/\b(and|with|while|whose|who)\b/gi) ?? []).length;
  const main: Condition | undefined = leaves.length === 0 ? undefined : leaves.length === 1 ? leaves[0] : ors > ands ? { any: leaves } : { all: leaves };
  const when: Condition = main && tail.length ? { all: [main, ...tail] } : main ?? (tail.length === 1 ? tail[0] : { all: tail });
  if (leaves.length > 1) trace.push(`${leaves.length} facts joined with ${ors > ands ? "any (the sentence says or)" : "all (the sentence says and)"}.`);
  if (tail.length) trace.push(`${tail.length} fact${tail.length === 1 ? "" : "s"} after "${sentence.slice(cut).split(/\s+/)[0]}" must also hold, as absent.`);

  const sev = severityOf(sentence);
  trace.push(`Severity ${sev.severity}: ${sev.why}.`);
  const cite = sentence.match(CITATION);
  const authority: RuleDefinition["authority"] = cite ? (/^FINRA|Regulatory Notice/.test(cite[0]) ? "FINRA" : "SEC") : "Firm";
  const citation = cite ? cite[0] : `${docName}, paragraph ${s.paragraph}`;
  trace.push(cite ? `Cites ${cite[0]}.` : "Cites no rule; the policy itself is the authority.");

  const keys = [...leaves, ...tail].map((l) => ("fact" in l ? l.fact : "")).filter(Boolean);
  const overlaps = BASELINE.filter((r) => r.scope === scope && keys.every((k) => factsUsed(r.when).has(k))).map((r) => r.id);
  if (overlaps.length) trace.push(`The baseline already reads these facts in ${overlaps.join(", ")}; adding this one runs both.`);

  const factList = keys.map((k) => `${k} = {${k}}`).join(", ");
  const title = cap(sentence.replace(/\s*\(.*?\)\s*/g, " ").trim()).slice(0, 88).replace(/\s+\S*$/, (m) => (sentence.length > 88 ? "" : m));
  return {
    id: `policy-${slug(docName)}-${n}`,
    title,
    authority,
    citation,
    scope,
    severity: sev.severity,
    mandatory: false,
    enabled: true,
    when,
    params,
    evidence: keys,
    finding: `${title}. Read: ${factList}.`,
    remediation: `Review against the policy: "${sentence}."`,
    confidenceFloor: 0.8,
    requires: [],
    actions: sev.severity === "block"
      ? [{ kind: "hold", what: `Hold pending disposition. The policy reads: "${sentence}."` }]
      : [{ kind: "task", text: `Review against the policy: ${title.toLowerCase()}`, owner: "Advisor", dueInDays: 2 }],
    sentence,
    paragraph: s.paragraph,
    confidence: unresolved.length ? Math.min(confidence, 0.4) : confidence,
    unresolved,
    factKeys: keys,
    overlaps,
    trace,
  };
}

/** Read a whole policy document. Pure: the same text gives the same candidates. */
export function readPolicy(text: string, documentName = "policy"): PolicyReading {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const sentences = sentencesOf(text);
  const candidates: CandidateRule[] = [];
  const skipped: PolicyReading["skipped"] = [];
  for (const s of sentences) {
    const r = readSentence(s, documentName, candidates.length + 1);
    if ("why" in r) skipped.push({ sentence: s.sentence, why: r.why });
    else candidates.push(r);
  }
  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  return { documentName, paragraphs: new Set(sentences.map((s) => s.paragraph)).size, sentences: sentences.length, candidates, skipped, ms: Math.max(1, Math.round(t1 - t0)) };
}

/** The rule as the engine will run it: the candidate without its reading notes. */
export function toRule(c: CandidateRule): RuleDefinition {
  const { sentence: _s, paragraph: _p, confidence: _c, unresolved: _u, factKeys: _f, overlaps: _o, trace: _t, ...rule } = c;
  void _s; void _p; void _c; void _u; void _f; void _o; void _t;
  return rule;
}

/** A short firm policy, invented, that exercises every kind of reading. Shipped as data so the screen has something to read. */
export const SAMPLE_POLICY = `# Written supervisory procedures, section 4: client protection and communications

## 4.1 Senior and vulnerable clients
An account whose client is 65 years of age or older with a new third-party contact must be flagged for review by the advisor within two business days (FINRA Rule 2165).
Where a client is aged 70 or over and no trusted contact is on file, the advisor must request the trusted contact form.
An unusual disbursement on any account with a complaint that is not logged is held for review.

## 4.2 Concentration
A single-name position over 20 percent of the household must be reviewed against the household's own ceiling (FINRA Rule 2111).

## 4.3 Client communications
Client-facing text that contains a performance projection or a testimonial may not be sent without principal approval (SEC Rule 206(4)-1).
Any message that is machine-drafted with fewer than 2 cited sources is held for review (Regulatory Notice 24-09).
Outside business language in an outbound message with no OBA on file must be reported to the supervisor (FINRA Rule 3270).

## 4.4 General
Advisors should read this section every quarter.
The firm's brand colours are set by marketing.
`;
