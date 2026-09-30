// The evaluation, on screen: the corpus, the expected side that shares no
// code with the engines, precision and recall per rule and per discovery
// kind, the labelled sentences, and what the eval has caught. Every number
// here is read from evals/golden.json, the file the check suite enforces, so
// the screen cannot say something the suite does not.
import Link from "next/link";
import golden from "@/evals/golden.json";
import labels from "@/evals/labels.json";
import { RULES_DATA } from "@/lib/data";
import { EXTRACTORS } from "@/lib/discovery/discover";
import { Card, CardGrid, More, PageTitle, Pill, Section, StatRow, TableScroll, td, th } from "@/components/ui";
import { Bars } from "@/components/charts";
import { AboutNav, NextPage, Takeaways } from "@/components/about";

export const metadata = { title: "Evals" };

type Score = { expected: number; found: number; tp: number; fp: number; fn: number };
const G = golden as unknown as {
  corpus: { households: number; messages: number; validationErrors: number; coherenceProblems: number; opportunities: number };
  arithmetic: { liquidityMonthsAgree: number; totalsAgree: number };
  opportunities: Score;
  rules: Record<string, Score>;
  cannotEvaluate: Record<string, Score>;
  notSwept: { expected: number; found: number };
  discovery: Record<string, Score>;
  briefings: { households: number; unknowns: number; inferred: number; citationsResolved: boolean };
  retrieval: { opportunities: number; refused: number; conflicts: number };
};
const L = labels as unknown as {
  messages: Record<string, { direction: "inbound" | "outbound"; rules: string[]; discovery: string[]; why?: string }>;
  notes: Record<string, string[]>;
  contactSummaries: Record<string, string[]>;
};

const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : "n/a");
const ruleTitle = (id: string) => RULES_DATA.rules.find((r) => r.id === id)?.title ?? id;
const kindLabel = (id: string) => EXTRACTORS.find((x) => x.id === id)?.label ?? id;

const CAUGHT: [string, string, string][] = [
  ["A client asking to talk through their pension was not read as a retirement candidate; 53 of 85 expected candidates were missed", "Discovery extractor", "The extractor now reads a request to talk through a pension as the decision it is"],
  ["53 households had a liquidity target below their own minimum, and one spent a third of its assets a year", "Sample generator", "Spending is anchored to the portfolio at 1.5% to 5% a year; the target is never below the minimum"],
  ["One household's day-90 concentration was negative", "Sample generator", "History is floored above zero"],
];

const BROKEN: string[] = [
  "A complaint pattern with two of its phrases removed",
  "The retirement extractor narrowed",
  "One household's cash changed in the CSV",
  "The review threshold moved from 180 to 200 days",
];

function ScoreTable({ rows, name, label }: { rows: [string, Score][]; name: (id: string) => string; label: string }) {
  return (
    <TableScroll>
      <table className="w-full min-w-[44rem] border-collapse text-body">
        <thead>
          <tr>
            <th className={th}>{label}</th>
            <th className={`${th} text-right`}>Expected</th>
            <th className={`${th} text-right`}>Found</th>
            <th className={`${th} text-right`}>Correct</th>
            <th className={`${th} text-right`}>Extra</th>
            <th className={`${th} text-right`}>Missed</th>
            <th className={`${th} text-right`}>Precision</th>
            <th className={`${th} text-right`}>Recall</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, s]) => (
            <tr key={id}>
              <td className={td}>{name(id)}<div className="text-meta leading-4 text-ink-3">{id}</div></td>
              <td className={`${td} text-right tabular-nums`}>{s.expected}</td>
              <td className={`${td} text-right tabular-nums`}>{s.found}</td>
              <td className={`${td} text-right tabular-nums`}>{s.tp}</td>
              <td className={`${td} text-right tabular-nums ${s.fp ? "text-critical" : "text-ink-3"}`}>{s.fp}</td>
              <td className={`${td} text-right tabular-nums ${s.fn ? "text-critical" : "text-ink-3"}`}>{s.fn}</td>
              <td className={`${td} text-right tabular-nums`}>{pct(s.tp, s.tp + s.fp)}</td>
              <td className={`${td} text-right tabular-nums`}>{pct(s.tp, s.tp + s.fn)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export default function Evals() {
  const rules = Object.entries(G.rules);
  const kinds = Object.entries(G.discovery);
  const totalRules = rules.reduce((a, [, s]) => ({ tp: a.tp + s.tp, fp: a.fp + s.fp, fn: a.fn + s.fn }), { tp: 0, fp: 0, fn: 0 });
  const totalKinds = kinds.reduce((a, [, s]) => ({ tp: a.tp + s.tp, fp: a.fp + s.fp, fn: a.fn + s.fn }), { tp: 0, fp: 0, fn: 0 });
  const sentences = [
    ...Object.entries(L.messages).map(([text, x]) => ({ text, kind: "message" as const, direction: x.direction, rules: x.rules, discovery: x.discovery, why: x.why })),
    ...Object.entries(L.notes).map(([text, d]) => ({ text, kind: "note" as const, direction: undefined, rules: [] as string[], discovery: d, why: undefined })),
    ...Object.entries(L.contactSummaries).map(([text, d]) => ({ text, kind: "contact" as const, direction: undefined, rules: [] as string[], discovery: d, why: undefined })),
  ];

  return (
    <>
      <PageTitle icon="check" title="Evals" sub="How the agents are known to be right, and known to stay right: a corpus a person can check, an expected side that shares no code with the engines, a score per decision, and a golden file the check suite enforces." />
      <AboutNav />
      <Takeaways
        items={[
          <>{G.corpus.households} households and {G.corpus.messages} captured messages, generated from a fixed seed so every sentence is one of a known set and its ground truth is reviewed by hand.</>,
          <>The expected side reads the CSV files with its own reader and imports nothing from the engines. If it did, a bug in the engines would be in the answer key too.</>,
          <>Scored per (household, rule) and per (household, kind), never as one average. The counts below are the golden file; a change to a rule, an extractor or the corpus fails the suite until someone reads the diff.</>,
        ]}
      />

      <Section title="The corpus">
        <StatRow items={[
          { value: G.corpus.households, label: "Households", icon: "people" },
          { value: G.corpus.messages, label: "Captured messages", icon: "email" },
          { value: G.corpus.opportunities, label: "Opportunities detected", icon: "eye" },
          { value: G.corpus.validationErrors + G.corpus.coherenceProblems, label: "Data problems", icon: "alert", tone: G.corpus.validationErrors + G.corpus.coherenceProblems ? "critical" : "positive" },
        ]} />
        <p className="mt-2 text-meta text-ink-3">Arithmetic, engine against the eval&apos;s own: liquidity months agree on {G.arithmetic.liquidityMonthsAgree} of {G.corpus.households} households, total assets on {G.arithmetic.totalsAgree} of {G.corpus.households}. The corpus itself lives under <Link href="https://github.com/nikjain15/relay/tree/main/public/samples" className="underline">public/samples</Link> and can be dropped on the Sources screen.</p>
      </Section>

      <Section title="How it is built, in four steps">
        <CardGrid cols={4}>
          <Card icon="settings" title="1. Generate"><p className="text-body text-ink-2">A sample generator writes {G.corpus.households} households and their messages from a fixed seed and a fixed set of sentences. Reproducible, and small enough to read.</p></Card>
          <Card icon="document" title="2. Label"><p className="text-body text-ink-2">A labels file says, per sentence, which rule should fire and which discovery kind it yields, with the reason written beside the ones that fire nothing.</p></Card>
          <Card icon="block" title="3. Expect, without the engines"><p className="text-body text-ink-2">The expected side derives every count from the CSV, the rule parameters, the firm edits and each advisor&apos;s connections, with its own reader and arithmetic.</p></Card>
          <Card icon="check" title="4. Score and freeze"><p className="text-body text-ink-2">The engines run through the real import path and are scored per decision. The counts are frozen in a golden file the check suite enforces on every push.</p></Card>
        </CardGrid>
      </Section>

      <Section title="Compliance desks, per household and per message">
        <StatRow items={[
          { value: pct(totalRules.tp, totalRules.tp + totalRules.fp), label: "Precision across rules", icon: "shield" },
          { value: pct(totalRules.tp, totalRules.tp + totalRules.fn), label: "Recall across rules", icon: "shield" },
          { value: Object.values(G.cannotEvaluate).reduce((s, x) => s + x.tp, 0), label: "Reported as cannot evaluate, correctly", icon: "question" },
          { value: `${G.notSwept.found} of ${G.notSwept.expected}`, label: "On an unhealthy source, not swept", icon: "link" },
        ]} />
        <ScoreTable rows={rules} name={ruleTitle} label="Rule" />
        <p className="mt-2 text-meta text-ink-3">A rule whose source is not connected for the household&apos;s advisor must come back as cannot evaluate, never as clear. The eval expects that from the advisor files, not from the engine.</p>
        <div className="mt-3">
          <ScoreTable rows={Object.entries(G.cannotEvaluate)} name={ruleTitle} label="Cannot evaluate" />
        </div>
      </Section>

      <Section title="Discovery, per household and kind">
        <StatRow items={[
          { value: pct(totalKinds.tp, totalKinds.tp + totalKinds.fp), label: "Precision across kinds", icon: "search" },
          { value: pct(totalKinds.tp, totalKinds.tp + totalKinds.fn), label: "Recall across kinds", icon: "search" },
          { value: kinds.reduce((s, [, x]) => s + x.expected, 0), label: "Candidates expected", icon: "eye" },
          { value: kinds.length, label: "Kinds scored", icon: "list" },
        ]} />
        <Bars ariaLabel="Expected candidates by discovery kind" items={kinds.map(([id, s]) => ({ label: kindLabel(id), value: s.expected, tone: s.fn || s.fp ? ("critical" as const) : ("plain" as const) }))} />
        <div className="mt-3">
          <ScoreTable rows={kinds} name={kindLabel} label="Kind" />
        </div>
      </Section>

      <Section title="Research and retrieval">
        <StatRow items={[
          { value: G.briefings.households, label: "Briefings", icon: "briefing" },
          { value: G.briefings.unknowns, label: "Things not established", icon: "question" },
          { value: G.briefings.inferred, label: "Inferences with a confidence", icon: "eye" },
          { value: G.briefings.citationsResolved ? "yes" : "no", label: "Every claim cites a record", icon: "check", tone: G.briefings.citationsResolved ? "positive" : "critical" },
          { value: `${G.retrieval.opportunities - G.retrieval.refused} of ${G.retrieval.opportunities}`, label: "Opportunities cited", icon: "library" },
          { value: G.retrieval.conflicts, label: "Resting on documents that disagree", icon: "conflict" },
        ]} />
      </Section>

      <Section title={`The labelled sentences: ${sentences.length} kinds of thing a client or colleague says`}>
        <p className="mb-2 text-body text-ink-2">Every message and note in the corpus is one of these. The label says what each should trigger; the reason beside a sentence that triggers nothing is the part a reviewer reads first.</p>
        <TableScroll>
          <table className="w-full min-w-[48rem] border-collapse text-body">
            <thead>
              <tr>
                <th className={th}>Sentence</th>
                <th className={th}>Where</th>
                <th className={th}>Should fire</th>
                <th className={th}>Should discover</th>
              </tr>
            </thead>
            <tbody>
              {sentences.map((s) => (
                <tr key={s.text}>
                  <td className={`${td} max-w-lg`}>&quot;{s.text}&quot;{s.why && <div className="text-meta leading-4 text-ink-2">{s.why}</div>}</td>
                  <td className={`${td} text-ink-2`}>{s.kind}{s.direction ? `, ${s.direction}` : ""}</td>
                  <td className={td}>{s.rules.length ? s.rules.map((r) => <div key={r}><Pill tone="fail">{ruleTitle(r)}</Pill></div>) : <span className="text-ink-3">nothing</span>}</td>
                  <td className={td}>{s.discovery.length ? s.discovery.map((d) => <div key={d}><Pill tone="accent">{kindLabel(d)}</Pill></div>) : <span className="text-ink-3">nothing</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Section>

      <Section title="What the eval has caught">
        <p className="mb-2 text-body text-ink-2">Recorded so the eval is not mistaken for a formality.</p>
        <TableScroll>
          <table className="w-full min-w-[40rem] border-collapse text-body">
            <thead><tr><th className={th}>Found</th><th className={th}>Where</th><th className={th}>Fix</th></tr></thead>
            <tbody>
              {CAUGHT.map(([f, w, x]) => (
                <tr key={f}><td className={`${td} max-w-md`}>{f}</td><td className={`${td} text-ink-2`}>{w}</td><td className={`${td} max-w-md text-ink-2`}>{x}</td></tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
        <p className="mt-3 text-body text-ink-2">It was also seen failing on each of four deliberate breaks before it was recorded as a guard:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-body text-ink-2">
          {BROKEN.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </Section>

      <More summary="The limit, stated">
        Recall of 100% on a fixed sentence set says the engines read every sentence in that set, not every way a client
        might say the same thing. A sentence a real book would contain and these engines would miss belongs in the labels
        with the finding expected, so the eval fails first and the engine is fixed second. When a model reads free text in
        production, it is scored by the same harness at the same level, and held-out phrasings the fixed patterns cannot
        read are where it has to beat them.
      </More>
      <NextPage />
    </>
  );
}
