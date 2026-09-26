import { describe, it, expect } from "vitest";
import { PROSPECTS, SERVICE_REQUESTS, clientFile, getClientFile } from "@/lib/data";
import { rankProspects, prospectScore, introDraft } from "@/lib/prospecting/rank";
import { paperStatus, openItems, ESCALATE_AFTER_DAYS } from "@/lib/onboarding/status";
import { classify, triage } from "@/lib/servicing/classify";

describe("prospecting", () => {
  it("ranks warm, well-fitting, larger prospects first", () => {
    const ranked = rankProspects(PROSPECTS, "adv-a");
    expect(ranked[0].id).toBe("pr-series-d-founder");
    expect(ranked.at(-1)!.path).toBe("signal");
    expect(ranked.every((p) => p.advisorId === "adv-a")).toBe(true);
  });
  it("scores warmth plus fit plus size", () => {
    expect(prospectScore(PROSPECTS.find((p) => p.id === "pr-series-d-founder")!)).toBe(3 + 2 + 2);
  });
  it("drafts, never sends: a cold prospect gets advice, not outreach", () => {
    expect(introDraft(PROSPECTS.find((p) => p.path === "signal")!)).toMatch(/No warm path yet/);
    for (const p of PROSPECTS) expect(introDraft(p)).not.toMatch(/—/);
  });
});

describe("paperwork", () => {
  it(`escalates when unsigned for more than ${ESCALATE_AFTER_DAYS} days`, () => {
    expect(paperStatus({ form: "x", requestedDay: -21 }).status).toBe("escalated");
    expect(paperStatus({ form: "x", requestedDay: -14 }).status).toBe("due");
    expect(paperStatus({ form: "x", requestedDay: -21, signedDay: -2 }).status).toBe("signed");
  });
  it("the Vasquez-Hale rollover form is escalated at 21 days", () => {
    const open = openItems(clientFile("vasquez-hale")!);
    expect(open.find((w) => w.form === "401(k) rollover form")).toMatchObject({ status: "escalated", daysOpen: 21 });
  });
});

describe("servicing", () => {
  it("routes each request by rule", () => {
    const k = (id: string) => classify(SERVICE_REQUESTS.find((r) => r.id === id)!).kind;
    expect(k("sr-thornbury-wire")).toBe("Money movement");
    expect(k("sr-okafor-beneficiary")).toBe("Beneficiary change");
    expect(k("sr-alcott-withdrawal")).toBe("Distribution set-up");
    expect(k("sr-brandvold-pension")).toBe("Transfer in");
    expect(k("sr-renner-tax-docs")).toBe("Documents");
    expect(k("sr-pell-address")).toBe("Account details");
    expect(k("sr-vh-question")).toBe("Question");
  });
  it("puts callback-required money movement first and flags overdue items", () => {
    const t = triage(SERVICE_REQUESTS);
    expect(t[0]).toMatchObject({ id: "sr-thornbury-wire", callbackRequired: true });
    expect(t.find((r) => r.id === "sr-vh-question")!.overdue).toBe(true);
  });
  it("the client file bundle includes paperwork and service requests", () => {
    const f = getClientFile("thornbury")!;
    expect(f.serviceRequests.map((r) => r.id)).toEqual(["sr-thornbury-wire"]);
    expect(f.paperwork.length).toBeGreaterThan(0);
  });
});

describe("meetings and follow-ups", async () => {
  const { todaysMeetings, reviewPack } = await import("@/lib/meetings/prep");
  const { allTasks } = await import("@/lib/followups");

  it("every advisor has a day of meetings from data", () => {
    expect(todaysMeetings("adv-a").length).toBeGreaterThan(0);
    expect(todaysMeetings("adv-b").length).toBeGreaterThan(0);
  });

  it("the Alcott review pack carries the cash gap, the escalated form and the booked meeting", () => {
    const r = reviewPack("hh-alcott")!;
    expect(r.meeting?.kind).toBe("review");
    expect(r.gaps.map((g) => g.strategy)).toEqual(["Liquidity", "Legacy"]);
    expect(r.openPaperwork.some((w) => w.status === "escalated")).toBe(true);
    expect(r.documents.length).toBeGreaterThan(0);
    expect(reviewPack("hh-nobody")).toBeUndefined();
  });

  it("follow-ups list overdue tasks first", () => {
    const t = allTasks();
    expect(t[0].dueDay).toBeLessThan(0);
    expect(t.map((x) => x.dueDay)).toEqual([...t.map((x) => x.dueDay)].sort((a, b) => a - b));
  });
});
