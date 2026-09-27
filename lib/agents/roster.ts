// Every agent that is not a compliance desk, in one list. The desks are
// data/compliance/agents.json; these are the rest. Every screen that names or
// counts "the agents" reads this and AGENTS, so the Overview, How it works,
// Features, Architecture and the README cannot drift apart again (they said 14,
// 15 and 16 at once before this file existed).
//
// `cadence` says when an agent runs: "morning" agents run on the book before
// anyone opens Relay and show on the Overview's "What else ran"; "on request"
// agents run when a person asks (a dossier, a policy read, a question).
import { AGENTS } from "@/lib/compliance/agents";

export interface RosterAgent {
  id: string;
  name: string;
  /** An icon name from components/icons; kept as a string so lib does not import components. */
  icon: string;
  cadence: "morning" | "on request";
  /** One sentence, in the advisor's words: what this agent is for. */
  role: string;
  reads: string;
  /** What it works out, step by step. */
  checks: string[];
  leaves: string;
  never: string;
  href: string;
  /** Whether an advisor may turn it off for themselves. Ask stays on: it is how you reach everything else. */
  canTurnOff: boolean;
}

export const ROSTER: RosterAgent[] = [
  { id: "research", name: "Research", icon: "briefing", cadence: "morning", reads: "The client file, the service queue, the firm's record, the channels", leaves: "A briefing per household: what changed, observed, inferred with a confidence, not established", role: "Before every conversation, tells you what changed since you last spoke and what nobody has established yet.", checks: ["What changed since the last contact", "What the file observes, apart from what it only infers", "What could not be established, and why"], never: "Never contacts the client; an inference is never shown as a fact.", canTurnOff: true, href: "/research" },
  { id: "retrieval", name: "Retrieval", icon: "library", cadence: "morning", reads: "The document corpus, on every opportunity", leaves: "Cited passages with a reason per score, conflicts shown as conflicts, or a refusal", role: "Finds the passages in the firm's documents that support an opportunity, or refuses when none do.", checks: ["Which current documents speak to the opportunity", "How relevant each passage is, with the reasons", "Whether two documents disagree or one is past its review date"], never: "Never cites a superseded or out-of-date document, and never writes its own evidence.", canTurnOff: true, href: "/documents" },
  { id: "discovery", name: "Discovery", icon: "search", cadence: "morning", reads: "What clients said, in messages, notes and contact summaries", leaves: "Candidate opportunities, each cited to its sentence", role: "Reads what clients said and spots opportunities the data feeds missed.", checks: ["Life events, money moves and intentions in messages, notes and call summaries", "How confident it is, sentence by sentence"], never: "Never puts anything on your list until you accept it.", canTurnOff: true, href: "/discovery" },
  { id: "consequence", name: "Options and consequences", icon: "hourglass", cadence: "morning", reads: "Every shelf product against the household's rules, on a copy of the household", leaves: "After-tax income, cost, access, rate risk, and the morning after, graded", role: "Shows what the morning after each option looks like before you act.", checks: ["Every product on the approved shelf against the family's rules", "After-tax income, cost, access and rate risk", "Which rules would change their verdict the next day"], never: "Never recommends; it grades every option the same way and you choose.", canTurnOff: true, href: "/simulate" },
  { id: "proposer", name: "Rule-change proposer", icon: "flag", cadence: "morning", reads: "Ninety days of findings", leaves: "Tighten-only rule changes with the findings behind each, for a principal", role: "Suggests stricter rules when the last 90 days of findings show a gap.", checks: ["Patterns across past findings", "Whether a change would only tighten"], never: "Never loosens a rule, and never applies a change: a principal accepts or refuses.", canTurnOff: true, href: "/compliance" },
  { id: "meetings", name: "Meeting prep", icon: "calendar", cadence: "morning", reads: "Today's calendar and the client file behind each meeting", leaves: "A review pack and a briefing for every client meeting", role: "Builds a review pack and a briefing for every client meeting on your calendar.", checks: ["Today's calendar", "The client file behind each meeting"], never: "Never drafts anything for the client.", canTurnOff: true, href: "/meetings" },
  { id: "ranking", name: "Ranking", icon: "settings", cadence: "morning", reads: "Every opportunity raised on the advisor's book", leaves: "Today's list: materiality times the advisor's weight, capped at the advisor's list size", role: "Orders today's list so the most material item for you is first.", checks: ["Materiality of each opportunity", "Your weight for each kind of signal", "Your list size"], never: "Never changes which options pass a family's rules; it only orders what you see.", canTurnOff: true, href: "/triage#tune" },
  { id: "dossier", name: "Dossier", icon: "crm", cadence: "on request", reads: "The file, the CRM, the captured corpus, the firm's documents, the public record", leaves: "Every claim cited, sources checked against each other, a CRM note a person files", role: "Researches one household on request and drafts the CRM note you file.", checks: ["The file, the CRM, captured messages, the firm's documents and the public record", "Where the sources disagree"], never: "Never treats the public record as fact until you confirm it.", canTurnOff: true, href: "/clients" },
  { id: "policy-reader", name: "Policy reader", icon: "document", cadence: "on request", reads: "A written supervisory procedure", leaves: "Candidate rules in the engine's own shape, each cited to its sentence, for a person to add to a desk", role: "Turns a written procedure into candidate rules for a desk.", checks: ["Each sentence that states an obligation", "The rule shape it maps to, cited to the sentence"], never: "Never adds a rule itself: a person chooses which to add.", canTurnOff: true, href: `/agents/${AGENTS[0].id}` },
  { id: "ask", name: "Ask", icon: "agent", cadence: "on request", reads: "The advisor's book, the findings, the rules, the sources, today's calendar", leaves: "An answer to a plain question, with the records it read", role: "Answers a plain question from your book, the findings, the rules and the sources, with the records it read.", checks: ["Which household, desk, rule or source the question is about", "The figure from the same engine the screen uses"], never: "Never sends, and never guesses a figure it does not hold.", canTurnOff: false, href: "/" },
];

export const MORNING = ROSTER.filter((a) => a.cadence === "morning");
export const ON_REQUEST = ROSTER.filter((a) => a.cadence === "on request");

/** Every agent: the compliance desks and the roster. */
export const AGENT_COUNT = AGENTS.length + ROSTER.length;
/** The agents that run on the book every morning, before anyone asks. */
export const MORNING_COUNT = AGENTS.length + MORNING.length;

const WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
/** "Eighteen", for a sentence that starts with the count. */
export const inWords = (n: number) => (WORDS[n] ?? String(n)).replace(/^./, (x) => x.toUpperCase());
