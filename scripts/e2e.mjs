// Browser run over the built prototype and the walkthrough mockup (audit R-21).
// Usage: npm run build && npm run e2e. Starts `next start` on E2E_PORT (3100),
// serves the mockup on E2E_PORT + 1, and drives Chromium with playwright-core.
// Every page at 1440, 1280, 1024, 768 and 390: no console or page error, no horizontal
// scroll, every internal link resolves, every button clicks without an error,
// every control has an accessible name, every text/background pair meets WCAG
// 2.2 AA contrast, and the first Tab reaches a skip link. Then the demo flows.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("../", import.meta.url).pathname;
const PORT = Number(process.env.E2E_PORT ?? 3100);
const BASE = `http://localhost:${PORT}`;
const MOCK = `http://localhost:${PORT + 1}`;
// A local Chromium if one is pre-installed, else the one playwright-core installed.
const EXE = process.env.CHROMIUM_PATH || (existsSync("/opt/pw-browsers/chromium") ? "/opt/pw-browsers/chromium" : chromium.executablePath());
const WIDTHS = [1440, 1280, 1024, 768, 390];
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const clients = readdirSync(join(ROOT, "data/clients")).map((f) => json(`data/clients/${f}`));
const opps = clients.flatMap((c) => c.opportunities);
const app = json("data/app.json");
const PAGES = [
  "/", "/clients", "/pipeline", "/onboarding", "/triage", "/communications", "/supervision", "/meetings",
  "/follow-ups", "/servicing", "/measurement", "/profiles", "/learning", "/personas",
  "/compliance", "/compliance/log", "/compliance/replay", "/documents", "/research", "/agents", "/sources", "/discovery", "/simulate", "/how-it-works", "/features", "/impact", "/architecture",
  ...json("data/compliance/agents.json").agents.map((a) => `/agents/${a.id}`),
  ...readdirSync(join(ROOT, "data/documents")).map((f) => `/documents/${f.replace(/\.json$/, "")}`),
  ...clients.map((c) => `/research/${c.id}`),
  ...clients.map((c) => `/household/${c.id}`),
  ...clients.map((c) => `/meetings/${c.id}`),
  ...opps.map((o) => `/evidence/${o.id}`),
  ...clients.filter((c) => c.opportunities.some((o) => o.action === "fund" || o.action === "trim")).map((c) => `/household/${c.id}/proposal`),
];

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  ::  ${detail}` : ""}`);
};

async function waitFor(url, ms = 60_000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    try { if ((await fetch(url)).ok) return; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`server did not start: ${url}`);
}

// In-page audits, run in the browser.
function audit() {
  const parse = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
  const lum = ([r, g, b]) => [r, g, b].map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)).reduce((s, v, i) => s + v * [0.2126, 0.7152, 0.0722][i], 0);
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const bgOf = (el) => {
    for (let e = el; e; e = e.parentElement) {
      const c = parse(getComputedStyle(e).backgroundColor);
      if (c.length < 4 || c[3] > 0) return c.slice(0, 3);
    }
    return [255, 255, 255];
  };
  const faded = (el) => { for (let e = el; e; e = e.parentElement) if (Number(getComputedStyle(e).opacity) < 1) return true; return false; };
  const contrast = [];
  for (const el of document.querySelectorAll("body *")) {
    const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
    if (!own || !el.getClientRects().length || el.closest("[disabled],[aria-hidden=true]") || faded(el)) continue;
    const s = getComputedStyle(el);
    if (s.visibility === "hidden") continue;
    const size = parseFloat(s.fontSize), bold = Number(s.fontWeight) >= 700;
    const need = size >= 24 || (size >= 18.66 && bold) ? 3 : 4.5;
    const r = ratio(parse(s.color), bgOf(el));
    if (r < need) contrast.push(`${r.toFixed(2)} ${s.color} on ${getComputedStyle(el).backgroundColor} "${el.textContent.trim().slice(0, 30)}"`);
  }
  const unnamed = [];
  for (const el of document.querySelectorAll("a[href],button,input,select,textarea,[role=button]")) {
    if (el.type === "hidden") continue;
    const labelled = el.getAttribute("aria-labelledby");
    const name = (el.getAttribute("aria-label") || (labelled && document.getElementById(labelled)?.textContent) || el.closest("label")?.textContent || (el.id && document.querySelector(`label[for="${el.id}"]`)?.textContent) || el.textContent || el.getAttribute("title") || "").trim();
    if (!name) unnamed.push(el.outerHTML.slice(0, 80));
  }
  const overflow = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
  return { contrast: [...new Set(contrast)], unnamed, overflow, text: document.body.innerText };
}

const staticServer = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, MOCK).pathname);
  const allowed = { "/docs/mockups/relay-wireframes.html": "text/html", "/data/generated/walkthrough.json": "application/json" };
  if (!allowed[path]) { res.writeHead(404).end(); return; }
  res.writeHead(200, { "content-type": allowed[path] }).end(readFileSync(join(ROOT, path)));
});

const server = spawn("npx", ["next", "start", "-p", String(PORT)], { cwd: ROOT, stdio: "ignore", detached: true });
let browser;
try {
  staticServer.listen(PORT + 1);
  await waitFor(BASE);
  browser = await chromium.launch({ executablePath: EXE });

  // 1. Every page at every width.
  const links = new Set();
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    page.on("console", (m) => { if (m.type() === "error") errors.push(`${page.url()}: ${m.text()}`); });
    const contrast = new Set(), unnamed = new Set(), overflow = [];
    for (const p of PAGES) {
      const r = await page.goto(BASE + p);
      if (r.status() !== 200) errors.push(`${p}: HTTP ${r.status()}`);
      const a = await page.evaluate(audit);
      a.contrast.forEach((x) => contrast.add(`${p}: ${x}`));
      a.unnamed.forEach((x) => unnamed.add(`${p}: ${x}`));
      if (a.overflow) overflow.push(p);
      if (width === WIDTHS[0]) for (const h of await page.$$eval("a[href^='/']", (as) => as.map((x) => x.getAttribute("href")))) links.add(h);
    }
    check(`${width}px: every page loads with no console or page error`, errors.length === 0, errors.slice(0, 3).join(" | "));
    check(`${width}px: no horizontal scroll`, overflow.length === 0, overflow.join(", "));
    check(`${width}px: every text/background pair meets WCAG 2.2 AA contrast`, contrast.size === 0, `${contrast.size} failing, e.g. ${[...contrast].slice(0, 2).join(" | ")}`);
    if (width === WIDTHS[0]) check("every link, button and field has an accessible name", unnamed.size === 0, [...unnamed].slice(0, 3).join(" | "));
    await ctx.close();
  }

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));

  // 2. Every internal link resolves.
  const bad = [];
  for (const h of links) {
    // A link may carry a fragment. Navigating to a fragment on the page you are
    // already on is a same-document navigation and returns no response, so the
    // path is fetched on its own and the anchor target is checked to exist:
    // a link to a heading that was renamed is a dead link, not a passing one.
    const [path, hash] = h.split("#");
    // A file under public/ (a sample to download) is fetched, not navigated to.
    if (/\.[a-z0-9]+$/i.test(path)) { const s = (await fetch(BASE + path)).status; if (s !== 200) bad.push(`${h} ${s}`); continue; }
    const r = await page.goto(BASE + (path || "/"));
    if (r.status() !== 200) { bad.push(`${h} ${r.status()}`); continue; }
    if (hash && !(await page.evaluate((id) => Boolean(document.getElementById(id)), hash))) bad.push(`${h} no such anchor`);
  }
  check(`all ${links.size} internal links resolve`, bad.length === 0, bad.join(", "));

  // 3. Every button on every page clicks without an error.
  let clicks = 0;
  for (const p of PAGES) {
    await page.goto(BASE + p);
    const n = await page.locator("main button:visible").count();
    for (let i = 0; i < n; i++) {
      await page.goto(BASE + p);
      const b = page.locator("main button:visible").nth(i);
      if (!(await b.count()) || (await b.isDisabled())) continue;
      await b.click();
      clicks++;
    }
  }
  check(`every button on every page (${clicks} clicks) runs without a page error`, errors.length === 0, errors.slice(0, 3).join(" | "));

  // 4. Keyboard: the first Tab reaches a skip link that moves focus to the content; focus is always visible.
  await page.goto(BASE + "/triage");
  await page.keyboard.press("Tab");
  const first = await page.evaluate(() => document.activeElement?.textContent?.trim());
  check("keyboard: the first Tab reaches 'Skip to content'", first === "Skip to content", `got "${first}"`);
  if (first === "Skip to content") {
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    const inMain = await page.evaluate(() => !!document.activeElement?.closest("main"));
    check("keyboard: the skip link moves focus into the main content", inMain);
  }
  let invisible = 0;
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    invisible += await page.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle === "none" && s.boxShadow === "none" ? 1 : 0; });
  }
  check("keyboard: every focused control shows a visible focus outline", invisible === 0, `${invisible} without an outline`);

  // 5. Triage: plain labels, dismiss by keyboard, restore.
  await page.goto(BASE + "/triage");
  const t = await page.locator("main").innerText();
  check("triage: no raw internal node labels (ExternalEvent, Threshold...)", !/\b(ExternalEvent|LifeEvent|ServiceEvent|Threshold|Publication)\b/.test(t));
  await page.getByRole("button", { name: "Dismiss" }).first().focus();
  await page.keyboard.press("Enter");
  await page.getByLabel("Dismiss reason").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Dismiss with this reason" }).click().catch(() => {});
  const dismissed = await page.getByText("Dismissed, with reasons").count();
  check("triage: dismiss with a reason by keyboard, then restore", dismissed === 1 && (await page.getByRole("button", { name: "Restore" }).click().then(() => true)));

  // 6. Proposal: switching opportunity keeps a valid selection; the amount arithmetic is right.
  const f = app.featured;
  const fc = clients.find((c) => c.id === f.clientId);
  const other = fc.opportunities.find((o) => o.id !== f.opportunityId && (o.action === "fund" || o.action === "trim"));
  await page.goto(`${BASE}/household/${f.clientId}/proposal?opp=${f.opportunityId}`);
  if (other) {
    await page.getByRole("link", { name: other.title }).click();
    await page.waitForURL(`**opp=${other.id}`);
    const txt = await page.locator("main").innerText();
    check("proposal: switching opportunity shows its rationale, not 'No eligible candidate'", !txt.includes("No eligible candidate") && txt.includes("Rationale record"));
  }
  // The need, recomputed here from data/ alone (not from the engine): target months x spending,
  // less unearmarked holdings in Liquidity-eligible products, plus any known outflow.
  const shelf = json("data/shelf.json"), policy = json("data/policy.json");
  const liquid = new Set(shelf.filter((p) => p.riskLevel <= policy.liquidity.sleeveMaxRisk && p.liquidityDays <= policy.liquidity.sleeveMaxAccessDays).map((p) => p.id));
  const usd = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(n >= 1e7 ? 1 : 2).replace(/\.?0+$/, "")}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}K` : `$${Math.round(n)}`);
  for (const c of clients) {
    for (const o of c.opportunities.filter((x) => x.action === "fund")) {
      const g = c.goals.find((x) => x.strategy === o.strategy);
      const have = c.holdings.filter((x) => liquid.has(x.productId) && !x.earmarked).reduce((a, x) => a + x.valueUsd, 0);
      const need = g.target * c.monthlySpendUsd - have + (o.outflowUsd ?? 0);
      const amount = o.inflowUsd ? Math.min(o.inflowUsd, need) : need;
      await page.goto(`${BASE}/household/${c.id}/proposal?opp=${o.id}`);
      const line = await page.locator("main p", { hasText: "Need:" }).first().innerText().catch(() => "");
      const cell = await page.locator("tbody tr").first().locator("td").nth(3).innerText();
      check(`proposal ${o.id}: the need (${usd(need)}) and the amount (${usd(amount)}) on screen match data/`, line.includes(usd(need)) && cell === usd(amount), `${line} | amount ${cell}`);
    }
  }

  // Refusal carries to every surface: triage, evidence, proposals, review pack.
  const refusedOpp = opps.find((o) => o.evidenceExpectedMissing);
  if (refusedOpp) {
    await page.goto(`${BASE}/evidence/${refusedOpp.id}`);
    const ev = /Refused: no supporting evidence/.test(await page.locator("main").innerText());
    await page.goto(`${BASE}/household/${refusedOpp.householdId}/proposal?opp=${refusedOpp.id}`);
    const pr = /Refused: this opportunity has no supporting evidence/.test(await page.locator("main").innerText());
    await page.goto(`${BASE}/meetings/${refusedOpp.householdId}`);
    const rp = !(await page.locator("main").innerText()).includes(`${refusedOpp.plainTitle ?? refusedOpp.title}: `);
    await page.goto(`${BASE}/triage`);
    const owner = clients.find((c) => c.id === refusedOpp.householdId).advisorId;
    const label = json(`data/advisors/${owner}.json`).name;
    await page.getByRole("button", { name: label }).click();
    const tr = await page.getByRole("link", { name: "Refused: no supporting evidence" }).count();
    check("refusal carries to evidence, proposals, the review pack and today's list", ev && pr && rp && tr === 1, `${ev} ${pr} ${rp} ${tr}`);
  }

  // 6b. Retrieval, briefing, replay: the new agent surfaces say what they must.
  if (refusedOpp) {
    await page.goto(`${BASE}/evidence/${refusedOpp.id}`);
    const t = await page.locator("main").innerText();
    check("retrieval: the refusal names the missing citation, the unmatched terms and the nearest miss with why", /Refused: no supporting evidence/.test(t) && t.includes(refusedOpp.evidenceDocIds[0]) && /Nearest passages, and why each is not enough/.test(t) && /under the .* floor|does not cite it/.test(t));
  }
  await page.goto(`${BASE}/evidence/${f.opportunityId}`);
  const evText = await page.locator("main").innerText();
  check("retrieval: every cited passage shows a relevance that decomposes into reasons", /Relevance \d\.\d\d\s*=/.test(evText) && /Cited by the opportunity record/.test(evText));
  await page.goto(`${BASE}/documents`);
  const lib = await page.locator("main").innerText();
  check("documents: the library shows a disagreement, a superseded document and a document past its review date", /Two current documents disagree/.test(lib) && /Superseded by/.test(lib) && /Past review date/.test(lib));
  await page.goto(`${BASE}/research/${f.clientId}`);
  const br = await page.locator("main").innerText();
  check("briefing: observed, inferred with a confidence, and what could not be established, each cited to a record", /What the file observes/.test(br) && /Inferred, \d+ percent/.test(br) && /What Relay could not establish/.test(br) && /data\/clients\//.test(br));
  await page.goto(`${BASE}/compliance/replay`);
  const rp = await page.locator("main").innerText();
  check("replay: a past finding is re-run against the rules as they stood and as they are now", /As the rules stood then/.test(rp) && /The same facts, against the rules now/.test(rp) && /Verdict then:/.test(rp));
  await page.goto(`${BASE}/agents`);
  const ag = await page.locator("main").innerText();
  check("agents: every agent shows a state in words, what it read and what it prepared", /Last run/.test(ag) && /Prepared/.test(ag) && /(Clear|Needs you|Blocking)/.test(ag) && /This morning/.test(ag));
  await page.goto(`${BASE}/supervision`);
  const before = await page.getByRole("button", { name: "Accept" }).count();
  if (before) await page.getByRole("button", { name: "Accept" }).first().click();
  const afterText = await page.locator("main").innerText();
  check("prepared actions: a finding carries what the agent prepared, and accepting records it without sending", before > 0 && /Prepared by the agent/.test(afterText) && /accepted/.test(afterText) && /Nothing is sent or written by accepting/.test(afterText));
  // Discovery on the shipped book: accept a candidate, then find it on its advisor's list. Runs before data is connected, so the day's cap does not hide it among a hundred connected rows.
  await page.goto(`${BASE}/discovery`);
  const disc = await page.locator("main").innerText();
  const acceptable = await page.getByRole("button", { name: "Accept" }).count();
  if (acceptable) await page.getByRole("button", { name: "Accept" }).first().click();
  await page.getByRole("navigation").getByRole("link", { name: "Today's list" }).click();
  await page.waitForURL("**/triage");
  // The accepted candidate belongs to one advisor's book; today's list shows one advisor at a time.
  let onList = false;
  for (const b of await page.getByRole("group", { name: "Advisor" }).getByRole("button").all()) {
    await b.click();
    if (/found in a (message|note|contact)/.test(await page.locator("main").innerText())) { onList = true; break; }
  }
  check("discovery: candidates cite their sentence; accepting one puts it on today's list for the session", /Read from a (message|note|contact)/.test(disc) && acceptable > 0 && onList);
  // Every workflow screen opens with the agent that fed it, its trace, and the perspective legend.
  let bars = 0;
  for (const path of ["/servicing", "/meetings", "/pipeline", "/onboarding", "/follow-ups", "/communications"]) {
    await page.goto(`${BASE}${path}`);
    const t = await page.locator("main").innerText();
    if (/I read /.test(t) && /How I got there/.test(t) && (/Agent read or prepared/.test(t) || (await page.locator("header").first().innerText()).includes("Agent read or prepared"))) bars++;
  }
  check("agent briefs: six workflow screens open with the agent speaking first, a trace and the legend", bars === 6, `${bars} of 6`);
  // The morning inbox: a prepared action opens beside the list with the draft and the reasoning; accepting records it and stays on screen.
  await page.goto(`${BASE}/`);
  const inbox = await page.locator("main").innerText();
  const reviews = await page.getByRole("button", { name: "Review", exact: true }).count();
  if (reviews) await page.getByRole("button", { name: "Review", exact: true }).first().click();
  const dialog = page.getByRole("dialog");
  const panelText = reviews ? await dialog.innerText() : "";
  if (reviews) await dialog.getByRole("button", { name: "Accept", exact: true }).click();
  const afterAccept = reviews ? await dialog.innerText() : "";
  if (reviews) await page.keyboard.press("Escape");
  const inboxAfter = await page.locator("main").innerText();
  check("inbox: decide now, review what the agents prepared, what else ran; accepting in the panel records it without sending and stays on screen", /1\. Decide now/.test(inbox) && /2\. Review what the agents prepared/.test(inbox) && /3\. What else ran/.test(inbox) && reviews > 0 && /How the agent got here/.test(panelText) && /Nothing sends/.test(panelText) && /Recorded\. Nothing was sent\./.test(afterAccept) && /Recorded\. Nothing was sent; you act\./.test(inboxAfter), `${reviews} reviews`);
  // A desk page: rules, findings, tuning, and a policy read into candidate rules that a person adds; the rule is then in force on the next sweep.
  await page.goto(`${BASE}/agents/client-protection`);
  await page.getByRole("button", { name: "Use the sample procedure" }).click();
  const readText = await page.locator("main").innerText();
  const addable = await page.getByRole("button", { name: /^Add to / }).count();
  const enabledAdd = page.getByRole("button", { name: /^Add to / }).filter({ hasNot: page.locator("[disabled]") });
  const firstAdd = page.locator("button:not([disabled])", { hasText: /^Add to / }).first();
  await firstAdd.click();
  const added = await page.locator("main").innerText();
  await page.locator("main").getByRole("link", { name: "in the change log" }).click();
  await page.waitForURL("**/compliance/log**");
  const logText = await page.locator("main").innerText();
  check("policy reader: a procedure becomes candidate rules cited to their sentences; adding one puts it in force and in the change log", /I read \d+ sentences/.test(readText) && /Paragraph \d/.test(readText) && /Fires when/.test(readText) && addable >= 5 && /Added to /.test(added) && /addRule/.test(logText) && /policy-/.test(logText), `${addable} addable, enabled ${await enabledAdd.count()}`);
  // Ask, on every page: a question answered from the records, cited, linked.
  await page.goto(`${BASE}/clients`);
  await page.getByRole("button", { name: "Ask Relay a question" }).click();
  await page.getByLabel("Your question").fill("How much cash cover does Renner have?");
  await page.getByRole("button", { name: "Ask", exact: true }).last().click();
  const askText = await page.getByRole("dialog").innerText();
  check("ask: a plain question is answered from household arithmetic with the record cited and a link to the household", /Liquidity covers \d+ months/.test(askText) && /data\/clients\/hh-renner\.json#holdings/.test(askText) && /From household arithmetic/.test(askText));
  await page.keyboard.press("Escape");
  // Options: the figures an advisor compares, and the morning after per row.
  await page.goto(`${BASE}/household/${f.clientId}/proposal?opp=${f.opportunityId}`);
  const opt = await page.locator("main").innerText();
  check("options: after-tax income, cost over the horizon, access and the morning after on every row, and the economics of the selected option", /Income after tax, a year/.test(opt) && /Cost, 3 yrs/.test(opt) && /Morning after/.test(opt) && /(Clean|Review|Blocked)/.test(opt) && /The economics for the household/.test(opt) && /Rate risk/.test(opt) && /Rationale record/.test(opt));
  // Sources: three steps, the connector catalogue with what each unlocks, and a gap named.
  await page.goto(`${BASE}/sources`);
  const src = await page.locator("main").innerText();
  check("sources: your book, your tools and channels with what each connector unlocks, documents and policies; gaps first", /1\. Your book/.test(src) && /2\. Your tools and channels/.test(src) && /3\. Documents and policies/.test(src) && /Unlocks \d+ rule/.test(src) && /Not captured/.test(src) && /for demonstration/.test(src));
  // Before you act: every option carried to the morning after, graded, with a trace; picking a row changes the detail.
  await page.goto(`${BASE}/simulate`);
  const sim = await page.locator("main").innerText();
  const rows = await page.getByRole("button", { pressed: false }).count();
  check("consequences: every option graded on the morning after, with rule changes, questions and a trace", /Options carried through/.test(sim) && /(Clean|Review|Blocked)/.test(sim) && /What a supervisor will ask/.test(sim) && /How the agent got there/.test(sim) && /No price movement is assumed/.test(sim) && rows > 0);
  // Households: a dossier on one household reads five sources, cites each, checks the public record against the file, and files a note a briefing then shows.
  await page.goto(`${BASE}/clients`);
  await page.getByRole("button", { name: "Research" }).first().click();
  const dos = await page.locator("main").innerText();
  const filed = await page.getByRole("button", { name: "File as a team note" }).count();
  if (filed) await page.getByRole("button", { name: "File as a team note" }).click();
  const afterFile = await page.locator("main").innerText();
  // Client-side navigation, so the session keeps the note; a full load would reset it, as documented.
  await page.locator("main").getByRole("link", { name: "Briefing", exact: true }).first().click();
  await page.waitForURL("**/research/**");
  const briefed = await page.locator("main").innerText();
  check("dossier: five sources cited, public record marked unverified, the drafted note filed by a person reaches the briefing", /records read from \d+ sources/.test(dos) && /Public record/.test(dos) && /Confidence \d+%/.test(dos) && /Unverified until a person confirms/.test(dos) && /Filed to the record/.test(afterFile) && /Research agent noted/.test(briefed));
  // Review desks: one agent per team, tuned per advisor, with a refused loosening shown.
  await page.goto(`${BASE}/compliance`);
  const desks = await page.locator("main").innerText();
  check("desks: eight review desks with authorities, an advisor-layer tightening shown with its layer, and a refused loosening named", /Review desks, as they stand for/.test(desks) && /Marketing and advertising review/.test(desks) && /Complaints/.test(desks) && /Sales practice supervision/.test(desks) && /FINRA 4513/.test(desks) && /Refused at the/.test(desks) && /Tune for/.test(desks));
  // Connect data: the sample spreadsheet goes in through the file input, every row is accepted, the agents run over it live, and the book grows.
  await page.goto(`${BASE}/sources`);
  await page.locator('input[type="file"]').setInputFiles([join(ROOT, "public/samples/clients.csv"), join(ROOT, "public/samples/messages.csv"), join(ROOT, "public/samples/research-note.md")]);
  // Files are read one after another; wait for the last one's row before reading the table.
  await page.getByRole("cell", { name: /messages\.csv/ }).waitFor({ timeout: 15000 });
  await page.getByText("Run every agent now").waitFor();
  const connected = await page.locator("main").innerText();
  const sampleRows = readFileSync(join(ROOT, "public/samples/clients.csv"), "utf8").trim().split("\n").length - 1;
  const messageRows = readFileSync(join(ROOT, "public/samples/messages.csv"), "utf8").trim().split("\n").length - 1;
  const flat = connected.replace(/\s+/g, " ");
  check(`connect data: ${sampleRows} spreadsheet rows, ${messageRows} messages and a document are read in the browser and every row passes the validator`, new RegExp(`clients\\.csv clients ${sampleRows} ${sampleRows} 0`).test(flat) && new RegExp(`messages\\.csv messages ${messageRows} ${messageRows} 0`).test(flat) && /research-note\.md/.test(connected));
  await page.getByRole("button", { name: /Run every agent now/ }).click();
  await page.getByText(/Done in [\d.]+ seconds of compute/).waitFor({ timeout: 60000 });
  const ran = await page.locator("main").innerText();
  check("live run: every agent runs over the connected book with real timings and visible counts", /Compliance agents swept/.test(ran) && /Research agent briefed/.test(ran) && /Retrieval cited/.test(ran) && /Discovery read/.test(ran) && /ms\./.test(ran));
  const xlsxOk = await page.evaluate(() => typeof DecompressionStream !== "undefined");
  check("connect data: the browser can inflate an .xlsx with no library (DecompressionStream present)", xlsxOk);
  await page.goto(`${BASE}/compliance`);
  const cp = await page.locator("main").innerText();
  check("proposer: a rule change waits on a principal, and a loosening is seen but not proposed", /Proposed by the agent, waiting on a principal/.test(cp) && /Seen, not proposed/.test(cp) && /stricter direction/.test(cp));

  // 7. Communications: the recipient counter 2, 26, 32, 8, and reload behaviour.
  await page.goto(`${BASE}/household/${f.clientId}/proposal?opp=${f.opportunityId}`);
  await page.getByRole("radio", { name: new RegExp(json("data/shelf.json").find((p) => p.id === f.productId).name) }).check();
  await page.getByRole("button", { name: "Accept proposal" }).click();
  await page.getByRole("link", { name: "Draft client note" }).click();
  const counter = async () => Number(await page.locator("aside p.text-3xl").innerText());
  const c0 = await counter();
  await page.getByRole("button", { name: /Select 12 two-person households/ }).click();
  const c1 = await counter();
  const regime1 = await page.locator("aside").innerText();
  await page.getByLabel(/another advisor/).check();
  const c2 = await counter();
  await page.getByRole("button", { name: "Clear" }).click();
  const c3 = await counter();
  check("counter: 2, then 26 (retail communication), 32 with prior sends, 8 cleared", c0 === 2 && c1 === 26 && /retail communication/.test(regime1) && c2 === 32 && c3 === 8, `${c0} ${c1} ${c2} ${c3}`);
  await page.getByLabel(/another advisor/).uncheck();
  await page.getByRole("button", { name: "Submit for supervision" }).click();
  // Follow the in-page link rather than a fresh goto: the queue lives in session
  // state, and a full page load would reset it, which is what the prototype
  // documents and what the reload checks below assert.
  await page.getByRole("link", { name: "Supervision console" }).click();
  await page.waitForURL("**/supervision");
  // The console opens on the agent findings queue, which is the point of it: the
  // sweep runs whether or not an advisor submitted anything. The submitted draft
  // is on the second tab.
  await page.getByRole("tab", { name: /^Drafts/ }).click();
  await page.getByRole("button", { name: "Approve" }).click({ timeout: 5000 });
  const sup = await page.locator("main").innerText();
  check("supervision: approve writes a disposition without claiming a permanent record", /Dispositioned: approved/.test(sup) && !/Written to the audit record/.test(sup));
  await page.getByRole("navigation").getByRole("link", { name: "Follow-ups" }).click();
  await page.waitForURL("**/follow-ups");
  await page.getByRole("heading", { name: "Follow-ups" }).waitFor();
  check("follow-ups: the approved note waits for the advisor to send", (await page.getByRole("button", { name: "I sent it from my email" }).count()) === 1);
  await page.reload();
  check("reload: session state resets as documented (no approved note after reload)", (await page.getByRole("button", { name: "I sent it from my email" }).count()) === 0);
  await page.goto(BASE + "/communications");
  check("reload: communications offers the featured proposal when nothing is accepted", (await page.getByRole("button", { name: /Load the featured proposal/ }).count()) === 1);

  // 7b. One source: for every advisor, each count on the Overview equals the count on the screen it links to.
  // The advisor is switched in the header and the screens are reached by the navigation, as a person would.
  {
    const nav = async (label) => { await page.getByRole("navigation").getByRole("link", { name: new RegExp(`^${label}`) }).first().click(); await page.waitForTimeout(500); return (await page.locator("main").innerText()).replace(/\s+/g, " "); };
    const num = (t, re) => { const m = t.match(re); return m ? Number(m[1]) : 0; };
    const bad = [];
    await page.goto(BASE + "/");
    for (const a of readdirSync(join(ROOT, "data/advisors")).map((f) => f.replace(/\.json$/, ""))) {
      await page.getByLabel("Signed in as").selectOption(a);
      const ov = await nav("Overview");
      const header = (await page.locator("header").first().innerText()).replace(/\s+/g, " ");
      const pairs = [
        ["meetings", num(ov, /(\d+) meetings today/), num(await nav("Meetings"), /I read (\d+) meetings/)],
        ["tasks overdue", num(ov, /(\d+) tasks? overdue/), num(await nav("Follow-ups"), /(\d+) tasks overdue/)],
        ["service past target", num(ov, /(\d+) service requests? past target/), num(await nav("Service requests"), /(\d+) past target/)],
        ["forms escalated", num(ov, /(\d+) forms? past the escalation deadline/), num(await nav("Paperwork"), /(\d+) escalated to the branch supervisor/)],
        ["findings", num(header, /(\d+) findings?/), num(await nav("Supervision queue"), /(\d+) findings? wait/)],
        ["on today's list", num(ov, /(\d+) opportunities are on/), num(await nav("Today's list"), /kept the top (\d+)/)],
        ["households", num(ov, /across (\d+) households/), num(await nav("Households"), /'s (\d+) households/)],
      ];
      for (const [k, x, y] of pairs) if (x !== y) bad.push(`${a} ${k}: overview ${x}, screen ${y}`);
    }
    check("one source: for every advisor, the Overview's counts equal the screens they link to", bad.length === 0, bad.join(" | "));
  }

  // 8. Copy: no firm branding in product copy.
  await page.goto(BASE + "/triage");
  check("copy: no firm name in product copy on today's list", !/\bUBS\b/.test(await page.locator("main").innerText()));

  // 9. No outbound: the browser blocks a request to another host (Content-Security-Policy).
  await page.goto(BASE + "/");
  const blocked = await page.evaluate(() => new Promise((res) => {
    document.addEventListener("securitypolicyviolation", (e) => res(e.violatedDirective), { once: true });
    fetch("https://example.com/collect", { method: "POST", body: "x", mode: "no-cors" }).catch(() => {});
    setTimeout(() => res(null), 3000);
  }));
  check("no outbound: the browser blocks a request to another host (CSP connect-src)", blocked === "connect-src", String(blocked));
  const head = await page.request.get(BASE + "/");
  const meta = await page.locator('meta[name="robots"]').getAttribute("content");
  check("noindex: meta robots and X-Robots-Tag header", /noindex/.test(meta ?? "") && /noindex/.test(head.headers()["x-robots-tag"] ?? ""), `${meta} / ${head.headers()["x-robots-tag"]}`);
  const robots = await page.request.get(BASE + "/robots.txt");
  check("noindex: robots.txt disallows everything", robots.status() === 200 && /Disallow: \//.test(await robots.text()));

  // 10. The walkthrough mockup: every story and step, and it matches the prototype.
  const m = await ctx.newPage();
  const merr = [];
  m.on("pageerror", (e) => merr.push(e.message));
  await m.goto(`${MOCK}/docs/mockups/relay-wireframes.html`);
  await m.waitForSelector("#step");
  const wt = json("data/generated/walkthrough.json");
  let mclicks = 0;
  for (let s = 0; s < wt.stories.length; s++) {
    await m.locator(`[data-story="${s}"]`).first().click();
    for (let k = 0; k < 6; k++) { await m.locator(`[data-to="${k}"]`).first().click(); mclicks++; }
    for (const b of await m.locator("[data-aud]").all()) { await b.click(); mclicks++; }
  }
  for (const b of await m.locator("[data-chapter]").all()) { await b.click(); mclicks++; }
  check(`mockup: ${mclicks} clicks through every story, step and chapter with no error`, merr.length === 0, merr.join(" | "));
  const mtext = await m.evaluate(audit);
  check("mockup: every text/background pair meets WCAG 2.2 AA contrast", mtext.contrast.length === 0, mtext.contrast.slice(0, 2).join(" | "));
  const robotsMeta = await m.locator('meta[name="robots"]').getAttribute("content").catch(() => null);
  check("mockup: carries a noindex robots meta", /noindex/.test(robotsMeta ?? ""));
  // The mockup's first story list must be the prototype's ranked list for that advisor.
  await m.locator('[data-story="0"]').first().click();
  await m.locator('[data-to="0"]').first().click();
  const mockRows = await m.locator(".item > div > div:nth-child(2)").allInnerTexts();
  await page.goto(BASE + "/triage");
  const protoRows = (await page.locator("tbody tr td:nth-child(5) .font-medium").allInnerTexts()).slice(0, mockRows.length);
  check("mockup: today's list order matches the prototype's ranking", mockRows.join("|") === protoRows.join("|"), `${mockRows.join(", ")} vs ${protoRows.join(", ")}`);
} catch (e) {
  check("run completed", false, e.message.split("\n")[0]);
} finally {
  await browser?.close();
  staticServer.close();
  try { process.kill(-server.pid); } catch {}
}
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length} passed, ${failed.length} failed`);
process.exit(failed.length ? 1 : 0);
