import Link from "next/link";
import { notFound } from "next/navigation";
import { opportunity, OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { retrieve } from "@/lib/evidence/retrieve";
import { clientFile } from "@/lib/data";
import { CLASS_LABEL, PageTitle, Pill, Section } from "@/components/ui";

export function generateStaticParams() {
  return OPPORTUNITIES.map((o) => ({ oppId: o.id }));
}

export default async function Evidence({ params }: { params: Promise<{ oppId: string }> }) {
  const { oppId } = await params;
  const o = opportunity(oppId);
  if (!o) notFound();
  const h = household(o.householdId)!;
  const ev = retrieve(o);

  return (
    <>
      <PageTitle title="Evidence and explain" sub={`${h.name}: ${o.title}`} />
      <Section title="Reason path, the object the ranking used">
        <p className="mb-2">
          <Pill tone="accent">{CLASS_LABEL[o.triggerClass]}</Pill>
        </p>
        <ol className="space-y-1">
          {o.reasonPath.map((n, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-24 shrink-0 text-[11px] uppercase tracking-wide text-neutral-500">{n.kind}</span>
              <span>{n.label}</span>
            </li>
          ))}
        </ol>
      </Section>
      <Section title="Cited evidence">
        {ev.refused ? (
          <div role="alert" className="rounded border border-red-700 bg-red-50 p-3">
            <p className="font-semibold text-red-900">Refused: no supporting evidence.</p>
            <p className="mt-1 text-red-900">
              No passage in the corpus links this publication to a holding in this household. Missing:{" "}
              <code>{ev.missing.join(", ")}</code>. Relay will not narrate an explanation it cannot cite.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {ev.passages.map((p, i) => (
              <li key={i} className="border-l-2 border-accent pl-3">
                <p>{p.text}</p>
                <p className="mt-0.5 text-[11px] text-neutral-500">
                  {p.title}, prototype corpus, day {p.day}
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>
      <Section title="What the team already knows">
        {(() => {
          const c = clientFile(h.id)!;
          const ago = (d: number) => (d === 0 ? "today" : `${-d} days ago`);
          return (
            <ul className="space-y-1">
              {c.contactHistory.map((e, i) => (
                <li key={i}><strong>{e.channel}</strong>, {ago(e.day)}: {e.summary}</li>
              ))}
              {c.notes.map((n, i) => (
                <li key={`n${i}`} className="rounded bg-amber-50 px-2 py-1 text-amber-900"><strong>{n.from}</strong>, {ago(n.day)}: {n.text}</li>
              ))}
            </ul>
          );
        })()}
      </Section>
      <p className="text-xs">
        <Link className="underline" href={`/household/${h.id}`}>
          Household advice state
        </Link>
        {(o.action === "fund" || o.action === "trim") && (
          <>
            {" · "}
            <Link className="underline" href={`/household/${h.id}/proposal?opp=${o.id}`}>
              Bounded proposals
            </Link>
          </>
        )}
      </p>
    </>
  );
}
