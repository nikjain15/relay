"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { OPPORTUNITIES, opportunity } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { product } from "@/lib/fixtures/shelf";
import { BOOK } from "@/lib/fixtures/book";
import { PRIOR_DISTRIBUTIONS, PROTOTYPE_TODAY, templateFor } from "@/lib/fixtures/distributions";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { retrieve } from "@/lib/evidence/retrieve";
import { addressees, compose } from "@/lib/drafting/compose";
import { countRetailRecipients, regimeAfter, RETAIL_THRESHOLD, type Distribution } from "@/lib/recipients/count";
import { useRelay } from "@/components/state";
import { resolveProfile, sourceLabel } from "@/lib/profile";
import { clientFile } from "@/lib/data";
import { APP } from "@/lib/data/policy";
import { PageTitle, Pill, Section, btn, btnPrimary } from "@/components/ui";

const F = APP.featured;

export function Communications() {
  const params = useSearchParams();
  const { accepted, accept, submit, queue, overlay } = useRelay();
  const acceptedOpps = OPPORTUNITIES.filter((o) => accepted[o.id]);
  const oppId = params.get("opp") && accepted[params.get("opp")!] ? params.get("opp")! : acceptedOpps[0]?.id;
  const [batch, setBatch] = useState<Set<string>>(new Set());
  const [includePrior, setIncludePrior] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [called, setCalled] = useState(false);

  const o = oppId ? opportunity(oppId) : undefined;
  const h = o ? household(o.householdId) : undefined;
  const prof = h ? resolveProfile({ clientId: h.id }, overlay) : undefined;
  const ev = o && h ? evaluateAll(o, h).find((e) => e.candidate.id === accepted[o.id]) : undefined;
  const evidence = o ? retrieve(o) : undefined;
  const draft = o && h && ev && evidence && !evidence.refused ? compose(h, o, ev, product(ev.candidate.productId)!, evidence.passages, { length: prof?.values["note.length"] }) : null;

  const comm = o ? templateFor(o) : "";
  const dists = useMemo(() => {
    const d: Distribution[] = [];
    if (!h) return d;
    const add = (personId: string) => d.push({ communicationId: comm, personId, advisorId: clientFile(h.id)?.advisorId ?? APP.defaultAdvisorId, institutional: false, date: PROTOTYPE_TODAY });
    addressees(h).forEach((p) => add(p.id));
    for (const b of BOOK) if (batch.has(b.id)) for (let i = 0; i < b.persons; i++) add(`${b.id}-p${i}`);
    return d;
  }, [h, batch, comm]);
  const { count, regime } = regimeAfter(includePrior ? PRIOR_DISTRIBUTIONS : [], dists, comm, PROTOTYPE_TODAY);
  const households = 1 + batch.size;
  const flipped = count > RETAIL_THRESHOLD;
  const callFirstRequired = !!prof?.values["contact.callBeforeNote"];
  const pending = ev ? queue.some((q) => q.candidateId === ev.candidate.id && !q.disposition) : false;
  // The prior sends, split by the same 30-day window the counter uses.
  const priorIn = countRetailRecipients(PRIOR_DISTRIBUTIONS, comm, PROTOTYPE_TODAY);
  const priorOut = new Set(PRIOR_DISTRIBUTIONS.filter((d) => !d.institutional && d.communicationId === comm).map((d) => d.personId)).size - priorIn;

  if (!o || !h || !ev || !draft) {
    return (
      <>
        <PageTitle title="Client communications" sub="Drafts are composed only from an accepted proposal and its cited evidence." />
        <p className="mb-3">No accepted proposal yet. Accept one from a proposal screen, or load the demo proposal.</p>
        {(() => {
          const o = opportunity(F.opportunityId);
          const h = o ? household(o.householdId) : undefined;
          const e = o && h ? evaluateAll(o, h).find((x) => x.pass && x.candidate.productId === F.productId) : undefined;
          return e && h ? (
            <button className={btnPrimary} onClick={() => accept(F.opportunityId, e.candidate.id)}>
              Load the featured proposal: {h.name}, {product(F.productId)?.plainName ?? product(F.productId)?.name}
            </button>
          ) : null;
        })()}
      </>
    );
  }

  const toggle = (id: string) =>
    setBatch((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <>
      <PageTitle title="Client communications" sub={`${h.name}: ${o.title}`} />
      <div className="grid gap-6 xl:grid-cols-[1fr_22rem]">
        <div>
          {prof && (
            <p className="mb-3 rounded border border-line px-3 py-2 text-xs">
              <strong>For this client:</strong> {prof.values["contact.channel"]} ({sourceLabel(prof.provenance["contact.channel"])})
              {prof.values["contact.window"] ? `, ${prof.values["contact.window"]}` : ""}; {prof.values["note.length"]} note ({sourceLabel(prof.provenance["note.length"])}).
              {prof.values["contact.callBeforeNote"] && (
                <> <Pill tone="fail">Call first</Pill> Rule for this client ({sourceLabel(prof.provenance["contact.callBeforeNote"])}): speak to them before any written note.</>
              )}
            </p>
          )}
          <Section title="Draft, composed from the accepted proposal and cited evidence only">
            <pre className="whitespace-pre-wrap rounded border border-line bg-subtle p-3 font-sans">{draft.text}</pre>
          </Section>
          <Section title="Talking points for your call first">
            <ul className="list-inside list-disc space-y-0.5">
              {(clientFile(h.id)?.walkthrough?.talkingPoints ?? APP.defaultTalkingPoints).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Section>
          <Section title="Batch: the same note template for other households in the book">
            <p className="mb-2 text-xs text-ink-2">Each household would get its own figures. Relay counts every recipient of the same template together, the conservative reading of Rule 2210.</p>
            <div className="mb-2 flex flex-wrap gap-2">
              <button className={btn} onClick={() => setBatch(new Set(BOOK.filter((b) => b.persons === 2).slice(0, 12).map((b) => b.id)))}>
                Select 12 two-person households
              </button>
              <button className={btn} onClick={() => setBatch(new Set())}>
                Clear
              </button>
              {priorIn + priorOut > 0 && <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={includePrior} onChange={(e) => setIncludePrior(e.target.checked)} />
                Include another advisor&apos;s sends of this note ({priorIn} persons in the last 30 days, {priorOut} older)
              </label>}
            </div>
            <ul className="grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 md:grid-cols-3">
              {BOOK.map((b) => (
                <li key={b.id}>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={batch.has(b.id)} onChange={() => toggle(b.id)} />
                    {b.name} <span className="text-xs text-ink-2">({b.persons} {b.persons === 1 ? "person" : "persons"})</span>
                  </label>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <aside aria-live="polite">
          <Section title="Recipient counter, FINRA Rule 2210(a)">
            <div className={`rounded border p-3 ${flipped ? "border-critical bg-critical-soft" : "border-positive bg-positive-soft"}`}>
              <p className="text-3xl font-semibold">{count}</p>
              <p>
                retail investors, firm-wide, last 30 calendar days ({households} {households === 1 ? "household" : "households"} from this advisor)
              </p>
              <p className="mt-2">
                <Pill tone={flipped ? "fail" : "pass"}>{regime}</Pill>
              </p>
              <p className="mt-2 text-xs">
                {flipped
                  ? "More than 25 retail investors: principal approval before use, retention and filing where applicable."
                  : "25 or fewer retail investors: correspondence, reviewed under Rule 3110(b). Relay routes it to a principal anyway during V2."}
              </p>
              <p className="mt-2 text-xs text-ink-2">Counts persons, not households, across every advisor using this note. Institutional investors excluded.</p>
            </div>
            {callFirstRequired && (
              <label className="mt-3 flex items-start gap-2 text-xs">
                <input type="checkbox" checked={called} onChange={(e) => setCalled(e.target.checked)} />
                <span>
                  <Pill tone="fail">Call first</Pill> This client&apos;s rule: I have spoken to them about this before any written note. Supervision cannot approve without it.
                </span>
              </label>
            )}
            <button
              className={`${btnPrimary} mt-3`}
              disabled={submitted || pending}
              onClick={() => {
                submit({
                  opportunityId: o.id,
                  householdId: h.id,
                  candidateId: ev.candidate.id,
                  draft: draft.text,
                  sources: draft.sources,
                  citedTitles: draft.citedTitles,
                  recipients: count,
                  regime,
                  batchSize: households,
                  callFirst: callFirstRequired ? { required: true, confirmed: called } : undefined,
                  settingsVersion: prof?.version,
                });
                setSubmitted(true);
              }}
            >
              {submitted || pending ? "Submitted for supervision" : "Submit for supervision"}
            </button>
            {(submitted || pending) && (
              <p className="mt-2 text-xs">
                In the queue. <Link className="underline" href="/supervision">Supervision console</Link> ({queue.length} item{queue.length === 1 ? "" : "s"}).
                Relay never sends: release is a human act after disposition.
              </p>
            )}
          </Section>
        </aside>
      </div>
    </>
  );
}
