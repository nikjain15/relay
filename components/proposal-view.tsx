"use client";

// Options: every candidate on the approved shelf for one opportunity, with the
// figures an advisor compares before choosing, and the morning after for each.
//
// The first version showed eligibility and a cost in basis points, which is
// what a compliance officer checks and not how an advisor chooses. An advisor
// weighs after-tax income, cost over the time the money will sit, when it can
// be reached, rate risk, and what the move does to the household's cover and
// concentration. All of that is arithmetic over the shelf entry, the amount and
// a copy of the household, so it is here, per row, with the selected option
// expanded underneath. Eligibility is still decided by the constraint engine
// and nothing here changes which options pass.
import Link from "next/link";
import { useMemo, useState } from "react";
import { household } from "@/lib/fixtures/households";
import { opportunity } from "@/lib/fixtures/opportunities";
import { product } from "@/lib/fixtures/shelf";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { rationale } from "@/lib/rationale";
import { retrieve } from "@/lib/evidence/retrieve";
import { usd } from "@/lib/format";
import { needText } from "@/lib/need-text";
import { useRelay } from "@/components/state";
import { resolveProfile, sourceLabel } from "@/lib/profile";
import { Icon } from "@/components/icons";
import { AgentBar, Legend, More, PageTitle, Pill, Row, Section, TableScroll, Who, btn, btnPrimary, stack, td, th } from "@/components/ui";
import { economics, type OptionEconomics } from "@/lib/proposals/compare";
import { simulate, type Simulation, type Tone } from "@/lib/simulate/simulate";
import { policyFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { connectedIds } from "@/lib/compliance/sweep";
import { clientFile } from "@/lib/data";
import { POLICY } from "@/lib/data/policy";

const SOURCE: Record<string, string> = {
  new_cash: "New cash from the event",
  rebalance_from_core: "Rebalance from core model",
  sell_long_term_lots: "Sell long-term lots",
  sell_all_lots: "Sell all lots",
  contribute_in_kind: "Contribute shares in kind",
};
const TEXT: Record<Tone, string> = { plain: "text-ink", positive: "text-positive", caution: "text-caution", critical: "text-critical" };
const GRADE: Record<Simulation["grade"], { word: string; tone: "pass" | "fail" | "accent" }> = {
  clean: { word: "Clean", tone: "pass" }, review: { word: "Review", tone: "accent" }, blocked: { word: "Blocked", tone: "fail" },
};

export function ProposalView({ householdId, oppId, others }: { householdId: string; oppId: string; others: { id: string; title: string }[] }) {
  const h = household(householdId)!;
  const o = opportunity(oppId)!;
  const { accepted, accept, overlay, ruleEdits, connections, book } = useRelay();
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
  // A selection from another opportunity never counts: fall back to this one's first eligible option.
  const sel = evs.find((e) => e.candidate.id === selected && e.pass) ?? evs.find((e) => e.candidate.id === accepted[o.id]) ?? evs.find((e) => e.pass);
  const record = sel ? rationale(o, h, sel, evs, prof.version) : null;
  const passing = evs.filter((e) => e.pass).length;
  const refused = retrieve(o).refused;

  // The morning after, per option, from the same engines the sweep runs.
  const client = book.clients.find((c) => c.id === householdId) ?? clientFile(householdId);
  const sims = useMemo(() => {
    if (!client) return new Map<string, Simulation>();
    const policy = policyFrom(ruleEdits, scopeFor(client.advisorId), undefined, book.rules);
    const connected = connectedIds(client.advisorId, connections);
    return new Map(evs.map((e) => [e.candidate.id, simulate(client, o, e.candidate, policy, connected)]));
  }, [client, evs, o, ruleEdits, connections, book.rules]);
  const econ = useMemo(() => new Map(evs.map((e) => [e.candidate.id, economics(e.candidate, product(e.candidate.productId)!)])), [evs]);
  const tax = POLICY.proposals.taxAssumptions;
  const best = (pick: (x: OptionEconomics) => number, dir: 1 | -1 = 1) => {
    const el = evs.filter((e) => e.pass);
    if (!el.length) return undefined;
    return el.reduce((a, b) => (dir * (pick(econ.get(b.candidate.id)!) - pick(econ.get(a.candidate.id)!)) > 0 ? b : a)).candidate.id;
  };
  const bestIncome = best((x) => x.afterTaxIncomeUsd), bestCost = best((x) => x.costOverHorizonUsd, -1);

  if (refused) {
    return (
      <>
        <PageTitle icon="filter" title="Options" sub={`${h.name}: ${o.title}`} />
        <p role="alert" className="rounded border border-critical bg-critical-soft p-3 text-critical">
          Refused: this opportunity has no supporting evidence, so Relay will not propose an action on it.{" "}
          <Link className="underline" href={`/evidence/${o.id}`}>See why</Link>
        </p>
      </>
    );
  }

  const simSel = sel ? sims.get(sel.candidate.id) : undefined;
  const econSel = sel ? econ.get(sel.candidate.id) : undefined;

  return (
    <>
      <PageTitle icon="filter" title="Options" sub={`${h.name}: ${o.plainTitle ?? o.title}. The approved shelf, each option checked against this household's own rules and carried to the morning after.`} />
      <Legend className="-mt-5 mb-6 lg:hidden" />
      <AgentBar
        name="Options"
        icon="filter"
        read={`${evs.length} shelf products, ${h.constraints.length} household rules, ${client ? client.holdings.length : h.holdings.length} positions`}
        left={[`${passing} eligible`, `${evs.length - passing} rejected with the rule named`, `${[...sims.values()].filter((s) => s.grade === "clean").length} clean the morning after`]}
        steps={[
          { icon: "eye", who: "client", title: "Read the household", detail: `${usd(h.holdings.reduce((s, x) => s + x.valueUsd, 0))} across ${h.holdings.length} positions, ${h.constraints.length} IPS rules, spending ${usd(h.monthlySpendUsd)} a month.` },
          { icon: "rules", who: "agent", title: "Checked every shelf product against every rule", detail: "A rejected option is shown with the failing rule named; nothing is dropped silently." },
          { icon: "chart", who: "agent", title: "Worked out the economics of each option", detail: `Income after tax at ${tax.federalOrdinaryPct + tax.statePct + tax.niitPct}% combined for ordinary income, cost over ${POLICY.proposals.horizonYears} years, rate sensitivity from duration.` },
          { icon: "hourglass", who: "agent", title: "Carried each option to the morning after", detail: "Liquidity cover, concentration, the goal gap and every account rule, on a copy of the household." },
          { icon: "people", who: "advisor", title: "Left the choice to you", detail: "Ordering is a preference; eligibility and every figure are code." },
        ]}
        note="Yields and tax rates are illustrative shelf data. In production the custodian and the plan supply the client's own; a model may phrase the comparison and decides nothing in it."
      />
      {others.length > 1 && (
        <p className="mb-3 text-meta leading-4">
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
        const t = needText(h, o);
        return (
          <p className="mb-3 max-w-3xl rounded bg-subtle px-3 py-2">
            <Who who="client" />Need: {t.need}. <strong>{t.source}.</strong>
          </p>
        );
      })()}
      <Section title={`${evs.length} options: ${passing} eligible, ${evs.length - passing} rejected with the failing rule named`}>
        <p className="mb-2 text-meta leading-4 text-ink-2">
          Eligible first, then by {sortBy === "cost" ? "lowest annual cost" : sortBy === "access" ? "fastest access" : "lowest risk"} ({sourceLabel(prof.provenance["proposals.sortBy"])}). Ordering never changes which options pass. Income is after tax at the firm&apos;s illustrative rates; cost is over {POLICY.proposals.horizonYears} years.
        </p>
        <TableScroll>
          <table className={`w-full min-w-[64rem] border-collapse text-body ${stack.table}`}>
            <thead className={stack.head}>
              <tr>
                <th className={th}>Select</th>
                <th className={th}>Product</th>
                <th className={th}>Funding</th>
                <th className={`${th} text-right`}>Amount</th>
                <th className={`${th} text-right`}>Yield</th>
                <th className={`${th} text-right`}>Income after tax, a year</th>
                <th className={`${th} text-right`}>Cost, {POLICY.proposals.horizonYears} yrs</th>
                <th className={th}>Access</th>
                <th className={th}>Morning after</th>
                <th className={th}>Result</th>
              </tr>
            </thead>
            <tbody className={stack.body}>
              {evs.map((e) => {
                const p = product(e.candidate.productId)!;
                const x = econ.get(e.candidate.id)!;
                const s = sims.get(e.candidate.id);
                const liq = s?.consequences.find((c) => c.key === "liquidity");
                const conc = s?.consequences.find((c) => c.key === "concentration");
                const on = sel?.candidate.id === e.candidate.id;
                return (
                  <tr key={e.candidate.id} className={`${e.pass ? "" : "text-ink-2"} ${on ? "bg-selected" : ""} ${stack.row} max-md:px-2`}>
                    <td className={`${td} ${stack.cell}`}>
                      <input
                        type="radio"
                        name="candidate"
                        aria-label={`Select ${p.name}, ${SOURCE[e.candidate.source]}`}
                        disabled={!e.pass}
                        checked={on}
                        onChange={() => setSelected(e.candidate.id)}
                      />
                    </td>
                    <td className={`${td} ${stack.cell}`}>
                      <span className="text-ink">{p.name}</span>
                      <span className="block text-caption text-ink-3">risk {p.riskLevel} · {p.costBps} bps · duration {x.durationYears} yr · {p.taxTreatment?.replace("_", " ")}</span>
                    </td>
                    <td className={`${td} ${stack.wide}`}><span className={stack.label}>Funding</span>{SOURCE[e.candidate.source]}</td>
                    <td className={`${td} text-right tabular-nums ${stack.wide}`}><span className={stack.label}>Amount</span>{usd(e.candidate.amountUsd)}</td>
                    <td className={`${td} text-right tabular-nums ${stack.wide}`}><span className={stack.label}>Yield</span>{x.yieldPct.toFixed(1)}%</td>
                    <td className={`${td} text-right tabular-nums ${stack.wide}`}>
                      <span className={stack.label}>Income after tax, a year</span>
                      <span className={e.candidate.id === bestIncome ? "text-positive" : ""}>{usd(x.afterTaxIncomeUsd)}</span>
                      <span className="block text-caption text-ink-3">{usd(x.grossIncomeUsd)} gross, {x.taxPct}% tax</span>
                    </td>
                    <td className={`${td} text-right tabular-nums ${stack.wide}`}>
                      <span className={stack.label}>Cost, {POLICY.proposals.horizonYears} yrs</span>
                      <span className={e.candidate.id === bestCost ? "text-positive" : ""}>{usd(x.costOverHorizonUsd)}</span>
                      <span className="block text-caption text-ink-3">{usd(e.annualCostUsd)} a year</span>
                    </td>
                    <td className={`${td} ${stack.wide}`}><span className={stack.label}>Access</span>{x.accessLabel}{!x.minimumMet && <span className="block text-caption text-critical">Below {usd(x.minimumUsd)} minimum</span>}</td>
                    <td className={`${td} tabular-nums ${stack.wide}`}>
                      <span className={stack.label}>Morning after</span>
                      {s ? (
                        <>
                          <Pill tone={GRADE[s.grade].tone}>{GRADE[s.grade].word}</Pill>
                          <span className="mt-0.5 block text-caption text-ink-3">
                            {liq && <span className={TEXT[liq.tone]}>cover {liq.after}</span>}{liq && conc && " · "}{conc && <span className={TEXT[conc.tone]}>{conc.after} single name</span>}
                          </span>
                        </>
                      ) : <span className="text-ink-3">n/a</span>}
                    </td>
                    <td className={`${td} ${stack.wide}`}>
                      {e.pass ? (
                        <Pill tone="pass">Eligible</Pill>
                      ) : (
                        <ul className="space-y-0.5">
                          {e.failures.map((f) => (
                            <li key={f.rule}>
                              <Pill tone="fail">{f.rule}</Pill> <span className="text-meta leading-4 text-ink-2">{f.detail}</span>
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
        </TableScroll>
        <p className="mt-2 text-meta text-ink-3">Green marks the eligible option with the highest after-tax income and the lowest cost over the horizon. No price movement is assumed anywhere; every figure is arithmetic over holdings as they stand.</p>
      </Section>

      {sel && simSel && econSel && (
        <Section title={`If you chose ${product(sel.candidate.productId)!.name}, ${SOURCE[sel.candidate.source].toLowerCase()}`}>
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-meta text-ink-3"><Who who="client" />The economics for the household</p>
              <div className="rounded border border-line px-3 sm:px-4">
                <Row icon="trend" title={<span className="tabular-nums">Income {usd(econSel.grossIncomeUsd)} a year gross, {usd(econSel.afterTaxIncomeUsd)} after tax</span>} meta={`At ${econSel.yieldPct.toFixed(1)}% on ${usd(sel.candidate.amountUsd)}; ${econSel.taxNote} at ${econSel.taxPct}% combined.`} />
                <Row icon="list" title={<span className="tabular-nums">Cost {usd(econSel.costOverHorizonUsd)} over {econSel.horizonYears} years</span>} meta={`${product(sel.candidate.productId)!.costBps} basis points a year. Net of cost, after tax, over the horizon: ${usd(econSel.netOverHorizonUsd)}.`} tone={econSel.netOverHorizonUsd > 0 ? "positive" : "caution"} />
                <Row icon="clock" title={`Access ${econSel.accessLabel.toLowerCase()}`} meta={econSel.minimumMet ? `Minimum ${usd(econSel.minimumUsd)}, met.` : `Below the ${usd(econSel.minimumUsd)} minimum.`} tone={econSel.minimumMet ? "plain" : "critical"} />
                <Row icon="chart" title={<span className="tabular-nums">Rate risk: a one-point rise costs about {usd(econSel.ratePointUsd)}</span>} meta={`Duration ${econSel.durationYears} years, benchmark ${product(sel.candidate.productId)!.benchmark ?? "none"}.`} tone={econSel.durationYears > 4 ? "caution" : "plain"} />
                {simSel.consequences.map((c) => (
                  <Row key={c.key} icon={c.icon} tone={c.tone} title={<span className="tabular-nums">{c.label}: {c.before} <span className="text-ink-3">to</span> <span className={TEXT[c.tone]}>{c.after}</span></span>} meta={c.why} right={c.change ? <span className={`text-meta tabular-nums ${TEXT[c.tone]}`}>{c.change}</span> : undefined} />
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-meta text-ink-3"><Who who="agent" />The morning sweep, on the copy</p>
              <div className="mb-4 rounded border border-line px-3 sm:px-4">
                {simSel.rules.changes.length === 0
                  ? <Row icon="shield" tone="positive" title={`${simSel.rules.after.length} account rules, no verdict changes`} meta="Nothing new fires the morning after." />
                  : simSel.rules.changes.map((r) => <Row key={r.ruleId} icon="shield" tone={r.to === "clear" ? "positive" : "critical"} title={r.title} meta={r.finding} right={<Pill tone={r.to === "clear" ? "pass" : "fail"}>{r.from} to {r.to}</Pill>} />)}
                <Row icon="library" tone={simSel.evidence.refused ? "critical" : simSel.evidence.conflicts ? "caution" : "positive"} title={simSel.evidence.refused ? "Evidence refused" : `${simSel.evidence.cited} passages cited`} meta={<Link href={`/evidence/${o.id}`} className="underline">What the note would cite</Link>} />
              </div>
              <p className="mb-2 text-meta text-ink-3"><Who who="agent" />What a supervisor will ask</p>
              <ul className="mb-4 space-y-1.5 text-body text-ink-2">
                {simSel.supervisorQuestions.length === 0 && <li>Nothing beyond the rationale record.</li>}
                {simSel.supervisorQuestions.map((q, i) => <li key={i} className="flex gap-2"><Icon name="question" size={16} className="mt-0.5 shrink-0 text-ink-3" />{q}</li>)}
              </ul>
              {simSel.followOns.length > 0 && (
                <>
                  <p className="mb-2 text-meta text-ink-3">What it sets in motion</p>
                  <ul className="mb-4 space-y-1.5 text-body text-ink-2">
                    {simSel.followOns.map((f, i) => <li key={i} className="flex gap-2"><Icon name="trend" size={16} className="mt-0.5 shrink-0 text-ink-3" />{f}</li>)}
                  </ul>
                </>
              )}
              <p className="text-meta"><Link href="/simulate" className="underline">Every option side by side on Before you act</Link></p>
            </div>
          </div>
        </Section>
      )}

      {record && sel && (
        <Section title="Rationale record">
          <p className="mb-2 text-meta text-ink-3">Care-obligation evidence: Reg BI for brokerage, fiduciary duty for advisory. Written from the figures above; a person signs it.</p>
          <dl className="grid max-w-4xl grid-cols-[10rem_1fr] gap-x-3 gap-y-1 text-body">
            <dt className="text-ink-2">Basis</dt>
            <dd>{record.basis.join(" then ")}</dd>
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
            <dd className="font-mono text-meta leading-4">{record.settingsVersion}</dd>
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
          <More summary="Where the figures come from">
            Yield, duration, tax treatment and minimum are fields on the shelf entry; the after-tax figure applies the firm&apos;s illustrative marginal rates from the policy file; cost is the product&apos;s basis points over the firm&apos;s comparison horizon; the morning-after column is the consequence agent run on a copy of the household. None of it is estimated by a model.
          </More>
        </Section>
      )}
      {!record && <p role="alert">No eligible candidate. Nothing on the approved shelf satisfies this household&apos;s constraints for this action.</p>}
    </>
  );
}
