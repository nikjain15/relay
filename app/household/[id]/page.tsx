import Link from "next/link";
import { notFound } from "next/navigation";
import { HOUSEHOLDS, household } from "@/lib/fixtures/households";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { investableUsd, singleNamePct } from "@/lib/household-math";
import { usd, pct } from "@/lib/format";
import type { Goal } from "@/lib/types";
import { constraintText } from "@/lib/constraint-text";
import { PageTitle, Pill, Section, td, th } from "@/components/ui";

export function generateStaticParams() {
  return HOUSEHOLDS.map((h) => ({ id: h.id }));
}

function fmt(g: Goal, v: number) {
  return g.unit === "months" ? `${v} months` : usd(v);
}

export default async function HouseholdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const h = household(id);
  if (!h) notFound();
  const opps = OPPORTUNITIES.filter((o) => o.householdId === h.id);
  const total = investableUsd(h);

  return (
    <>
      <PageTitle title={`${h.name} household`} sub={`${h.archetype}. ${h.tier}. ${usd(h.totalUsd)}. ${h.hardPart}.`} />
      <Section title="Advice state against Liquidity, Longevity, Legacy">
        <table className="w-full max-w-3xl border-collapse">
          <thead>
            <tr>
              <th className={th}>Strategy</th>
              <th className={th}>Funded</th>
              <th className={th}>Target</th>
              <th className={th}>Coverage</th>
              <th className={th}>Driving assumption</th>
            </tr>
          </thead>
          <tbody>
            {h.goals.map((g) => {
              const ratio = g.target ? Math.min(1, g.funded / g.target) : 1;
              const under = g.target > 0 && g.funded < g.target;
              return (
                <tr key={g.strategy}>
                  <td className={`${td} font-medium`}>{g.strategy}</td>
                  <td className={td}>{fmt(g, g.funded)}</td>
                  <td className={td}>{g.target ? fmt(g, g.target) : "No goal"}</td>
                  <td className={td}>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 rounded bg-neutral-200" aria-hidden="true">
                        <div className={`h-2 rounded ${under ? "bg-red-700" : "bg-emerald-700"}`} style={{ width: `${ratio * 100}%` }} />
                      </div>
                      {g.target > 0 && <Pill tone={under ? "fail" : "pass"}>{under ? `Gap ${fmt(g, g.target - g.funded)}` : "Funded"}</Pill>}
                    </div>
                  </td>
                  <td className={`${td} text-neutral-600`}>{g.assumption}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Section>
      <div className="grid max-w-5xl gap-6 md:grid-cols-2">
        <Section title="Holdings">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Holding</th>
                <th className={`${th} text-right`}>Value</th>
                <th className={`${th} text-right`}>Weight</th>
              </tr>
            </thead>
            <tbody>
              {h.holdings.map((x) => (
                <tr key={x.name}>
                  <td className={td}>
                    {x.name}
                    {x.earmarked && <div className="text-[11px] text-neutral-500">Earmarked: {x.earmarked}</div>}
                    {x.shortTermLotsUsd ? <div className="text-[11px] text-neutral-500">Short-term lots: {usd(x.shortTermLotsUsd)}</div> : null}
                  </td>
                  <td className={`${td} text-right`}>{usd(x.valueUsd)}</td>
                  <td className={`${td} text-right`}>{pct((x.valueUsd / total) * 100)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 text-[11px] text-neutral-500">Single-name exposure {pct(singleNamePct(h))} of investable assets.</p>
        </Section>
        <Section title="IPS constraints and persons">
          <ul className="list-inside list-disc space-y-0.5">
            {h.constraints.map((c) => (
              <li key={c.kind}>{constraintText(c)}</li>
            ))}
          </ul>
          <p className="mt-2 text-neutral-600">
            Persons ({h.persons.length}): {h.persons.map((p) => `${p.name}, ${p.role}`).join("; ")}. Each person counts separately
            toward the retail-investor threshold.
          </p>
        </Section>
      </div>
      <Section title="Open opportunities">
        <ul className="space-y-1">
          {opps.map((o) => (
            <li key={o.id}>
              {o.title}.{" "}
              <Link className="text-accent underline" href={`/evidence/${o.id}`}>
                Evidence
              </Link>
              {(o.action === "fund" || o.action === "trim") && (
                <>
                  {" · "}
                  <Link className="text-accent underline" href={`/household/${h.id}/proposal?opp=${o.id}`}>
                    Proposals
                  </Link>
                </>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
