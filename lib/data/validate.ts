// Checks every data file for shape and cross-reference errors. Run by the
// test suite, so a broken edit to data/ fails `npm run check`.
import type { ClientFile } from "@/lib/types";
import { POLICY, APP } from "@/lib/data/policy";
import { validateProfiles } from "@/lib/profile/validate";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { toHousehold, COMMUNICATIONS, ADVISORS_DATA, CLIENTS, DOCUMENTS, PROSPECTS, SERVICE_REQUESTS, SHELF_DATA, SNAPSHOTS, MESSAGES, HISTORY, ADVISOR_INPUTS, RULES_DATA } from "@/lib/data";
import { CATALOG } from "@/lib/connectors/catalog";
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
  const DOC_KINDS = ["research note", "product one-pager", "term sheet", "model fact sheet", "procedure extract", "disclosure"];
  const DOC_STATUS = ["current", "superseded", "withdrawn"];
  for (const d of DOCUMENTS) {
    const at = `document ${d.id}`;
    if (!ID.test(d.id)) err(`${at}: id must be lower case letters, digits and hyphens`);
    if (!d.title?.trim() || !d.desk?.trim()) err(`${at}: needs a title and a desk`);
    if (!DOC_KINDS.includes(d.kind)) err(`${at}: unknown kind ${d.kind}`);
    if (!DOC_STATUS.includes(d.status)) err(`${at}: unknown status ${d.status}`);
    if (!Number.isInteger(d.day) || d.day > POLICY.retrieval.corpusDay) err(`${at}: day must be an integer on or before the corpus day ${POLICY.retrieval.corpusDay}`);
    if (!(d.reviewEveryDays > 0)) err(`${at}: reviewEveryDays must be above zero`);
    if (!d.passages?.length) err(`${at}: needs at least one passage`);
    const pids = new Set<string>();
    for (const p of d.passages ?? []) {
      if (!p.id || pids.has(p.id)) err(`${at}: passage ids must be present and unique`);
      pids.add(p.id);
      if (!p.text?.trim()) err(`${at}: passage ${p.id} is empty`);
      for (const c of p.claims ?? []) if (!c.topic?.trim() || !c.value?.trim()) err(`${at}: passage ${p.id} has a claim without a topic and value`);
    }
    // A supersession chain is stated on both ends, so neither document can quietly forget the other.
    if (d.status === "superseded" && !d.supersededBy) err(`${at}: superseded but supersededBy is not set`);
    if (d.supersededBy && !docIds.has(d.supersededBy)) err(`${at}: supersededBy ${d.supersededBy} does not exist`);
    if (d.supersededBy && DOCUMENTS.find((x) => x.id === d.supersededBy)?.supersedes !== d.id) err(`${at}: ${d.supersededBy} does not say it supersedes ${d.id}`);
    if (d.supersedes && DOCUMENTS.find((x) => x.id === d.supersedes)?.supersededBy !== d.id) err(`${at}: ${d.supersedes} does not say it is superseded by ${d.id}`);
    if (d.supersedes && d.status !== "current") err(`${at}: a document that supersedes another must be current`);
  }
  if (!(POLICY.retrieval.floor > 0 && POLICY.retrieval.floor < 1)) err("policy.json: retrieval.floor must be between 0 and 1");
  if (!(POLICY.retrieval.stalePenalty >= 0 && POLICY.retrieval.stalePenalty <= 1)) err("policy.json: retrieval.stalePenalty must be 0 to 1");
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
  // Compliance data the deeper agents read. Every reference must resolve, and a
  // stored snapshot may never carry a "today" that could disagree with the file.
  const ruleIds = new Set(RULES_DATA.rules.map((r) => r.id));
  const connectorIds = new Set(CATALOG.map((c) => c.id));
  for (const s of SNAPSHOTS.series) {
    if (!ids.has(s.clientId)) err(`snapshots: unknown client ${s.clientId}`);
    if (s.concentrationPct.some((h) => h.day >= 0)) err(`snapshots ${s.clientId}: day 0 is computed from the client file, never stored`);
    if (s.concentrationPct.some((h, i, a) => i > 0 && h.day <= a[i - 1].day)) err(`snapshots ${s.clientId}: days must rise`);
    if (s.concentrationPct.some((h) => !(h.pct >= 0 && h.pct <= 100))) err(`snapshots ${s.clientId}: pct must be 0 to 100`);
    if (!CLIENTS.find((c) => c.id === s.clientId)?.holdings.some((h) => h.singleName)) err(`snapshots ${s.clientId}: client has no single-name holding to track`);
  }
  for (const c of CLIENTS as ClientFile[]) {
    if (!c.supervisory) err(`client ${c.id}: missing supervisory (the firm's record for this account)`);
    if (!Array.isArray(c.messages)) err(`client ${c.id}: missing messages (an empty list is fine)`);
  }
  const msgIds = new Set<string>();
  for (const m of MESSAGES.messages) {
    if (msgIds.has(m.id) || !ID.test(m.id)) err(`message ${m.id}: id must be unique, lower case letters, digits and hyphens`);
    msgIds.add(m.id);
    if (!advisorIds.has(m.advisorId)) err(`message ${m.id}: unknown advisor ${m.advisorId}`);
    if (m.clientId && !ids.has(m.clientId)) err(`message ${m.id}: unknown client ${m.clientId}`);
    if (m.clientId && CLIENTS.find((c) => c.id === m.clientId)?.advisorId !== m.advisorId) err(`message ${m.id}: client ${m.clientId} belongs to another advisor`);
    if (!connectorIds.has(m.connectorId)) err(`message ${m.id}: unknown connector ${m.connectorId}`);
    if (!["inbound", "outbound"].includes(m.direction)) err(`message ${m.id}: direction must be inbound or outbound`);
    if (!(m.day <= 0)) err(`message ${m.id}: day must be zero or negative`);
    if (!m.text?.trim()) err(`message ${m.id}: empty`);
    if (/\u2014/.test(m.text)) err(`message ${m.id}: em-dash`);
  }
  for (const a of ADVISOR_INPUTS.advisors) if (!advisorIds.has(a.advisorId)) err(`advisor ${a.advisorId}: unknown`);
  const hIds = new Set<string>();
  for (const h of HISTORY.findings) {
    if (hIds.has(h.id)) err(`history ${h.id}: duplicate id`);
    hIds.add(h.id);
    if (Number.isNaN(Date.parse(h.at))) err(`history ${h.id}: at must be ISO 8601`);
    if (!ruleIds.has(h.ruleId)) err(`history ${h.id}: unknown rule ${h.ruleId}`);
    if (!advisorIds.has(h.scope.advisorId)) err(`history ${h.id}: unknown advisor ${h.scope.advisorId}`);
    for (const c of h.connectors) if (!connectorIds.has(c)) err(`history ${h.id}: unknown connector ${c}`);
    if (!["clear", "flag", "block", "cannot_evaluate"].includes(h.outcome)) err(`history ${h.id}: unknown outcome ${h.outcome}`);
    if (!["cleared", "returned", "blocked"].includes(h.disposition)) err(`history ${h.id}: unknown disposition ${h.disposition}`);
    if (!h.dispositionBy || !h.comment) err(`history ${h.id}: needs dispositionBy and a comment`);
    const rule = RULES_DATA.rules.find((r) => r.id === h.ruleId)!;
    for (const k of Object.keys(h.factConfidence ?? {})) if (!(k in h.facts)) err(`history ${h.id}: confidence for a fact it does not carry, ${k}`);
    if (rule && !rule.evidence.some((k) => k in h.facts)) err(`history ${h.id}: carries none of the facts ${h.ruleId} reads`);
  }
  errors.push(...validateProfiles());
  return errors;
}
