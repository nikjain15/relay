import { FUNNEL } from "@/lib/fixtures/funnel";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { product } from "@/lib/fixtures/shelf";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { retrieve } from "@/lib/evidence/retrieve";
import { compose } from "@/lib/drafting/compose";
import { runChecks } from "@/lib/policy/checks";
import { PageTitle, Pill, Section, td, th } from "@/components/ui";

// Gates computed live over every eligible proposal in the fixtures, with the
// same functions the test suite asserts on.
function gates() {
  let drafts = 0;
  const failures: Record<string, number> = {};
  let breaches = 0;
  let refusals = 0;
  for (const o of OPPORTUNITIES) {
    const h = household(o.householdId)!;
    const ev = retrieve(o);
    if (ev.refused) {
      refusals++;
      continue;
    }
    for (const e of evaluateAll(o, h)) {
      if (e.pass && e.failures.length) breaches++;
      if (!e.pass) continue;
      const d = compose(h, o, e, product(e.candidate.productId)!, ev.passages);
      drafts++;
      for (const c of runChecks({ draft: d.text, sources: d.sources, citedTitles: d.citedTitles, recipients: h.persons.length, recordedRegime: "correspondence" })) {
        if (!c.pass) failures[c.id] = (failures[c.id] ?? 0) + 1;
      }
    }
  }
  return [
    { label: "Zero constraint breaches in eligible proposals", fails: breaches },
    { label: "Zero performance projections in client text", fails: failures["no-projection"] ?? 0 },
    { label: "Zero unsourced figures", fails: failures["figures-sourced"] ?? 0 },
    { label: "Zero drafts without a citation", fails: failures["citation"] ?? 0 },
    { label: "Zero regime mismatches", fails: failures["regime"] ?? 0 },
    { label: "Zero drafts without disclosure", fails: failures["disclosure"] ?? 0 },
  ].map((g) => ({ ...g, drafts, refusals }));
}

export default function Measurement() {
  const g = gates();
  const top = FUNNEL[0].count;
  return (
    <>
      <PageTitle title="Measurement" sub="Conversion, not volume. The north star is approved client actions per surfaced opportunity." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Conversion funnel, pilot cohort, one week (synthetic)">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={th}>Stage</th>
                <th className={`${th} text-right`}>Count</th>
                <th className={`${th} text-right`}>From previous</th>
                <th className={th}>Share of generated</th>
              </tr>
            </thead>
            <tbody>
              {FUNNEL.map((s, i) => (
                <tr key={s.stage}>
                  <td className={td}>{s.stage}</td>
                  <td className={`${td} text-right`}>{s.count.toLocaleString("en-US")}</td>
                  <td className={`${td} text-right`}>{i === 0 ? "" : `${Math.round((s.count / FUNNEL[i - 1].count) * 100)}%`}</td>
                  <td className={td}>
                    <div className="h-2 rounded bg-accent" style={{ width: `${Math.max(1, (s.count / top) * 100)}%` }} aria-hidden="true" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-neutral-500">
            Synthetic numbers for layout only. The real funnel is the first thing to ask for in week one (PRD Appendix B, question 1).
          </p>
        </Section>
        <Section title={`Zero-tolerance release gates, computed now over ${g[0].drafts} composed drafts`}>
          <table className="w-full border-collapse">
            <tbody>
              {g.map((x) => (
                <tr key={x.label}>
                  <td className={td}>{x.label}</td>
                  <td className={td}>
                    <Pill tone={x.fails ? "fail" : "pass"}>{x.fails ? `${x.fails} failing` : "Pass"}</Pill>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs">
            {g[0].refusals} opportunity refused for insufficient evidence. The same checks run in <code>npm run check</code>, alongside the
            invariant that no code path can reach a client.
          </p>
        </Section>
      </div>
    </>
  );
}
