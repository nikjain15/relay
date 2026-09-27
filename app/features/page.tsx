import Link from "next/link";
import { AGENTS } from "@/lib/compliance/agents";
import { EXTRACTORS } from "@/lib/discovery/discover";
import { PROBE_IDS } from "@/lib/research/brief";
import { Card, CardGrid, Legend, PageTitle, Pill, Section, Who } from "@/components/ui";
import type { IconName } from "@/components/icons";

export const metadata = { title: "Features" };

const OTHER: { name: string; icon: IconName; reads: string; leaves: string; href: string }[] = [
  { name: "Research", icon: "briefing", reads: "The client file, the service queue, the firm's record, the channels", leaves: `A briefing in four fixed sections from ${PROBE_IDS.length} probes: what changed, observed, inferred with a confidence, and what could not be established`, href: "/research" },
  { name: "Dossier", icon: "crm", reads: "The file, the CRM, the captured corpus, the firm's documents, the public record", leaves: "Every claim cited, the sources checked against each other, a CRM note a person files", href: "/clients" },
  { name: "Retrieval", icon: "library", reads: "The document corpus, on every opportunity", leaves: "Cited passages with a reason per score, conflicts shown as conflicts, or a refusal that names what is missing", href: "/documents" },
  { name: "Discovery", icon: "search", reads: "What clients said, in messages, notes and contact summaries", leaves: `Candidate opportunities from ${EXTRACTORS.length} extractors, each cited to its sentence with a confidence`, href: "/discovery" },
  { name: "Consequences", icon: "hourglass", reads: "Every option for a proposal, applied to a copy of the household", leaves: "The morning after, graded: Liquidity, concentration, the sweep, the note's regime, the supervisor's questions", href: "/simulate" },
  { name: "Rule-change proposer", icon: "flag", reads: "Ninety days of findings", leaves: "Tighten-only rule changes with the findings behind each, for a principal", href: "/compliance" },
];

export default function Features() {
  return (
    <>
      <PageTitle title="Features" sub="Fourteen agents, the surfaces they feed, and the guarantees that hold underneath all of them." />
      <Legend className="-mt-5 mb-6 lg:hidden" />

      <Section title="Eight compliance review desks">
        <p className="mb-3 max-w-2xl text-[13px] text-ink-2">One agent per team a legal, risk and compliance function runs. Each carries the team it mirrors, the authorities it applies, its rules and its cadence, all as data. An advisor&apos;s layer can tighten any desk and loosen none.</p>
        <CardGrid cols={2}>
          {AGENTS.map((a) => (
            <Card key={a.id} icon="shield" title={<><Who who="agent" />{a.desk}</>} sub={a.mirrors}>
              <p className="flex flex-wrap gap-1">{a.authorities.map((x) => <Pill key={x}>{x}</Pill>)}</p>
            </Card>
          ))}
        </CardGrid>
      </Section>

      <Section title="Six agents that read the book for the advisor">
        <CardGrid cols={2}>
          {OTHER.map((a) => (
            <Card key={a.name} icon={a.icon} title={<><Who who="agent" />{a.name}</>}>
              <p className="text-[13px] text-ink-2"><span className="text-ink">Reads</span> {a.reads}.</p>
              <p className="mt-1 text-[13px] text-ink-2"><span className="text-ink">Leaves for a person</span> {a.leaves}.</p>
              <p className="mt-2 text-[12px]"><Link href={a.href} className="underline">Open</Link></p>
            </Card>
          ))}
        </CardGrid>
      </Section>

      <Section title="For the advisor">
        <CardGrid cols={3}>
          <Card icon="list" title="Today's list, ranked and capped"><p className="text-[13px] text-ink-2">One decision per row, each with the reason path behind it and the evidence it rests on.</p></Card>
          <Card icon="filter" title="Options, bounded"><p className="text-[13px] text-ink-2">Every candidate checked against the household&apos;s own rules; a rejected one shown with the failing constraint named.</p></Card>
          <Card icon="email" title="A note, composed from sources only"><p className="text-[13px] text-ink-2">Figures come from the proposal and cited passages, nowhere else. The recipient counter sets the regime before anything moves.</p></Card>
          <Card icon="calendar" title="Review packs and briefings"><p className="text-[13px] text-ink-2">Built from the client file before each meeting; what you do not yet know, listed.</p></Card>
          <Card icon="link" title="Connect your own book"><p className="text-[13px] text-ink-2">A .csv or .xlsx read in the browser, every row held to the same validator as a shipped file, nothing uploaded.</p></Card>
          <Card icon="settings" title="Personalized, never loosened"><p className="text-[13px] text-ink-2">Preferences resolve most-specific-wins; rules resolve strictest-wins; a learning loop proposes and never applies.</p></Card>
        </CardGrid>
      </Section>

      <Section title="For the supervisor">
        <CardGrid cols={3}>
          <Card icon="shield" title="A queue of prepared actions"><p className="text-[13px] text-ink-2">Each finding carries what its agent prepared: a hold, a callback, a form, a task, a drafted note. Accept or decline; nothing sends.</p></Card>
          <Card icon="replay" title="Replay"><p className="text-[13px] text-ink-2">A past finding re-run against the rules as they stood and as they are now, from an append-only change log.</p></Card>
          <Card icon="log" title="Every change attributed"><p className="text-[13px] text-ink-2">Who, when, which layer, from what to what, and why. An attempt to loosen is refused and stays in the log.</p></Card>
        </CardGrid>
      </Section>

      <Section title="Underneath all of it">
        <div className="rounded border border-line px-3 sm:px-4">
          {[
            ["Never sends", "No module can reach an outbound transport. Enforced by dependency-cruiser, a test suite and a content security policy in the browser."],
            ["The model never decides", "Eligibility, ranking, the recipient count, the supervisory regime, every rule verdict and every grade are deterministic code."],
            ["Nothing clears its own findings", "An agent detects and prepares; a principal dispositions; a person accepts each prepared action."],
            ["Everything is data", "A client, an advisor, a document, a rule, a desk: one file each. Add a file and it is in the product."],
            ["Evaluated, not asserted", "A 300-household corpus scored by an expected side that imports nothing from the engines, enforced in the check suite."],
          ].map(([t, m]) => (
            <div key={t} className="flex items-start gap-3 border-b border-line px-1 py-3 last:border-b-0">
              <span className="min-w-0 flex-1"><span className="block text-[14px] text-ink">{t}</span><span className="block text-[12px] text-ink-3">{m}</span></span>
            </div>
          ))}
        </div>
      </Section>
    </>
  );
}
