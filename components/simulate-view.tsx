"use client";

// Before you act: every option for a proposal, carried through to the morning
// after, on one screen.
//
// The matrix is the point. A proposal screen shows which options pass; this
// shows what each one does to Liquidity, concentration, the goal gap, the
// morning sweep and the supervisor's questions, so the person choosing sees
// the second-order effects before the first-order one is taken.
import Link from "next/link";
import { useMemo, useState } from "react";
import { useRelay } from "@/components/state";
import { Icon } from "@/components/icons";
import { Legend, More, PageTitle, Pill, Row, Section, StatRow, TableScroll, Timeline, Who, btn, btnPrimary, td, th } from "@/components/ui";
import { policyFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { connectedIds } from "@/lib/compliance/sweep";
import { simulable, simulateAll, type Simulation, type Tone } from "@/lib/simulate/simulate";
import { APP } from "@/lib/data/policy";
import { usd } from "@/lib/format";

const SOURCE: Record<string, string> = {
  new_cash: "New cash", rebalance_from_core: "From core", sell_long_term_lots: "Sell long-term lots",
  sell_all_lots: "Sell all lots", contribute_in_kind: "In kind",
};
const GRADE: Record<Simulation["grade"], { word: string; tone: "pass" | "fail" | "accent" }> = {
  clean: { word: "Clean", tone: "pass" }, review: { word: "Review", tone: "accent" }, blocked: { word: "Blocked", tone: "fail" },
};
const TEXT: Record<Tone, string> = { plain: "text-ink", positive: "text-positive", caution: "text-caution", critical: "text-critical" };
const OUTCOME: Record<string, string> = { clear: "clear", flag: "flag", block: "block", cannot_evaluate: "cannot evaluate" };

export function SimulateView() {
  const { ruleEdits, connections, book } = useRelay();
  const households = useMemo(() => book.clients.filter((c) => simulable(c).length > 0), [book.clients]);
  const [clientId, setClientId] = useState(households.some((c) => c.id === APP.featured.clientId) ? APP.featured.clientId : households[0]?.id);
  const client = households.find((c) => c.id === clientId) ?? households[0];
  const opps = useMemo(() => (client ? simulable(client) : []), [client]);
  const [oppId, setOppId] = useState<string | null>(null);
  const opp = opps.find((o) => o.id === oppId) ?? opps[0];
  const sims = useMemo(() => {
    if (!client || !opp) return [];
    const policy = policyFrom(ruleEdits, scopeFor(client.advisorId), undefined, book.rules);
    return simulateAll(client, opp, policy, connectedIds(client.advisorId, connections));
  }, [client, opp, ruleEdits, connections, book.rules]);
  const [pick, setPick] = useState<string | null>(null);
  const sel = sims.find((s) => s.candidate.id === pick) ?? sims.find((s) => s.grade === "clean") ?? sims.find((s) => s.grade === "review") ?? sims[0];
  const cols = useMemo(() => {
    const keys = new Set<string>();
    for (const s of sims) for (const c of s.consequences) keys.add(c.key);
    return [...keys].map((k) => ({ key: k, label: sims.flatMap((s) => s.consequences).find((c) => c.key === k)!.label }));
  }, [sims]);

  if (!client || !opp) return <PageTitle icon="hourglass" title="Before you act" sub="No household has a fundable or trimmable opportunity." />;

  const clean = sims.filter((s) => s.grade === "clean").length;
  const blocked = sims.filter((s) => s.grade === "blocked").length;

  return (
    <>
      <PageTitle icon="hourglass" title="Before you act" sub="Every option, carried through to the morning after. The agent runs the consequences; you choose." />
      <Legend className="-mt-5 mb-6 lg:hidden" />

      <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Household">
        {households.map((c) => (
          <button key={c.id} type="button" className={c.id === client.id ? btnPrimary : btn} onClick={() => { setClientId(c.id); setOppId(null); setPick(null); }}>{c.name}</button>
        ))}
      </div>
      {opps.length > 1 && (
        <div className="mb-6 flex flex-wrap gap-1.5" role="group" aria-label="Opportunity">
          {opps.map((o) => (
            <button key={o.id} type="button" className={`${o.id === opp.id ? btnPrimary : btn} h-auto whitespace-normal py-1.5 text-left`} onClick={() => { setOppId(o.id); setPick(null); }}>{o.plainTitle ?? o.title}</button>
          ))}
        </div>
      )}

      <StatRow
        items={[
          { value: sims.length, label: "Options carried through", icon: "filter" },
          { value: clean, label: "Clean the morning after", icon: "check", tone: clean ? "positive" : "plain" },
          { value: sims.length - clean - blocked, label: "Need a supervisor's answer", icon: "question" },
          { value: blocked, label: "Blocked by a rule or a finding", icon: "block", tone: blocked ? "critical" : "plain" },
        ]}
      />

      <Section title={`${client.name}: ${opp.plainTitle ?? opp.title}`}>
        <TableScroll>
          <table className="w-full min-w-[900px] border-collapse text-[13px]">
            <thead>
              <tr>
                <th className={th}>Option</th>
                <th className={th}>Morning after</th>
                {cols.map((c) => <th key={c.key} className={th}>{c.label}</th>)}
                <th className={th}>Sweep</th>
                <th className={th}>Asked</th>
              </tr>
            </thead>
            <tbody>
              {sims.map((s) => {
                const on = sel?.candidate.id === s.candidate.id;
                return (
                  <tr key={s.candidate.id} className={on ? "bg-selected" : "hover:bg-subtle"}>
                    <td className={td}>
                      <button type="button" className="text-left underline decoration-line-strong hover:decoration-ink" onClick={() => setPick(s.candidate.id)} aria-pressed={on}>
                        <span className="block text-ink">{s.product.name}</span>
                        <span className="block text-[11px] text-ink-3">{SOURCE[s.candidate.source]} · {usd(s.candidate.amountUsd)}</span>
                      </button>
                    </td>
                    <td className={td}><Pill tone={GRADE[s.grade].tone}>{GRADE[s.grade].word}</Pill></td>
                    {cols.map((c) => {
                      const x = s.consequences.find((k) => k.key === c.key);
                      return (
                        <td key={c.key} className={`${td} tabular-nums`}>
                          {x ? (
                            <>
                              <span className={`block ${TEXT[x.tone]}`}>{x.after}</span>
                              <span className="block text-[11px] text-ink-3">{x.change || "unchanged"}</span>
                            </>
                          ) : <span className="text-ink-3">n/a</span>}
                        </td>
                      );
                    })}
                    <td className={td}>
                      {s.rules.changes.length === 0 ? <span className="text-ink-3">No change</span> : s.rules.changes.map((r) => (
                        <span key={r.ruleId} className={`block ${r.to === "clear" ? "text-positive" : "text-critical"}`}>{OUTCOME[r.from]} to {OUTCOME[r.to]}</span>
                      ))}
                    </td>
                    <td className={`${td} tabular-nums`}>{s.supervisorQuestions.length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableScroll>
        <p className="mt-2 text-[12px] text-ink-3">No price movement is assumed anywhere. Every figure is arithmetic over holdings as they stand; the same engines that read the book today read the copy.</p>
      </Section>

      {sel && (
        <>
          <Section title={`If you chose ${sel.product.name}, ${SOURCE[sel.candidate.source].toLowerCase()}`}>
            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-[12px] text-ink-3"><Who who="client" />Consequences for the household, before and after</p>
                <div className="rounded border border-line px-3 sm:px-4">
                  {sel.consequences.map((c) => (
                    <Row key={c.key} icon={c.icon} tone={c.tone} title={<span className="tabular-nums">{c.label}: {c.before} <span className="text-ink-3">to</span> <span className={TEXT[c.tone]}>{c.after}</span></span>} meta={c.why} right={c.change ? <span className={`text-[12px] tabular-nums ${TEXT[c.tone]}`}>{c.change}</span> : undefined} />
                  ))}
                </div>
                <p className="mb-2 mt-6 text-[12px] text-ink-3"><Who who="agent" />The morning sweep, run on the copy</p>
                <div className="rounded border border-line px-3 sm:px-4">
                  {sel.rules.changes.length === 0 ? (
                    <Row icon="shield" tone="positive" title={`${sel.rules.after.length} account rules, no verdict changes`} meta={`${sel.rules.after.filter((v) => v.outcome !== "clear").length} already open on this household stay as they are.`} />
                  ) : sel.rules.changes.map((r) => (
                    <Row key={r.ruleId} icon="shield" tone={r.to === "clear" ? "positive" : "critical"} title={r.title} meta={r.finding} right={<Pill tone={r.to === "clear" ? "pass" : "fail"}>{OUTCOME[r.from]} to {OUTCOME[r.to]}</Pill>} />
                  ))}
                  <Row icon="library" tone={sel.evidence.refused ? "critical" : sel.evidence.conflicts ? "caution" : "positive"} title={sel.evidence.refused ? "Evidence refused" : `${sel.evidence.cited} passages cited${sel.evidence.conflicts ? `, ${sel.evidence.conflicts} disagreement` : ""}`} meta={<Link href={`/evidence/${sel.opportunityId}`} className="underline">What it would cite</Link>} />
                  <Row icon="people" tone={sel.regime.regime === "retail communication" ? "caution" : "plain"} title={`The note would be ${sel.regime.regime}`} meta={`${sel.regime.count} retail recipients of this template in 30 days, firm-wide, against ${sel.regime.threshold}.`} />
                </div>
              </div>
              <div>
                <p className="mb-2 text-[12px] text-ink-3">What it sets in motion</p>
                <ul className="mb-6 space-y-1.5 text-[13px] text-ink-2">
                  {sel.followOns.length === 0 && <li>Nothing beyond the trade itself.</li>}
                  {sel.followOns.map((f, i) => <li key={i} className="flex gap-2"><Icon name="trend" size={16} className="mt-0.5 shrink-0 text-ink-3" />{f}</li>)}
                </ul>
                <p className="mb-2 text-[12px] text-ink-3"><Who who="agent" />What a supervisor will ask</p>
                <ul className="mb-6 space-y-1.5 text-[13px] text-ink-2">
                  {sel.supervisorQuestions.map((q, i) => <li key={i} className="flex gap-2"><Icon name="question" size={16} className="mt-0.5 shrink-0 text-ink-3" />{q}</li>)}
                </ul>
                <p className="mb-2 text-[12px] text-ink-3"><Who who="advisor" />Still yours</p>
                <ul className="space-y-1.5 text-[13px] text-ink-2">
                  {sel.humanGate.map((q, i) => <li key={i} className="flex gap-2"><Icon name="check" size={16} className="mt-0.5 shrink-0 text-ink-3" />{q}</li>)}
                </ul>
                <p className="mt-4 text-[13px]">
                  <Link href={`/household/${client.id}/proposal?opp=${opp.id}`} className={btnPrimary}>Open the proposal</Link>
                </p>
              </div>
            </div>
          </Section>

          <Section title="How the agent got there">
            <Timeline items={sel.trace.map((t) => ({ at: `step ${t.n}`, icon: t.icon, title: t.title, meta: t.detail, tone: t.verdict === "fail" ? "critical" : t.verdict === "ok" ? "positive" : "plain" }))} />
          </Section>
        </>
      )}

      <More summary="What this agent is, and which step a model would own">
        The consequence agent applies a proposed action to a copy of the household and runs the same
        deterministic engines Relay runs on the real one: the household arithmetic, the constraint engine,
        every account rule in force, the evidence layer and the recipient counter. Nothing here is a
        forecast; no price, return or tax figure is estimated. In production a model might phrase the
        supervisor&apos;s questions more naturally. It would never decide what they are, and it would never
        grade an option.
      </More>
    </>
  );
}
