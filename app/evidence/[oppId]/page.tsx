// Why this client: the reason path, and the evidence behind it as a retrieval
// surface rather than a list of quotes.
//
// Every passage says why it ranks where it does, in numbers that add up. A
// cited document that shares no words with the opportunity is marked as a weak
// citation rather than dressed up. Two current documents that disagree are
// shown disagreeing. A document past its review date says so. And when no
// cited document resolves, the screen refuses, names what is missing, and shows
// the nearest passages with the reason each is not enough. The refusal is the
// most valuable thing on this screen and it is not softened.
import Link from "next/link";
import { notFound } from "next/navigation";
import { opportunity, OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { retrieve, type RankedPassage } from "@/lib/evidence/retrieve";
import { FRESHNESS_LABEL } from "@/lib/evidence/corpus";
import { clientFile } from "@/lib/data";
import { POLICY } from "@/lib/data/policy";
import { CLASS_LABEL, NODE_LABEL, Card, More, PageTitle, Pill, Section, StatRow } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Bars } from "@/components/charts";

export function generateStaticParams() {
  return OPPORTUNITIES.map((o) => ({ oppId: o.id }));
}

function Score({ p }: { p: RankedPassage }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[12px]">
      <span className="tabular-nums text-ink">Relevance {p.score.toFixed(2)}</span>
      <span className="text-ink-3">=</span>
      {p.reasons.map((r, i) => (
        <span
          key={i}
          className={`rounded px-1.5 py-px tabular-nums ${r.kind === "stale" ? "bg-caution-soft text-caution" : r.kind === "cited" ? "bg-selected text-ink" : "bg-subtle text-ink-2"}`}
        >
          {r.kind === "term" ? `"${r.label}"` : r.label} {r.delta >= 0 ? "+" : "−"}
          {Math.abs(r.delta).toFixed(2)}
        </span>
      ))}
    </div>
  );
}

function PassageRow({ p, weakLabel }: { p: RankedPassage; weakLabel?: string }) {
  const weak = p.matched.length === 0;
  return (
    <li className="border-b border-line py-4 last:border-b-0">
      <p className="text-[14px] text-ink">{p.text}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
        <Icon name="quote" size={16} />
        <Link href={`/documents/${p.docId}#${p.passageId}`} className="text-ink underline decoration-line-strong hover:decoration-ink">
          {p.title}, passage {p.passageId}
        </Link>
        <span>prototype corpus, day {p.day}</span>
        {p.freshness !== "current" && <Pill tone={p.freshness === "stale" ? "fail" : "accent"}>{FRESHNESS_LABEL[p.freshness]}</Pill>}
        {weak && weakLabel && <Pill tone="accent">{weakLabel}</Pill>}
      </p>
      <Score p={p} />
    </li>
  );
}

export default async function Evidence({ params }: { params: Promise<{ oppId: string }> }) {
  const { oppId } = await params;
  const o = opportunity(oppId);
  if (!o) notFound();
  const h = household(o.householdId)!;
  const c = clientFile(h.id)!;
  const ev = retrieve(o);
  const ago = (d: number) => (d === 0 ? "today" : `${-d} days ago`);
  const stale = ev.refused ? [] : [...ev.passages, ...ev.related].filter((p) => p.freshness === "stale");
  const docsCited = new Set(o.evidenceDocIds).size;

  return (
    <>
      <PageTitle icon="eye" title="Why this client" sub={`${h.name}: ${o.title}`} />

      <StatRow
        items={[
          { value: ev.refused ? 0 : ev.passages.length, label: `Cited passages, from ${docsCited} document${docsCited === 1 ? "" : "s"}`, icon: "quote", tone: ev.refused ? "critical" : "plain" },
          { value: ev.refused ? 0 : ev.related.length, label: "Related, not cited", icon: "search" },
          { value: ev.conflicts.length, label: "Sources in conflict", icon: "conflict", tone: ev.conflicts.length ? "critical" : "positive" },
          { value: ev.refused ? ev.refusal.missing.length : stale.length, label: ev.refused ? "Citations missing" : "Past review date", icon: ev.refused ? "block" : "hourglass", tone: (ev.refused ? ev.refusal.missing.length : stale.length) ? "critical" : "positive" },
        ]}
      />

      <Section title="Why it was flagged">
        <p className="mb-2">
          <Pill tone="accent">{CLASS_LABEL[o.triggerClass]}</Pill>
        </p>
        <ol className="space-y-1">
          {o.reasonPath.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-24 shrink-0 text-xs text-ink-2">{NODE_LABEL[n.kind] ?? n.kind}</span>
              <span>{n.label}</span>
            </li>
          ))}
        </ol>
      </Section>

      {ev.refused ? (
        <Section title="Evidence">
          <div role="alert" className="rounded border border-critical bg-critical-soft p-4">
            <p className="flex items-center gap-2 text-[15px] font-semibold text-critical">
              <Icon name="block" size={20} />
              Refused: no supporting evidence.
            </p>
            <p className="mt-2 text-[14px] text-critical">
              The record cites {ev.refusal.missing.map((m) => <code key={m} className="mx-0.5">{m}</code>)}, which {ev.refusal.missing.length === 1 ? "is" : "are"} not in
              the corpus. Relay will not narrate an explanation it cannot cite, and it will not substitute its own citation for the record&apos;s.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[12px] font-medium text-ink">What the corpus has nothing on</p>
                <p className="mt-1 flex flex-wrap gap-1">
                  {ev.refusal.unmatched.map((t) => (
                    <span key={t} className="rounded bg-surface px-1.5 py-px text-[12px] text-ink-2">&ldquo;{t}&rdquo;</span>
                  ))}
                </p>
                <p className="mt-2 text-[12px] text-ink-2">
                  {ev.refusal.unmatched.length} of {ev.query.terms.length} query terms appear in no current passage, across {ev.searched} passages searched.
                </p>
              </div>
              <div>
                <p className="text-[12px] font-medium text-ink">Nearest passages, and why each is not enough</p>
                <ul className="mt-1 space-y-2">
                  {ev.refusal.nearest.map((n) => (
                    <li key={`${n.docId}-${n.passageId}`} className="text-[12px] text-ink-2">
                      <Link href={`/documents/${n.docId}#${n.passageId}`} className="text-ink underline decoration-line-strong">{n.title}, passage {n.passageId}</Link>
                      <span className="tabular-nums"> {n.score.toFixed(2)}</span>. {n.why}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <p className="mt-4 text-[12px] text-critical">
              This opportunity cannot be proposed on, drafted about or listed as a decision until a citation resolves. The refusal carries to today&apos;s list, the options screen and the review pack.
            </p>
          </div>
        </Section>
      ) : (
        <>
          <Section title="Cited evidence, ranked">
            {ev.missing.length > 0 && (
              <p role="status" className="mb-3 rounded border border-caution bg-caution-soft p-2 text-[13px] text-caution">
                Also cited but not found, so not relied on: <code>{ev.missing.join(", ")}</code>.
              </p>
            )}
            {ev.excluded.length > 0 && (
              <p role="status" className="mb-3 rounded border border-caution bg-caution-soft p-2 text-[13px] text-caution">
                Excluded from evidence: {ev.excluded.map((e) => `${e.title} (${e.reason.toLowerCase()})`).join("; ")}.
              </p>
            )}
            <ul className="rounded border border-line px-4">
              {ev.passages.map((p) => (
                <PassageRow key={`${p.docId}-${p.passageId}`} p={p} weakLabel="Cited, but shares no term with this opportunity" />
              ))}
            </ul>
            <More summary="How relevance is scored, and where a model would sit">
              The query is the opportunity as the record states it: its title, class, strategy, action and reason path,
              and nothing more. Each passage&apos;s score is the share of the query&apos;s weight it covers, where a rarer
              term across the corpus counts for more and a term the corpus has never seen counts as its rarest, plus{" "}
              {POLICY.retrieval.citedBoost.toFixed(2)} when the record cites the document, halved when the document is past
              its review date. The floor is {POLICY.retrieval.floor.toFixed(2)}. In production a model rewrites the query
              and reranks the candidates; the floor, the citation requirement, the exclusion of superseded documents and
              the refusal stay in code, so a verdict never depends on a model&apos;s prose.
            </More>
          </Section>

          {ev.conflicts.length > 0 && (
            <Section title="Sources that disagree">
              {ev.conflicts.map((k) => (
                <Card key={k.topic} tone="critical" icon="conflict" title={`Two current documents disagree: ${k.topic.replace(/[.-]/g, " ")}`} sub={k.note}>
                  <div className="grid gap-3 md:grid-cols-2">
                    {k.sides.map((s) => (
                      <div key={s.docId} className={`rounded border p-3 ${s.docId === k.leans ? "border-ink" : "border-line"}`}>
                        <p className="text-[13px] text-ink">{s.value}</p>
                        <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] text-ink-3">
                          <Link href={`/documents/${s.docId}#${s.passageId}`} className="text-ink underline decoration-line-strong">{s.title}</Link>
                          <span>day {s.day}</span>
                          <Pill tone={s.freshness === "stale" ? "fail" : "pass"}>{FRESHNESS_LABEL[s.freshness]}</Pill>
                          {s.docId === k.leans && <Pill tone="accent">Newer</Pill>}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-[12px] text-ink-2">Relay shows both and applies neither. The advisor, or the desk that owns the older document, resolves it.</p>
                </Card>
              ))}
            </Section>
          )}

          {ev.related.length > 0 && (
            <Section title="Related passages the record did not cite">
              <p className="mb-2 text-[13px] text-ink-2">Above the floor on the opportunity&apos;s own words. Shown for the advisor; never used in a note, because the record does not cite them.</p>
              <ul className="rounded border border-line px-4">
                {ev.related.map((p) => (
                  <PassageRow key={`${p.docId}-${p.passageId}`} p={p} />
                ))}
              </ul>
            </Section>
          )}

          <Section title="What the query matched">
            <Bars
              ariaLabel="Query terms by how many cited or related passages contain them"
              items={ev.query.terms
                .map((t) => ({ label: t, value: [...ev.passages, ...ev.related].filter((p) => p.matched.includes(t)).length }))
                .sort((a, b) => b.value - a.value || String(a.label).localeCompare(String(b.label)))
                .slice(0, 8)
                .map((x) => ({ ...x, tone: x.value === 0 ? ("muted" as const) : ("plain" as const), display: x.value === 0 ? "none" : `${x.value} passage${x.value === 1 ? "" : "s"}` }))}
            />
          </Section>
        </>
      )}

      <Section title="What the team already knows">
        <ul className="space-y-1">
          {c.contactHistory.map((e, i) => (
            <li key={i}><strong>{e.channel}</strong>, {ago(e.day)}: {e.summary}</li>
          ))}
          {c.notes.map((n, i) => (
            <li key={`n${i}`} className="rounded bg-caution-soft px-2 py-1 text-caution"><strong>{n.from}</strong>, {ago(n.day)}: {n.text}</li>
          ))}
        </ul>
        <p className="mt-2 text-[13px]">
          <Link className="underline" href={`/research/${h.id}`}>Full briefing, with what could not be established</Link>
        </p>
      </Section>

      <p className="text-xs">
        <Link className="underline" href={`/household/${h.id}`}>Client picture</Link>
        {(o.action === "fund" || o.action === "trim") && (
          <>
            {" · "}
            <Link className="underline" href={`/household/${h.id}/proposal?opp=${o.id}`}>Options</Link>
          </>
        )}
        {" · "}
        <Link className="underline" href="/documents">Document library</Link>
      </p>
    </>
  );
}
