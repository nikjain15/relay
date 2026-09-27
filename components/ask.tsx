"use client";

// Ask, on every screen: a question in plain words, an answer from the records.
//
// The drawer opens from the header or with the / key. The answer comes from
// lib/ask, which reads the same book, sweep and rules every screen reads, and
// names the records it used, so an advisor can check it in one click. The
// conversation lives in this session; nothing leaves the browser.
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRelay } from "@/components/state";
import { Icon } from "@/components/icons";
import { Who, btn, btnPrimary } from "@/components/ui";
import { answer, suggestions, type Answer } from "@/lib/ask/answer";
import { policyFrom, agentsFrom } from "@/lib/compliance/store";
import { scopeFor } from "@/lib/compliance/scope";
import { sweep } from "@/lib/compliance/sweep";
import { prepareAll } from "@/lib/compliance/actions";
import { APP } from "@/lib/data/policy";

interface Turn { q: string; a: Answer; ms: number }

export function Ask({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { ruleEdits, connections, caseDispositions, actionDecisions, book, overlay } = useRelay();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [q, setQ] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const end = useRef<HTMLDivElement>(null);
  const advisorId = APP.defaultAdvisorId;

  const ctx = useMemo(() => {
    const scope = scopeFor(advisorId);
    const policy = policyFrom(ruleEdits, scope, undefined, book.rules);
    const agents = agentsFrom(ruleEdits, undefined, scope, book.rules);
    const found = sweep(advisorId, policy, connections, book.clients, agents);
    const cases = found.cases.filter((c) => !caseDispositions[c.id]);
    const actions = prepareAll(cases, policy.rules).filter((a) => !actionDecisions[a.id]);
    return { advisorId, clients: book.clients, documents: book.documents, cases, actions, policy, agents, connections, overlay };
  }, [advisorId, ruleEdits, connections, caseDispositions, actionDecisions, book, overlay]);

  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [turns]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const ask = (text: string) => {
    const t = text.trim();
    if (!t) return;
    const t0 = performance.now();
    const a = answer(t, ctx);
    setTurns((l) => [...l, { q: t, a, ms: Math.max(1, Math.round(performance.now() - t0)) }]);
    setQ("");
  };

  if (!open) return null;
  const last = turns[turns.length - 1];
  const chips = last?.a.followUps.length ? last.a.followUps : suggestions(book.clients, advisorId).slice(0, 4);

  return (
    <div className="fixed inset-0 z-30" role="presentation">
      <button type="button" aria-label="Close Ask" onClick={onClose} className="absolute inset-0 bg-ink/20" />
      <aside role="dialog" aria-modal="true" aria-label="Ask Relay" className="absolute inset-y-0 right-0 flex w-full max-w-lg flex-col border-l border-line bg-surface shadow-lg">
        <header className="flex items-center gap-3 border-b border-line px-5 py-3">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-agent-soft text-agent"><Icon name="agent" size={16} /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-semibold text-ink">Ask</p>
            <p className="text-[11px] text-ink-3">Answers from the book, the findings, the rules and the sources, each cited. Nothing leaves this browser.</p>
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-8 w-8 items-center justify-center rounded border border-line text-ink" aria-label="Close"><Icon name="close" size={16} /></button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {turns.length === 0 && (
            <div className="rounded border border-agent/30 bg-agent-soft/40 p-3 text-[13px] text-ink-2">
              <p><Who who="agent" />Ask about a household by name, about what needs you today, about a desk, a rule, a source or a document. I answer from the records and show which ones.</p>
            </div>
          )}
          <ol className="space-y-4">
            {turns.map((t, i) => (
              <li key={i}>
                <p className="mb-1.5 text-[13px] text-ink"><Who who="advisor" />{t.q}</p>
                <div className="rounded border border-agent/30 bg-agent-soft/40 p-3">
                  <p className="text-[13px] leading-relaxed text-ink"><Who who="agent" />{t.a.text}</p>
                  {t.a.cites.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-3">
                      {t.a.cites.map((k, j) => (
                        <li key={j} className="flex items-center gap-1"><Icon name="link" size={16} />{k.href ? <Link href={k.href} className="text-ink-2 underline decoration-line-strong">{k.label}</Link> : <span className="text-ink-2">{k.label}</span>}<code className="break-all">{k.record}</code></li>
                      ))}
                    </ul>
                  )}
                  {t.a.links.length > 0 && (
                    <p className="mt-2 flex flex-wrap gap-2">
                      {t.a.links.map((l) => <Link key={l.href + l.label} href={l.href} className={btn} onClick={onClose}>{l.label}</Link>)}
                    </p>
                  )}
                  <p className="mt-2 text-[11px] text-ink-3">From {t.a.via}{t.a.confidence < 1 ? `, confidence ${Math.round(t.a.confidence * 100)}%` : ""}, in {t.ms} ms.</p>
                </div>
              </li>
            ))}
          </ol>
          <div ref={end} />
        </div>

        <footer className="border-t border-line px-5 py-3">
          <p className="mb-2 flex flex-wrap gap-1.5">
            {chips.map((s) => <button key={s} type="button" className="rounded border border-line bg-subtle px-2 py-1 text-[12px] text-ink-2 hover:bg-selected" onClick={() => ask(s)}>{s}</button>)}
          </p>
          <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); ask(q); }}>
            <input ref={input} className="h-9 min-w-0 flex-1 rounded border border-line-strong bg-surface px-3 text-[13px] text-ink" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about a household, today, a desk, a rule or a source" aria-label="Your question" />
            <button type="submit" className={btnPrimary} disabled={!q.trim()}>Ask</button>
          </form>
          <p className="mt-2 text-[11px] text-ink-3">Deterministic here: intent by words, figures from the engines. In production a model phrases the answer and takes every figure from the same place.</p>
        </footer>
      </aside>
    </div>
  );
}
