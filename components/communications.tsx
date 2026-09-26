"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { OPPORTUNITIES, opportunity } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { product } from "@/lib/fixtures/shelf";
import { BOOK } from "@/lib/fixtures/book";
import { DEMO_COMMUNICATION, PRIOR_DISTRIBUTIONS, PROTOTYPE_TODAY } from "@/lib/fixtures/distributions";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { retrieve } from "@/lib/evidence/retrieve";
import { compose } from "@/lib/drafting/compose";
import { regimeAfter, RETAIL_THRESHOLD, type Distribution } from "@/lib/recipients/count";
import { useRelay } from "@/components/state";
import { clientFile } from "@/lib/data";
import { PageTitle, Pill, Section, btn, btnPrimary } from "@/components/ui";

const DEMO_OPP = "opp-renner-property";
const DEMO_CANDIDATE = "opp-renner-property:prod-tsy-ladder:new_cash";

export function Communications() {
  const params = useSearchParams();
  const { accepted, accept, submit, queue } = useRelay();
  const acceptedOpps = OPPORTUNITIES.filter((o) => accepted[o.id]);
  const oppId = params.get("opp") && accepted[params.get("opp")!] ? params.get("opp")! : acceptedOpps[0]?.id;
  const [batch, setBatch] = useState<Set<string>>(new Set());
  const [includePrior, setIncludePrior] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const o = oppId ? opportunity(oppId) : undefined;
  const h = o ? household(o.householdId) : undefined;
  const ev = o && h ? evaluateAll(o, h).find((e) => e.candidate.id === accepted[o.id]) : undefined;
  const evidence = o ? retrieve(o) : undefined;
  const draft = o && h && ev && evidence && !evidence.refused ? compose(h, o, ev, product(ev.candidate.productId)!, evidence.passages) : null;

  const dists = useMemo(() => {
    const d: Distribution[] = [];
    if (!h) return d;
    const add = (personId: string) => d.push({ communicationId: DEMO_COMMUNICATION, personId, advisorId: "adv-a", institutional: false, date: PROTOTYPE_TODAY });
    h.persons.forEach((p) => add(p.id));
    for (const b of BOOK) if (batch.has(b.id)) for (let i = 0; i < b.persons; i++) add(`${b.id}-p${i}`);
    return d;
  }, [h, batch]);
  const { count, regime } = regimeAfter(includePrior ? PRIOR_DISTRIBUTIONS : [], dists, DEMO_COMMUNICATION, PROTOTYPE_TODAY);
  const households = 1 + batch.size;
  const flipped = count > RETAIL_THRESHOLD;

  if (!o || !h || !ev || !draft) {
    return (
      <>
        <PageTitle title="Client communications" sub="Drafts are composed only from an accepted proposal and its cited evidence." />
        <p className="mb-3">No accepted proposal yet. Accept one from a proposal screen, or load the demo proposal.</p>
        <button className={btnPrimary} onClick={() => accept(DEMO_OPP, DEMO_CANDIDATE)}>
          Load demo proposal: Renner, Treasury ladder
        </button>
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
          <Section title="Draft, composed from the accepted proposal and cited evidence only">
            <pre className="whitespace-pre-wrap rounded border border-neutral-300 bg-neutral-50 p-3 font-sans">{draft.text}</pre>
          </Section>
          <Section title="Talking points for your call first">
            <ul className="list-inside list-disc space-y-0.5">
              {(clientFile(h.id)?.walkthrough?.talkingPoints ?? ["Explain the gap in plain terms", "Walk through the option and its cost", "Agree the next step"]).map((x) => (
                <li key={x}>{x}</li>
              ))}
            </ul>
          </Section>
          <Section title="Batch: send the same note to other households in the book">
            <div className="mb-2 flex flex-wrap gap-2">
              <button className={btn} onClick={() => setBatch(new Set(BOOK.filter((b) => b.persons === 2).slice(0, 12).map((b) => b.id)))}>
                Select 12 two-person households
              </button>
              <button className={btn} onClick={() => setBatch(new Set())}>
                Clear
              </button>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={includePrior} onChange={(e) => setIncludePrior(e.target.checked)} />
                Include another advisor&apos;s sends of this note (6 persons in the last 30 days, 3 older)
              </label>
            </div>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 md:grid-cols-3">
              {BOOK.map((b) => (
                <li key={b.id}>
                  <label className="flex items-center gap-1">
                    <input type="checkbox" checked={batch.has(b.id)} onChange={() => toggle(b.id)} />
                    {b.name} <span className="text-[11px] text-neutral-500">({b.persons} {b.persons === 1 ? "person" : "persons"})</span>
                  </label>
                </li>
              ))}
            </ul>
          </Section>
        </div>
        <aside aria-live="polite">
          <Section title="Recipient counter, FINRA Rule 2210(a)">
            <div className={`rounded border p-3 ${flipped ? "border-red-700 bg-red-50" : "border-emerald-700 bg-emerald-50"}`}>
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
              <p className="mt-2 text-[11px] text-neutral-600">Counts persons, not households, across every advisor using this note. Institutional investors excluded.</p>
            </div>
            <button
              className={`${btnPrimary} mt-3`}
              disabled={submitted}
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
                });
                setSubmitted(true);
              }}
            >
              {submitted ? "Submitted for supervision" : "Submit for supervision"}
            </button>
            {submitted && (
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
