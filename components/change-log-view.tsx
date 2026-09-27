"use client";

// The change log.
//
// This is the screen that makes a configurable rule set defensible rather than
// merely flexible. Nothing here is a mutation record after the fact: the log is
// the state, and the policy any screen runs is this log folded onto the baseline.
// So replaying it to a past timestamp reproduces the rules exactly as they stood
// when a disposition was made, which is what a supervisor is asked to show.
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRelay } from "@/components/state";
import { Card, PageTitle, Pill, Section, StatRow, TableScroll, btn, td, th } from "@/components/ui";
import { policyFrom, editsAsOf } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { BASELINE } from "@/lib/compliance/policy";
import { AGENTS } from "@/lib/compliance/agents";

const LAYER_LABEL: Record<string, string> = {
  firm: "Firm",
  segment: "Segment",
  advisor: "Advisor",
  client: "Client",
};

function subjectOf(ruleId?: string, agentId?: string): string {
  if (agentId) return AGENTS.find((a) => a.id === agentId)?.name ?? agentId;
  return BASELINE.find((r) => r.id === ruleId)?.title ?? ruleId ?? "";
}

export function ChangeLogView({ advisorId }: { advisorId: string }) {
  const { ruleEdits, revertEdit } = useRelay();
  const [asOf, setAsOf] = useState<string | undefined>(undefined);

  const ordered = useMemo(() => editsAsOf(ruleEdits).slice().reverse(), [ruleEdits]);
  const scope = useMemo(() => scopeFor(advisorId), [advisorId]);
  const policy = useMemo(() => policyFrom(ruleEdits, scope, asOf), [ruleEdits, scope, asOf]);
  const refused = (ruleId: string | undefined, field: string, layer: string) =>
    policy.rejected.some((r) => r.ruleId === ruleId && r.field === field && r.layer === layer);

  return (
    <>
      <PageTitle
        icon="log"
        title="Change log"
        sub="Append-only. A rule is never edited in place: the console adds an entry and the effective policy is the baseline with these folded onto it, newest last."
      />

      <StatRow
        items={[
          { value: ordered.length, label: "Entries" },
          { value: ordered.filter((e) => e.target === "rule").length, label: "Rule changes" },
          { value: ordered.filter((e) => e.target === "agent").length, label: "Agent changes" },
          { value: policy.rejected.length, label: "Refused", tone: policy.rejected.length ? "critical" : "plain" },
        ]}
      />

      <Section title="Replay">
        <p className="mb-3 max-w-2xl text-[13px] text-ink-2">
          Pick an entry to see the rule set as it stood immediately after it. This is how a past decision is defended: the rules that produced
          it are reconstructable, not remembered.
        </p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={asOf ? btn : "hidden"} onClick={() => setAsOf(undefined)}>
            Back to now
          </button>
          {asOf && (
            <Pill tone="accent">
              Showing policy as of {asOf}: {policy.rules.filter((r) => r.enabled).length} rules in force
            </Pill>
          )}
        </div>
      </Section>

      <Section title="Entries, newest first">
        {ordered.length === 0 ? (
          <Card title="No changes yet">
            <p className="text-[13px] text-ink-2">
              The rule set is at its firm baseline. Make a change on the{" "}
              <Link href="/compliance" className="underline">
                rules page
              </Link>{" "}
              and it appears here.
            </p>
          </Card>
        ) : (
          <TableScroll>
            <table className="w-full min-w-[46rem] border-collapse text-[13px]">
              <thead>
                <tr>
                  <th className={th}>When</th>
                  <th className={th}>Who</th>
                  <th className={th}>Layer</th>
                  <th className={th}>What changed</th>
                  <th className={th}>Why</th>
                  <th className={th}>State</th>
                  <th className={th} />
                </tr>
              </thead>
              <tbody>
                {ordered.map((e) => {
                  const rejected = e.target === "rule" && refused(e.ruleId, e.field, e.layer);
                  return (
                    <tr key={e.id}>
                      <td className={`${td} whitespace-nowrap text-ink-2`}>{e.at.replace("T", " ").replace("Z", "")}</td>
                      <td className={td}>{e.actor}</td>
                      <td className={`${td} whitespace-nowrap`}>{LAYER_LABEL[e.layer] ?? e.layer}</td>
                      <td className={td}>
                        <span className="font-medium">{subjectOf(e.ruleId, e.agentId)}</span>
                        <br />
                        {e.field} {e.from} to {e.to}
                      </td>
                      <td className={`${td} max-w-[22rem] text-ink-2`}>{e.reason}</td>
                      <td className={td}>
                        {rejected ? <Pill tone="fail">Refused: would loosen</Pill> : <Pill tone="pass">In force</Pill>}
                      </td>
                      <td className={td}>
                        <div className="flex gap-2">
                          <button type="button" className={btn} onClick={() => setAsOf(e.at)}>
                            Replay
                          </button>
                          <button type="button" className={btn} onClick={() => revertEdit(e.id)}>
                            Undo
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        )}
        <p className="mt-3 max-w-2xl text-[12px] text-ink-3">
          Undo removes the entry because this prototype holds the log in session state. In production a reversal is itself an entry, so the log
          stays append-only and a reversal is as attributable as the change it reverses.
        </p>
      </Section>

      {policy.rejected.length > 0 && (
        <Section title="Refused changes, kept on purpose">
          <p className="mb-3 max-w-2xl text-[13px] text-ink-2">
            A layer that tried to loosen a rule is itself a supervision signal, so the attempt is recorded and the rule stays where the higher
            layer set it.
          </p>
          <ul className="space-y-2 text-[13px]">
            {policy.rejected.map((r, i) => (
              <li key={i} className="rounded border border-line px-3 py-2">
                <span className="font-medium">{subjectOf(r.ruleId)}</span>: {LAYER_LABEL[r.layer] ?? r.layer} tried to set {r.field} to{" "}
                {r.attempted}. {r.reason}
              </li>
            ))}
          </ul>
        </Section>
      )}
    </>
  );
}
