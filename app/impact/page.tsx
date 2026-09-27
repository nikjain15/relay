import Link from "next/link";
import golden from "@/evals/golden.json";
import { AGENTS } from "@/lib/compliance/agents";
import { BASELINE } from "@/lib/compliance/policy";
import { CATALOG } from "@/lib/connectors/catalog";
import { Card, CardGrid, More, PageTitle, Section, StatRow, Who } from "@/components/ui";
import { AboutNav, NextPage, Takeaways } from "@/components/about";

export const metadata = { title: "Impact" };

const G = golden as { corpus: { households: number; messages: number; opportunities: number }; briefings: { households: number; unknowns: number; inferred: number }; retrieval: { opportunities: number; refused: number; conflicts: number }; rules: Record<string, { expected: number; found: number }>; discovery: Record<string, { expected: number; found: number }> };
const findings = Object.values(G.rules).reduce((s, r) => s + r.found, 0);
const candidates = Object.values(G.discovery).reduce((s, r) => s + r.found, 0);

export default function Impact() {
  return (
    <>
      <PageTitle icon="trend" title="Impact" sub="What changes for an advisor, a supervisor and a firm when the step after the insight is automated up to the human gate. Sized to what was measured." />
      <AboutNav />
      <Takeaways
        items={[
          <>An insight engine can flag millions of opportunities a year. The hours and the risk sit in the step after: evidence, options, note, audience, regime, disposition, follow-up. Relay is that step.</>,
          <>On a 300-household book the agents raise every finding the expected side raises and none it does not, brief every household, and find what clients said, each cited.</>,
          <>It fits what is already there: read-only over {CATALOG.length} tools and channels a practice already runs. The advisor keeps sending from their own mail.</>,
        ]}
      />

      <Section title="The problem it is built for">
        <p className="max-w-3xl text-[14px] leading-relaxed text-ink">
          A wealth manager&apos;s insight engine can flag tens of millions of client opportunities a year. What it cannot do is turn one into a documented, approved, client-facing action: the evidence read, the options compared, the note composed, the audience counted, the supervisory regime decided, the finding dispositioned, the follow-up owned. That step is where the hours go and where the risk sits. Relay does everything up to the gate and hands the decision to a person.
        </p>
      </Section>

      <Section title="Measured on a 300-household book, in the browser">
        <StatRow
          items={[
            { value: G.corpus.households, label: `Households read, ${G.corpus.messages} captured messages`, icon: "people" },
            { value: findings, label: `Compliance findings across ${Object.keys(G.rules).length} rules, every one cited`, icon: "shield" },
            { value: G.briefings.households, label: `Briefings, ${G.briefings.unknowns} things named as not established`, icon: "briefing" },
            { value: candidates, label: "Opportunities found in what clients said, cited to the sentence", icon: "search" },
          ]}
        />
        <p className="text-[13px] text-ink-2">
          Every figure is reproduced by the evaluation in the check suite: an expected side that imports nothing from the engines works out what each agent should find, and the run matches it with nothing missed and nothing raised wrongly. The report is in the repository under <code className="text-[12px]">evals/</code>. The whole book runs in seconds on a laptop; the <Link href="/sources" className="underline">Sources</Link> screen shows the milliseconds per step live.
        </p>
      </Section>

      <Section title="For the advisor">
        <CardGrid cols={3}>
          <Card icon="home" title={<><Who who="advisor" />Decisions, not reading</>}><p className="text-[13px] text-ink-2">The morning opens with what only a person can decide, worst first. The reading, the citing and the drafting happened overnight. Each row is one decision with its reasoning one click away.</p></Card>
          <Card icon="filter" title={<><Who who="advisor" />Calls made on figures</>}><p className="text-[13px] text-ink-2">Every option carries after-tax income, cost over the horizon, access, rate risk and the morning after. The surprise happens on screen, not in the file.</p></Card>
          <Card icon="agent" title={<><Who who="advisor" />An answer in one question</>}><p className="text-[13px] text-ink-2">Cash cover, what a client said, what needs you first: asked in plain words, answered from the records, cited.</p></Card>
        </CardGrid>
      </Section>

      <Section title="For the supervisor">
        <CardGrid cols={3}>
          <Card icon="shield" title={<><Who who="agent" />Whole-book surveillance</>}><p className="text-[13px] text-ink-2">{AGENTS.length} desks read every account, every captured message in both directions and every draft, on a cadence. A rule whose source is missing says so rather than clearing.</p></Card>
          <Card icon="document" title={<><Who who="agent" />Policies become rules</>}><p className="text-[13px] text-ink-2">A written procedure is read into candidate rules cited to its sentences; a principal adds the ones the firm meant. The gap between the policy binder and the surveillance shrinks to a review.</p></Card>
          <Card icon="flag" title={<><Who who="agent" />Stricter, never looser</>}><p className="text-[13px] text-ink-2">The proposer reads ninety days of findings and proposes tightenings with the evidence. Every layer can tighten; none can loosen; every refusal is on the record.</p></Card>
        </CardGrid>
      </Section>

      <Section title="For the firm">
        <CardGrid cols={3}>
          <Card icon="library" title="Defensible by construction"><p className="text-[13px] text-ink-2">Every claim cites a record. Every verdict is reproducible from the facts and the rules as they stood. A refusal is a first-class outcome. Nothing is sent by a system.</p></Card>
          <Card icon="rules" title={`${BASELINE.length} rules, and the next one is a file`}><p className="text-[13px] text-ink-2">A rule, a desk, a client, a document, a connector: data, not code. A change is an attributed entry in a log the console replays.</p></Card>
          <Card icon="link" title="Fits what is already there"><p className="text-[13px] text-ink-2">Read-only over the CRM, the custodian, the archive, planning and e-sign. Nothing is replaced. A model, where used, composes language and decides nothing.</p></Card>
        </CardGrid>
        <More summary="What this does not claim">
          No hours-saved or revenue figure is stated here, because none was measured: the data is invented and the population is a prototype&apos;s. What is measured is coverage, precision and recall on a known corpus, the compute each step takes, and the number of decisions that reach a person prepared rather than raw. The conversion between an insight flagged and an action taken is the figure a pilot would establish, and the measurement screen is built to hold it.
        </More>
      </Section>
      <NextPage />
    </>
  );
}
