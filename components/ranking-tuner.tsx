"use client";

// The ranking desk: the agent that orders today's list, tuned by the advisor.
//
// Every advisor weighs signals differently. One wants outside events first,
// another wants anything over a family's own limit first. The score stays
// arithmetic an advisor can check (materiality times the weight for the kind
// of signal) and the weights stay inside the bounds the firm set in
// data/profiles/schema.json; what changes is whose weights they are. A tuned
// value is a session layer above the advisor's profile, so resolveProfile()
// reports it as "Your setting" and every screen that ranks reads the same one.
// Eligibility, rules and compliance never read it (personalization-cannot-widen).
import { useMemo } from "react";
import type { Opportunity, TriggerClass } from "@/lib/types";
import { rank, score } from "@/lib/ranking/rank";
import { resolveProfile, sourceLabel, SCHEMA } from "@/lib/profile";
import { useRelay } from "@/components/state";
import { CLASS_LABEL, btn } from "@/components/ui";
import { Icon, CLASS_ICON } from "@/components/icons";

const CLASSES = SCHEMA["triage.classWeights"].values as TriggerClass[];

export function RankingTuner({ advisorId, advisorName, opportunities, dismissed, titleOf }: {
  advisorId: string;
  advisorName: string;
  opportunities: Opportunity[];
  dismissed: ReadonlySet<string>;
  titleOf: (o: Opportunity) => string;
}) {
  const { overlay, tune, resetTuning, tuned } = useRelay();
  const now = resolveProfile({ advisorId }, overlay);
  const base = resolveProfile({ advisorId }, { ...overlay, tuned: {} });
  const weights = now.values["triage.classWeights"];
  const cap = now.values["triage.dailyCap"];
  const wSpec = SCHEMA["triage.classWeights"];
  const cSpec = SCHEMA["triage.dailyCap"];
  const isTuned = Boolean(tuned[advisorId] && Object.keys(tuned[advisorId]).length);

  // What moved, against the same list under the advisor's untuned settings.
  const moved = useMemo(() => {
    const before = rank(opportunities, dismissed, base.values["triage.dailyCap"], base.values["triage.classWeights"]).map((o) => o.id);
    const after = rank(opportunities, dismissed, cap, weights);
    return after
      .map((o, i) => ({ o, from: before.indexOf(o.id), to: i }))
      .filter((m) => m.from !== m.to)
      .sort((a, b) => Math.abs(b.from === -1 ? 99 : b.from - b.to) - Math.abs(a.from === -1 ? 99 : a.from - a.to))
      .slice(0, 3);
  }, [opportunities, dismissed, base.values, cap, weights]);

  const setWeight = (k: TriggerClass, v: number) => tune(advisorId, "triage.classWeights", { ...weights, [k]: v });

  return (
    <section id="tune" className="mb-6 scroll-mt-20 rounded-lg border border-agent/30 bg-agent-soft/40 p-4 sm:p-5" aria-label="Ranking agent">
      <div className="flex gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-agent-soft text-agent" aria-hidden="true"><Icon name="settings" size={20} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] text-ink-3"><span className="font-medium text-agent">Ranking</span> · tuned for {advisorName}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-ink">
            I score each item as its materiality (0 to 100, from the agent that raised it) times the weight you give its kind of signal, then keep the top {cap}.
            {" "}Weights now: {sourceLabel(now.provenance["triage.classWeights"]).toLowerCase()}. Move one and the list below re-ranks.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CLASSES.map((k) => (
              <label key={k} className="block rounded border border-line bg-surface p-3">
                <span className="flex items-center justify-between gap-2 text-[13px] text-ink">
                  <span className="inline-flex items-center gap-1.5"><Icon name={CLASS_ICON[k]} size={16} className="text-ink-3" />{CLASS_LABEL[k]}</span>
                  <span className="tabular-nums font-medium">{weights[k].toFixed(2)}</span>
                </span>
                <input
                  type="range"
                  className="mt-2 w-full accent-agent"
                  min={wSpec.min}
                  max={wSpec.max}
                  step={0.05}
                  value={weights[k]}
                  onChange={(e) => setWeight(k, Number(e.target.value))}
                  aria-label={`Weight for ${CLASS_LABEL[k]}`}
                />
              </label>
            ))}
            <label className="block rounded border border-line bg-surface p-3">
              <span className="flex items-center justify-between gap-2 text-[13px] text-ink">
                <span className="inline-flex items-center gap-1.5"><Icon name="list" size={16} className="text-ink-3" />Items on today&apos;s list</span>
                <span className="tabular-nums font-medium">{cap}</span>
              </span>
              <input
                type="range"
                className="mt-2 w-full accent-agent"
                min={cSpec.min}
                max={cSpec.max}
                step={1}
                value={cap}
                onChange={(e) => tune(advisorId, "triage.dailyCap", Number(e.target.value))}
                aria-label="Items on today's list"
              />
            </label>
          </div>

          <div className="mt-3 text-[13px] text-ink-2" aria-live="polite">
            {isTuned ? (
              moved.length ? (
                <ul className="space-y-1">
                  {moved.map(({ o, from, to }) => (
                    <li key={o.id} className="flex gap-2">
                      <Icon name="trend" size={16} className="mt-0.5 shrink-0 text-agent" />
                      <span>{titleOf(o)}: {from === -1 ? `now on the list at ${to + 1}` : `moved from ${from + 1} to ${to + 1}`}, score {score(o, weights)}.</span>
                    </li>
                  ))}
                </ul>
              ) : <p>Your weights are set; the order of the list is unchanged.</p>
            ) : <p>Nothing tuned yet. The firm&apos;s bounds are {wSpec.min} to {wSpec.max} for a weight and {cSpec.min} to {cSpec.max} items.</p>}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isTuned && <button type="button" className={btn} onClick={() => resetTuning(advisorId)}>Reset to {sourceLabel(base.provenance["triage.classWeights"]).toLowerCase()}</button>}
          </div>
          <p className="mt-2 text-[11px] text-ink-3">Deterministic: the weights are yours, the arithmetic is code, and a model never reorders the list. The ranking only orders what you see; it never changes which options pass a household&apos;s rules. In production the setting is a versioned write to your profile; here it lasts for the session.</p>
        </div>
      </div>
    </section>
  );
}
