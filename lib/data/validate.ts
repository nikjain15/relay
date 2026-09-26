// Checks every data file for shape and cross-reference errors. Run by the
// test suite, so a broken edit to data/ fails `npm run check`.
import type { ClientFile } from "@/lib/types";
import { ADVISORS_DATA, CLIENTS, DOCUMENTS, PROSPECTS, SERVICE_REQUESTS, SHELF_DATA } from "@/lib/data";

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
    if (ids.has(c.id)) err(`${at}: duplicate id`);
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
      const missing = o.evidenceDocIds.filter((d) => !docIds.has(d));
      if (missing.length && !o.evidenceExpectedMissing) err(`${at}: opportunity ${o.id} cites unknown documents ${missing.join(", ")}`);
      if (!missing.length && o.evidenceExpectedMissing) err(`${at}: opportunity ${o.id} is marked evidenceExpectedMissing but its documents exist`);
    }
    const w = c.walkthrough;
    if (w) {
      if (!c.opportunities.some((o) => o.id === w.opportunityId)) err(`${at}: walkthrough opportunity ${w.opportunityId} not found`);
      if (!productIds.has(w.chooseProductId)) err(`${at}: walkthrough product ${w.chooseProductId} not found`);
    }
  }
  for (const p of PROSPECTS) {
    if (!advisorIds.has(p.advisorId)) err(`prospect ${p.id}: unknown advisor ${p.advisorId}`);
    if (!p.groundedIn?.length) err(`prospect ${p.id}: no sources`);
    if (p.fit < 0 || p.fit > 2) err(`prospect ${p.id}: fit must be 0 to 2`);
  }
  for (const r of SERVICE_REQUESTS) if (!ids.has(r.clientId)) err(`service request ${r.id}: unknown client ${r.clientId}`);
  for (const c of CLIENTS as ClientFile[]) {
    if (!Array.isArray(c.paperwork)) err(`client ${c.id}: missing paperwork`);
    for (const w of c.paperwork ?? []) if (w.signedDay !== undefined && w.signedDay < w.requestedDay) err(`client ${c.id}: ${w.form} signed before it was requested`);
  }
  return errors;
}
