import Link from "next/link";
import golden from "@/evals/golden.json";
import { AGENTS } from "@/lib/compliance/agents";
import { BASELINE } from "@/lib/compliance/policy";
import { Card, CardGrid, Legend, More, PageTitle, Section, StatRow, Who } from "@/components/ui";

export const metadata = { title: "Impact" };

const G = golden as { corpus: { households: number; messages: number; opportunities: number }; briefings: { households: number; unknowns: number; inferred: number }; retrieval: { opportunities: number; refused: number; conflicts: number }; rules: Record<string, { expected: number; found: number }>; discovery: Record<string, { expected: number; found: number }> };
const findings = Object.values(G.rules).reduce((s, r) => s + r.found, 0);
const candidates = Object.values(G.discovery).reduce((s, r) => s + r.found, 0);

export default function Impact() {
  return (
    <>
      <PageTitle title="Impact" sub="What changes for an advisor, a supervisor and a firm when the step after the insight is automated up to the human gate. Measured on the prototype; the claims are sized to what was measured." />
      <Legend className="-mt-5 mb-6 lg:hidden" />

      <Section title="The problem Relay is built for">
        <p className="max-w-3xl text-[14px] text-ink">
          A wealth manager&apos;s insight engine can flag tens of millions of client opportunities a year. What it cannot do is turn one into a documented, approved, client-facing action: the evidence read, the options bounded, the note composed, the audience counted, the supervisory regime decided, the finding dispositioned, the follow-up owned. That step is where the hours go, and where the risk sits. Relay is that step, as an agent layer that does everything up to the gate and hands the decision to a person.
        </p>
      </Section>

      <Section title="Measured on a 300-household book, in the browser, with no model calls">
        <StatRow
          items={[
            { value: G.corpus.households, label: `Households read, ${G.corpus.messages} captured messages`, icon: "people" },
            { value: findings, label: `Compliance findings raised across ${Object.keys(G.rules).length} rules, every one cited`, icon: "shield" },
            { value: G.briefings.households, label: `Briefings assembled, ${G.briefings.unknowns} things named as not established`, icon: "briefing" },
            { value: candidates, label: "Opportunities found in what clients said, each cited to its sentence", icon: "search" },
          ]}
        />
        <p className="text-[13px] text-ink-2">
          Every figure above is reproduced by the evaluation in the check suite: an expected side that imports nothing from the engines works out what each agent should find, and the run matches it with no finding missed and none raised wrongly. The report is in the repository under <code className="text-[12px]">evals/</code>. Run time for the whole book is seconds of compute on a laptop; the <Link href="/data" className="underline">Connect data</Link> screen shows the milliseconds per step live.
        </p>
      </Section>

      <Section title="For the advisor">
        <CardGrid cols={3}>
          <Card icon="list" title={<><Who who="advisor" />Decisions, not reading</>}>
            <p className="text-[13px] text-ink-2">The morning opens with what only a person can decide, worst first. The reading, the citing and the drafting happened overnight. Each row is one decision with its reasoning one click away.</p>
          </Card>
          <Card icon="briefing" title={<><Who who="advisor" />Every conversation prepared</>}>
            <p className="text-[13px] text-ink-2">A briefing before each meeting that separates what is observed from what is inferred, and says what it could not establish. A dossier that checks the firm&apos;s record against the public one.</p>
          </Card>
          <Card icon="hourglass" title={<><Who who="advisor" />The consequences first</>}>
            <p className="text-[13px] text-ink-2">Every option carried to the morning after before it is chosen: Liquidity, concentration, what the sweep will raise, what a supervisor will ask. The surprise happens on screen, not in the file.</p>
          </Card>
        </CardGrid>
      </Section>

      <Section title="For the supervisor">
        <CardGrid cols={3}>
          <Card icon="shield" title={<><Who who="agent" />Whole-book surveillance</>}>
            <p className="text-[13px] text-ink-2">{AGENTS.length} desks read every account, every captured message in both directions and every draft, on a cadence, and raise the account nobody opened this week. A rule whose source is missing says so rather than clearing.</p>
          </Card>
          <Card icon="check" title={<><Who who="agent" />Findings that arrive prepared</>}>
            <p className="text-[13px] text-ink-2">The facts read, the citation, the drafted remediation and the prepared action: a hold, a callback, a form, a task, a note. Disposition is one decision, defended later by replay.</p>
          </Card>
          <Card icon="flag" title={<><Who who="agent" />Rules that get stricter, never looser</>}>
            <p className="text-[13px] text-ink-2">The proposer reads ninety days of findings and proposes tightenings with the evidence. Every layer can tighten; none can loosen; every refusal is on the record.</p>
          </Card>
        </CardGrid>
      </Section>

      <Section title="For the firm">
        <CardGrid cols={3}>
          <Card icon="library" title="Defensible by construction">
            <p className="text-[13px] text-ink-2">Every claim cites a record. Every verdict is reproducible from the facts and the rules as they stood. A refusal is a first-class outcome. Nothing is sent by a system.</p>
          </Card>
          <Card icon="rules" title={`${BASELINE.length} rules, and the next one is a file`}>
            <p className="text-[13px] text-ink-2">A rule, a desk, a client, a document: data, not code. A change is an attributed entry in a log the console replays. A new desk is a new entry.</p>
          </Card>
          <Card icon="link" title="Fits what is already there">
            <p className="text-[13px] text-ink-2">Read-only connectors over the CRM, the custodian, the archive and e-sign. The advisor keeps sending from their own tools. A model, where used, composes language and decides nothing.</p>
          </Card>
        </CardGrid>
        <More summary="What this does not claim">
          No hours-saved or revenue figure is stated here, because none was measured: the data is synthetic and
          the population is a prototype&apos;s. What is measured is coverage, precision and recall on a known
          corpus, the compute each step takes, and the number of decisions that reach a person prepared rather
          than raw. The conversion between an insight flagged and an action taken is the figure a pilot would
          establish, and the measurement screen is built to hold it.
        </More>
      </Section>
    </>
  );
}
