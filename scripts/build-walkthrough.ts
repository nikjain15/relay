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
import { APP } from "@/lib/data/policy";
import { FIRM, KEYS, SCHEMA, resolveProfile, sourceLabel } from "@/lib/profile";
import { fmtValue, fmtChange } from "@/lib/profile/format";
import { suggest } from "@/lib/learning/learn";
import { reviewPack, prospectFor } from "@/lib/meetings/prep";
import { allTasks, dueLabel } from "@/lib/followups";

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
    const draft = compose(h, opp, chosen, plain(chosen.candidate.productId), ev.passages, { length: resolveProfile({ clientId: c.id }).values["note.length"] });
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
  prospects: rankProspects(PROSPECTS, APP.defaultAdvisorId).map((p) => ({
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

const rp = reviewPack(APP.featured.reviewClientId);
if (!rp) throw new Error(`app.json reviewClientId ${APP.featured.reviewClientId} not found`);
const fmtGoal = (unit: string, v: number) => (unit === "months" ? `${v} months` : usd(v));
const labelOf = (id: string) => { const a = ADVISORS_DATA.find((x) => x.id === id)!; return a.walkthrough?.label ?? a.name; };
const journeyMore = {
  today: APP.todayLabel,
  policy: { dailyCap: FIRM.values["triage.dailyCap"], escalateAfterDays: FIRM.values["paperwork.escalateAfterDays"] },
  prospectsAdvisor: labelOf(APP.defaultAdvisorId),
  reviewAdvisor: labelOf(rp.client.advisorId),
  meetings: ADVISORS_DATA.map((a) => ({
    advisor: a.walkthrough?.label ?? a.name,
    items: (a.walkthrough?.meetings ?? []).map((m) => ({
      time: m.time, title: m.title, kind: m.kind, purpose: m.purpose,
      client: m.clientId ? nameOf(m.clientId) : null, prospect: prospectFor(m)?.label ?? null,
    })),
  })),
  reviewPack: {
    client: nameOf(rp.client.id),
    people: rp.client.persons.map((p) => `${p.name}${p.age ? ` (${p.age})` : ""}`).join(", "),
    total: usd(rp.client.totalUsd),
    meeting: rp.meeting ? `${rp.meeting.time}, ${rp.meeting.title}` : null,
    purpose: rp.meeting?.purpose ?? null,
    lastContact: rp.lastContact ? `${rp.lastContact.channel}, ${-rp.lastContact.day} days ago: ${rp.lastContact.summary}` : null,
    changed: rp.changed.map((o) => o.plainTitle ?? o.title),
    gaps: rp.gaps.map((g) => `${g.strategy}: ${fmtGoal(g.unit, g.funded)} of ${fmtGoal(g.unit, g.target)}`),
    decisions: rp.decisions.map((d) => `${d.opportunity.plainTitle ?? d.opportunity.title}: ${d.eligible} options allowed, ${d.blocked} blocked${d.amount ? `, about ${d.amount}` : ""}`),
    openItems: [
      ...rp.openPaperwork.map((w) => `${w.form}: ${w.status}, ${w.daysOpen} days`),
      ...rp.serviceRequests.map((s) => `${s.kind}: "${s.text}"`),
    ],
    tasks: rp.tasks.map((t) => ({ text: t.text, owner: t.owner, due: dueLabel(t.dueDay), overdue: t.dueDay < 0 })),
    talkingPoints: rp.talkingPoints,
    documents: rp.documents.map((d) => d.title),
  },
  personalization: [APP.featured.clientId, ...CLIENTS.filter((c) => c.advisorId !== ADVISORS_DATA.find((a) => a.id === CLIENTS.find((x) => x.id === APP.featured.clientId)!.advisorId)!.id).slice(0, 1).map((c) => c.id)].map((id) => {
    const r = resolveProfile({ clientId: id });
    return {
      client: nameOf(id),
      advisor: labelOf(CLIENTS.find((c) => c.id === id)!.advisorId),
      version: r.version,
      settings: KEYS.filter((k) => r.values[k as keyof typeof r.values] !== undefined).map((k) => ({
        label: SCHEMA[k].label, kind: SCHEMA[k].kind, value: fmtValue(k, r.values[k as keyof typeof r.values]), from: sourceLabel(r.provenance[k]),
      })),
    };
  }),
  suggestions: suggest().map((s) => ({
    who: s.scope === "client" ? nameOf(s.scopeId) : labelOf(s.scopeId),
    setting: SCHEMA[s.key].label,
    from: fmtChange(s.key, s.from, s.to, s.detail)[0] + fmtChange(s.key, s.from, s.to, s.detail)[1],
    to: fmtChange(s.key, s.from, s.to, s.detail)[2],
    because: s.because, measure: s.measure, heldBack: s.heldBack ?? null,
  })),
  followUps: allTasks().map((t) => ({ client: t.clientName, text: t.text, owner: t.owner, due: dueLabel(t.dueDay), overdue: t.dueDay < 0 })),
};

const out = JSON.stringify({ generatedFrom: "data/ via scripts/build-walkthrough.ts; do not hand-edit", stories, journey: { ...journey, ...journeyMore } }, null, 2) + "\n";
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
