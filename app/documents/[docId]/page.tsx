// One document, passage by passage, so a citation the advisor clicks lands on
// the exact passage and can be read in its surroundings. The state of the
// document (age, review, supersession) sits above the text, because a passage
// read without knowing its document is stale is a passage misread.
import Link from "next/link";
import { notFound } from "next/navigation";
import { CORPUS, doc } from "@/lib/fixtures/corpus";
import { docState, corpusConflicts, FRESHNESS_LABEL } from "@/lib/evidence/corpus";
import { ALL_OPPORTUNITIES, clientFile } from "@/lib/data";
import { Banner, Card, PageTitle, Pill, Section, StatRow } from "@/components/ui";

export function generateStaticParams() {
  return CORPUS.map((d) => ({ docId: d.id }));
}

export default async function DocumentPage({ params }: { params: Promise<{ docId: string }> }) {
  const { docId } = await params;
  const d = doc(docId);
  if (!d) notFound();
  const s = docState(d);
  const cites = ALL_OPPORTUNITIES.filter((o) => o.evidenceDocIds.includes(d.id));
  const conflicts = corpusConflicts().filter((k) => k.sides.some((x) => x.docId === d.id));
  const claimed = new Set(conflicts.flatMap((k) => k.sides.filter((x) => x.docId === d.id).map((x) => x.passageId)));

  return (
    <>
      <PageTitle icon="document" title={d.title} sub={`${d.kind}, ${d.desk}. Published on corpus day ${d.day}; reviewed every ${d.reviewEveryDays} days.`} />

      <StatRow
        items={[
          { value: `${s.ageDays}d`, label: "Age", icon: "clock" },
          { value: s.daysToReview < 0 ? `${-s.daysToReview}d` : `${s.daysToReview}d`, label: s.daysToReview < 0 ? "Past review" : "To review", icon: "hourglass", tone: s.freshness === "stale" ? "critical" : "plain" },
          { value: d.passages.length, label: "Passages", icon: "quote" },
          { value: cites.length, label: "Cited by opportunities", icon: "link" },
        ]}
      />

      {!s.usable && (
        <Banner tone="critical" title={d.status === "superseded" ? "Superseded. Never shown as evidence." : "Withdrawn. Never shown as evidence."}>
          {s.supersededBy && (
            <>
              Replaced by <Link href={`/documents/${s.supersededBy.id}`} className="underline">{s.supersededBy.title}</Link> (day {s.supersededBy.day}). Kept here so a past citation can still be read as it stood.
            </>
          )}
        </Banner>
      )}
      {s.usable && s.freshness === "stale" && (
        <Banner tone="critical" title={`Past its review date by ${-s.daysToReview} days`}>
          Still retrievable, with its relevance halved and this state on every passage. Nothing here withdraws it; the {d.desk.toLowerCase()} does.
        </Banner>
      )}
      {s.usable && s.freshness === "review_due" && (
        <Banner tone="caution" title={`Review due in ${s.daysToReview} days`}>Current until then. Retrieval marks it so an advisor quoting it today knows it is about to be re-read.</Banner>
      )}
      {s.supersedes && (
        <p className="mb-6 text-[13px] text-ink-2">
          Supersedes <Link href={`/documents/${s.supersedes.id}`} className="underline">{s.supersedes.title}</Link> (day {s.supersedes.day}).
        </p>
      )}

      <Section title="Passages">
        <ol className="rounded border border-line">
          {d.passages.map((p) => (
            <li key={p.id} id={p.id} className="scroll-mt-20 border-b border-line px-4 py-4 target:bg-selected last:border-b-0">
              <div className="flex gap-3">
                <span className="w-8 shrink-0 text-[12px] tabular-nums text-ink-3">{p.id}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] text-ink">{p.text}</p>
                  {p.claims?.map((c) => (
                    <p key={c.topic} className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                      <span>Asserts on {c.topic.replace(/[.-]/g, " ")}:</span>
                      <span className="text-ink-2">{c.value}</span>
                      {claimed.has(p.id) && <Pill tone="fail">Disputed</Pill>}
                    </p>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      {conflicts.length > 0 && (
        <Section title="Disagreements this document is part of">
          {conflicts.map((k) => (
            <Card key={k.topic} tone="critical" icon="conflict" title={k.topic.replace(/[.-]/g, " ")} sub={k.note}>
              <ul className="space-y-1 text-[13px]">
                {k.sides.map((x) => (
                  <li key={x.docId} className="flex flex-wrap items-baseline gap-2">
                    <Pill tone={x.freshness === "stale" ? "fail" : "pass"}>{FRESHNESS_LABEL[x.freshness]}</Pill>
                    {x.docId === d.id ? <span className="font-medium">This document</span> : <Link href={`/documents/${x.docId}#${x.passageId}`} className="underline">{x.title}</Link>}
                    <span className="text-ink-2">{x.value}</span>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </Section>
      )}

      <Section title="Cited by">
        {cites.length ? (
          <ul className="space-y-1 text-[13px]">
            {cites.map((o) => (
              <li key={o.id}>
                <Link href={`/evidence/${o.id}`} className="underline">{clientFile(o.householdId)?.name}: {o.title}</Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-2">No opportunity cites this document. It is retrievable as related reading.</p>
        )}
      </Section>

      <p className="text-xs">
        <Link href="/documents" className="underline">Document library</Link>
      </p>
    </>
  );
}
