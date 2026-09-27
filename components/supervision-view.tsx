"use client";

// The supervision console.
//
// Two queues, and the difference between them is the product argument. Drafts
// are what the advisor brought you. Agent findings are what nobody brought you:
// the sweep runs whether or not anyone opened the account. Both end the same way,
// at a principal, because Relay dispositions nothing it finds.
import { useMemo, useState } from "react";
import Link from "next/link";
import { household } from "@/lib/fixtures/households";
import { opportunity } from "@/lib/fixtures/opportunities";
import { runChecks } from "@/lib/policy/checks";
import { useRelay, type Disposition } from "@/components/state";
import { Banner, Card, CardGrid, More, PageTitle, Pill, Section, StatRow, TableScroll, btn, btnPrimary, input, td, th } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { policyFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import type { Case } from "@/lib/compliance/agents";

const REASON_LABEL: Record<Case["reason"], string> = {
  fired: "Finding",
  cannot_evaluate: "Cannot evaluate",
  low_confidence: "Needs confirming",
};
const REASON_ICON: Record<Case["reason"], IconName> = { fired: "alert", cannot_evaluate: "block", low_confidence: "eye" };

function Disposer({ id, onAct }: { id: string; onAct: (d: Disposition, comment?: string) => void }) {
  const [comment, setComment] = useState("");
  return (
    <div className="mt-3 space-y-2">
      <label className="block text-[12px] text-ink-2">
        Comment
        <input className={`${input} mt-1`} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btnPrimary} onClick={() => onAct("approved", comment)}>
          Clear
        </button>
        <button type="button" className={btn} onClick={() => onAct("returned", comment)}>
          Return to advisor
        </button>
        <button type="button" className={btn} onClick={() => onAct("blocked", comment)}>
          Block
        </button>
      </div>
      <p className="text-[11px] text-ink-3">Recorded for this session. In production this is an immutable supervisory record (PRD FR-14).</p>
      <span className="sr-only">{id}</span>
    </div>
  );
}

export function SupervisionView({ advisorId }: { advisorId: string }) {
  const { queue, dispose, ruleEdits, connections, caseDispositions, disposeCase } = useRelay();
  const [tab, setTab] = useState<"findings" | "drafts">("findings");
  const [comment, setComment] = useState<Record<string, string>>({});

  const scope = useMemo(() => scopeFor(advisorId), [advisorId]);
  const policy = useMemo(() => policyFrom(ruleEdits, scope), [ruleEdits, scope]);
  const found = useMemo(() => sweep(advisorId, policy, connections), [advisorId, policy, connections]);

  const open = found.cases.filter((c) => !caseDispositions[c.id]);
  const blocking = open.filter((c) => c.severity === "block" && c.reason === "fired");
  const pendingDrafts = queue.filter((q) => !q.disposition);

  return (
    <>
      <PageTitle
        title="Supervision console"
        sub="Everything the agents found on their own, plus every draft waiting for release. Relay drafts the finding; the disposition is yours."
      />

      <StatRow
        items={[
          { value: open.length, label: "Open findings", icon: "shield", tone: open.length ? "critical" : "positive" },
          { value: blocking.length, label: "Blocking", icon: "block", tone: blocking.length ? "critical" : "positive" },
          { value: pendingDrafts.length, label: "Drafts awaiting release", icon: "email" },
          { value: found.accountsScanned, label: "Accounts swept", icon: "sweep" },
        ]}
      />

      {found.blockedBy.length > 0 && (
        <Banner tone="caution" title="Some rules could not be evaluated">
          {found.blockedBy.join(", ")} {found.blockedBy.length === 1 ? "is" : "are"} not connected, so the rules that read from{" "}
          {found.blockedBy.length === 1 ? "it" : "them"} return cannot evaluate rather than a clear.{" "}
          <Link href="/connectors" className="underline">
            Connect the source
          </Link>
          .
        </Banner>
      )}

      <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label="Queues">
        <button type="button" role="tab" aria-selected={tab === "findings"} className={`${tab === "findings" ? btnPrimary : btn} gap-1.5`} onClick={() => setTab("findings")}>
          <Icon name="agent" size={16} />
          Agent findings ({open.length})
        </button>
        <button type="button" role="tab" aria-selected={tab === "drafts"} className={`${tab === "drafts" ? btnPrimary : btn} gap-1.5`} onClick={() => setTab("drafts")}>
          <Icon name="email" size={16} />
          Drafts ({pendingDrafts.length})
        </button>
      </div>

      {tab === "findings" && (
        <Section title="What the agents found, without being asked">
          <More summary="What is autonomous here, and what is not">
            Detection, classification, evidence assembly, the drafted finding, the drafted remediation, the citation and
            the order of this queue are all autonomous. The disposition is not. Anything that fired reaches a person, so
            does anything whose confidence sits below its rule&apos;s floor, and so does anything a rule could not
            evaluate because its source is missing, which is reported rather than passed.
          </More>
          {open.length === 0 ? (
            <Card tone="positive" title="Nothing open">
              <p className="text-[13px] text-ink-2">
                {found.accountsScanned} accounts and every attested channel swept against {policy.rules.filter((r) => r.enabled).length} rules in
                force. Everything raised has been dispositioned.
              </p>
            </Card>
          ) : (
            <CardGrid cols={2}>
              {open.map((c) => (
                <Card
                  key={c.id}
                  tone={c.reason !== "fired" ? "caution" : c.severity === "block" ? "critical" : "plain"}
                  icon={REASON_ICON[c.reason]}
                  title={c.ruleTitle}
                  sub={`${c.subjectLabel} · ${c.agentName} · ${c.citation}`}
                  right={<Pill tone={c.reason === "fired" && c.severity === "block" ? "fail" : "accent"}>{REASON_LABEL[c.reason]}</Pill>}
                >
                  <p className="text-[13px] text-ink">{c.finding}</p>
                  <p className="mt-2 text-[13px] text-ink-2">
                    <span className="font-medium text-ink">Suggested:</span> {c.remediation}
                  </p>
                  {Object.keys(c.evidence).length > 0 && (
                    <dl className="mt-3 grid grid-cols-[auto,1fr] gap-x-3 gap-y-1 border-t border-line pt-3 text-[12px]">
                      {Object.entries(c.evidence).map(([k, v]) => (
                        <div key={k} className="col-span-2 flex gap-2">
                          <dt className="text-ink-3">{k}</dt>
                          <dd className="text-ink-2">{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  <p className="mt-2 text-[12px] text-ink-3">Confidence {Math.round(c.confidence * 100)} percent.</p>
                  <Disposer id={c.id} onAct={(d, note) => disposeCase(c.id, d, note)} />
                </Card>
              ))}
            </CardGrid>
          )}

          {found.cases.length > open.length && (
            <div className="mt-6">
              <h3 className="mb-2 text-[14px] font-semibold">Dispositioned this session</h3>
              <TableScroll>
                <table className="w-full min-w-[34rem] border-collapse text-[13px]">
                  <thead>
                    <tr>
                      <th className={th}>Finding</th>
                      <th className={th}>Subject</th>
                      <th className={th}>Disposition</th>
                      <th className={th}>Comment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {found.cases
                      .filter((c) => caseDispositions[c.id])
                      .map((c) => (
                        <tr key={c.id}>
                          <td className={td}>{c.ruleTitle}</td>
                          <td className={td}>{c.subjectLabel}</td>
                          <td className={td}>
                            <Pill tone={caseDispositions[c.id].disposition === "approved" ? "pass" : "fail"}>{caseDispositions[c.id].disposition}</Pill>
                          </td>
                          <td className={`${td} text-ink-2`}>{caseDispositions[c.id].comment || "No comment"}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </TableScroll>
            </div>
          )}
        </Section>
      )}

      {tab === "drafts" && (
        <Section title="Drafts awaiting release">
          {queue.length === 0 ? (
            <Card title="No drafts submitted">
              <p className="text-[13px] text-ink-2">
                Compose one on{" "}
                <Link className="underline" href="/communications">
                  Note and audience
                </Link>
                . The zero-tolerance checks run on submission and every one is shown here, passing or failing.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {queue.map((q) => {
                const h = household(q.householdId)!;
                const o = opportunity(q.opportunityId)!;
                const checks = runChecks({
                  draft: q.draft,
                  sources: q.sources,
                  citedTitles: q.citedTitles,
                  recipients: q.recipients,
                  recordedRegime: q.regime,
                  callFirst: q.callFirst,
                });
                const allPass = checks.every((c) => c.pass);
                return (
                  <Card
                    key={q.id}
                    title={`${h.name}: ${o.title}`}
                    sub={`${q.recipients} retail investors across ${q.batchSize} ${q.batchSize === 1 ? "household" : "households"}, counted when submitted`}
                    right={<Pill tone={allPass ? "pass" : "fail"}>{q.regime}</Pill>}
                  >
                    <div className="grid gap-4 lg:grid-cols-2">
                      <p className="whitespace-pre-wrap rounded border border-line bg-subtle p-3 text-[13px]">{q.draft}</p>
                      <div>
                        <ul className="space-y-1.5 text-[13px]">
                          {checks.map((c) => (
                            <li key={c.id} className="flex flex-wrap items-baseline gap-2">
                              <Pill tone={c.pass ? "pass" : "fail"}>{c.pass ? "Pass" : "Fail"}</Pill>
                              <span className="font-medium">{c.label}</span>
                              <span className="text-ink-2">{c.detail}</span>
                            </li>
                          ))}
                        </ul>
                        {q.settingsVersion && <p className="mt-2 text-[12px] text-ink-3">Settings in force: {q.settingsVersion}</p>}
                        <p className="mt-2 text-[12px]">
                          <Link className="underline" href={`/household/${h.id}/proposal?opp=${o.id}`}>
                            Proposal and rationale record
                          </Link>
                          {" · "}
                          <Link className="underline" href={`/evidence/${o.id}`}>
                            Evidence
                          </Link>
                        </p>
                        {q.disposition ? (
                          <p className="mt-3 text-[13px]" role="status">
                            Dispositioned: <strong>{q.disposition}</strong>
                            {q.comment ? `, "${q.comment}"` : ""}.
                          </p>
                        ) : (
                          <div className="mt-3 space-y-2">
                            <label className="block text-[12px] text-ink-2">
                              Comment
                              <input
                                className={`${input} mt-1`}
                                value={comment[q.id] ?? ""}
                                onChange={(e) => setComment((s) => ({ ...s, [q.id]: e.target.value }))}
                              />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                className={btnPrimary}
                                disabled={!allPass}
                                onClick={() => dispose(q.id, "approved", comment[q.id])}
                                title={allPass ? "" : "A failing check blocks approval"}
                              >
                                Approve
                              </button>
                              <button type="button" className={btn} onClick={() => dispose(q.id, "returned", comment[q.id])}>
                                Return with comment
                              </button>
                              <button type="button" className={btn} onClick={() => dispose(q.id, "blocked", comment[q.id])}>
                                Block
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </Section>
      )}

      <p className="mt-8 text-[13px] text-ink-2">
        The rules behind these findings are editable on{" "}
        <Link href="/compliance" className="underline">
          Rules and agents
        </Link>
        , and every change is in the{" "}
        <Link href="/compliance/log" className="underline">
          change log
        </Link>
        .
      </p>
    </>
  );
}
