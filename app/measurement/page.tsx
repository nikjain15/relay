import { FUNNEL } from "@/lib/fixtures/funnel";
import { OPPORTUNITIES } from "@/lib/fixtures/opportunities";
import { household } from "@/lib/fixtures/households";
import { product } from "@/lib/fixtures/shelf";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { retrieve } from "@/lib/evidence/retrieve";
import { addressees, compose } from "@/lib/drafting/compose";
import { classify } from "@/lib/recipients/count";
import { runChecks } from "@/lib/policy/checks";
import { Brief, PageTitle, Pill, Section, TableScroll, td, th } from "@/components/ui";

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
      for (const length of ["full", "brief"] as const) {
        const d = compose(h, o, e, product(e.candidate.productId)!, ev.passages, { length });
        drafts++;
        const n = addressees(h).length;
        for (const c of runChecks({ draft: d.text, sources: d.sources, citedTitles: d.citedTitles, recipients: n, recordedRegime: classify(n) })) {
          if (!c.pass) failures[c.id] = (failures[c.id] ?? 0) + 1;
        }
      }
    }
  }
  // Two gates hold by construction here (an eligible candidate has no failures; the regime is
  // recorded from the counter), so they are labelled as such rather than shown as live tests.
  return [
    { label: "Zero constraint breaches in eligible proposals (by construction)", fails: breaches },
    { label: "Zero performance projections in client text", fails: failures["no-projection"] ?? 0 },
    { label: "Zero unsourced figures", fails: failures["figures-sourced"] ?? 0 },
    { label: "Zero drafts without a citation", fails: failures["citation"] ?? 0 },
    { label: "Zero regime mismatches (by construction; the counter records the regime)", fails: failures["regime"] ?? 0 },
    { label: "Zero drafts without disclosure", fails: failures["disclosure"] ?? 0 },
  ].map((g) => ({ ...g, drafts, refusals }));
}

export default function Measurement() {
  const g = gates();
  const top = FUNNEL[0].count;
  return (
    <>
      <PageTitle icon="chart" title="Measurement" sub="Conversion, not volume. The north star is approved client actions per surfaced opportunity." />
      <Brief
        name="Measurement"
        icon="chart"
        says={<>Of {top.toLocaleString()} opportunities surfaced in the pilot week, {FUNNEL[FUNNEL.length - 1].count.toLocaleString()} became approved client actions. The gates below are the invariants, each with its failure count; {g.every((x) => x.fails === 0) ? "none failed." : `${g.filter((x) => x.fails > 0).length} failed.`}</>}
        note="The funnel is synthetic. The conversion between an insight flagged and an action taken is the figure a pilot establishes, and this screen is built to hold it."
      />
      <div className="grid gap-6 xl:grid-cols-2">
        <Section title="Conversion funnel, pilot cohort, one week (synthetic)">
          <TableScroll>
            <table className="w-full min-w-[34rem] border-collapse">
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
          </TableScroll>
          <p className="mt-2 text-xs text-ink-2">
            Synthetic numbers for layout only. The real funnel is the first thing to ask for in week one (PRD Appendix B, question 1).
          </p>
        </Section>
        <Section title={`Zero-tolerance release gates, computed now over ${g[0].drafts} composed drafts (full and brief)`}>
          <TableScroll>
            <table className="w-full min-w-[34rem] border-collapse">
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
          </TableScroll>
          <p className="mt-2 text-xs">
            {g[0].refusals} opportunity refused for insufficient evidence. The same checks run in <code>npm run check</code>, alongside the
            invariant that no code path can reach a client.
          </p>
        </Section>
      </div>
    </>
  );
}
