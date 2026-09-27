// Rows in, records out.
//
// A spreadsheet exported from a CRM or a custodian is flat; a client record is
// not. This is the one place that knows the column names, so a book can be
// connected from a file with headings a person would write, and every
// resulting record is then held to exactly the rules a shipped file is held to
// (`clientErrors()` in lib/data/validate.ts). Nothing is guessed silently: a
// column that is missing leaves its field empty and the validator says so.
//
// Opportunities are not a column. They are detected from the record, by the
// same thresholds the rest of the product uses, so a book connected from a
// spreadsheet arrives with today's list already worked out and cited.
import type { ClientFile, ClientMessage, Doc, Holding, Opportunity, Person, TriggerClass } from "@/lib/types";
import { APP, POLICY } from "@/lib/data/policy";
import { toHousehold } from "@/lib/data";
import { liquidityMonths, singleNamePct } from "@/lib/household-math";
import { usd, pct } from "@/lib/format";

const TIERS = ["$50M+", "$5M+", "$500K to $5M", "Wealth Advice Center"] as const;
type Row = Record<string, string>;

/** Header aliases, so "Monthly spend" and "monthlySpendUsd" both land. Lower case, letters and digits only. */
const ALIAS: Record<string, string[]> = {
  id: ["id", "clientid", "householdid"],
  name: ["name", "household", "client", "family", "householdname"],
  advisorId: ["advisorid", "advisor"],
  tier: ["tier", "segment"],
  archetype: ["archetype", "situation"],
  monthlySpendUsd: ["monthlyspendusd", "monthlyspend", "spendpermonth", "monthlyspending"],
  cashUsd: ["cashusd", "cash"],
  coreUsd: ["coreusd", "core", "diversifiedcore", "model"],
  treasuryUsd: ["treasuryusd", "treasuries", "treasuryladder"],
  muniUsd: ["muniusd", "munis", "municipalladder", "municipals"],
  singleName: ["singlename", "concentratedposition", "singlestock", "position"],
  singleNameUsd: ["singlenameusd", "concentratedusd", "singlestockusd", "positionusd"],
  maxSingleNamePct: ["maxsinglenamepct", "concentrationlimit", "singlenamelimit", "maxsinglename"],
  minLiquidityMonths: ["minliquiditymonths", "minimumcashmonths", "cashfloor"],
  maxRiskLevel: ["maxrisklevel", "risklimit", "maxrisk"],
  liquidityTargetMonths: ["liquiditytargetmonths", "cashtargetmonths", "liquiditytarget"],
  longevityTargetUsd: ["longevitytargetusd", "retirementtarget", "longevitytarget"],
  legacyTargetUsd: ["legacytargetusd", "legacytarget", "bequesttarget"],
  lastContactDaysAgo: ["lastcontactdaysago", "dayssincecontact", "lastcontact"],
  lastContactChannel: ["lastcontactchannel", "contactchannel"],
  lastContactSummary: ["lastcontactsummary", "contactsummary", "lastconversation"],
  note: ["note", "teamnote", "notes"],
  contactWindow: ["contactwindow", "besttime", "preferredtime"],
  trustedContactOnFile: ["trustedcontactonfile", "trustedcontact"],
  unusualDisbursement: ["unusualdisbursement", "disbursementflag"],
  newThirdPartyContact: ["newthirdpartycontact", "thirdpartyflag"],
  concentration90: ["concentration90", "concentrationpct90d", "conc90"],
  concentration60: ["concentration60", "concentrationpct60d", "conc60"],
  concentration30: ["concentration30", "concentrationpct30d", "conc30"],
  person1: ["person1", "primary", "person1name"], person1Age: ["person1age", "primaryage", "age1"],
  person2: ["person2", "spouse", "person2name"], person2Age: ["person2age", "spouseage", "age2"],
  person3: ["person3", "beneficiary", "person3name"], person3Age: ["person3age", "beneficiaryage", "age3"],
  // messages
  clientId: ["clientid", "client", "household", "householdid"],
  channel: ["channel"], direction: ["direction"], daysAgo: ["daysago", "day", "age"], text: ["text", "message", "body"], connectorId: ["connectorid", "connector", "source"],
};

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Read a field by any of its aliases. */
export function field(row: Row, key: string): string {
  const wanted = new Set([...(ALIAS[key] ?? []), norm(key)]);
  for (const [h, v] of Object.entries(row)) if (wanted.has(norm(h))) return (v ?? "").trim();
  return "";
}

const num = (s: string): number | undefined => {
  if (!s) return undefined;
  const n = Number(s.replace(/[$,\s%]/g, "").replace(/^\((.*)\)$/, "-$1"));
  return Number.isFinite(n) ? n : undefined;
};
const bool = (s: string): boolean | undefined => (s === "" ? undefined : /^(true|yes|y|1|on)$/i.test(s) ? true : /^(false|no|n|0|off)$/i.test(s) ? false : undefined);
export const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

/** Which connector a channel implies when the row does not say. */
const CONNECTOR_FOR: Record<string, string> = { email: "microsoft-365", sms: "compliant-texting", chat: "teams-chat", meeting: "zoom", calendar: "microsoft-365" };

export interface MappedClients {
  clients: ClientFile[];
  /** Per row: what could not be read, by client id. Empty when the row mapped cleanly. */
  warnings: { id: string; text: string }[];
  opportunitiesDetected: number;
}

export function mapClients(rows: Row[], opts: { source: string; defaultAdvisorId?: string; corpusDay?: number } ): MappedClients {
  const warnings: MappedClients["warnings"] = [];
  const clients: ClientFile[] = [];
  let opportunitiesDetected = 0;
  rows.forEach((row, i) => {
    const name = field(row, "name") || `Row ${i + 2}`;
    const id = `hh-${slug(field(row, "id") || name)}`;
    const warn = (t: string) => warnings.push({ id, text: t });
    const persons: Person[] = [];
    (["person1", "person2", "person3"] as const).forEach((k, n) => {
      const pn = field(row, k);
      if (!pn) return;
      const age = num(field(row, `${k}Age`));
      persons.push({ id: `p-${slug(id)}-${n + 1}`, name: pn, role: n === 0 ? "primary" : n === 1 ? "spouse" : "beneficiary", ...(age !== undefined ? { age } : {}) });
    });
    if (!persons.length) { persons.push({ id: `p-${slug(id)}-1`, name: `${name} (primary)`, role: "primary" }); warn("No person columns; a primary person was named after the household"); }

    const holdings: Holding[] = [];
    const cash = num(field(row, "cashUsd")); if (cash) holdings.push({ name: "Cash", productId: POLICY.liquidity.cashProductId, valueUsd: cash, singleName: false });
    const core = num(field(row, "coreUsd")); if (core) holdings.push({ name: "Diversified core model", productId: POLICY.proposals.coreProductId, valueUsd: core, singleName: false });
    for (const [column, product] of Object.entries(POLICY.import.holdingColumns)) {
      const v = num(field(row, column));
      if (v) holdings.push({ name: product.name, productId: product.productId, valueUsd: v, singleName: false });
    }
    const sn = num(field(row, "singleNameUsd")); if (sn) holdings.push({ name: field(row, "singleName") || "Concentrated position", valueUsd: sn, singleName: true });
    if (!holdings.length) warn("No holdings columns (cash, core, treasury, muni, single name) so the household has no assets");
    const totalUsd = holdings.reduce((s, h) => s + h.valueUsd, 0);
    const monthlySpendUsd = num(field(row, "monthlySpendUsd")) ?? 0;
    if (!monthlySpendUsd) warn("No monthly spend, so Liquidity cover cannot be computed");

    const tierRaw = field(row, "tier");
    const tier = (TIERS.find((t) => norm(t) === norm(tierRaw)) ?? (totalUsd >= 50_000_000 ? "$50M+" : totalUsd >= 5_000_000 ? "$5M+" : totalUsd >= 500_000 ? "$500K to $5M" : "Wealth Advice Center")) as ClientFile["tier"];
    if (tierRaw && !TIERS.some((t) => norm(t) === norm(tierRaw))) warn(`Tier "${tierRaw}" not recognised; set from assets`);

    const maxSingle = num(field(row, "maxSingleNamePct")) ?? 25;
    const minLiq = num(field(row, "minLiquidityMonths")) ?? 12;
    const maxRisk = num(field(row, "maxRiskLevel")) ?? 3;
    const constraints: ClientFile["constraints"] = [
      { kind: "maxSingleName", pct: Math.min(100, Math.max(1, maxSingle)) },
      { kind: "minLiquidityMonths", months: Math.max(0, minLiq) },
      { kind: "maxRiskLevel", level: Math.min(5, Math.max(1, Math.round(maxRisk))) as 1 | 2 | 3 | 4 | 5 },
    ];

    const partial = { id, name, archetype: field(row, "archetype") || "Imported household", tier, advisorId: field(row, "advisorId") || opts.defaultAdvisorId || APP.defaultAdvisorId, totalUsd, monthlySpendUsd, hardPart: "", persons, holdings, goals: [], constraints, groundedIn: [{ label: `Imported from ${opts.source}`, url: "" }] };
    const h = toHousehold({ ...partial, contactHistory: [], notes: [], tasks: [], paperwork: [], supervisory: { trustedContactOnFile: false, complaintLogged: false, unusualDisbursement: false, newThirdPartyContact: false }, messages: [], opportunities: [] });
    const months = liquidityMonths(h);
    const liqTarget = num(field(row, "liquidityTargetMonths")) ?? Math.max(minLiq, 24);
    const longevityTarget = num(field(row, "longevityTargetUsd"));
    const legacyTarget = num(field(row, "legacyTargetUsd"));
    const nonLiquid = holdings.filter((x) => !x.singleName && x.productId !== POLICY.liquidity.cashProductId).reduce((s, x) => s + x.valueUsd, 0);
    const goals: ClientFile["goals"] = [
      { strategy: "Liquidity", funded: months, target: liqTarget, unit: "months", assumption: `${liqTarget} months of spending at ${usd(monthlySpendUsd)} a month` },
      ...(longevityTarget ? [{ strategy: "Longevity" as const, funded: nonLiquid, target: longevityTarget, unit: "USD" as const, assumption: "Imported target" }] : []),
      ...(legacyTarget ? [{ strategy: "Legacy" as const, funded: 0, target: legacyTarget, unit: "USD" as const, assumption: "Imported target; nothing funding it yet" }] : []),
    ];

    const lastDays = num(field(row, "lastContactDaysAgo"));
    const contactHistory = lastDays !== undefined ? [{ day: -Math.abs(lastDays), channel: field(row, "lastContactChannel") || "Call", summary: field(row, "lastContactSummary") || "Contact logged in the source system" }] : [];
    const noteText = field(row, "note");
    const notes = noteText ? [{ from: "Imported note", day: 0, text: noteText }] : [];
    const c90 = num(field(row, "concentration90")), c60 = num(field(row, "concentration60")), c30 = num(field(row, "concentration30"));
    const valuationHistory = sn && (c90 !== undefined || c60 !== undefined || c30 !== undefined)
      ? { concentrationPct: [c90 !== undefined ? { day: -90, pct: c90 } : null, c60 !== undefined ? { day: -60, pct: c60 } : null, c30 !== undefined ? { day: -30, pct: c30 } : null].filter((x): x is { day: number; pct: number } => x !== null) }
      : undefined;
    const window = field(row, "contactWindow");

    // Opportunities detected from the record, cited to the corpus the product already trusts.
    const opportunities: Opportunity[] = [];
    const single = singleNamePct(h);
    if (monthlySpendUsd && months < liqTarget) {
      opportunities.push(opp(id, "liquidity", "household_threshold", `Cash covers ${months} of ${liqTarget} months`, `Cash for planned spending covers ${months} of ${liqTarget} months`, 55 + Math.min(35, (liqTarget - months) * 2), "fund", "Liquidity", POLICY.import.defaultEvidence.liquidity, [
        { kind: "Threshold", label: `Liquidity funded ${months} of ${liqTarget} target months` }, { kind: "Household", label: `${name} household` }, { kind: "Constraint", label: `Household minimum ${minLiq} months` }]));
    }
    if (sn && single > maxSingle) {
      opportunities.push(opp(id, "concentration", "household_threshold", `Single-name concentration ${pct(single)} against a ${maxSingle}% policy`, `${pct(single)} of wealth in one position; the household's rule is ${maxSingle}%`, 60 + Math.min(30, Math.round(single - maxSingle)), "trim", "Longevity", POLICY.import.defaultEvidence.concentration, [
        { kind: "Threshold", label: `Concentration ${pct(single)} against ${maxSingle}%` }, { kind: "Household", label: `${name} household` }, { kind: "Holding", label: `${field(row, "singleName") || "Concentrated position"}, ${usd(sn)}` }]));
    }
    if (lastDays !== undefined && lastDays > 180) {
      opportunities.push(opp(id, "review", "plan_service_event", `No contact logged in ${lastDays} days`, `Not spoken to in ${lastDays} days; the annual review is due`, 40, "review", "Longevity", POLICY.import.defaultEvidence.review, [
        { kind: "ServiceEvent", label: `Last contact ${lastDays} days ago` }, { kind: "Household", label: `${name} household` }]));
    }
    opportunitiesDetected += opportunities.length;

    clients.push({
      ...partial,
      hardPart: [months < liqTarget ? `${months} of ${liqTarget} months of cash` : "", sn && single > maxSingle ? `${pct(single)} in one name against ${maxSingle}%` : "", lastDays !== undefined && lastDays > 180 ? `${lastDays} days since contact` : ""].filter(Boolean).join("; ") || "Nothing flagged on import",
      goals,
      contactHistory,
      notes,
      tasks: [],
      paperwork: [],
      supervisory: {
        trustedContactOnFile: bool(field(row, "trustedContactOnFile")) ?? false,
        complaintLogged: false,
        unusualDisbursement: bool(field(row, "unusualDisbursement")) ?? false,
        newThirdPartyContact: bool(field(row, "newThirdPartyContact")) ?? false,
      },
      ...(valuationHistory ? { valuationHistory } : {}),
      messages: [],
      opportunities,
      ...(window ? { preferences: { version: 1, values: { "contact.window": window } } } : {}),
    });
  });
  return { clients, warnings, opportunitiesDetected };
}

function opp(id: string, key: string, triggerClass: TriggerClass, title: string, plainTitle: string, materiality: number, action: Opportunity["action"], strategy: Opportunity["strategy"], evidenceDocIds: string[], reasonPath: Opportunity["reasonPath"]): Opportunity {
  return { id: `opp-${id.replace(/^hh-/, "")}-${key}`, householdId: id, triggerClass, title, plainTitle, materiality: Math.min(100, materiality), observedDay: 0, action, strategy, reasonPath, evidenceDocIds };
}

/** Message rows attached to the clients they name, by id or by household name. Unmatched rows are reported. */
export function mapMessages(rows: Row[], clients: ClientFile[]): { attached: number; unmatched: { row: number; text: string }[] } {
  let attached = 0;
  const unmatched: { row: number; text: string }[] = [];
  rows.forEach((row, i) => {
    const ref = field(row, "clientId");
    const c = clients.find((x) => x.id === ref || x.id === `hh-${slug(ref)}` || norm(x.name) === norm(ref));
    if (!c) { unmatched.push({ row: i + 2, text: `No client "${ref}"` }); return; }
    const channel = (field(row, "channel") || "email").toLowerCase();
    const direction = /^(in|inbound|received|from client)$/i.test(field(row, "direction")) ? "inbound" : "outbound";
    const m: ClientMessage = {
      id: `msg-${c.id.replace(/^hh-/, "")}-${(c.messages ?? []).length + 1}`,
      connectorId: field(row, "connectorId") || CONNECTOR_FOR[channel] || "microsoft-365",
      channel,
      direction,
      day: -Math.abs(num(field(row, "daysAgo")) ?? 0),
      text: field(row, "text"),
    };
    if (!m.text) { unmatched.push({ row: i + 2, text: "Empty message" }); return; }
    c.messages = [...(c.messages ?? []), m];
    attached++;
  });
  return { attached, unmatched };
}

/** A plain-text or Markdown file as a document: the first line is the title, blank lines separate passages. */
export function mapDocument(fileName: string, text: string, corpusDay: number = POLICY.retrieval.corpusDay): Doc {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const first = lines.find((l) => l.trim())?.replace(/^#+\s*/, "").trim() || fileName.replace(/\.[^.]+$/, "");
  const body = lines.slice(lines.findIndex((l) => l.trim()) + 1).join("\n");
  const passages = body.split(/\n\s*\n/).map((p) => p.replace(/\s+/g, " ").trim()).filter((p) => p.length > 20);
  const kind: Doc["kind"] = /procedure|policy/i.test(first) ? "procedure extract" : /disclosure/i.test(first) ? "disclosure" : /term sheet/i.test(first) ? "term sheet" : /one-pager|fact sheet/i.test(first) ? "product one-pager" : "research note";
  return {
    id: `doc-${slug(fileName.replace(/\.[^.]+$/, ""))}`,
    title: first,
    kind,
    desk: "Imported",
    day: corpusDay,
    reviewEveryDays: 90,
    status: "current",
    passages: passages.length ? passages.map((p, i) => ({ id: `p${i + 1}`, text: p })) : [{ id: "p1", text: body.replace(/\s+/g, " ").trim() || first }],
  };
}
