import { AGENTS } from "@/lib/compliance/agents";
import { MORNING_COUNT, ON_REQUEST } from "@/lib/agents/roster";
import { BASELINE } from "@/lib/compliance/policy";
import { CLIENTS, ADVISORS_DATA } from "@/lib/data";
import { CATALOG } from "@/lib/connectors/catalog";
import { Card, CardGrid, More, PageTitle, Section } from "@/components/ui";
import { AboutNav, NextPage, Step, Takeaways } from "@/components/about";

export const metadata = { title: "How it works" };

export default function HowItWorks() {
  return (
    <>
      <PageTitle icon="sweep" title="How Relay works" sub="Agents read everything an advisor already has, prepare every step short of the decision, and hand each decision to the advisor. Nothing leaves without a person sending it." />
      <AboutNav />
      <Takeaways
        items={[
          <>Relay sits on top of the CRM, custodian, planning and archive tools a practice already runs. It reads them and writes nothing back.</>,
          <>{MORNING_COUNT} agents run on the book every morning, and {ON_REQUEST.length} more when you ask: they detect, cite, draft and carry each option to the morning after. Every result names the records it read.</>,
          <>The advisor decides and sends from their own tools. No module in Relay can reach an outbound transport, and a guard proves it on every build.</>,
        ]}
      />

      <Section title="The loop, every morning">
        <ol className="space-y-4">
          <Step n={1} icon="link" who="client" title="Your records arrive, read only" href="/sources">
            The book from the CRM, positions from the custodian, every captured channel from the archive, plans, e-signed documents, the firm&apos;s research. {CATALOG.length} connectors in the catalogue, or a spreadsheet dropped in the browser.
          </Step>
          <Step n={2} icon="sweep" who="agent" title="The agents read on their cadence" href="/agents">
            {AGENTS.length} compliance desks on every draft, daily or weekly; research before each conversation; discovery over what clients said; retrieval on every opportunity; the consequence agent on every proposal.
          </Step>
          <Step n={3} icon="eye" who="agent" title="Each one detects, cites and prepares" href="/">
            A finding names the facts it read and the rule it applied. A briefing cites every claim to a field. A candidate cites its sentence. A prepared action is a drafted note, a hold, a callback, a form or a task, ready to accept.
          </Step>
          <Step n={4} icon="shield" who="advisor" title="You decide, at the gate" href="/supervision">
            The morning opens with what only you can decide, worst first. You accept or decline each prepared action; a principal dispositions each finding; nobody clears their own. Ask anything and the answer cites its record.
          </Step>
          <Step n={5} icon="email" who="advisor" title="You send, from your own tools" href="/follow-ups">
            A note leaves from your own mail after review. Relay records that you said so. There is no send path to take, which is the whole design.
          </Step>
        </ol>
      </Section>

      <Section title="What makes it trustworthy">
        <CardGrid cols={3}>
          <Card icon="rules" title="Rules and desks are data">
            <p className="text-[13px] text-ink-2">{BASELINE.length} rules and {AGENTS.length} desks live in files a compliance officer edits at runtime. A written policy can be read straight into a desk. Every change is attributed and replayable; a lower layer can only tighten.</p>
          </Card>
          <Card icon="document" title="Evidence before opinion">
            <p className="text-[13px] text-ink-2">Every claim carries where it came from. A document that cannot be found is a refusal that names what is missing, never a softened answer.</p>
          </Card>
          <Card icon="question" title="Honest about what it does not know">
            <p className="text-[13px] text-ink-2">A rule whose source is not connected says it cannot evaluate. A briefing lists what it could not establish. A public record is unverified until a person confirms it.</p>
          </Card>
        </CardGrid>
      </Section>

      <Section title="Where a model sits">
        <div className="grid gap-4 md:grid-cols-2">
          <Card tone="positive" icon="check" title="A model may compose">
            <ul className="space-y-1 text-[13px] text-ink-2">
              <li>The wording of a client note, from figures and sources chosen by code</li>
              <li>Reading free text: a request, a policy sentence, a press item, a question</li>
              <li>Phrasing a briefing, a comparison, an answer</li>
            </ul>
          </Card>
          <Card tone="critical" icon="block" title="A model never decides">
            <ul className="space-y-1 text-[13px] text-ink-2">
              <li>Eligibility, ranking, the recipient count, the supervisory regime</li>
              <li>Any rule verdict, any grade, what corroborates what</li>
              <li>Whether a finding is cleared, or a rule loosened</li>
            </ul>
          </Card>
        </div>
        <More summary="What this demonstration runs on">
          Every step here is the deterministic version, and each screen says which step a model would own in production. That is what lets the same facts produce the same verdict twice, and a past decision be replayed against the rules as they stood. Every client, advisor, document and message is invented ({CLIENTS.length} households across {ADVISORS_DATA.length} advisors, as cited composites of published practice patterns); instruments, tax mechanics and the regulations the desks apply are real. Vendor names in the connector catalogue are for demonstration of the integration surface and imply no affiliation.
        </More>
      </Section>
      <NextPage />
    </>
  );
}
