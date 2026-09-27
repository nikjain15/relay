import Link from "next/link";
import { AGENTS } from "@/lib/compliance/agents";
import { EXTRACTORS } from "@/lib/discovery/discover";
import { PROBE_IDS } from "@/lib/research/brief";
import { CATALOG } from "@/lib/connectors/catalog";
import { Card, CardGrid, PageTitle, Pill, Section, TableScroll, Who, td, th } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { AboutNav, NextPage, Takeaways } from "@/components/about";

export const metadata = { title: "Features" };

const OTHER: { name: string; icon: IconName; reads: string; leaves: string; href: string }[] = [
  { name: "Research", icon: "briefing", reads: "The client file, the service queue, the firm's record, the channels", leaves: `A briefing from ${PROBE_IDS.length} probes: what changed, observed, inferred with a confidence, not established`, href: "/research" },
  { name: "Dossier", icon: "crm", reads: "The file, the CRM, the captured corpus, the firm's documents, the public record", leaves: "Every claim cited, sources checked against each other, a CRM note a person files", href: "/clients" },
  { name: "Retrieval", icon: "library", reads: "The document corpus, on every opportunity", leaves: "Cited passages with a reason per score, conflicts shown as conflicts, or a refusal", href: "/documents" },
  { name: "Discovery", icon: "search", reads: "What clients said, in messages, notes and contact summaries", leaves: `Candidate opportunities from ${EXTRACTORS.length} extractors, each cited to its sentence`, href: "/discovery" },
  { name: "Options and consequences", icon: "hourglass", reads: "Every shelf product against the household's rules, on a copy of the household", leaves: "After-tax income, cost, access, rate risk, and the morning after, graded", href: "/simulate" },
  { name: "Rule-change proposer", icon: "flag", reads: "Ninety days of findings", leaves: "Tighten-only rule changes with the findings behind each, for a principal", href: "/compliance" },
  { name: "Policy reader", icon: "document", reads: "A written supervisory procedure", leaves: "Candidate rules in the engine's own shape, each cited to its sentence, for a person to add to a desk", href: `/agents/${AGENTS[0].id}` },
  { name: "Ask", icon: "agent", reads: "The book, the findings, the rules, the sources, today's calendar", leaves: "An answer to a plain question, with the records it read", href: "/" },
];

export default function Features() {
  return (
    <>
      <PageTitle icon="list" title="Features" sub="Fourteen agents, the screens they feed, the tools they read, and the guarantees underneath all of them." />
      <AboutNav />
      <Takeaways
        items={[
          <>{AGENTS.length} compliance review desks mirror the teams a legal, risk and compliance function runs, and an advisor&apos;s layer can tighten any of them and loosen none.</>,
          <>Eight more agents read the book for the advisor: research, dossier, retrieval, discovery, options and consequences, the proposer, the policy reader, and Ask.</>,
          <>Everything is data and everything is cited. A client, a rule, a desk, a connector: one file each. Add a file and it is in the product.</>,
        ]}
      />

      <Section title={`${AGENTS.length} compliance review desks`}>
        <TableScroll>
          <table className="w-full min-w-[44rem] border-collapse text-[13px]">
            <thead><tr><th className={th}>Desk</th><th className={th}>Mirrors</th><th className={th}>Authorities</th><th className={th}>Runs</th></tr></thead>
            <tbody>
              {AGENTS.map((a) => (
                <tr key={a.id}>
                  <td className={td}><Link href={`/agents/${a.id}`} className="underline"><Who who="agent" />{a.desk}</Link></td>
                  <td className={`${td} text-ink-2`}>{a.mirrors}</td>
                  <td className={td}><span className="flex flex-wrap gap-1">{a.authorities.map((x) => <Pill key={x}>{x}</Pill>)}</span></td>
                  <td className={`${td} text-ink-2`}>{a.cadence.replace("_", " ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <p className="mt-2 text-[12px] text-ink-3">Open any desk to see its rules, its findings, tune its cadence for one advisor, or read a written policy into it.</p>
      </Section>

      <Section title="Eight agents that read the book for the advisor">
        <TableScroll>
          <table className="w-full min-w-[44rem] border-collapse text-[13px]">
            <thead><tr><th className={th}>Agent</th><th className={th}>Reads</th><th className={th}>Leaves for a person</th></tr></thead>
            <tbody>
              {OTHER.map((a) => (
                <tr key={a.name}>
                  <td className={td}><Link href={a.href} className="flex items-center gap-2 underline"><Icon name={a.icon} size={16} className="text-agent" />{a.name}</Link></td>
                  <td className={`${td} text-ink-2`}>{a.reads}</td>
                  <td className={`${td} text-ink-2`}>{a.leaves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Section>

      <Section title="For the advisor">
        <CardGrid cols={3}>
          <Card icon="home" title="A morning inbox, not a dashboard"><p className="text-[13px] text-ink-2">Decide now, review what the agents prepared, see what else ran. Every action opens with the draft, the reasoning and where it goes; a decision stays on screen as a recorded outcome.</p></Card>
          <Card icon="filter" title="Options the way an advisor compares them"><p className="text-[13px] text-ink-2">After-tax income, cost over the horizon, access, rate risk, and the morning after for each, with a rejected option shown with the failing rule named.</p></Card>
          <Card icon="agent" title="Ask anything, cited"><p className="text-[13px] text-ink-2">A household&apos;s cover, what a client said, what needs you first, what a desk watches. Every answer names the records it read.</p></Card>
          <Card icon="link" title={`Reads the tools you already run`}><p className="text-[13px] text-ink-2">{CATALOG.length} connectors across CRM, custodian, portfolio, planning, archive, e-signature and every channel. Read only; the advisor keeps working where they work.</p></Card>
          <Card icon="calendar" title="Every conversation prepared"><p className="text-[13px] text-ink-2">A briefing and a review pack before each meeting, with what could not be established listed rather than guessed.</p></Card>
          <Card icon="settings" title="Personalized, never loosened"><p className="text-[13px] text-ink-2">Preferences resolve most-specific-wins; rules resolve strictest-wins; the learning loop proposes and never applies.</p></Card>
        </CardGrid>
      </Section>

      <Section title="For the supervisor">
        <CardGrid cols={3}>
          <Card icon="shield" title="Findings that arrive prepared"><p className="text-[13px] text-ink-2">The facts read, the citation, the drafted remediation and the prepared action. Disposition is one decision, defended later by replay.</p></Card>
          <Card icon="document" title="Policies become rules"><p className="text-[13px] text-ink-2">Paste a written supervisory procedure into a desk; each obligation becomes a candidate rule cited to its sentence; a principal adds the ones the firm meant.</p></Card>
          <Card icon="log" title="Every change attributed"><p className="text-[13px] text-ink-2">Who, when, which layer, from what to what, and why. An attempt to loosen is refused and stays in the log.</p></Card>
        </CardGrid>
      </Section>

      <Section title="Underneath all of it">
        <div className="rounded border border-line px-3 sm:px-4">
          {[
            ["Never sends", "No module can reach an outbound transport. Enforced by dependency-cruiser, a test suite and a content security policy in the browser."],
            ["The model never decides", "Eligibility, ranking, the recipient count, the supervisory regime, every rule verdict and every grade are deterministic code."],
            ["Nothing clears its own findings", "An agent detects and prepares; a principal dispositions; a person accepts each prepared action."],
            ["Everything is data", "A client, an advisor, a document, a rule, a desk, a connector: one file each."],
            ["Evaluated, not asserted", "A 300-household corpus scored by an expected side that imports nothing from the engines, enforced in the check suite."],
          ].map(([t, m]) => (
            <div key={t} className="flex items-start gap-3 border-b border-line px-1 py-3 last:border-b-0">
              <span className="min-w-0 flex-1"><span className="block text-[14px] text-ink">{t}</span><span className="block text-[12px] text-ink-3">{m}</span></span>
            </div>
          ))}
        </div>
      </Section>
      <NextPage />
    </>
  );
}
