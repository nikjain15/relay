// Checks every data file for shape and cross-reference errors. Run by the
// test suite, so a broken edit to data/ fails `npm run check`.
import type { ClientFile } from "@/lib/types";
import { POLICY, APP } from "@/lib/data/policy";
import { validateProfiles } from "@/lib/profile/validate";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { toHousehold, COMMUNICATIONS, ADVISORS_DATA, CLIENTS, DOCUMENTS, PROSPECTS, SERVICE_REQUESTS, SHELF_DATA } from "@/lib/data";
import { liquidityMonths } from "@/lib/household-math";
import { usd } from "@/lib/format";
import { addressees } from "@/lib/drafting/compose";

const TRIGGER_CLASSES = ["life_event", "external_event", "household_threshold", "plan_service_event", "market_view"];
const ACTIONS = ["trim", "fund", "rebalance", "review"];
const STRATEGIES = ["Liquidity", "Longevity", "Legacy"];
const TIERS = ["$50M+", "$5M+", "$500K to $5M", "Wealth Advice Center"];
const ROLES = ["primary", "spouse", "trustee", "beneficiary"];
const PRODUCT_TYPES = ["treasury_ladder", "money_market", "exchange_fund", "structured_note", "diversified_model", "private_credit", "municipal_ladder", "sector_etf"];
const PATHS = ["existing", "referral", "event", "signal"];
/** Ids appear in URLs and in the data-separation scan: lower case, digits and hyphens. */
const ID = /^[a-z0-9][a-z0-9-]*$/;
const money = (n: unknown) => typeof n === "number" && Number.isFinite(n) && n >= 0;

export function validate(): string[] {
  const errors: string[] = [];
  const err = (m: string) => errors.push(m);
  const ids = new Set<string>();
  const personIds = new Set<string>();
  const oppIds = new Set<string>();
  const docIds = new Set(DOCUMENTS.map((d) => d.id));
  const productIds = new Set(SHELF_DATA.map((p) => p.id));
  const advisorIds = new Set(ADVISORS_DATA.map((a) => a.id));

  for (const c of CLIENTS as ClientFile[]) {
    const at = `client ${c.id}`;
    for (const k of ["id", "name", "tier", "advisorId", "totalUsd", "monthlySpendUsd", "persons", "holdings", "goals", "constraints", "opportunities", "groundedIn"] as const) {
      if (c[k] === undefined) err(`${at}: missing ${k}`);
    }
    if (!ID.test(c.id)) err(`${at}: id must be lower case letters, digits and hyphens`);
    if (ids.has(c.id)) err(`${at}: duplicate id`);
    if (!TIERS.includes(c.tier)) err(`${at}: unknown tier ${c.tier}`);
    if (!(c.monthlySpendUsd > 0)) err(`${at}: monthlySpendUsd must be above zero`);
    if (!(c.totalUsd > 0)) err(`${at}: totalUsd must be above zero`);
    if (!c.persons?.length) err(`${at}: needs at least one person`);
    for (const p of c.persons ?? []) if (!p.name?.trim() || !ROLES.includes(p.role)) err(`${at}: person ${p.id} needs a name and a known role`);
    for (const h of c.holdings ?? []) {
      if (!money(h.valueUsd)) err(`${at}: holding ${h.name} needs a value of zero or more`);
      if (h.shortTermLotsUsd !== undefined && !(money(h.shortTermLotsUsd) && h.shortTermLotsUsd <= h.valueUsd)) err(`${at}: holding ${h.name} short-term lots exceed its value`);
    }
    for (const g of c.goals ?? []) {
      if (!STRATEGIES.includes(g.strategy) || !["months", "USD"].includes(g.unit)) err(`${at}: goal needs a known strategy and unit`);
      // The months shown on screen and in notes are stored; the engine computes them from holdings. They must agree.
      if (g.strategy === "Liquidity" && g.unit === "months" && c.holdings && c.monthlySpendUsd > 0 && g.funded !== liquidityMonths(toHousehold(c)))
        err(`${at}: Liquidity goal says ${g.funded} months but holdings cover ${liquidityMonths(toHousehold(c))}`);
    }
    for (const k of c.constraints ?? []) {
      switch (k.kind) {
        case "maxSingleName": if (!(k.pct > 0 && k.pct <= 100)) err(`${at}: maxSingleName pct must be 1 to 100`); break;
        case "minLiquidityMonths": if (!(k.months >= 0)) err(`${at}: minLiquidityMonths must be zero or more`); break;
        case "maxRiskLevel": if (!(k.level >= 1 && k.level <= 5)) err(`${at}: maxRiskLevel must be 1 to 5`); break;
        case "noShortTermGains": break;
        case "excludedProductTypes": for (const t of k.types ?? []) if (!PRODUCT_TYPES.includes(t)) err(`${at}: excluded product type ${t} is not a shelf type`); break;
        default: err(`${at}: unknown constraint kind ${(k as { kind: string }).kind}`);
      }
    }
    ids.add(c.id);
    if (!advisorIds.has(c.advisorId)) err(`${at}: unknown advisor ${c.advisorId}`);
    const sum = c.holdings.reduce((s, h) => s + h.valueUsd, 0);
    if (sum !== c.totalUsd) err(`${at}: holdings sum ${sum} but totalUsd ${c.totalUsd}`);
    for (const p of c.persons) {
      if (personIds.has(p.id)) err(`${at}: duplicate person ${p.id}`);
      personIds.add(p.id);
    }
    for (const h of c.holdings) if (h.productId && !productIds.has(h.productId)) err(`${at}: holding references unknown product ${h.productId}`);
    if (!c.groundedIn.length) err(`${at}: no sources in groundedIn`);
    for (const o of c.opportunities) {
      if (oppIds.has(o.id)) err(`${at}: duplicate opportunity ${o.id}`);
      oppIds.add(o.id);
      if (o.householdId !== c.id) err(`${at}: opportunity ${o.id} points at ${o.householdId}`);
      if (!ID.test(o.id)) err(`${at}: opportunity id ${o.id} must be lower case letters, digits and hyphens`);
      if (!TRIGGER_CLASSES.includes(o.triggerClass)) err(`${at}: opportunity ${o.id} has unknown trigger class ${o.triggerClass}`);
      if (!(o.materiality >= 0 && o.materiality <= 100)) err(`${at}: opportunity ${o.id} materiality must be 0 to 100`);
      if (!ACTIONS.includes(o.action) || !STRATEGIES.includes(o.strategy)) err(`${at}: opportunity ${o.id} needs a known action and strategy`);
      if (!o.reasonPath?.length) err(`${at}: opportunity ${o.id} needs a reason path`);
      if (o.inflowUsd !== undefined && !money(o.inflowUsd)) err(`${at}: opportunity ${o.id} inflowUsd must be zero or more`);
      if (o.outflowUsd !== undefined && (!money(o.outflowUsd) || !o.outflowLabel)) err(`${at}: opportunity ${o.id} outflowUsd needs a value and an outflowLabel`);
      const missing = o.evidenceDocIds.filter((d) => !docIds.has(d));
      if (missing.length && !o.evidenceExpectedMissing) err(`${at}: opportunity ${o.id} cites unknown documents ${missing.join(", ")}`);
      if (!missing.length && o.evidenceExpectedMissing) err(`${at}: opportunity ${o.id} is marked evidenceExpectedMissing but its documents exist`);
    }
    const w = c.walkthrough;
    if (w) {
      if (!c.opportunities.some((o) => o.id === w.opportunityId)) err(`${at}: walkthrough opportunity ${w.opportunityId} not found`);
      if (!productIds.has(w.chooseProductId)) err(`${at}: walkthrough product ${w.chooseProductId} not found`);
      const wo = c.opportunities.find((o) => o.id === w.opportunityId);
      if (wo?.inflowUsd) {
        // The story's "leftover" sentence is hand-written; its figure must be the new cash the proposal does not use.
        const left = wo.inflowUsd - (evaluateAll(wo, toHousehold(c))[0]?.candidate.amountUsd ?? 0);
        if (left > 0 && !w.leftover.includes(usd(left))) err(`${at}: walkthrough leftover should mention ${usd(left)} of unused new cash`);
      }
      if (w.audience.one[1] !== addressees(toHousehold(c)).length) err(`${at}: walkthrough audience says ${w.audience.one[1]} people but the note is addressed to ${addressees(toHousehold(c)).length}`);
    }
  }
  for (const p of PROSPECTS) {
    if (!advisorIds.has(p.advisorId)) err(`prospect ${p.id}: unknown advisor ${p.advisorId}`);
    if (!p.groundedIn?.length) err(`prospect ${p.id}: no sources`);
    if (p.fit < 0 || p.fit > 2) err(`prospect ${p.id}: fit must be 0 to 2`);
    if (!PATHS.includes(p.path)) err(`prospect ${p.id}: unknown path ${p.path}`);
    if (!money(p.estimatedUsd)) err(`prospect ${p.id}: estimatedUsd must be zero or more`);
  }
  for (const r of SERVICE_REQUESTS) if (!ids.has(r.clientId)) err(`service request ${r.id}: unknown client ${r.clientId}`);
  for (const c of CLIENTS as ClientFile[]) {
    if (!Array.isArray(c.paperwork)) err(`client ${c.id}: missing paperwork`);
    for (const w of c.paperwork ?? []) if (w.signedDay !== undefined && w.signedDay < w.requestedDay) err(`client ${c.id}: ${w.form} signed before it was requested`);
  }
  const prospectIds = new Set(PROSPECTS.map((p) => p.id));
  const KINDS = ["call", "review", "prospect", "internal", "queue"];
  for (const a of ADVISORS_DATA) {
    for (const m of a.walkthrough?.meetings ?? []) {
      const at = `advisor ${a.id} meeting ${m.time}`;
      if (!m.time || !m.title || !m.purpose) err(`${at}: needs time, title and purpose`);
      if (!KINDS.includes(m.kind)) err(`${at}: unknown kind ${m.kind}`);
      if (m.clientId && !ids.has(m.clientId)) err(`${at}: unknown client ${m.clientId}`);
      else if (m.clientId && CLIENTS.find((c) => c.id === m.clientId)?.advisorId !== a.id) err(`${at}: client ${m.clientId} belongs to another advisor`);
      if (m.prospectId && !prospectIds.has(m.prospectId)) err(`${at}: unknown prospect ${m.prospectId}`);
    }
  }
  for (const c of CLIENTS as ClientFile[]) {
    for (const t of c.tasks ?? []) if (!t.text || !t.owner || typeof t.dueDay !== "number") err(`client ${c.id}: task needs text, owner and a numeric dueDay`);
  }
  if (!advisorIds.has(APP.defaultAdvisorId)) err(`app.json: unknown defaultAdvisorId ${APP.defaultAdvisorId}`);
  const fc = CLIENTS.find((c) => c.id === APP.featured.clientId);
  const fo = fc?.opportunities.find((o) => o.id === APP.featured.opportunityId);
  if (!fc) err(`app.json: unknown featured client ${APP.featured.clientId}`);
  else if (!fo) err(`app.json: featured opportunity ${APP.featured.opportunityId} is not on ${fc.id}`);
  else if (!evaluateAll(fo, toHousehold(fc)).some((e) => e.pass && e.candidate.productId === APP.featured.productId)) err(`app.json: featured product ${APP.featured.productId} is not eligible for ${fo.id}`);
  if (!ids.has(APP.featured.reviewClientId)) err(`app.json: unknown reviewClientId ${APP.featured.reviewClientId}`);
  if (!productIds.has(POLICY.liquidity.cashProductId)) err(`policy.json: unknown cashProductId`);
  if (!productIds.has(POLICY.proposals.coreProductId)) err(`policy.json: unknown coreProductId`);
  if (!docIds.has(POLICY.communications.disclosureDocId)) err(`policy.json: unknown disclosureDocId`);
  if (!Object.values(COMMUNICATIONS.templates ?? {}).includes(COMMUNICATIONS.demoCommunication)) err("communications.json: demoCommunication must be one of the templates");
  for (const r of POLICY.servicing.rules) {
    try { new RegExp(r.pattern); } catch { err(`policy.json: bad servicing pattern ${r.pattern}`); }
  }
  // The callback before money moves is a rule, not a preference: it cannot be switched off or pushed behind another rule.
  const mm = POLICY.servicing.rules.findIndex((r) => r.kind === "Money movement");
  if (mm !== 0) err("policy.json: the Money movement rule must exist and be checked first");
  else if (!POLICY.servicing.rules[0].callbackRequired) err("policy.json: Money movement must require a callback");
  const bands = POLICY.prospecting.sizeBands;
  if (bands.some((b, i) => i > 0 && b.minUsd >= bands[i - 1].minUsd)) err("policy.json: prospecting sizeBands must be ordered from the largest minUsd down");
  errors.push(...validateProfiles());
  return errors;
}
