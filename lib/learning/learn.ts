// The learning loop (BUILD-SPEC §5.4, R-19): capture, learn, propose, approve,
// apply, measure. Deterministic learners read the behavior log and propose a
// change to a preference with the evidence behind it. They never apply a
// change and never touch a rule: the advisor accepts or declines, and a
// declined suggestion is held back for a cooling-off period.
import events from "@/data/events.json";
import config from "@/data/profiles/learning.json";
import { ADVISOR_PROFILES, SCHEMA, checkValue, resolveProfile, type Overlay, type SettingKey } from "@/lib/profile";
import type { TriggerClass } from "@/lib/types";
import { fmtValue } from "@/lib/profile/format";

export interface BehaviorEvent {
  day: number;
  advisorId: string;
  clientId?: string;
  type: "triage_decision" | "day_end" | "option_chosen" | "draft_edited" | "pack_opened" | "client_response" | "suggestion_rejected";
  triggerClass?: TriggerClass;
  decision?: "acted" | "dismissed";
  reason?: string;
  worked?: number;
  chosen?: "cheapest" | "other";
  change?: "shortened" | "unchanged" | "lengthened";
  firstSection?: string;
  channel?: string;
  responded?: boolean;
  scope?: "advisor" | "client";
  scopeId?: string;
  key?: string;
  detail?: string;
}

export const EVENTS = (events as unknown as { events: BehaviorEvent[] }).events;
export const LEARNING = config as { windowDays: number; minEvents: number; shareThreshold: number; weightStep: number; cooldownDays: number; capHeadroom: number; checkAfterDays: number };

export interface Suggestion {
  id: string;
  scope: "advisor" | "client";
  scopeId: string;
  advisorId: string;
  key: SettingKey;
  /** For per-class weights, the class; the value applies to that class only. */
  detail?: string;
  from: unknown;
  to: unknown;
  because: string;
  evidence: { events: number; share: number; windowDays: number };
  /** The outcome that shows whether the change helped, checked after checkAfterDays. */
  measure: string;
  heldBack?: string;
}

export interface Rejection { scopeId: string; key: string; detail?: string; day: number }

const share = (n: number, d: number) => (d ? Math.round((n / d) * 100) / 100 : 0);

/** Guard: the loop may propose only preferences, within their bounds, at a layer allowed to set them. */
export function guard(s: Suggestion): Suggestion {
  const spec = SCHEMA[s.key];
  if (!spec) throw new Error(`learning: unknown setting ${s.key}`);
  if (spec.kind !== "preference") throw new Error(`learning: ${s.key} is a rule; the loop never changes rules`);
  if (!spec.layers.includes(s.scope)) throw new Error(`learning: ${s.scope} may not set ${s.key}`);
  const bad = checkValue(s.key, s.key === "triage.classWeights" ? { [s.detail!]: s.to } : s.to);
  if (bad) throw new Error(`learning: ${bad}`);
  return s;
}

export function suggest(opts: { events?: BehaviorEvent[]; overlay?: Overlay; rejected?: Rejection[]; today?: number } = {}): Suggestion[] {
  const today = opts.today ?? 0;
  const all = (opts.events ?? EVENTS).filter((e) => today - e.day <= LEARNING.windowDays);
  const overlay = opts.overlay ?? {};
  const rejected: Rejection[] = [
    ...all.filter((e) => e.type === "suggestion_rejected").map((e) => ({ scopeId: e.scopeId!, key: e.key!, detail: e.detail, day: e.day })),
    ...(opts.rejected ?? []),
  ];
  const out: Suggestion[] = [];
  const W = LEARNING.windowDays;
  const enough = (n: number) => n >= LEARNING.minEvents;

  for (const ap of ADVISOR_PROFILES.filter((a) => a.learning)) {
    const aid = ap.advisorId;
    const mine = all.filter((e) => e.advisorId === aid);
    const eff = resolveProfile({ advisorId: aid }, overlay).values;

    // 1. A kind of signal the advisor keeps dismissing counts for less.
    const classes = [...new Set(mine.filter((e) => e.type === "triage_decision").map((e) => e.triggerClass!))];
    for (const tc of classes) {
      const ds = mine.filter((e) => e.type === "triage_decision" && e.triggerClass === tc);
      const dismissed = ds.filter((e) => e.decision === "dismissed").length;
      const cur = eff["triage.classWeights"][tc];
      const next = Math.round(Math.max(SCHEMA["triage.classWeights"].min!, cur - LEARNING.weightStep) * 100) / 100;
      if (enough(dismissed) && share(dismissed, ds.length) >= LEARNING.shareThreshold && next < cur) {
        const reasons = [...new Set(ds.filter((e) => e.reason).map((e) => e.reason))].join("; ");
        out.push({
          id: `${aid}:weight:${tc}`, scope: "advisor", scopeId: aid, advisorId: aid, key: "triage.classWeights", detail: tc, from: cur, to: next,
          because: `You dismissed ${dismissed} of ${ds.length} ${tc.replace(/_/g, " ")} items in ${W} days (${reasons}).`,
          evidence: { events: ds.length, share: share(dismissed, ds.length), windowDays: W },
          measure: "Share of this kind of item dismissed falls; nothing you acted on drops off the list.",
        });
      }
    }

    // 2. The list is longer than the advisor ever works through.
    const days = mine.filter((e) => e.type === "day_end");
    if (enough(days.length)) {
      const avg = days.reduce((s, e) => s + e.worked!, 0) / days.length;
      const cap = eff["triage.dailyCap"];
      const next = Math.max(SCHEMA["triage.dailyCap"].min!, Math.ceil(Math.max(...days.map((e) => e.worked!))) + LEARNING.capHeadroom);
      if (next < cap - 2) {
        out.push({
          id: `${aid}:cap`, scope: "advisor", scopeId: aid, advisorId: aid, key: "triage.dailyCap", from: cap, to: next,
          because: `Over ${days.length} days you worked through ${Math.round(avg * 10) / 10} items on average and never more than ${next - LEARNING.capHeadroom}, against a list of ${cap}.`,
          evidence: { events: days.length, share: share(days.filter((e) => e.worked! <= next).length, days.length), windowDays: W },
          measure: "Share of the list worked each day rises; nothing material waits more than a day.",
        });
      }
    }

    // 3. The advisor nearly always picks the cheapest eligible option.
    const picks = mine.filter((e) => e.type === "option_chosen");
    const cheapest = picks.filter((e) => e.chosen === "cheapest").length;
    if (enough(picks.length) && share(cheapest, picks.length) >= LEARNING.shareThreshold && eff["proposals.sortBy"] !== "cost") {
      out.push({
        id: `${aid}:sort`, scope: "advisor", scopeId: aid, advisorId: aid, key: "proposals.sortBy", from: eff["proposals.sortBy"], to: "cost",
        because: `You chose the lowest-cost eligible option ${cheapest} of ${picks.length} times.`,
        evidence: { events: picks.length, share: share(cheapest, picks.length), windowDays: W },
        measure: "Time from opening options to accepting one falls. Which options are eligible never changes.",
      });
    }

    // 4. The advisor opens the same review-pack section first.
    const packs = mine.filter((e) => e.type === "pack_opened");
    const firsts = packs.reduce<Record<string, number>>((m, e) => ({ ...m, [e.firstSection!]: (m[e.firstSection!] ?? 0) + 1 }), {});
    const [top, n] = Object.entries(firsts).sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
    const order = eff["review.sectionOrder"];
    if (enough(packs.length) && share(n, packs.length) >= LEARNING.shareThreshold && order[0] !== top) {
      out.push({
        id: `${aid}:order`, scope: "advisor", scopeId: aid, advisorId: aid, key: "review.sectionOrder", from: order, to: [top, ...order.filter((x) => x !== top)],
        because: `You opened "${fmtValue("review.sectionOrder", [top])}" first in ${n} of ${packs.length} review packs.`,
        evidence: { events: packs.length, share: share(n, packs.length), windowDays: W },
        measure: "Fewer jumps within the pack before the meeting starts.",
      });
    }
  }

  // 5 and 6: per client, from the advisor's edits and the client's responses.
  const clientIds = [...new Set(all.filter((e) => e.clientId).map((e) => e.clientId!))];
  for (const cid of clientIds) {
    const evs = all.filter((e) => e.clientId === cid);
    const aid = evs[0].advisorId;
    if (!ADVISOR_PROFILES.find((a) => a.advisorId === aid)?.learning) continue;
    const eff = resolveProfile({ clientId: cid }, overlay).values;

    const edits = evs.filter((e) => e.type === "draft_edited");
    const shortened = edits.filter((e) => e.change === "shortened").length;
    if (shortened >= Math.min(LEARNING.minEvents, 4) && share(shortened, edits.length) >= LEARNING.shareThreshold && eff["note.length"] !== "brief") {
      out.push({
        id: `${cid}:length`, scope: "client", scopeId: cid, advisorId: aid, key: "note.length", from: eff["note.length"], to: "brief",
        because: `You shortened ${shortened} of ${edits.length} drafts for this client before sending.`,
        evidence: { events: edits.length, share: share(shortened, edits.length), windowDays: W },
        measure: "Share of drafts sent without edits rises. Citations and disclosure stay in every note.",
      });
    }

    const resp = evs.filter((e) => e.type === "client_response");
    const answered = resp.filter((e) => e.responded);
    const byCh = answered.reduce<Record<string, number>>((m, e) => ({ ...m, [e.channel!]: (m[e.channel!] ?? 0) + 1 }), {});
    const [ch, k] = Object.entries(byCh).sort((a, b) => b[1] - a[1])[0] ?? ["", 0];
    if (enough(answered.length) && share(k, answered.length) >= LEARNING.shareThreshold && eff["contact.channel"] !== ch) {
      out.push({
        id: `${cid}:channel`, scope: "client", scopeId: cid, advisorId: aid, key: "contact.channel", from: eff["contact.channel"], to: ch,
        because: `${k} of the client's ${answered.length} responses came by ${ch}${resp.length > answered.length ? `; ${resp.length - answered.length} contacts by other channels went unanswered` : ""}.`,
        evidence: { events: resp.length, share: share(k, answered.length), windowDays: W },
        measure: "Client response rate and time to response improve.",
      });
    }
  }

  return out.map(guard).map((s) => {
    const r = rejected.find((x) => x.scopeId === s.scopeId && x.key === s.key && (x.detail ?? "") === (s.detail ?? ""));
    const wait = r ? LEARNING.cooldownDays - (today - r.day) : 0;
    return r && wait > 0 ? { ...s, heldBack: `You declined this ${today - r.day} days ago; Relay will ask again in ${wait} days.` } : s;
  });
}

/** The overlay entry an accepted suggestion writes. */
export function applied(s: Suggestion, current: unknown): unknown {
  return s.key === "triage.classWeights" ? { ...(current as object), [s.detail!]: s.to } : s.to;
}
