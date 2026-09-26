// Builds data/generated/walkthrough.json from data/ and the real engines, so
// the mockup shows exactly what the prototype computes. Never hand-edit the
// output: edit data/, then run `npm run data:build`. `--check` fails if stale.
import { readFileSync, writeFileSync } from "node:fs";
import { CLIENTS, ADVISORS_DATA, SHELF_DATA, PROSPECTS, SERVICE_REQUESTS, getClientFile, toHousehold } from "@/lib/data";
import { rankProspects, prospectScore, introDraft, PATH_LABEL } from "@/lib/prospecting/rank";
import { paperStatus, reminderDraft } from "@/lib/onboarding/status";
import { triage } from "@/lib/servicing/classify";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { retrieve } from "@/lib/evidence/retrieve";
import { compose } from "@/lib/drafting/compose";
import { liquidityMonths } from "@/lib/household-math";
import { constraintText } from "@/lib/constraint-text";
import { usd } from "@/lib/format";
import type { Evaluation, Failure } from "@/lib/types";

const OUT = "data/generated/walkthrough.json";
const plain = (id: string) => SHELF_DATA.find((p) => p.id === id)!;

// One plain-English reason per blocked option, most specific rule first.
function reason(failures: Failure[], who: string): string {
  const by = (rule: string) => failures.find((f) => f.rule === rule);
  const ex = by("Excluded product type");
  if (ex) return `${who} rules exclude it`;
  const lm = by("Liquidity minimum");
  if (lm) {
    const m = /covers (\d+) of (\d+) required months/.exec(lm.detail);
    return m ? `Locks money up while cash covers ${m[1]} of the ${m[2]} months required` : lm.detail;
  }
  const rl = by("Risk level");
  if (rl) {
    const m = /risk (\d+) exceeds IPS maximum (\d+)/i.exec(rl.detail);
    return m ? `Risk ${m[1]}, above ${who.toLowerCase()} limit of ${m[2]}` : rl.detail;
  }
  if (by("Liquidity strategy fit")) return "Not cash-like enough for a cash cushion";
  return failures.map((f) => f.detail).join("; ");
}

const stories = CLIENTS.filter((c) => c.walkthrough)
  .sort((a, b) => a.walkthrough!.order - b.walkthrough!.order)
  .map((c) => {
    const w = c.walkthrough!;
    const h = toHousehold(c);
    const bundle = getClientFile(c.id)!;
    const opp = c.opportunities.find((o) => o.id === w.opportunityId)!;
    const evs: Evaluation[] = evaluateAll(opp, h);
    const chosen = evs.find((e) => e.pass && e.candidate.productId === w.chooseProductId);
    if (!chosen) throw new Error(`${c.id}: chosen product ${w.chooseProductId} is not eligible`);
    const ev = retrieve(opp);
    if (ev.refused) throw new Error(`${c.id}: walkthrough opportunity has no evidence`);
    const draft = compose(h, opp, chosen, plain(chosen.candidate.productId), ev.passages);
    const goal = c.goals.find((g) => g.strategy === opp.strategy)!;
    const have = liquidityMonths(h);
    const who = c.persons.length > 1 ? "The family's" : "The client's";
    const refusedOpp = c.opportunities.find((o) => retrieve(o).refused);
    const advisor = ADVISORS_DATA.find((a) => a.id === c.advisorId)!;

    return {
      id: c.id,
      tab: w.tab,
      tabSub: w.tabSub,
      shows: w.shows,
      advisor: { ...advisor.walkthrough, groundedIn: advisor.groundedIn },
      client: { name: `${c.persons.length > 1 ? `The ${c.name} family` : c.persons[0].name}, ${usd(c.totalUsd)}`, summary: w.summary, groundedIn: c.groundedIn },
      list: [
        { who: c.persons.length > 1 ? `${c.name} family` : c.persons[0].name, what: opp.plainTitle ?? opp.title, kind: opp.triggerClass, top: true },
        ...CLIENTS.flatMap((o) => o.opportunities)
          .filter((o) => o.id !== opp.id && CLIENTS.find((x) => x.id === o.householdId)!.advisorId === c.advisorId)
          .sort((a, b) => b.materiality - a.materiality)
          .slice(0, 3)
          .map((o) => {
            const oc = CLIENTS.find((x) => x.id === o.householdId)!;
            return { who: oc.persons.length > 1 ? `${oc.name} family` : oc.persons[0].name, what: o.plainTitle ?? o.title, kind: o.triggerClass, top: false };
          }),
      ],
      chain: w.chain,
      quotes: ev.passages.map((p) => ({ text: p.text, source: `${p.title} (illustrative, prototype corpus day ${p.day})` })),
      history: c.contactHistory,
      notes: c.notes,
      refused: refusedOpp ? { title: refusedOpp.plainTitle ?? refusedOpp.title, missing: refusedOpp.evidenceDocIds } : null,
      people: c.persons.map((p) => `${p.name}${p.age ? `, ${p.age}` : ""}, ${p.role}`),
      accounts: c.holdings.map((x) => ({ name: x.name, value: usd(x.valueUsd), note: x.earmarked ? `Set aside: ${x.earmarked}` : x.shortTermLotsUsd ? `${usd(x.shortTermLotsUsd)} in lots held under a year` : "" })),
      goals: c.goals
        .filter((g) => g.target > 0)
        .map((g) => ({
          strategy: g.strategy,
          pct: Math.round(Math.min(1, g.funded / g.target) * 100),
          value: g.unit === "months" ? `${g.funded} of ${g.target} months` : `${usd(g.funded)} of ${usd(g.target)}`,
          gap: g.funded < g.target,
          assumption: g.assumption,
        })),
      rules: c.constraints.map(constraintText),
      tasks: c.tasks,
      math: {
        months: [goal.target, have],
        monthly: usd(c.monthlySpendUsd),
        amount: usd(chosen.candidate.amountUsd),
        source: chosen.candidate.source === "new_cash" ? "from the new cash" : "moved from the core portfolio",
        leftover: w.leftover,
      },
      allowed: evs.filter((e) => e.pass).map((e) => ({ id: e.candidate.productId, name: plain(e.candidate.productId).plainName, desc: plain(e.candidate.productId).plainDescription, cost: usd(e.annualCostUsd) })),
      blocked: evs.filter((e) => !e.pass).map((e) => ({ name: plain(e.candidate.productId).plainName, reason: reason(e.failures, who) })),
      choose: w.chooseProductId,
      draft: draft.text,
      talkingPoints: w.talkingPoints,
      audience: w.audience,
      audienceNote: w.audienceNote,
      queue: w.queue,
      afterApproval: w.afterApproval,
      groundingBundle: { documents: bundle.documents.map((d) => d.title) },
    };
  });

const nameOf = (id: string) => {
  const c = CLIENTS.find((x) => x.id === id)!;
  return c.persons.length > 1 ? `${c.name} family` : c.persons[0].name;
};
const journey = {
  prospects: rankProspects(PROSPECTS, "adv-a").map((p) => ({
    label: p.label, signal: p.signal, path: PATH_LABEL[p.path], pathDetail: p.pathDetail,
    estimated: usd(p.estimatedUsd), score: prospectScore(p), draft: introDraft(p), groundedIn: p.groundedIn,
  })),
  paperwork: CLIENTS.flatMap((c) => c.paperwork.map((w) => ({ c, w, ...paperStatus(w) })))
    .filter((r) => r.status !== "signed")
    .sort((a, b) => Number(b.status === "escalated") - Number(a.status === "escalated") || b.daysOpen - a.daysOpen)
    .map(({ c, w, status, daysOpen }) => ({ client: nameOf(c.id), form: w.form, status, daysOpen, note: w.note ?? "", draft: reminderDraft(c, w) })),
  service: triage(SERVICE_REQUESTS).map((r) => ({
    client: nameOf(r.clientId), channel: r.channel, text: r.text, kind: r.kind, route: r.route,
    targetHours: r.targetHours, hoursLeft: r.hoursLeft, overdue: r.overdue, callbackRequired: r.callbackRequired,
  })),
};

const out = JSON.stringify({ generatedFrom: "data/ via scripts/build-walkthrough.ts; do not hand-edit", stories, journey }, null, 2) + "\n";
if (process.argv.includes("--check")) {
  let cur = "";
  try { cur = readFileSync(OUT, "utf8"); } catch {}
  if (cur !== out) {
    console.error(`${OUT} is stale. Run: npm run data:build`);
    process.exit(1);
  }
  console.log(`${OUT} is current.`);
} else {
  writeFileSync(OUT, out);
  console.log(`Wrote ${OUT}: ${stories.length} stories.`);
}
