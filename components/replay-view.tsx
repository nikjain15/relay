"use client";

// Replay: explain a past disposition by re-running the rule as it stood.
//
// A supervisor is asked "what were the rules when you cleared that?" and the
// honest answer is not a memory. It is the change log folded onto the baseline
// up to that timestamp, and the facts the rule read then, evaluated again. The
// same facts against today's rules say whether the outcome would differ now,
// and the entries in between say exactly why.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRelay } from "@/components/state";
import { Card, More, PageTitle, Pill, Section, StatRow, TableScroll, btn, btnPrimary, td, th } from "@/components/ui";
import { Icon } from "@/components/icons";
import { Bars } from "@/components/charts";
import { replayAll } from "@/lib/compliance/replay";
import { BASELINE } from "@/lib/compliance/policy";

const OUTCOME_TONE = { clear: "pass", flag: "accent", block: "fail", cannot_evaluate: "neutral" } as const;

export function ReplayView() {
  const { ruleEdits } = useRelay();
  const replays = useMemo(() => replayAll(ruleEdits), [ruleEdits]);
  // Open on the one that changed, if any: that is the one worth a look.
  const [picked, setPicked] = useState<string>(() => (replays.find((r) => !r.sameOutcomeNow) ?? replays[0])?.finding.id ?? "");
  const r = replays.find((x) => x.finding.id === picked) ?? replays[0];
  const drift = replays.filter((x) => !x.sameOutcomeNow).length;
  const mismatch = replays.filter((x) => !x.reproduces);
  const byRule = Object.entries(replays.reduce<Record<string, number>>((acc, x) => ((acc[x.finding.ruleId] = (acc[x.finding.ruleId] ?? 0) + 1), acc), {}))
    .map(([id, n]) => ({ label: BASELINE.find((b) => b.id === id)?.title ?? id, value: n, href: `/compliance#${id}` }))
    .sort((a, b) => b.value - a.value);

  if (!r) return <PageTitle icon="replay" title="Replay" sub="No past findings on file." />;

  const f = r.finding;
  const fieldsOf = (rule: typeof r.then.rule): Record<string, string> =>
    rule ? { enabled: String(rule.enabled), severity: rule.severity, ...Object.fromEntries(rule.params.map((p) => [p.key, String(p.value)])) } : {};
  const fieldsThen = fieldsOf(r.then.rule);
  const fieldsNow = fieldsOf(r.now.rule);
  const changedKeys = new Set(r.changed.map((c) => c.field));

  return (
    <>
      <PageTitle
        icon="replay"
        title="Replay a past finding"
        sub="Pick a finding. Relay folds the change log onto the baseline up to that moment, re-runs the rule on the facts it read then, and runs the same facts against the rules as they stand now."
      />

      <StatRow
        items={[
          { value: replays.length, label: "Findings on file, 90 days", icon: "replay" },
          { value: replays.length - mismatch.length, label: "Reproduce exactly", icon: "check", tone: mismatch.length ? "critical" : "positive" },
          { value: drift, label: "Would come out differently today", icon: "trend", tone: drift ? "plain" : "positive" },
          { value: ruleEdits.length, label: "Change-log entries replayed", icon: "log" },
        ]}
      />

      {mismatch.length > 0 && (
        <Card tone="critical" icon="alert" title={`${mismatch.length} finding${mismatch.length === 1 ? " does" : "s do"} not reproduce`}>
          <p className="text-[13px] text-ink">
            The recorded outcome differs from what the replayed rules produce. That is a finding about the log or the record, and it is shown rather than
            smoothed over: {mismatch.map((m) => m.finding.id).join(", ")}.
          </p>
        </Card>
      )}

      <Section title="Findings, newest first">
        <TableScroll>
          <table className="w-full min-w-[44rem] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={th}>When</th>
                <th className={th}>Rule</th>
                <th className={th}>Subject</th>
                <th className={th}>Then</th>
                <th className={th}>Now</th>
                <th className={th}>Disposition</th>
                <th className={th} />
              </tr>
            </thead>
            <tbody>
              {replays.map((x) => (
                <tr key={x.finding.id} className={x.finding.id === r.finding.id ? "bg-selected" : undefined}>
                  <td className={`${td} whitespace-nowrap text-ink-2`}>{x.finding.at.slice(0, 10)}</td>
                  <td className={td}>{x.then.rule?.title ?? x.finding.ruleId}</td>
                  <td className={td}>{x.finding.subjectLabel}</td>
                  <td className={td}><Pill tone={x.then.verdict ? OUTCOME_TONE[x.then.verdict.outcome] : "neutral"}>{x.then.verdict?.outcome ?? "rule off"}</Pill></td>
                  <td className={td}>
                    <Pill tone={x.now.verdict ? OUTCOME_TONE[x.now.verdict.outcome] : "neutral"}>{x.now.verdict?.outcome ?? "rule off"}</Pill>
                    {!x.sameOutcomeNow && <Icon name="trend" size={16} className="ml-1 inline text-ink-3" label="Different today" />}
                  </td>
                  <td className={`${td} text-ink-2`}>{x.finding.disposition}</td>
                  <td className={td}>
                    <button type="button" className={x.finding.id === r.finding.id ? btnPrimary : btn} onClick={() => setPicked(x.finding.id)} aria-pressed={x.finding.id === r.finding.id}>
                      Replay
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableScroll>
      </Section>

      <Section title={`${f.id}: ${r.then.rule?.title ?? f.ruleId}, ${f.subjectLabel}, ${f.at.replace("T", " ").replace("Z", "")}`}>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card icon="replay" title="As the rules stood then" sub={`Change log replayed to ${f.at.replace("T", " ").replace("Z", "")}`}>
            <p className="text-[13px]">
              Verdict then: <Pill tone={r.then.verdict ? OUTCOME_TONE[r.then.verdict.outcome] : "neutral"}>{r.then.verdict?.outcome ?? "rule not in force"}</Pill>{" "}
              <span className="text-ink-2">Recorded: {f.outcome}.</span>{" "}
              {r.reproduces ? <Pill tone="pass">Reproduces</Pill> : <Pill tone="fail">Does not reproduce</Pill>}
            </p>
            {r.then.verdict && <p className="mt-2 text-[13px] text-ink">{r.then.verdict.finding}</p>}
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-[12px]">
              {Object.entries(fieldsThen).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-32 shrink-0 text-ink-3">{k}</dt>
                  <dd className={changedKeys.has(k) ? "font-medium text-ink" : "text-ink-2"}>{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-[12px] text-ink-2">
              Disposition: <span className="text-ink">{f.disposition}</span> by {f.dispositionBy}. &ldquo;{f.comment}&rdquo;
            </p>
          </Card>

          <Card icon="rules" title="The same facts, against the rules now" sub={r.sameOutcomeNow ? "Same outcome today." : "A different outcome today, and the entries below say why."}>
            <p className="text-[13px]">
              Verdict now: <Pill tone={r.now.verdict ? OUTCOME_TONE[r.now.verdict.outcome] : "neutral"}>{r.now.verdict?.outcome ?? "rule not in force"}</Pill>
            </p>
            {r.now.verdict && <p className="mt-2 text-[13px] text-ink">{r.now.verdict.finding}</p>}
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-[12px]">
              {Object.entries(fieldsNow).map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="w-32 shrink-0 text-ink-3">{k}</dt>
                  <dd className={changedKeys.has(k) ? "font-medium text-ink" : "text-ink-2"}>{v}{changedKeys.has(k) && <span className="ml-1 text-ink-3">(was {fieldsThen[k] ?? "n/a"})</span>}</dd>
                </div>
              ))}
            </dl>
            {r.between.length > 0 ? (
              <ul className="mt-3 space-y-1.5 border-t border-line pt-3 text-[12px]">
                {r.between.map((e) => (
                  <li key={e.id}>
                    <span className="text-ink-3">{e.at.slice(0, 10)}</span> {e.actor}, {e.layer}: {e.field} {e.from} to {e.to}. <span className="text-ink-2">{e.reason}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 border-t border-line pt-3 text-[12px] text-ink-3">No change to this rule since the finding.</p>
            )}
          </Card>
        </div>

        <div className="mt-4 rounded border border-line p-4">
          <p className="mb-2 text-[13px] font-medium text-ink">The facts the rule read, exactly as recorded</p>
          <dl className="grid gap-x-4 gap-y-1 text-[12px] sm:grid-cols-2">
            {Object.entries(f.facts).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-40 shrink-0 text-ink-3">{k}</dt>
                <dd className="text-ink-2">{Array.isArray(v) ? v.join(", ") : String(v)}{f.factConfidence?.[k] !== undefined && <span className="ml-1 text-ink-3">(inferred, {Math.round(f.factConfidence[k] * 100)} percent)</span>}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <Section title="Findings by rule, 90 days">
        <Bars ariaLabel="Past findings by rule" items={byRule} />
      </Section>

      <More summary="Why this is reconstructed and not recalled">
        The rule set at any moment is the baseline plus the change-log entries dated on or before it; nothing else. So the rule that produced a
        past verdict is rebuilt from the log, the facts are the ones stored with the finding, and the engine is the same one that runs today. A
        finding that does not reproduce is reported, because it means the log or the record is incomplete, and that is a supervisory fact in its
        own right. The log is on{" "}
        <Link href="/compliance/log" className="underline">Change log</Link>.
      </More>
    </>
  );
}
