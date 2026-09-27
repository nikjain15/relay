import Link from "next/link";
import { notFound } from "next/navigation";
import { CLIENTS } from "@/lib/data";
import { reviewPack, clientName } from "@/lib/meetings/prep";
import { dueLabel } from "@/lib/followups";
import { usd } from "@/lib/format";
import { PageTitle, Pill, Section } from "@/components/ui";
import { OrderedSections, ClientPreferences } from "@/components/profile-panel";

export function generateStaticParams() {
  return CLIENTS.map((c) => ({ id: c.id }));
}

const GOAL: Record<string, string> = { Liquidity: "Cash for planned spending", Longevity: "Retirement", Legacy: "For the next generation" };

export default async function ReviewPack({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const r = reviewPack(id);
  if (!r) notFound();
  const c = r.client;
  const fmt = (unit: string, v: number) => (unit === "months" ? `${v} months` : usd(v));
  return (
    <>
      <PageTitle
        icon="calendar"
        title={`Review pack: ${clientName(c.id)}`}
        sub={r.meeting ? `${r.meeting.time}, ${r.meeting.title}. ${r.meeting.purpose}.` : "No meeting booked today; this pack is ready for the next one."}
      />
      <div className="mb-4 max-w-3xl rounded border border-line p-3 text-meta leading-4">
        <ClientPreferences clientId={c.id} />
      </div>
      <p className="mb-2 text-body">
        <Link className="underline" href={`/research/${c.id}`}>Briefing: what has changed, what is inferred, and what could not be established</Link>
      </p>
      <p className="mb-4 text-ink-2">
        {c.persons.map((p) => `${p.name}${p.age ? ` (${p.age})` : ""}`).join(", ")} &middot; {c.tier} &middot; {usd(c.totalUsd)}
        {r.lastContact && <> &middot; last contact: {r.lastContact.channel}, {-r.lastContact.day} days ago, {r.lastContact.summary.toLowerCase()}</>}
      </p>
      <OrderedSections
        clientId={c.id}
        sections={{
          changed: (
        <Section title="What has changed">
          <ul className="list-inside list-disc space-y-0.5">
            {r.changed.map((o) => (
              <li key={o.id}>
                <Link className="underline" href={`/evidence/${o.id}`}>{o.plainTitle ?? o.title}</Link>
              </li>
            ))}
          </ul>
        </Section>
          ),
          gaps: (
        <Section title="Goals with a gap">
          {r.gaps.length ? (
            <ul className="space-y-0.5">
              {r.gaps.map((g) => (
                <li key={g.strategy}>
                  <Pill tone="fail">{GOAL[g.strategy]}</Pill> {fmt(g.unit, g.funded)} of {fmt(g.unit, g.target)}. <span className="text-ink-2">{g.assumption}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2">Every goal is funded.</p>
          )}
        </Section>
          ),
          decisions: (
        <Section title="Decisions to make">
          {r.decisions.length ? (
            <ul className="space-y-1">
              {r.decisions.map((d) => (
                <li key={d.opportunity.id}>
                  {d.opportunity.plainTitle ?? d.opportunity.title}: {d.eligible} options allowed, {d.blocked} blocked{d.amount ? `, about ${d.amount}` : ""}.{" "}
                  <Link className="text-accent underline" href={`/household/${c.id}/proposal?opp=${d.opportunity.id}`}>See options</Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-ink-2">No product decisions pending.</p>
          )}
        </Section>
          ),
          open: (
        <Section title="Open items">
          <ul className="space-y-0.5">
            {r.openPaperwork.map((w) => (
              <li key={w.form}>
                <Pill tone={w.status === "escalated" ? "fail" : "neutral"}>{w.status}</Pill> {w.form} ({w.daysOpen} days)
              </li>
            ))}
            {r.serviceRequests.map((s) => (
              <li key={s.id}>
                <Pill tone={s.callbackRequired ? "fail" : "accent"}>{s.kind}</Pill> &ldquo;{s.text}&rdquo;
              </li>
            ))}
            {r.tasks.map((t) => (
              <li key={t.text}>
                <Pill>{t.owner}</Pill> {t.text} <span className="text-ink-2">({dueLabel(t.dueDay)})</span>
              </li>
            ))}
          </ul>
        </Section>
          ),
          talking: (
        <Section title="Talking points">
          <ol className="list-inside list-decimal space-y-0.5">
            {r.talkingPoints.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </Section>
          ),
          documents: (
        <Section title="Documents to have to hand">
          <ul className="list-inside list-disc space-y-0.5 text-meta leading-4">
            {r.documents.map((d) => (
              <li key={d.id}>{d.title} <span className="text-ink-2">({d.kind})</span></li>
            ))}
          </ul>
          <p className="mt-2 text-meta leading-4 text-ink-2">Everything in this pack comes from the client file. Nothing is generated.</p>
        </Section>
          ),
        }}
      />
    </>
  );
}
