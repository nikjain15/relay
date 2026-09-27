import Link from "next/link";
import { Card, CardGrid, Legend, More, PageTitle, Section, Timeline } from "@/components/ui";

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

export default function Architecture() {
  return (
    <>
      <PageTitle title="Architecture" sub="The approach: a spec before code, everything as data, deterministic engines with the model at the edges, invariants enforced by tools that were seen failing, and an evaluation that shares no code with what it scores." />
      <Legend className="-mt-5 mb-6 lg:hidden" />

      <Section title="The layers">
        <div className="overflow-x-auto rounded border border-line bg-subtle p-4">
          <svg viewBox="0 0 760 410" role="img" aria-label="Five layers: read-only sources and data at the bottom, deterministic engines, agents, the human gate, and the person who sends" className="min-w-[640px] text-ink">
            <Layer x={20} y={20} w={720} label="The human gate" sub="Accept or decline a prepared action; disposition a finding; file a note; send from your own tools. Relay never sends" cls="text-advisor" />
            <Layer x={20} y={100} w={720} label="Agents" sub="Eight compliance desks, research, dossier, retrieval, discovery, consequences, proposer: each reads, cites, prepares; none decides" cls="text-agent" />
            <Layer x={20} y={180} w={720} label="Deterministic engines" sub="Constraints, ranking, recipients, the rule engine, retrieval, household arithmetic, the simulator; no model client imported" cls="text-ink" />
            <Layer x={20} y={260} w={720} label="Data: one file per record" sub="Clients, advisors, documents, rules, desks, policy, a change log; validated on every build; nothing to change lives in code" cls="text-ink" />
            <Layer x={20} y={340} w={720} label="Sources, read only" sub="CRM, custodian feed, archive of captured channels, e-sign, documents, a dropped spreadsheet, a public record" cls="text-client" />
            {[[74, "prepared, cited"], [154, "verdicts, scores, options"], [234, "facts"], [314, "records"]].map(([y, t]) => (
              <g key={String(y)} className="text-ink-3">
                <path d={`M380 ${Number(y) + 26} v-26`} stroke="currentColor" strokeWidth={1.5} />
                <path d={`M375 ${Number(y) + 6} l5 -6 5 6`} stroke="currentColor" strokeWidth={1.5} fill="none" />
                <text x={392} y={Number(y) + 17} fontSize={11} fill="currentColor">{t}</text>
              </g>
            ))}
          </svg>
        </div>
        <p className="mt-2 text-[12px] text-ink-3">Every arrow points up. Nothing points down or out: the guard that proves it is a dependency rule over every module and a browser check that a request to another host is blocked.</p>
      </Section>

      <Section title="The approach, in the order it was applied">
        <Timeline
          items={[
            { at: "1", icon: "document", title: "Write the spec before the code", meta: "A build spec names every surface, the data model, each engine's responsibility, the demo path and the tests. Decisions made while building are written back into it, numbered." },
            { at: "2", icon: "rules", title: "Make everything a person might change into data", meta: "A client is a file. A rule is JSON with a condition tree the console edits at runtime. A desk is an entry. A validator fails the build on anything inconsistent, and a test fails on a client id in code." },
            { at: "3", icon: "shield", title: "Keep the engines deterministic; put the model at the edges", meta: "The same facts produce the same verdict, so a past decision can be replayed. Where a model would compose or read free text, the deterministic version is built and the screen says which step a model owns." },
            { at: "4", icon: "block", title: "Enforce the invariants with tools, and see each guard fail first", meta: "Never sends, the model never decides, nothing clears its own findings, design tokens only, no client data in code. Each is a dependency rule or a test, and each was recorded as enforced only after a planted violation made it fail." },
            { at: "5", icon: "eye", title: "Read the output before writing the test", meta: "Most defects were found by reading engine output and screenshots, not by the passing suite: a ranker fully covered by one common word, a note truncated at an initial, a headline figure the arithmetic could not support. Each became a test." },
            { at: "6", icon: "chart", title: "Evaluate against an expected side that shares no code", meta: "A 300-household corpus, an expected side with its own CSV reader and arithmetic, hand-reviewed labels per sentence, precision and recall per rule and per kind, a golden file enforced in the check suite." },
            { at: "7", icon: "trend", title: "Tighten only, at every layer", meta: "Firm, segment, advisor, client. Preferences resolve most-specific-wins; rules and desks resolve strictest-wins; the learning loop and the proposer suggest and never apply. Every refusal is recorded." },
          ]}
        />
      </Section>

      <Section title="What the stack is, and what it is not">
        <CardGrid cols={3}>
          <Card icon="planning" title="Next.js, TypeScript strict, Tailwind on tokens">
            <p className="text-[13px] text-ink-2">A static export with no server and no database; the whole product runs from the data folder in the browser. No runtime dependency beyond React and Next.</p>
          </Card>
          <Card icon="check" title="Vitest, dependency-cruiser, Playwright">
            <p className="text-[13px] text-ink-2">Unit and invariant tests, architecture rules over every import path, and a browser suite at five widths that checks errors, contrast, links, buttons, keyboard and the demo flows.</p>
          </Card>
          <Card icon="block" title="No model client, no network client">
            <p className="text-[13px] text-ink-2">There is nothing to send with. The content security policy in the page blocks any request to another host, and the browser suite proves it on every run.</p>
          </Card>
        </CardGrid>
        <More summary="Where to read further">
          <ul className="space-y-1">
            <li><Link href="https://github.com/nikjain15/relay/blob/main/ARCHITECTURE.md" className="underline">ARCHITECTURE.md</Link>: the overview, and links to the three detailed architecture documents</li>
            <li><Link href="https://github.com/nikjain15/relay/blob/main/docs/BUILD-SPEC.md" className="underline">BUILD-SPEC.md</Link>: every surface, the data model, engine responsibilities, the demo path</li>
            <li><Link href="https://github.com/nikjain15/relay/blob/main/evals/README.md" className="underline">evals/README.md</Link>: the corpus, how the expected side is built, what the eval has caught</li>
          </ul>
        </More>
      </Section>
    </>
  );
}
