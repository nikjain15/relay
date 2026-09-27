// The document library: every document the evidence layer can cite, with its
// age against its review cycle, its place in a supersession chain, what cites
// it, and every disagreement between two current documents. This is the
// retrieval surface's control panel: the answer to "what is this system
// allowed to quote, and how old is it".
import Link from "next/link";
import { corpusStates, corpusConflicts, FRESHNESS_LABEL, type Freshness } from "@/lib/evidence/corpus";
import { ALL_OPPORTUNITIES } from "@/lib/data";
import { POLICY } from "@/lib/data/policy";
import { Card, More, PageTitle, Pill, Section, StatRow, TableScroll, td, th } from "@/components/ui";
import { Icon, DOC_ICON } from "@/components/icons";
import { Bars, Meter } from "@/components/charts";

const TONE: Record<Freshness, "pass" | "accent" | "fail"> = { current: "pass", review_due: "accent", stale: "fail" };

export default function Documents() {
  const states = corpusStates().sort((a, b) => a.daysToReview - b.daysToReview);
  const usable = states.filter((s) => s.usable);
  const stale = usable.filter((s) => s.freshness === "stale");
  const due = usable.filter((s) => s.freshness === "review_due");
  const conflicts = corpusConflicts();
  const citedBy = (id: string) => ALL_OPPORTUNITIES.filter((o) => o.evidenceDocIds.includes(id));
  const byDesk = Object.entries(
    states.reduce<Record<string, number>>((acc, s) => ((acc[s.doc.desk] = (acc[s.doc.desk] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]);
  const uncited = usable.filter((s) => citedBy(s.doc.id).length === 0 && s.doc.kind !== "disclosure");

  return (
    <>
      <PageTitle title="Document library" sub={`What may be quoted, and how old it is. Corpus day ${POLICY.retrieval.corpusDay}.`} />

      <StatRow
        items={[
          { value: usable.length, label: `Current documents of ${states.length}`, icon: "library" },
          { value: stale.length, label: "Past review date", icon: "hourglass", tone: stale.length ? "critical" : "positive" },
          { value: due.length, label: `Review due within ${POLICY.retrieval.reviewDueWithinDays} days`, icon: "clock", tone: due.length ? "plain" : "positive" },
          { value: conflicts.length, label: "Open disagreements", icon: "conflict", tone: conflicts.length ? "critical" : "positive" },
        ]}
      />

      <Section title="Freshness">
        <Meter
          ariaLabel="Documents by freshness"
          segments={[
            { label: "Current", value: usable.filter((s) => s.freshness === "current").length, tone: "positive" },
            { label: "Review due", value: due.length, tone: "caution" },
            { label: "Past review date", value: stale.length, tone: "critical" },
            { label: "Superseded or withdrawn", value: states.length - usable.length, tone: "muted" },
          ]}
        />
      </Section>

      {conflicts.length > 0 && (
        <Section title="Two current documents disagree">
          {conflicts.map((k) => (
            <Card key={k.topic} tone="critical" icon="conflict" title={k.topic.replace(/[.-]/g, " ")} sub={k.note}>
              <ul className="space-y-1.5 text-[13px]">
                {k.sides.map((s) => (
                  <li key={s.docId} className="flex flex-wrap items-baseline gap-2">
                    <Pill tone={TONE[s.freshness]}>{FRESHNESS_LABEL[s.freshness]}</Pill>
                    <Link href={`/documents/${s.docId}#${s.passageId}`} className="underline">{s.title}</Link>
                    <span className="text-ink-3">day {s.day}</span>
                    <span className="text-ink-2">{s.value}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[12px] text-ink-2">Every opportunity whose evidence touches this topic shows the disagreement. Nothing picks a side on the advisor&apos;s behalf.</p>
            </Card>
          ))}
        </Section>
      )}

      <Section title="Every document, soonest review first">
        <TableScroll>
          <table className="w-full min-w-[46rem] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={th}>Document</th>
                <th className={th}>Kind</th>
                <th className={th}>Desk</th>
                <th className={th}>Age</th>
                <th className={th}>Review</th>
                <th className={th}>Status</th>
                <th className={th}>Cited by</th>
              </tr>
            </thead>
            <tbody>
              {states.map((s) => {
                const cites = citedBy(s.doc.id);
                return (
                  <tr key={s.doc.id}>
                    <td className={td}>
                      <span className="flex items-start gap-2"><Icon name={DOC_ICON[s.doc.kind] ?? "document"} size={16} className="mt-0.5 text-ink-3" /><Link href={`/documents/${s.doc.id}`} className="underline">{s.doc.title}</Link></span>
                      <span className="block text-[12px] text-ink-3">{s.doc.passages.length} passage{s.doc.passages.length === 1 ? "" : "s"}</span>
                    </td>
                    <td className={td}>{s.doc.kind}</td>
                    <td className={td}>{s.doc.desk}</td>
                    <td className={`${td} tabular-nums`}>{s.ageDays} days</td>
                    <td className={`${td} tabular-nums`}>{s.usable ? `every ${s.doc.reviewEveryDays}, ${s.daysToReview < 0 ? `${-s.daysToReview} days overdue` : `in ${s.daysToReview} days`}` : <span className="text-ink-3">no longer reviewed</span>}</td>
                    <td className={td}>
                      {s.usable ? <Pill tone={TONE[s.freshness]}>{FRESHNESS_LABEL[s.freshness]}</Pill> : <Pill>{s.doc.status === "superseded" ? `Superseded by ${s.supersededBy?.title ?? s.doc.supersededBy}` : "Withdrawn"}</Pill>}
                    </td>
                    <td className={`${td} tabular-nums`}>{cites.length ? `${cites.length} opportunit${cites.length === 1 ? "y" : "ies"}` : <span className="text-ink-3">nothing</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
      </Section>

      <div className="grid gap-8 md:grid-cols-2">
        <Section title="By desk">
          <Bars ariaLabel="Documents by desk" items={byDesk.map(([desk, n]) => ({ label: desk, value: n }))} />
        </Section>
        <Section title="Current but cited by nothing">
          {uncited.length ? (
            <ul className="space-y-1 text-[13px]">
              {uncited.map((s) => (
                <li key={s.doc.id} className="flex items-center gap-2">
                  <Icon name="document" size={16} className="text-ink-3" />
                  <Link href={`/documents/${s.doc.id}`} className="underline">{s.doc.title}</Link>
                  <Pill tone={TONE[s.freshness]}>{FRESHNESS_LABEL[s.freshness]}</Pill>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-ink-2">Every current document is cited by at least one opportunity.</p>
          )}
          <p className="mt-2 text-[12px] text-ink-3">A document nobody cites is still retrievable as related reading. It can also disagree with one that is cited, which is how the disagreement above was found.</p>
        </Section>
      </div>

      <More summary="What is autonomous here, and what is not">
        Age, review state, supersession and disagreement are computed from the documents&apos; own metadata and claims, on every
        render, with no person asked. Nothing here retires a document: a stale document stays retrievable with its state
        named and its score halved, a superseded one is excluded with the successor named, and a disagreement is shown
        until a desk resolves it. In production the desks own the review cycle and this screen is their queue.
      </More>
    </>
  );
}
