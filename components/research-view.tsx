"use client";

// The briefing body, reading the session's book so that a note filed from a
// dossier, or a household connected from a file, shows up here without a
// rebuild. The page under app/ keeps the static params and hands the id in.
import Link from "next/link";
import { useRelay } from "@/components/state";
import { brief, type Finding, type Unknown } from "@/lib/research/brief";
import { clientName } from "@/lib/meetings/prep";
import { Card, More, PageTitle, Pill, Section, StatRow } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Bars } from "@/components/charts";

function Cites({ cites }: { cites: Finding["cites"] }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px] text-ink-3">
      <Icon name="link" size={16} />
      {cites.map((k, i) => (
        <span key={i}>
          {k.href ? <Link href={k.href} className="text-ink-2 underline decoration-line-strong hover:decoration-ink">{k.label}</Link> : <span className="text-ink-2">{k.label}</span>}
          <code className="ml-1 break-all text-[11px] text-ink-3">{k.record}</code>
        </span>
      ))}
    </span>
  );
}

function FindingRow({ x }: { x: Finding }) {
  return (
    <li className="border-b border-line py-3 last:border-b-0">
      <p className="text-[14px] text-ink">{x.text}</p>
      {x.kind === "inferred" && (
        <p className="mt-1 flex flex-wrap items-center gap-2 text-[12px]">
          <Pill tone="accent">Inferred, {Math.round(x.confidence * 100)} percent</Pill>
          {x.askThis && <span className="text-ink-2">Ask: {x.askThis}</span>}
        </p>
      )}
      <Cites cites={x.cites} />
    </li>
  );
}

function UnknownRow({ u }: { u: Unknown }) {
  return (
    <li className="border-b border-line py-3 last:border-b-0">
      <p className="flex items-start gap-2 text-[14px] text-ink">
        <Icon name="question" size={20} className="mt-px shrink-0 text-critical" />
        <span>{u.text}</span>
      </p>
      <p className="ml-7 mt-1 text-[13px] text-ink-2">{u.why}</p>
      {u.askThis && <p className="ml-7 mt-1 text-[13px] text-ink">Ask: {u.askThis}</p>}
      <span className="ml-7 block"><Cites cites={u.cites} /></span>
    </li>
  );
}

export function ResearchView({ id }: { id: string }) {
  const { connections, book } = useRelay();
  const b = brief(id, connections, book.clients);
  if (!b) return <p>No briefing for this household.</p>;
  const ago = (d: number) => (d === 0 ? "today" : `${-d} days ago`);

  return (
    <>
      <PageTitle
        title={`Briefing: ${clientName(b.clientId)}`}
        sub={b.lastContact ? `Last conversation ${ago(b.lastContact.day)} by ${b.lastContact.channel.toLowerCase()}. What has changed since, what the file says, what Relay infers, and what it could not establish.` : "No conversation is logged. What the file says, what Relay infers, and what it could not establish."}
      />

      <StatRow
        items={[
          { value: b.since.length, label: "Changed since you spoke", icon: "trend" },
          { value: b.observed.length, label: "Observed, cited to a field", icon: "check" },
          { value: b.inferred.length, label: "Inferred, with confidence", icon: "eye", tone: b.inferred.length ? "plain" : "positive" },
          { value: b.unknowns.length, label: "Could not establish", icon: "question", tone: b.unknowns.length ? "critical" : "positive" },
        ]}
      />

      <Section title="Since you last spoke">
        {b.since.length ? (
          <ul className="rounded border border-line px-4">
            {b.since.map((x) => <FindingRow key={x.id} x={x} />)}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-2">Nothing new is on file since the last conversation.</p>
        )}
      </Section>

      <Section title="What the file observes">
        <ul className="rounded border border-line px-4">
          {b.observed.map((x) => <FindingRow key={x.id} x={x} />)}
        </ul>
      </Section>

      <Section title="What Relay infers, least certain first">
        {b.inferred.length ? (
          <ul className="rounded border border-line px-4">
            {b.inferred.map((x) => <FindingRow key={x.id} x={x} />)}
          </ul>
        ) : (
          <p className="text-[13px] text-ink-2">Nothing here is inferred. Every claim above is read straight off a record.</p>
        )}
        <More summary="What an inference is here, and what a model would do">
          An inference is a sentence Relay produced from a record that was written for another purpose: a colleague&apos;s note,
          an earmark on a holding, a flag on the firm&apos;s account record. Each carries the confidence its probe assigns
          (a team note 70 percent, a text classification 80 percent, file arithmetic 85 percent) and the question that
          would turn it into an observation. In production a model would draft these sentences and could read free text
          more capably; it would still not decide what is observed against inferred, what is missing, or what may be
          asserted without a record behind it.
        </More>
      </Section>

      <Section title="What Relay could not establish">
        {b.unknowns.length ? (
          <ul className="rounded border border-critical/40 bg-critical-soft px-4">
            {b.unknowns.map((u) => <UnknownRow key={u.id} u={u} />)}
          </ul>
        ) : (
          <Card tone="positive" icon="check" title="Nothing missing that the probes look for">
            <p className="text-[13px] text-ink-2">Every probe found its record. That is a statement about the file, not about the client.</p>
          </Card>
        )}
      </Section>

      {b.questions.length > 0 && (
        <Section title="Questions worth asking">
          <ol className="list-inside list-decimal space-y-1.5 text-[14px]">
            {b.questions.map((q, i) => (
              <li key={i}>
                {q.text} <span className="text-[12px] text-ink-3">from: {q.from.length > 90 ? `${q.from.slice(0, 90)}…` : q.from}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <div className="grid gap-8 md:grid-cols-2">
        <Section title="Assembled from">
          <Bars ariaLabel="Records read, by claims each supports" items={b.sources.slice(0, 8).map((s) => ({ label: <span title={s.record}>{s.label}</span>, value: s.claims, display: `${s.claims} claim${s.claims === 1 ? "" : "s"}` }))} />
          <p className="mt-2 text-[12px] text-ink-3">{b.probesRun.length} probes ran: {b.probesRun.join(", ")}.</p>
        </Section>
        <Section title="What this briefing cannot have seen">
          {b.blindSpots.length ? (
            <p className="text-[13px] text-ink">
              {b.blindSpots.join(", ")}: in use by the advisor, captured by nothing. <Link href="/connectors" className="underline">Connected channels</Link>.
            </p>
          ) : (
            <p className="text-[13px] text-ink-2">Every channel the advisor uses is captured.</p>
          )}
          <p className="mt-2 text-[12px] text-ink-3">Nothing here was drafted for the client, and nothing is sent. The advisor takes it into the conversation.</p>
        </Section>
      </div>

      <p className="text-xs">
        <Link className="underline" href={`/household/${b.clientId}`}>Client picture</Link>
        {" · "}
        <Link className="underline" href={`/meetings/${b.clientId}`}>Review pack</Link>
        {" · "}
        <Link className="underline" href="/research">All briefings</Link>
      </p>
    </>
  );
}
