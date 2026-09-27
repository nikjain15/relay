"use client";

// A live run: every agent, over the whole book, in this browser, with the
// work visible as it happens.
//
// The computation is real and the clock is real: each step reports the
// milliseconds it took. Between batches the loop yields to the screen so the
// counts move as they are produced rather than appearing at the end. That
// yield is the only pacing; nothing is slowed down to look busy.
import { useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRelay } from "@/components/state";
import { Card, StatRow, Timeline, btn, btnPrimary } from "@/components/ui";
import { Icon, type IconName } from "@/components/icons";
import { Meter } from "@/components/charts";
import { ADVISORS_DATA } from "@/lib/data";
import { policyFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import { prepareAll } from "@/lib/compliance/actions";
import { brief } from "@/lib/research/brief";
import { retrieve } from "@/lib/evidence/retrieve";
import { discover } from "@/lib/discovery/discover";
import type { ClientFile, Doc, Opportunity } from "@/lib/types";

interface Step { at: string; icon: IconName; title: string; meta: string; tone: "plain" | "critical" | "caution" | "positive" }

export interface RunSummary {
  clients: number; messages: number; documents: number;
  findings: number; blocking: number; actions: number; notSwept: number;
  briefings: number; unknowns: number; inferred: number;
  opportunities: number; refused: number; conflicts: number;
  discoveries: number; ms: number;
}

const yieldToScreen = () => new Promise<void>((r) => setTimeout(r, 0));
const clock = (t0: number) => `+${((performance.now() - t0) / 1000).toFixed(2)}s`;

export function LiveRun({ clients, documents, opportunities, onDone }: { clients: ClientFile[]; documents: Doc[]; opportunities: Opportunity[]; onDone?: (s: RunSummary) => void }) {
  const { ruleEdits, connections } = useRelay();
  const [steps, setSteps] = useState<Step[]>([]);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<RunSummary | null>(null);
  const cancelled = useRef(false);

  const push = (s: Step) => setSteps((xs) => [s, ...xs]);

  const run = useCallback(async () => {
    cancelled.current = false;
    setRunning(true);
    setSteps([]);
    setSummary(null);
    setProgress(0);
    const t0 = performance.now();
    const advisors = ADVISORS_DATA.filter((a) => clients.some((c) => c.advisorId === a.id));
    const totalUnits = advisors.length + clients.length + opportunities.length + 1;
    let done = 0;
    const tick = async () => { done++; setProgress(done / totalUnits); await yieldToScreen(); };
    const s: RunSummary = { clients: clients.length, messages: clients.reduce((n, c) => n + (c.messages?.length ?? 0), 0), documents: documents.length, findings: 0, blocking: 0, actions: 0, notSwept: 0, briefings: 0, unknowns: 0, inferred: 0, opportunities: opportunities.length, refused: 0, conflicts: 0, discoveries: 0, ms: 0 };

    push({ at: clock(t0), icon: "sweep", title: `Starting over ${clients.length} households, ${s.messages} captured messages, ${documents.length} documents`, meta: `${advisors.length} advisor book${advisors.length === 1 ? "" : "s"}. Everything below runs in this browser; nothing leaves it.`, tone: "plain" });

    // 1. The compliance agents, one sweep per advisor book.
    for (const a of advisors) {
      if (cancelled.current) break;
      const t = performance.now();
      const policy = policyFrom(ruleEdits, scopeFor(a.id));
      const found = sweep(a.id, policy, connections, clients);
      const actions = prepareAll(found.cases, policy.rules);
      const blocking = found.cases.filter((c) => c.reason === "fired" && c.severity === "block").length;
      s.findings += found.cases.length; s.blocking += blocking; s.actions += actions.length; s.notSwept += found.messagesNotSwept.length;
      push({ at: clock(t0), icon: "shield", title: `Compliance agents swept ${a.walkthrough?.label ?? a.name}: ${found.accountsScanned} accounts, ${found.messagesScanned} messages`, meta: `${found.cases.length} findings (${blocking} blocking), ${actions.length} actions prepared${found.messagesNotSwept.length ? `, ${found.messagesNotSwept.length} messages not swept (degraded source)` : ""}. ${Math.round(performance.now() - t)} ms.`, tone: blocking ? "critical" : found.cases.length ? "caution" : "positive" });
      await tick();
    }

    // 2. Research, one briefing per household, reported in batches.
    let t = performance.now();
    for (let i = 0; i < clients.length; i++) {
      if (cancelled.current) break;
      const b = brief(clients[i].id, connections, clients);
      if (b) { s.briefings++; s.unknowns += b.unknowns.length; s.inferred += b.inferred.length; }
      done++;
      if ((i + 1) % 25 === 0 || i === clients.length - 1) {
        push({ at: clock(t0), icon: "briefing", title: `Research agent briefed ${i + 1} of ${clients.length} households`, meta: `${s.unknowns} things not established so far, ${s.inferred} inferences with a confidence. ${Math.round(performance.now() - t)} ms for this batch.`, tone: "plain" });
        t = performance.now();
        setProgress(done / totalUnits);
        await yieldToScreen();
      }
    }

    // 3. Retrieval, one query per opportunity.
    t = performance.now();
    for (let i = 0; i < opportunities.length; i++) {
      if (cancelled.current) break;
      const ev = retrieve(opportunities[i], documents);
      if (ev.refused) s.refused++; else if (ev.conflicts.length) s.conflicts++;
      done++;
      if ((i + 1) % 50 === 0 || i === opportunities.length - 1) {
        push({ at: clock(t0), icon: "library", title: `Retrieval cited ${i + 1} of ${opportunities.length} opportunities against ${documents.length} documents`, meta: `${s.refused} refused for want of a citation, ${s.conflicts} resting on documents that disagree. ${Math.round(performance.now() - t)} ms for this batch.`, tone: s.refused ? "caution" : "positive" });
        t = performance.now();
        setProgress(done / totalUnits);
        await yieldToScreen();
      }
    }

    // 4. Discovery over everything the clients said.
    if (!cancelled.current) {
      t = performance.now();
      const found = discover(clients, documents);
      s.discoveries = found.length;
      push({ at: clock(t0), icon: "search", title: `Discovery read ${s.messages} messages and every note and contact summary`, meta: `${found.length} candidate opportunities nobody typed in, each cited to the sentence it came from. ${Math.round(performance.now() - t)} ms.`, tone: found.length ? "caution" : "positive" });
      await tick();
    }

    s.ms = Math.round(performance.now() - t0);
    push({ at: clock(t0), icon: "check", title: cancelled.current ? "Stopped" : `Done in ${(s.ms / 1000).toFixed(2)} seconds of compute`, meta: "Every finding, briefing and candidate above now waits for a person. Nothing was sent, scheduled or written.", tone: "positive" });
    setProgress(1);
    setSummary(s);
    setRunning(false);
    onDone?.(s);
  }, [clients, documents, opportunities, ruleEdits, connections, onDone]);

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" className={btnPrimary} disabled={running || clients.length === 0} onClick={run}>
          <Icon name="agent" size={16} className="mr-1.5" />
          {running ? "Running" : summary ? "Run every agent again" : "Run every agent now"}
        </button>
        {running && <button type="button" className={btn} onClick={() => { cancelled.current = true; }}>Stop</button>}
        <span className="text-[12px] text-ink-3">{clients.length} households, {clients.reduce((n, c) => n + (c.messages?.length ?? 0), 0)} messages, {opportunities.length} opportunities, {documents.length} documents in the book.</span>
      </div>
      <div className="mb-4 h-1.5 w-full rounded bg-subtle" aria-hidden="true">
        <div className="h-1.5 rounded bg-ink transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
      </div>
      {summary && (
        <>
          <StatRow
            items={[
              { value: summary.findings, label: `Findings, ${summary.blocking} blocking`, icon: "shield", tone: summary.blocking ? "critical" : "plain" },
              { value: summary.actions, label: "Actions prepared for a person", icon: "check" },
              { value: summary.unknowns, label: `Not established across ${summary.briefings} briefings`, icon: "question", tone: summary.unknowns ? "critical" : "positive" },
              { value: summary.discoveries, label: "Opportunities discovered in messages", icon: "search" },
            ]}
          />
          <Card title="What the run produced" sub={`${(summary.ms / 1000).toFixed(2)} s of compute in this browser for ${summary.clients} households.`}>
            <Meter
              ariaLabel="Opportunities by evidence outcome"
              segments={[
                { label: "Cited", value: summary.opportunities - summary.refused - summary.conflicts, tone: "positive" },
                { label: "Cited, sources disagree", value: summary.conflicts, tone: "caution" },
                { label: "Refused, no citation", value: summary.refused, tone: "critical" },
              ]}
            />
            <p className="mt-3 text-[13px]">
              <Link href="/supervision" className="underline">Findings and prepared actions</Link> · <Link href="/research" className="underline">Briefings</Link> · <Link href="/discovery" className="underline">Discoveries</Link> · <Link href="/triage" className="underline">Today&apos;s list</Link> · <Link href="/agents" className="underline">Agents</Link>
            </p>
          </Card>
        </>
      )}
      {steps.length > 0 && (
        <div className="mt-4">
          <Timeline items={steps} />
        </div>
      )}
    </div>
  );
}
