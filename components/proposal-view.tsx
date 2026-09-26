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
import { resolveProfile, sourceLabel } from "@/lib/profile";
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
  const { accepted, accept, overlay } = useRelay();
  const prof = resolveProfile({ clientId: householdId }, overlay);
  const sortBy = prof.values["proposals.sortBy"];
  // Personalization orders the list; it never changes which candidates pass.
  const key = (e: ReturnType<typeof evaluateAll>[number]) => {
    const p = product(e.candidate.productId)!;
    return sortBy === "cost" ? e.annualCostUsd : sortBy === "access" ? p.liquidityDays : p.riskLevel;
  };
  const evs = evaluateAll(o, h)
    .map((e, i) => ({ e, i }))
    .sort((a, b) => Number(b.e.pass) - Number(a.e.pass) || key(a.e) - key(b.e) || a.i - b.i)
    .map((x) => x.e);
  const [selected, setSelected] = useState<string | null>(accepted[o.id] ?? evs.find((e) => e.pass)?.candidate.id ?? null);
  const sel = evs.find((e) => e.candidate.id === selected);
  const record = sel ? rationale(o, h, sel, evs) : null;
  const passing = evs.filter((e) => e.pass).length;
  const refused = retrieve(o).refused;

  if (refused) {
    return (
      <>
        <PageTitle title="Action proposals, bounded" sub={`${h.name}: ${o.title}`} />
        <p role="alert" className="rounded border border-critical bg-critical-soft p-3 text-critical">
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
      {o.action === "fund" && evs[0] && (() => {
        const g = h.goals.find((x) => x.strategy === o.strategy);
        return g && g.unit === "months" ? (
          <p className="mb-3 max-w-3xl rounded bg-subtle px-3 py-2">
            Need: ({g.target} &minus; {g.funded}) months &times; {usd(h.monthlySpendUsd)} = <strong>{usd(evs[0].candidate.amountUsd)}</strong>
            {o.inflowUsd ? `, from ${usd(o.inflowUsd)} of new cash` : ", moved from the core portfolio"}.
          </p>
        ) : null;
      })()}
      <Section title={`${evs.length} candidates: ${passing} eligible, ${evs.length - passing} rejected with the failing constraint named`}>
        <p className="mb-2 text-xs text-ink-2">
          Eligible first, then by {sortBy === "cost" ? "lowest annual cost" : sortBy === "access" ? "fastest access" : "lowest risk"} ({sourceLabel(prof.provenance["proposals.sortBy"])}). Ordering never changes which options pass.
        </p>
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
                <tr key={e.candidate.id} className={e.pass ? "" : "text-ink-2"}>
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
                    <div className="text-xs">risk {p.riskLevel}, access {p.liquidityDays} days, {p.costBps} bps</div>
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
                            <Pill tone="fail">{f.rule}</Pill> <span className="text-xs text-ink-2">{f.detail}</span>
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
            <dt className="text-ink-2">Basis</dt>
            <dd>{record.basis.join(" → ")}</dd>
            <dt className="text-ink-2">Selected</dt>
            <dd>
              {product(record.selected.productId)!.name}, {SOURCE[record.selected.source].toLowerCase()}, {usd(record.selected.amountUsd)}
            </dd>
            <dt className="text-ink-2">Alternatives</dt>
            <dd>
              <ul>
                {record.alternatives.map((a, i) => (
                  <li key={i}>
                    {product(a.productId)!.name} ({SOURCE[a.source].toLowerCase()}): {a.outcome}
                  </li>
                ))}
              </ul>
            </dd>
            <dt className="text-ink-2">Costs compared</dt>
            <dd>{record.costsCompared.map((c) => `${product(c.productId)!.name} ${c.costBps} bps (${usd(c.annualCostUsd)} a year)`).join("; ")}</dd>
            <dt className="text-ink-2">Why suitable</dt>
            <dd>{record.whySuitable.join("; ")}</dd>
            <dt className="text-ink-2">Settings used</dt>
            <dd className="font-mono text-xs">{prof.version}</dd>
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
