"use client";

import Link from "next/link";
import { useState } from "react";
import { household } from "@/lib/fixtures/households";
import { opportunity } from "@/lib/fixtures/opportunities";
import { product } from "@/lib/fixtures/shelf";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { rationale } from "@/lib/rationale";
import { retrieve } from "@/lib/evidence/retrieve";
import { usd } from "@/lib/format";
import { useRelay } from "@/components/state";
import { PageTitle, Pill, Section, btn, btnPrimary, td, th } from "@/components/ui";

const SOURCE: Record<string, string> = {
  new_cash: "New cash from the event",
  rebalance_from_core: "Rebalance from core model",
  sell_long_term_lots: "Sell long-term lots",
  sell_all_lots: "Sell all lots",
  contribute_in_kind: "Contribute shares in kind",
};

export function ProposalView({ householdId, oppId, others }: { householdId: string; oppId: string; others: { id: string; title: string }[] }) {
  const h = household(householdId)!;
  const o = opportunity(oppId)!;
  const evs = evaluateAll(o, h);
  const { accepted, accept } = useRelay();
  const [selected, setSelected] = useState<string | null>(accepted[o.id] ?? evs.find((e) => e.pass)?.candidate.id ?? null);
  const sel = evs.find((e) => e.candidate.id === selected);
  const record = sel ? rationale(o, h, sel, evs) : null;
  const passing = evs.filter((e) => e.pass).length;
  const refused = retrieve(o).refused;

  if (refused) {
    return (
      <>
        <PageTitle title="Action proposals, bounded" sub={`${h.name}: ${o.title}`} />
        <p role="alert" className="rounded border border-red-700 bg-red-50 p-3 text-red-900">
          Refused: this opportunity has no supporting evidence, so Relay will not propose an action on it.{" "}
          <Link className="underline" href={`/evidence/${o.id}`}>See why</Link>
        </p>
      </>
    );
  }

  return (
    <>
      <PageTitle title="Action proposals, bounded" sub={`${h.name}: ${o.title}. Candidates are the approved shelf only, each checked against this household's IPS.`} />
      {others.length > 1 && (
        <p className="mb-3 text-xs">
          Opportunity:{" "}
          {others.map((x, i) => (
            <span key={x.id}>
              {i > 0 && " · "}
              {x.id === o.id ? <strong>{x.title}</strong> : <Link className="underline" href={`/household/${h.id}/proposal?opp=${x.id}`}>{x.title}</Link>}
            </span>
          ))}
        </p>
      )}
      <Section title={`${evs.length} candidates: ${passing} eligible, ${evs.length - passing} rejected with the failing constraint named`}>
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={th}>Select</th>
              <th className={th}>Product</th>
              <th className={th}>Funding</th>
              <th className={`${th} text-right`}>Amount</th>
              <th className={`${th} text-right`}>Annual cost</th>
              <th className={th}>Result</th>
            </tr>
          </thead>
          <tbody>
            {evs.map((e) => {
              const p = product(e.candidate.productId)!;
              return (
                <tr key={e.candidate.id} className={e.pass ? "" : "text-neutral-500"}>
                  <td className={td}>
                    <input
                      type="radio"
                      name="candidate"
                      aria-label={`Select ${p.name}, ${SOURCE[e.candidate.source]}`}
                      disabled={!e.pass}
                      checked={selected === e.candidate.id}
                      onChange={() => setSelected(e.candidate.id)}
                    />
                  </td>
                  <td className={td}>
                    {p.name}
                    <div className="text-[11px]">risk {p.riskLevel}, access {p.liquidityDays} days, {p.costBps} bps</div>
                  </td>
                  <td className={td}>{SOURCE[e.candidate.source]}</td>
                  <td className={`${td} text-right`}>{usd(e.candidate.amountUsd)}</td>
                  <td className={`${td} text-right`}>{usd(e.annualCostUsd)}</td>
                  <td className={td}>
                    {e.pass ? (
                      <Pill tone="pass">Eligible</Pill>
                    ) : (
                      <ul className="space-y-0.5">
                        {e.failures.map((f) => (
                          <li key={f.rule}>
                            <Pill tone="fail">{f.rule}</Pill> <span className="text-[11px] text-neutral-700">{f.detail}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
      {record && sel && (
        <Section title="Rationale record, structured (Reg BI care evidence)">
          <dl className="grid max-w-4xl grid-cols-[10rem_1fr] gap-x-3 gap-y-1">
            <dt className="text-neutral-500">Basis</dt>
            <dd>{record.basis.join(" → ")}</dd>
            <dt className="text-neutral-500">Selected</dt>
            <dd>
              {product(record.selected.productId)!.name}, {SOURCE[record.selected.source].toLowerCase()}, {usd(record.selected.amountUsd)}
            </dd>
            <dt className="text-neutral-500">Alternatives</dt>
            <dd>
              <ul>
                {record.alternatives.map((a, i) => (
                  <li key={i}>
                    {product(a.productId)!.name} ({SOURCE[a.source].toLowerCase()}): {a.outcome}
                  </li>
                ))}
              </ul>
            </dd>
            <dt className="text-neutral-500">Costs compared</dt>
            <dd>{record.costsCompared.map((c) => `${product(c.productId)!.name} ${c.costBps} bps (${usd(c.annualCostUsd)} a year)`).join("; ")}</dd>
            <dt className="text-neutral-500">Why suitable</dt>
            <dd>{record.whySuitable.join("; ")}</dd>
          </dl>
          <div className="mt-3 flex items-center gap-3">
            <button className={btnPrimary} onClick={() => accept(o.id, sel.candidate.id)}>
              {accepted[o.id] === sel.candidate.id ? "Accepted" : "Accept proposal"}
            </button>
            {accepted[o.id] && (
              <Link className={btn} href={`/communications?opp=${o.id}`}>
                Draft client note
              </Link>
            )}
          </div>
        </Section>
      )}
      {!record && <p role="alert">No eligible candidate. Nothing on the approved shelf satisfies this household&apos;s constraints for this action.</p>}
    </>
  );
}
