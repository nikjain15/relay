// A synthetic book of any size, generated from a seed, in the shape a
// spreadsheet export would have. Used for the downloadable sample files and
// for the "generate a book" button, so the live run has something real-sized
// to work over without anyone typing. Deterministic: the same seed gives the
// same book, so a number seen once can be seen again.
import { toCsv } from "@/lib/import/csv";
import { ADVISORS_DATA } from "@/lib/data";

const FIRST = ["A.", "B.", "C.", "D.", "E.", "F.", "G.", "H.", "J.", "K.", "L.", "M.", "N.", "P.", "R.", "S.", "T.", "V.", "W."];
const SURNAMES = ["Adeyemi", "Bakshi", "Calloway", "Delacroix", "Eriksson", "Fontaine", "Galloway", "Haddad", "Ibarra", "Jansen", "Kowalczyk", "Lindqvist", "Moreau", "Nakamura", "Obi", "Petrakis", "Quintero", "Rasmussen", "Sorensen", "Takahashi", "Uzun", "Varga", "Whitcombe", "Yilmaz", "Zielinski", "Anand", "Brennan", "Castillo", "Dubois", "Engel", "Farrow", "Grieve", "Holm", "Iversen", "Jaffe", "Kessler", "Laurent", "Mbeki", "Novak", "Okoro"];
const CHANNELS = ["Call", "Meeting", "Video", "Email"];
const NOTES = [
  "Mentioned they are thinking about selling the second home next spring.",
  "Asked whether the cash could go somewhere that earns a little more.",
  "Daughter is getting married in the autumn; wants to help with the deposit on a flat.",
  "Retiring at the end of next year; has not decided on the pension option.",
  "Moving to Lisbon for two years for work; unsure what that means for taxes.",
  "Received an inheritance from an aunt; roughly four hundred thousand.",
  "Company is being acquired; the shares vest on close.",
  "Wants to set something up for the grandchildren's school fees.",
  "",
  "",
];
const MESSAGES_OUT = [
  "Following up on our call. I'd suggest we move a year of spending out of cash into the ladder.",
  "Confirming Thursday at 10. Both of you, as you asked.",
  "The fund we discussed will return about 6% a year, which more than covers the gap.",
  "Attached is the form. Sign where marked and send it back whenever convenient.",
  "I sit on the advisory board of the sponsor, so I can walk you through the terms myself.",
];
const MESSAGES_IN = [
  "Can we find time next week to talk through the pension?",
  "This is not what I was told when I opened the account. I'm unhappy with how the fees were explained.",
  "We've just accepted an offer on the house. Completion is in six weeks.",
  "My brother will be handling the paperwork for me from now on. Please send everything to him.",
  "Should I put the whole cash balance into crypto? A friend doubled his last month.",
];

export function seeded(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (s * 1_103_515_245 + 12_345) % 2 ** 31) / 2 ** 31);
}

export function sampleBook(n: number, seed = 7, advisorIds: string[] = ADVISORS_DATA.map((a) => a.id)) {
  const rnd = seeded(seed);
  const pick = <T,>(xs: T[]) => xs[Math.floor(rnd() * xs.length)];
  const clients: Record<string, string | number>[] = [];
  const messages: Record<string, string | number>[] = [];
  for (let i = 0; i < n; i++) {
    const surname = `${SURNAMES[i % SURNAMES.length]}${i >= SURNAMES.length ? ` ${Math.floor(i / SURNAMES.length) + 1}` : ""}`;
    const scale = rnd() < 0.15 ? 20 : rnd() < 0.5 ? 5 : 1;
    const spend = Math.round((4 + rnd() * 20) * scale) * 1000;
    const cashMonths = Math.floor(rnd() * 40);
    const cash = cashMonths * spend;
    const core = Math.round((0.6 + rnd() * 4) * scale * 1_000_000);
    const single = rnd() < 0.35 ? Math.round((0.3 + rnd() * 3) * scale * 1_000_000) : 0;
    const limit = single ? pick([10, 20, 25, 30]) : 25;
    const lastContact = Math.floor(rnd() * 260);
    const age1 = 30 + Math.floor(rnd() * 52);
    const two = rnd() < 0.6;
    const advisorId = advisorIds[i % advisorIds.length];
    const single90 = single ? Math.round(((single / (core + cash + single)) * 100 - 2 - rnd() * 8) * 10) / 10 : "";
    clients.push({
      name: surname,
      advisorId,
      person1: `${pick(FIRST)} ${surname.split(" ")[0]}`, person1Age: age1,
      person2: two ? `${pick(FIRST)} ${surname.split(" ")[0]}` : "", person2Age: two ? age1 - 3 + Math.floor(rnd() * 6) : "",
      monthlySpendUsd: spend,
      cashUsd: cash,
      coreUsd: core,
      singleName: single ? pick(["Employer stock", "Inherited utility holding", "Founder shares", "Legacy bank holding"]) : "",
      singleNameUsd: single || "",
      maxSingleNamePct: limit,
      minLiquidityMonths: pick([6, 12, 18, 24]),
      liquidityTargetMonths: pick([12, 24, 36]),
      longevityTargetUsd: Math.round(core * (1 + rnd() * 0.6)),
      legacyTargetUsd: rnd() < 0.4 ? Math.round(core * 0.3) : "",
      lastContactDaysAgo: lastContact,
      lastContactChannel: pick(CHANNELS),
      lastContactSummary: "Review; nothing changed",
      note: pick(NOTES),
      trustedContactOnFile: rnd() < 0.7 ? "yes" : "no",
      unusualDisbursement: rnd() < 0.06 ? "yes" : "no",
      newThirdPartyContact: rnd() < 0.05 ? "yes" : "no",
      concentration90: single90,
      concentration60: single ? Math.round((Number(single90) + rnd() * 3) * 10) / 10 : "",
      concentration30: single ? Math.round((Number(single90) + 2 + rnd() * 4) * 10) / 10 : "",
      contactWindow: pick(["Mornings", "Afternoons", "After 6pm", "Weekday lunchtime"]),
    });
    const k = 1 + Math.floor(rnd() * 3);
    for (let m = 0; m < k; m++) {
      const inbound = rnd() < 0.5;
      messages.push({ clientId: surname, channel: pick(["email", "email", "sms"]), direction: inbound ? "inbound" : "outbound", daysAgo: Math.floor(rnd() * 30), text: inbound ? pick(MESSAGES_IN) : pick(MESSAGES_OUT) });
    }
  }
  return { clients, messages };
}

export const CLIENT_COLUMNS = ["name", "advisorId", "person1", "person1Age", "person2", "person2Age", "monthlySpendUsd", "cashUsd", "coreUsd", "singleName", "singleNameUsd", "maxSingleNamePct", "minLiquidityMonths", "liquidityTargetMonths", "longevityTargetUsd", "legacyTargetUsd", "lastContactDaysAgo", "lastContactChannel", "lastContactSummary", "note", "trustedContactOnFile", "unusualDisbursement", "newThirdPartyContact", "concentration90", "concentration60", "concentration30", "contactWindow"];
export const MESSAGE_COLUMNS = ["clientId", "channel", "direction", "daysAgo", "text"];

export function sampleCsv(n: number, seed = 7) {
  const b = sampleBook(n, seed);
  return { clients: toCsv(CLIENT_COLUMNS, b.clients), messages: toCsv(MESSAGE_COLUMNS, b.messages) };
}
