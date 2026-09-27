import Link from "next/link";
import { AGENTS } from "@/lib/compliance/agents";
import { BASELINE } from "@/lib/compliance/policy";
import { CLIENTS, ADVISORS_DATA, DOCUMENTS } from "@/lib/data";
import { Icon } from "@/components/icons";
import { Card, CardGrid, Legend, More, PageTitle, Section, StatRow, Timeline, Who } from "@/components/ui";

export const metadata = { title: "How it works" };

export default function HowItWorks() {
  return (
    <>
      <PageTitle title="How Relay works" sub="An agent layer that reads an advisor's whole book on a cadence, prepares every action short of the human gate, and hands each decision to a person. Nothing leaves without a person sending it." />
      <Legend className="-mt-5 mb-6 lg:hidden" />

      <StatRow
        items={[
          { value: AGENTS.length + 6, label: "Agents, each with a cadence", icon: "agent" },
          { value: BASELINE.length, label: "Rules as data, tighten only", icon: "rules" },
          { value: CLIENTS.length, label: `Households across ${ADVISORS_DATA.length} advisors, all invented`, icon: "people" },
          { value: DOCUMENTS.length, label: "Documents the agents may quote", icon: "library" },
        ]}
      />

      <Section title="The loop, every morning">
        <Timeline
          items={[
            { at: "1", icon: "link", title: <><Who who="client" />Records arrive through read-only connectors</>, meta: "The CRM, the custodian feed, the archive of every captured channel, e-sign, the document corpus. Or a spreadsheet dropped in the browser. Nothing is written back, nothing is sent." },
            { at: "2", icon: "sweep", title: <><Who who="agent" />Fourteen agents read on their cadence</>, meta: "Compliance desks on every draft, daily or weekly; research before each conversation; retrieval on every opportunity; discovery over what clients said; the consequence agent on every proposal." },
            { at: "3", icon: "eye", title: <><Who who="agent" />Each one detects, cites and prepares</>, meta: "A finding names the facts it read and the rule it applied. A briefing cites every claim to a field. A candidate cites its sentence. A prepared action is a drafted note, a hold, a callback, a form or a task, ready to accept." },
            { at: "4", icon: "shield", title: <><Who who="advisor" />A person decides, at the gate</>, meta: "The advisor accepts or declines each prepared action; a principal dispositions each finding; nobody clears their own. Every disposition is recorded against the rules as they stood." },
            { at: "5", icon: "email", title: <><Who who="advisor" />The person sends, outside Relay</>, meta: "A note leaves from the advisor's own email after review. Relay records that they said so. There is no module that can reach a transport, and a guard proves it." },
          ]}
        />
      </Section>

      <Section title="What an agent is here">
        <CardGrid cols={3}>
          <Card icon="rules" title="A bundle, a cadence, an owner">
            <p className="text-[13px] text-ink-2">Not a second engine. A compliance desk is the rules it watches, when it runs and the team it mirrors. Adding one is adding an entry in a data file.</p>
          </Card>
          <Card icon="document" title="Evidence before opinion">
            <p className="text-[13px] text-ink-2">Every claim carries where it came from. A document that cannot be found is a refusal that names what is missing, never a softened answer.</p>
          </Card>
          <Card icon="question" title="Honest about what it does not know">
            <p className="text-[13px] text-ink-2">A rule whose source is not connected says it cannot evaluate. A briefing lists what it could not establish. A public record is unverified until a person confirms it.</p>
          </Card>
        </CardGrid>
      </Section>

      <Section title="Where a model sits, and where it never does">
        <div className="grid gap-6 md:grid-cols-2">
          <Card tone="positive" icon="check" title="A model may compose">
            <ul className="space-y-1 text-[13px] text-ink-2">
              <li>The wording of a client note, from figures and sources chosen by code</li>
              <li>Reading free text more capably: a request, a note, a press item</li>
              <li>Phrasing the questions a supervisor will ask</li>
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
        <p className="mt-3 text-[13px] text-ink-2">
          This prototype makes no model calls at all: every step is the deterministic version, and each screen says which step a model would own in production. That is what lets the same facts produce the same verdict twice, and a past decision be <Link href="/compliance/replay" className="underline">replayed</Link> against the rules as they stood.
        </p>
      </Section>

      <Section title="See it run">
        <div className="rounded border border-line px-3 sm:px-4">
          {[
            { href: "/", icon: "home" as const, title: "The overview", meta: "What the agents did overnight, with the compute it took and a trace under every prepared action" },
            { href: "/simulate", icon: "hourglass" as const, title: "Before you act", meta: "Every option for a proposal carried to the morning after, graded" },
            { href: "/clients", icon: "people" as const, title: "Households", meta: "Connect your own list; ask for a dossier from five sources" },
            { href: "/compliance", icon: "shield" as const, title: "Review desks", meta: "Eight compliance agents, tuned per advisor, tighten only" },
            { href: "/data", icon: "link" as const, title: "Connect data", meta: "Drop a spreadsheet and watch every agent run over it live" },
          ].map((r) => (
            <Link key={r.href} href={r.href} className="flex items-start gap-3 border-b border-line px-1 py-3 last:border-b-0 hover:bg-subtle">
              <Icon name={r.icon} size={20} className="mt-px text-ink-3" />
              <span className="min-w-0 flex-1"><span className="block text-[14px] text-ink">{r.title}</span><span className="block text-[12px] text-ink-3">{r.meta}</span></span>
              <Icon name="chevron" size={16} className="self-center text-ink-3" />
            </Link>
          ))}
        </div>
        <More summary="What is synthetic, and what is real">
          Every client, advisor, document and message is invented, as cited composites of published practice
          patterns. Instruments, tax mechanics and the regulations the desks apply are real, so the engines are
          genuinely exercised. Sources for every composite are on the Who&apos;s who page.
        </More>
      </Section>
    </>
  );
}
