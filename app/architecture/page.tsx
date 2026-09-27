import Link from "next/link";
import { Card, CardGrid, More, PageTitle, Section } from "@/components/ui";
import { AboutNav, NextPage, Takeaways } from "@/components/about";

export const metadata = { title: "Architecture" };

function Layer({ x, y, w, label, sub, cls }: { x: number; y: number; w: number; label: string; sub: string; cls: string }) {
  return (
    <g className={cls}>
      <rect x={x} y={y} width={w} height={54} rx={2} fill="none" stroke="currentColor" strokeWidth={1.5} />
      <text x={x + 12} y={y + 22} fontSize={13} fill="currentColor" className="font-medium">{label}</text>
      <text x={x + 12} y={y + 41} fontSize={11} fill="currentColor" opacity={0.75}>{sub}</text>
    </g>
  );
}

const PRINCIPLES: [string, string][] = [
  ["Write the spec before the code", "A build spec names every surface, the data model, each engine's responsibility, the demo path and the tests. Decisions made while building are written back, numbered."],
  ["Make everything a person might change into data", "A client is a file. A rule is JSON with a condition tree the console edits at runtime. A desk and a connector are entries. A validator fails the build on anything inconsistent."],
  ["Keep the engines deterministic; put the model at the edges", "The same facts produce the same verdict, so a past decision can be replayed. Where a model would compose or read free text, the deterministic version is built and the screen says which step a model owns."],
  ["Enforce the invariants with tools, and see each guard fail first", "Never sends, the model never decides, nothing clears its own findings, design tokens only, no client data in code. Each is a dependency rule or a test, and each was seen failing on a planted violation."],
  ["Read the output before writing the test", "Most defects were found by reading engine output and screenshots, not by the passing suite. Each became a test."],
  ["Evaluate against an expected side that shares no code", "A 300-household corpus, an expected side with its own reader and arithmetic, hand-reviewed labels, precision and recall per rule, a golden file enforced in the check suite."],
  ["Tighten only, at every layer", "Firm, segment, advisor, client. Preferences resolve most-specific-wins; rules and desks resolve strictest-wins; the learning loop and the proposer suggest and never apply."],
];

export default function Architecture() {
  return (
    <>
      <PageTitle icon="planning" title="Architecture" sub="The approach: a spec before code, everything as data, deterministic engines with the model at the edges, invariants enforced by tools, and an evaluation that shares no code with what it scores." />
      <AboutNav />
      <Takeaways
        items={[
          <>Five layers, every arrow pointing up: read-only sources, data files, deterministic engines, agents, the human gate. Nothing points down or out.</>,
          <>Everything a person might change is data: clients, rules, desks, connectors, policy. A change is an attributed log entry, replayable to any past moment.</>,
          <>A model composes and reads at the edges; it never decides. The prototype runs every step deterministically and says on each screen which step a model would own.</>,
        ]}
      />

      <Section title="The layers">
        <div className="overflow-x-auto rounded border border-line bg-subtle p-4">
          <svg viewBox="0 0 760 410" role="img" aria-label="Five layers: read-only sources at the bottom, data, deterministic engines, agents, and the human gate at the top" className="min-w-[640px] text-ink">
            <Layer x={20} y={20} w={720} label="The human gate" sub="Accept or decline a prepared action; disposition a finding; add a rule; send from your own tools. Relay never sends" cls="text-advisor" />
            <Layer x={20} y={100} w={720} label="Agents" sub="Eight compliance desks, research, dossier, retrieval, discovery, consequences, proposer, policy reader, Ask: each reads, cites, prepares; none decides" cls="text-agent" />
            <Layer x={20} y={180} w={720} label="Deterministic engines" sub="Constraints, ranking, recipients, the rule engine, retrieval, household arithmetic, option economics, the simulator; no model client imported" cls="text-ink" />
            <Layer x={20} y={260} w={720} label="Data: one file per record" sub="Clients, advisors, documents, rules, desks, connectors, policy, a change log; validated on every build" cls="text-ink" />
            <Layer x={20} y={340} w={720} label="Sources, read only" sub="CRM, custodian, portfolio, planning, archive, e-sign, documents, a dropped spreadsheet, a public record" cls="text-client" />
            {[[74, "prepared, cited"], [154, "verdicts, scores, options"], [234, "facts"], [314, "records"]].map(([y, t]) => (
              <g key={String(y)} className="text-ink-3">
                <path d={`M380 ${Number(y) + 26} v-26`} stroke="currentColor" strokeWidth={1.5} />
                <path d={`M375 ${Number(y) + 6} l5 -6 5 6`} stroke="currentColor" strokeWidth={1.5} fill="none" />
                <text x={392} y={Number(y) + 17} fontSize={11} fill="currentColor">{t}</text>
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-2 text-[12px] text-ink-3">The guard that proves it is a dependency rule over every module and a browser check that a request to another host is blocked.</p>
      </Section>

      <Section title="The approach, in the order it was applied">
        <ol className="space-y-2">
          {PRINCIPLES.map(([t, m], i) => (
            <li key={t} className="flex gap-3 rounded border border-line px-3 py-2.5">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-subtle text-[12px] font-semibold text-ink" aria-hidden="true">{i + 1}</span>
              <span className="min-w-0"><span className="block text-[14px] text-ink">{t}</span><span className="block text-[13px] text-ink-2">{m}</span></span>
            </li>
          ))}
        </ol>
      </Section>

      <Section title="The stack">
        <CardGrid cols={3}>
          <Card icon="planning" title="Next.js, TypeScript strict, Tailwind on tokens"><p className="text-[13px] text-ink-2">A static export with no server and no database; the whole product runs from the data folder in the browser.</p></Card>
          <Card icon="check" title="Vitest, dependency-cruiser, Playwright"><p className="text-[13px] text-ink-2">Unit and invariant tests, architecture rules over every import path, and a browser suite at five widths.</p></Card>
          <Card icon="block" title="No model client, no network client"><p className="text-[13px] text-ink-2">There is nothing to send with. The content security policy blocks any request to another host, and the browser suite proves it on every run.</p></Card>
        </CardGrid>
        <More summary="Where to read further">
          <ul className="space-y-1">
            <li><Link href="https://github.com/nikjain15/relay/blob/main/ARCHITECTURE.md" className="underline">ARCHITECTURE.md</Link>: the overview, and links to the three detailed architecture documents</li>
            <li><Link href="https://github.com/nikjain15/relay/blob/main/docs/BUILD-SPEC.md" className="underline">BUILD-SPEC.md</Link>: every surface, the data model, engine responsibilities, the demo path</li>
            <li><Link href="https://github.com/nikjain15/relay/blob/main/evals/README.md" className="underline">evals/README.md</Link>: the corpus, how the expected side is built, what the eval has caught</li>
          </ul>
        </More>
      </Section>
      <NextPage />
    </>
  );
}
