"use client";

// Discovery: what the clients said that nobody turned into an opportunity.
import { useMemo } from "react";
import Link from "next/link";
import { useRelay } from "@/components/state";
import { Brief, Card, More, PageTitle, Pill, Section, btn, btnPrimary } from "@/components/ui";
import { Icon, CLASS_ICON } from "@/components/icons";
import { Bars, Meter } from "@/components/charts";
import { discover, EXTRACTORS } from "@/lib/discovery/discover";
import { CLASS_LABEL } from "@/lib/labels";
import { ADVISORS_DATA } from "@/lib/data";

export function DiscoveryView() {
  const { book, discoveryDecisions, decideDiscovery } = useRelay();
  // What the signed-in advisor's clients said: the same candidates the Overview counts.
  const { advisorId } = useRelay();
  const candidates = useMemo(() => discover(book.clients, book.documents).filter((k) => k.advisorId === advisorId), [book.clients, book.documents, advisorId]);
  const open = candidates.filter((k) => !discoveryDecisions[k.id]);
  const accepted = candidates.filter((k) => discoveryDecisions[k.id]?.decision === "accepted");
  const byKind = EXTRACTORS.map((x) => ({ label: x.label, value: candidates.filter((k) => k.extractor.id === x.id).length })).filter((b) => b.value > 0).sort((a, b) => b.value - a.value);
  const bySource = (["message", "note", "contact", "request"] as const).map((k) => ({ label: k, value: candidates.filter((c) => c.source.kind === k).length }));
  const label = (id: string) => ADVISORS_DATA.find((a) => a.id === id)?.walkthrough?.label ?? id;

  return (
    <>
      <PageTitle icon="search" title="Discovery" sub="Opportunities found in what clients said, not in what the feeds show. Each cites its sentence. You accept it onto today's list." />

      <Brief
        name="Discovery"
        icon="search"
        at="day 0, 06:40"
        says={<>I read {book.clients.filter((c) => c.advisorId === advisorId).reduce((n, c) => n + (c.messages?.length ?? 0) + c.notes.length + c.contactHistory.length, 0)} messages, notes and contact summaries for what clients said, not what the feeds show. {open.length ? <>{open.length} look like opportunities and wait on you, each cited to its sentence with a confidence.</> : "Everything I found has been decided."} {accepted.length ? `${accepted.length} accepted onto today's list this session.` : ""}{candidates.some((k) => !k.evidence.length) ? ` ${candidates.filter((k) => !k.evidence.length).length} have no citable document, so the evidence screen will refuse them.` : ""}</>}
        points={open.slice(0, 3).map((k) => ({ text: `${k.clientName}: ${k.extractor.label}, "${k.source.excerpt.slice(0, 80)}${k.source.excerpt.length > 80 ? "..." : ""}"`, who: "client" as const, icon: "quote" as const }))}
        next={open.length ? { label: "Decide the first one", href: "#found" } : undefined}
        note="In production a model would read free text for these events; here a set of extractors does, and either way a person accepts each one."
      />

      <Section title={open.length ? "Found, waiting on you" : "Nothing waiting"}>
        <div id="found" className="scroll-mt-20" />
        {open.length === 0 ? (
          <Card tone="positive" icon="check" title="Every candidate has been decided">
            <p className="text-[13px] text-ink-2">Connect more data on <Link href="/sources" className="underline">Connect data</Link> and the agent reads it.</p>
          </Card>
        ) : (
          <div className="rounded border border-line px-4">
            {open.slice(0, 40).map((k) => (
              <div key={k.id} className="border-b border-line py-4 last:border-b-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] text-ink">
                      <Icon name={CLASS_ICON[k.extractor.triggerClass]} size={20} className="text-ink-3" />
                      <span className="font-medium">{k.extractor.label}</span>
                      <span className="text-ink-2">{k.clientName}</span>
                      <Pill tone="accent">{CLASS_LABEL[k.extractor.triggerClass]}</Pill>
                      <Pill tone="neutral">{Math.round(k.confidence * 100)} percent</Pill>
                      {k.duplicate && <Pill tone="neutral">Similar item already on the list</Pill>}
                    </p>
                    <p className="mt-1.5 border-l-2 border-line-strong pl-3 text-[13px] text-ink">&ldquo;{k.source.excerpt}&rdquo;</p>
                    <p className="mt-1 text-[12px] text-ink-3">
                      Read from a {k.source.kind} ({k.source.id}), {k.source.day === 0 ? "today" : `${-k.source.day} days ago`} · {label(k.advisorId)} · {k.extractor.why}
                    </p>
                    <p className="mt-1 text-[12px] text-ink-2">
                      {k.evidence.length
                        ? <>Would cite: {k.evidence.map((e) => <span key={e.docId} className="mr-2"><Link href={`/documents/${e.docId}`} className="underline">{e.title}</Link> <span className="tabular-nums text-ink-3">{e.score.toFixed(2)}</span></span>)}</>
                        : <span className="text-critical">No document in the corpus supports this kind of conversation. Accepted, it lands on the list refused until one exists.</span>}
                    </p>
                  </div>
                  <span className="flex gap-1.5">
                    <button type="button" className={btnPrimary} onClick={() => decideDiscovery(k, "accepted")}>Accept</button>
                    <button type="button" className={btn} onClick={() => decideDiscovery(k, "declined")}>Decline</button>
                  </span>
                </div>
              </div>
            ))}
            {open.length > 40 && <p className="py-3 text-[12px] text-ink-3">First 40 of {open.length}.</p>}
          </div>
        )}
      </Section>

      <div className="grid gap-8 md:grid-cols-2">
        <Section title="By kind of event">
          <Bars ariaLabel="Candidates by kind" items={byKind} />
        </Section>
        <Section title="Where they were read">
          <Meter ariaLabel="Candidates by source record" segments={bySource.map((s, i) => ({ ...s, tone: (["plain", "caution", "muted", "positive"] as const)[i] }))} />
          <p className="mt-2 text-[12px] text-ink-3">A colleague&apos;s note or a contact summary is read at ten points less confidence than the client&apos;s own words.</p>
        </Section>
      </div>

      <More summary="What is autonomous here, and what a model would do">
        Reading is autonomous: {EXTRACTORS.length} extractors over every captured message, team note and contact summary,
        each a pattern with a confidence, each result cited to the sentence and the record it came from, each matched to
        the corpus documents that would support the conversation. Adding an event kind is one entry in the extractor
        list. In production a typed extraction model would do the reading and read it better; it would still not put a
        candidate on today&apos;s list, and a candidate with no citable document would still arrive saying so.
      </More>
    </>
  );
}
