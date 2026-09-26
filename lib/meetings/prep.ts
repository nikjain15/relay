// Review pack for a client meeting (PRD FR-20), built only from the client
// file: nothing here is invented or model-generated.
import type { ClientFile, Meeting } from "@/lib/types";
import { ADVISORS_DATA, clientFile, getClientFile, PROSPECTS } from "@/lib/data";
import { openItems } from "@/lib/onboarding/status";
import { classify } from "@/lib/servicing/classify";
import { evaluateAll } from "@/lib/constraints/evaluate";
import { toHousehold } from "@/lib/data";
import { usd } from "@/lib/format";
import { APP } from "@/lib/data/policy";
import { retrieve } from "@/lib/evidence/retrieve";

export function todaysMeetings(advisorId?: string): (Meeting & { advisorId: string; advisorLabel: string })[] {
  return ADVISORS_DATA.filter((a) => !advisorId || a.id === advisorId).flatMap((a) =>
    (a.walkthrough?.meetings ?? []).map((m) => ({ ...m, advisorId: a.id, advisorLabel: a.walkthrough?.label ?? a.name })),
  );
}

export function meetingFor(clientId: string) {
  return todaysMeetings().find((m) => m.clientId === clientId);
}

export function prospectFor(m: Meeting) {
  return m.prospectId ? PROSPECTS.find((p) => p.id === m.prospectId) : undefined;
}

export function reviewPack(id: string) {
  const f = getClientFile(id);
  if (!f) return undefined;
  const c: ClientFile = f.client;
  const h = toHousehold(c);
  const last = c.contactHistory.reduce<(typeof c.contactHistory)[number] | undefined>((m, e) => (!m || e.day > m.day ? e : m), undefined);
  const decisions = c.opportunities
    .filter((o) => (o.action === "fund" || o.action === "trim") && !retrieve(o).refused)
    .map((o) => {
      const evs = evaluateAll(o, h);
      const ok = evs.filter((e) => e.pass);
      return { opportunity: o, eligible: ok.length, blocked: evs.length - ok.length, amount: ok[0] ? usd(ok[0].candidate.amountUsd) : undefined };
    });
  return {
    client: c,
    meeting: meetingFor(c.id),
    lastContact: last,
    changed: c.opportunities,
    gaps: c.goals.filter((g) => g.target > 0 && g.funded < g.target),
    openPaperwork: openItems(c),
    serviceRequests: f.serviceRequests.map((r) => ({ ...r, ...classify(r) })),
    decisions,
    tasks: c.tasks,
    talkingPoints: c.walkthrough?.talkingPoints ?? APP.defaultTalkingPoints,
    documents: f.documents,
  };
}

export function clientName(id: string): string {
  const c = clientFile(id);
  if (!c) return id;
  return c.persons.length > 1 ? `${c.name} family` : c.persons[0].name;
}
